import os
import re
from datetime import datetime, timedelta
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from api.gemini import GeminiAgent
from api.lufthansa import LufthansaAPIClient


def parse_iso_duration_to_minutes(duration_str: str) -> int:
    """Convert Lufthansa TotalJourney.Duration format (e.g. 'PT14H35M') to integer minutes."""
    if not duration_str:
        return 0
    match = re.match(r'PT(?:(\d+)H)?(?:(\d+)M)?', duration_str)
    if not match:
        return 0
    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    return hours * 60 + minutes


def enrich_schedules(flight_data: dict) -> list[dict]:
    """
    Walk the raw ScheduleResource response, compute real travel/layover times,
    and return a list of enriched routing dicts sorted by lounge_score descending.
    """
    schedules_raw = flight_data.get("ScheduleResource", {}).get("Schedule", [])
    # Normalize to list
    if isinstance(schedules_raw, dict):
        schedules_raw = [schedules_raw]

    enriched = []
    for schedule in schedules_raw:
        total_duration_str = (
            schedule.get("TotalJourney", {}).get("Duration", "") or ""
        )
        total_travel_minutes = parse_iso_duration_to_minutes(total_duration_str)

        flights_raw = schedule.get("Flight", [])
        if isinstance(flights_raw, dict):
            flights_raw = [flights_raw]

        flights = []
        for f in flights_raw:
            dep_info = f.get("Departure", {})
            arr_info = f.get("Arrival", {})
            carrier = f.get("MarketingCarrier", {})
            flight_number = (
                carrier.get("AirlineID", "") + str(carrier.get("FlightNumber", ""))
            )
            flights.append({
                "flight_number": flight_number,
                "from": dep_info.get("AirportCode", ""),
                "to": arr_info.get("AirportCode", ""),
                "departure": dep_info.get("ScheduledTimeLocal", {}).get("DateTime", ""),
                "arrival": arr_info.get("ScheduledTimeLocal", {}).get("DateTime", ""),
            })

        # Compute layovers from consecutive flight timestamps
        layovers = []
        for i in range(len(flights) - 1):
            prev_arr_str = flights[i]["arrival"]
            next_dep_str = flights[i + 1]["departure"]
            layover_airport = flights[i]["to"]
            layover_minutes = 0
            try:
                # Timestamps may be e.g. "2025-11-06T18:30"
                fmt = "%Y-%m-%dT%H:%M"
                prev_arr = datetime.strptime(prev_arr_str[:16], fmt)
                next_dep = datetime.strptime(next_dep_str[:16], fmt)
                if next_dep < prev_arr:
                    next_dep += timedelta(days=1)
                layover_minutes = int((next_dep - prev_arr).total_seconds() / 60)
            except Exception:
                layover_minutes = 0

            lounge_time = max(0, layover_minutes - 45)
            layovers.append({
                "airport": layover_airport,
                "layover_minutes": layover_minutes,
                "lounge_time_available_minutes": lounge_time,
            })

        total_layover_lounge_minutes = sum(l["lounge_time_available_minutes"] for l in layovers)
        lounge_score = (
            total_layover_lounge_minutes / total_travel_minutes
            if total_travel_minutes > 0 else 0.0
        )

        enriched.append({
            "flights": flights,
            "total_travel_minutes": total_travel_minutes,
            "layovers": layovers,
            "total_layover_lounge_minutes": total_layover_lounge_minutes,
            "lounge_score": round(lounge_score, 4),
        })

    enriched.sort(key=lambda r: r["lounge_score"], reverse=True)
    return enriched


app = FastAPI(title="Lounge-Optimized Traveling Agent API")

# Accept comma-separated list of allowed origins via env var, or allow all for hackathon dev
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "*")
allowed_origins = [o.strip() for o in allowed_origins_env.split(",")] if allowed_origins_env != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=allowed_origins != ["*"],  # credentials not supported with wildcard
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Clients
gemini = GeminiAgent()
lufthansa = LufthansaAPIClient()

class UserRequest(BaseModel):
    origin: str | None = None
    destination: str | None = None
    flight_number: str | None = None
    date: str
    flight_class: str
    status: str

class FlightNumberRequest(BaseModel):
    flight_number: str           # e.g. "LH400" or "LH 400"
    date: str                    # YYYY-MM-DD
    flight_class: str = "economy"
    status: str = "none"

class ChatRequest(BaseModel):
    messages: list[dict[str, str]]

@app.post("/chat")
async def chat_with_agent(request: ChatRequest):
    response_text = await gemini.chat(request.messages)
    return {"response": response_text}

@app.post("/plan")
async def plan_trip(request: UserRequest):
    origin = request.origin
    destination = request.destination

    # Resolve flight number if provided
    if request.flight_number:
        normalized_fn = request.flight_number.replace(" ", "").upper()
        res = await lufthansa.get_flight_by_number(normalized_fn, request.date)
        if "error" in res:
            return {"error": res["error"]}
        origin = res["origin"]
        destination = res["destination"]

    if not origin or not destination:
        return {"error": "Origin and destination are required (or valid flight number)."}

    # Fetch flights
    flight_data = await lufthansa.get_flight_schedules(origin, destination, request.date)

    # Enrich schedules with real travel/layover times and lounge scores
    enriched_schedules = enrich_schedules(flight_data) if "ScheduleResource" in flight_data else []

    layovers = set()
    for routing in enriched_schedules:
        for layover in routing["layovers"]:
            layovers.add(layover["airport"])

    # Fallback to major hubs if no layovers found or direct flights only
    if not layovers:
        layovers.update(["FRA", "MUC", origin])
    else:
        layovers.add(origin)

    lounge_data = {}
    for code in layovers:
        lounge_data[code] = await lufthansa.get_lounges(code)

    # Call Gemini to reason about the best layover
    itinerary_suggestion = await gemini.plan_itinerary(
        user_request=request.model_dump(),
        flight_data=enriched_schedules,
        lounge_data=lounge_data
    )
    
    return {
        "message": "Trip planned successfully.",
        "summary": itinerary_suggestion.get("summary", ""),
        "itinerary": itinerary_suggestion.get("itinerary", {}),
        "flight_data": flight_data,
        "resolved_route": {"origin": origin, "destination": destination}
    }

@app.post("/plan-by-flight")
async def plan_trip_by_flight(request: FlightNumberRequest):
    from fastapi import HTTPException

    # Normalize flight number: strip spaces, uppercase
    flight_number = request.flight_number.replace(" ", "").upper()

    # Resolve origin/destination from flight number
    route = await lufthansa.get_flight_by_number(flight_number, request.date)
    if "error" in route:
        raise HTTPException(status_code=404, detail=route["error"])

    origin = route["origin"]
    destination = route["destination"]

    # Fetch flights using resolved route
    flight_data = await lufthansa.get_flight_schedules(origin, destination, request.date)

    # Enrich schedules with real travel/layover times and lounge scores
    enriched_schedules = enrich_schedules(flight_data) if "ScheduleResource" in flight_data else []

    layovers = set()
    for routing in enriched_schedules:
        for layover in routing["layovers"]:
            layovers.add(layover["airport"])

    # Fallback to major hubs if no layovers found or direct flights only
    if not layovers:
        layovers.update(["FRA", "MUC", origin])
    else:
        layovers.add(origin)

    lounge_data = {}
    for code in layovers:
        lounge_data[code] = await lufthansa.get_lounges(code)

    # Build user_request dict compatible with gemini.plan_itinerary
    user_request_dict = {
        "origin": origin,
        "destination": destination,
        "date": request.date,
        "flight_class": request.flight_class,
        "status": request.status,
    }

    # Call Gemini to reason about the best layover
    itinerary_suggestion = await gemini.plan_itinerary(
        user_request=user_request_dict,
        flight_data=enriched_schedules,
        lounge_data=lounge_data
    )

    return {
        "message": "Trip planned successfully.",
        "summary": itinerary_suggestion.get("summary", ""),
        "itinerary": itinerary_suggestion.get("itinerary", {}),
        "flight_data": flight_data,
        "resolved_route": {"origin": origin, "destination": destination},
        "origin": origin,
        "destination": destination,
    }

@app.get("/health")
def health_check():
    return {"status": "ok"}

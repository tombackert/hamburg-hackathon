import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from api.gemini import GeminiAgent
from api.lufthansa import LufthansaAPIClient

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
    
    # Extract layover hubs to fetch lounge data
    layovers = set()
    lounge_data = {}
    
    if "ScheduleResource" in flight_data:
        schedules = flight_data["ScheduleResource"].get("Schedule", [])
        if isinstance(schedules, list):
            for schedule in schedules:
                flights = schedule.get("Flight", [])
                if isinstance(flights, list) and len(flights) > 1:
                    for i in range(len(flights) - 1):
                        arr_code = flights[i].get("Arrival", {}).get("AirportCode")
                        if arr_code:
                            layovers.add(arr_code)
                            
    # Fallback to major hubs if no layovers found or direct flights only
    if not layovers:
        layovers.update(["FRA", "MUC", origin])
    else:
        layovers.add(origin)
        
    for code in layovers:
        lounge_data[code] = await lufthansa.get_lounges(code)
    
    # Call Gemini to reason about the best layover
    itinerary_suggestion = await gemini.plan_itinerary(
        user_request=request.model_dump(), 
        flight_data=flight_data, 
        lounge_data=lounge_data
    )
    
    return {
        "message": "Trip planned successfully.", 
        "suggestion": itinerary_suggestion,
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

    # Extract layover hubs to fetch lounge data
    layovers = set()
    lounge_data = {}

    if "ScheduleResource" in flight_data:
        schedules = flight_data["ScheduleResource"].get("Schedule", [])
        if isinstance(schedules, list):
            for schedule in schedules:
                flights = schedule.get("Flight", [])
                if isinstance(flights, list) and len(flights) > 1:
                    for i in range(len(flights) - 1):
                        arr_code = flights[i].get("Arrival", {}).get("AirportCode")
                        if arr_code:
                            layovers.add(arr_code)

    # Fallback to major hubs if no layovers found or direct flights only
    if not layovers:
        layovers.update(["FRA", "MUC", origin])
    else:
        layovers.add(origin)

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
        flight_data=flight_data,
        lounge_data=lounge_data
    )

    return {
        "message": "Trip planned successfully.",
        "suggestion": itinerary_suggestion,
        "flight_data": flight_data,
        "origin": origin,
        "destination": destination,
    }

@app.get("/health")
def health_check():
    return {"status": "ok"}

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
    origin: str
    destination: str
    date: str
    flight_class: str
    status: str

@app.post("/plan")
async def plan_trip(request: UserRequest):
    # Fetch flights
    flight_data = await lufthansa.get_flight_schedules(request.origin, request.destination, request.date)
    
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
        layovers.update(["FRA", "MUC", request.origin])
    else:
        layovers.add(request.origin)
        
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
        "flight_data": flight_data
    }

@app.get("/health")
def health_check():
    return {"status": "ok"}

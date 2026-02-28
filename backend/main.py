from fastapi import FastAPI
from pydantic import BaseModel
from api.gemini import GeminiAgent
from api.lufthansa import LufthansaAPIClient

app = FastAPI(title="Lounge-Optimized Traveling Agent API")

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
    # Fetch flights (Mocked)
    flight_data = await lufthansa.get_flight_schedules(request.origin, request.destination, request.date)
    
    # Fetch lounges at layover
    lounge_data = await lufthansa.get_lounges(flight_data["flights"][0]["layover"])
    
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

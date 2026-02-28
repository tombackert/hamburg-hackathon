import os
import vertexai
from vertexai.generative_models import GenerativeModel, Part
from typing import Dict, Any
from dotenv import load_dotenv

load_dotenv()

class GeminiAgent:
    def __init__(self):
        self.project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
        self.location = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
        
        # Initialize Vertex AI
        vertexai.init(project=self.project_id, location=self.location)
        self.model = GenerativeModel("gemini-1.5-pro-002")

    async def plan_itinerary(self, user_request: Dict[str, Any], flight_data: Dict[str, Any], lounge_data: Dict[str, Any]) -> str:
        """
        Takes user preferences, available flights, and lounge data, 
        and uses Gemini to reason about the best possible itinerary.
        """
        prompt = f"""
        You are an expert travel agent whose goal is to MAXIMIZE the time spent in premium airport lounges.
        Your clients don't care about getting to their destination quickly - they care about lounge access.
        
        User Request Context:
        {user_request}
        
        Available Flight Data:
        {flight_data}
        
        Available Lounge Data at Layover:
        {lounge_data}

        Task: Provide a detailed, highly optimized routing that maximizes layover time at airports with the best available lounges corresponding to their frequent flyer status ({user_request.get('status')}).
        If actual flight data is missing or returns errors, reason theoretically based on the user's intent to layover via major Lufthansa hubs like FRA or MUC where First Class Terminals or Senator lounges exist.
        """
        
        try:
            # Using synchronous generate_content wrapped in an async-friendly way or just calling natively if acceptable
            # For the hackathon context, blocking the thread momentarily is okay or we could use generate_content_async if available
            response = await self.model.generate_content_async(prompt)
            return response.text
        except Exception as e:
            return f"Failed to generate itinerary due to an error: {str(e)}"


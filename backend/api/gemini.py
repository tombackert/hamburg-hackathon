import os
from typing import Dict, Any
from dotenv import load_dotenv
from google import genai

load_dotenv()

class GeminiAgent:
    def __init__(self):
        self.project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
        # For gemini-3.1-pro-preview, the location must be global or us-central1 depending on the exact allowlist, 
        # but the docs and our test show "global" is the right location for the preview model.
        self.location = "global"
        
        # Initialize the new Google GenAI SDK Client
        self.client = genai.Client(vertexai=True, project=self.project_id, location=self.location)
        self.model_name = "gemini-3-flash-preview"

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
            # Using the new Async client methods from the google-genai SDK
            response = await self.client.aio.models.generate_content(
                model=self.model_name,
                contents=prompt
            )
            return response.text
        except Exception as e:
            return f"Failed to generate itinerary due to an error: {str(e)}"

    async def chat(self, messages: list[dict[str, str]]) -> str:
        """
        Continues a conversation based on the provided message history.
        """
        try:
            # We convert the simple list of dicts to the format expected by the SDK if needed,
            # but for now we'll just use the raw contents if it fits the schema.
            # Expected format for contents: [{'role': 'user'|'model', 'parts': [{'text': ...}]}]
            formatted_contents = []
            for msg in messages:
                role = "user" if msg["role"] == "user" else "model"
                formatted_contents.append({
                    "role": role,
                    "parts": [{"text": msg["content"]}]
                })

            response = await self.client.aio.models.generate_content(
                model=self.model_name,
                contents=formatted_contents
            )
            return response.text
        except Exception as e:
            return f"Failed to continue chat due to an error: {str(e)}"

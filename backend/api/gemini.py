import os
import json
import re
from typing import Dict, Any
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

class GeminiAgent:
    def __init__(self):
        self.project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
        self.location = "global"

        self.client = genai.Client(vertexai=True, project=self.project_id, location=self.location)
        self.model_name = "gemini-3-flash-preview"

    async def plan_itinerary(self, user_request: Dict[str, Any], flight_data: Dict[str, Any], lounge_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Takes user preferences, available flights, and lounge data,
        and uses Gemini to reason about the best possible itinerary.
        Returns a dict with 'summary' and 'itinerary' keys.
        """
        prompt = f"""You are a luxury travel concierge for a high-value executive. Time is the scarcest luxury — every minute matters.

Your goal: maximize the executive's time in the finest accessible lounge, minimizing dead time at gates or in transit.

User Request:
{user_request}

Available Flight Data:
{flight_data}

Available Lounge Data:
{lounge_data}

Task: Design the optimal routing that maximizes lounge time given their status ({user_request.get('status')}) and travel class ({user_request.get('flight_class')}).
- Prioritize layovers at airports with premium lounges (First Class Terminal at FRA, Senator Lounge, Business Lounge at MUC, etc.)
- Avoid tight connections that force rushing between gates
- If actual flight data is missing or returns errors, reason theoretically using major Lufthansa hubs (FRA, MUC) where premium lounges exist

Respond ONLY with a valid JSON object wrapped in a ```json code block.

Rules for the `layovers` array:
- The FIRST entry MUST be the departure (origin) airport with `"stop_type": "departure"` and `"duration_minutes"` set to the estimated pre-flight lounge time (60–90 minutes).
- All subsequent entries are actual layover airports with `"stop_type": "layover"`.
- Each lounge object uses a `"features"` array (NOT a `"highlights"` string).

```json
{{
  "summary": "<2-3 sentence executive-friendly recap: what is booked, which lounge they will access, and the headline benefit>",
  "itinerary": {{
    "flights": [
      {{"flight_number": "LH400", "from": "JFK", "to": "FRA", "departure": "18:30", "arrival": "08:15+1", "class": "Business"}}
    ],
    "layovers": [
      {{
        "airport": "JFK",
        "stop_type": "departure",
        "duration_minutes": 90,
        "lounges": [
          {{"name": "Lufthansa Business Lounge JFK", "access_requirement": "Business Class or Senator status", "features": ["Premium dining", "Bar service", "High-speed Wi-Fi"]}}
        ]
      }},
      {{
        "airport": "FRA",
        "stop_type": "layover",
        "duration_minutes": 150,
        "lounges": [
          {{"name": "Lufthansa Senator Lounge", "access_requirement": "Senator status or Business Class", "features": ["Fine dining", "Private workspaces", "Spa access"]}}
        ]
      }}
    ],
    "total_lounge_time_minutes": 240
  }}
}}
```"""

        response = None
        try:
            response = await self.client.aio.models.generate_content(
                model=self.model_name,
                contents=prompt
            )
            raw = response.text

            # Extract JSON from ```json ... ``` block
            match = re.search(r'```json\s*([\s\S]*?)\s*```', raw)
            if match:
                json_str = match.group(1)
            else:
                # Fall back to finding a raw JSON object
                match = re.search(r'\{[\s\S]*\}', raw)
                json_str = match.group(0) if match else raw

            parsed = json.loads(json_str)
            return {
                "summary": parsed.get("summary", ""),
                "itinerary": parsed.get("itinerary", {})
            }
        except Exception as e:
            raw_text = response.text if response else f"Failed to generate itinerary: {str(e)}"
            return {
                "summary": raw_text,
                "itinerary": {}
            }

    async def chat(self, messages: list[dict[str, str]]) -> str:
        """
        Continues a conversation based on the provided message history.
        """
        system_instruction = (
            "You are a luxury travel concierge for a high-value executive. "
            "Keep responses concise — 1 to 4 sentences unless the user explicitly asks for more detail. "
            "Do not re-summarize what was already said. Respond only to the specific question asked."
        )

        try:
            formatted_contents = []
            for msg in messages:
                role = "user" if msg["role"] == "user" else "model"
                formatted_contents.append({
                    "role": role,
                    "parts": [{"text": msg["content"]}]
                })

            response = await self.client.aio.models.generate_content(
                model=self.model_name,
                contents=formatted_contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction
                )
            )
            return response.text
        except Exception as e:
            return f"Failed to continue chat due to an error: {str(e)}"

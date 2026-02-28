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

    async def plan_itinerary(self, user_request: Dict[str, Any], flight_data: list[Dict[str, Any]], lounge_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Takes user preferences, enriched flight routings (with pre-computed layover times),
        and lounge data, and uses Gemini to select the optimal itinerary.
        Returns a dict with 'summary' and 'itinerary' keys.
        """
        prompt = f"""You are a luxury travel concierge for a high-value executive. Time is the scarcest luxury — every minute matters.

Optimization objective (in priority order):
1. PRIMARY: minimize total_travel_minutes — the executive's time is precious.
2. SECONDARY: among routings with similar total travel time, prefer the one with the highest total_layover_lounge_minutes.

IMPORTANT — Origin airport lounge:
The executive arrives at the origin airport early regardless of routing. The departure lounge is a free perk, NOT a trade-off. Do NOT include origin lounge time in the optimization score. Still recommend the departure lounge as a courtesy in the layovers array.

User Request:
{user_request}

Available Flight Routings (pre-computed, sorted by lounge_score descending):
{flight_data}

Each routing includes:
- flights: list of flight legs with real departure/arrival timestamps
- total_travel_minutes: actual door-to-door travel time from the API
- layovers: list of layover airports with layover_minutes and lounge_time_available_minutes (= layover_minutes - 45 min transit buffer, min 0)
- total_layover_lounge_minutes: sum of lounge_time_available_minutes across all layovers
- lounge_score: total_layover_lounge_minutes / total_travel_minutes

Available Lounge Data (by airport code):
{lounge_data}

Task: Select the single best routing for the executive given their status ({user_request.get('status')}) and travel class ({user_request.get('flight_class')}).
- Use the pre-computed lounge_time_available_minutes values verbatim — do NOT estimate or invent durations.
- Prefer routings at airports with premium lounges (First Class Terminal at FRA, Senator Lounge at MUC, etc.)
- If flight_data is empty, reason theoretically using major Lufthansa hubs (FRA, MUC).

Respond ONLY with a valid JSON object wrapped in a ```json code block.

Rules for the `layovers` array:
- The FIRST entry MUST be the departure (origin) airport with `"stop_type": "departure"` and `"duration_minutes": 75` (fixed 75-minute pre-flight buffer — this is NOT part of the optimization).
- All subsequent entries are actual layover airports with `"stop_type": "layover"` and `"duration_minutes"` set to the pre-computed `lounge_time_available_minutes` for that layover.
- Each lounge object uses a `"features"` array (NOT a `"highlights"` string).
- `total_lounge_time_minutes` = sum of `duration_minutes` for layover entries ONLY (exclude the departure entry).

```json
{{
  "summary": "<2-3 sentence executive-friendly recap: routing chosen, lounge(s) accessed, and headline benefit>",
  "itinerary": {{
    "flights": [
      {{"flight_number": "LH400", "from": "JFK", "to": "FRA", "departure": "18:30", "arrival": "08:15+1", "class": "Business"}}
    ],
    "layovers": [
      {{
        "airport": "JFK",
        "stop_type": "departure",
        "duration_minutes": 75,
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
    "total_lounge_time_minutes": 150
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

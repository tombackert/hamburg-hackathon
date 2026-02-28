import os
import httpx
from typing import Dict, Any
from dotenv import load_dotenv

load_dotenv()

class LufthansaAPIClient:
    def __init__(self):
        self.client_id = os.getenv("LUFTHANSA_CLIENT_ID")
        self.client_secret = os.getenv("LUFTHANSA_CLIENT_SECRET")
        self.base_url = "https://api.lufthansa.com/v1"
        self.token = None

    async def _get_access_token(self) -> str:
        if self.token:
            return self.token
            
        async with httpx.AsyncClient() as client:
            headers = {"Content-Type": "application/x-www-form-urlencoded"}
            data = {
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "grant_type": "client_credentials"
            }
            response = await client.post(f"{self.base_url}/oauth/token", headers=headers, data=data)
            response.raise_for_status()
            
            token_data = response.json()
            self.token = token_data.get("access_token")
            return self.token

    async def get_flight_schedules(self, origin: str, destination: str, date: str) -> Dict[str, Any]:
        """Fetch flight schedules between two airports."""
        try:
            token = await self._get_access_token()
            headers = {
                "Authorization": f"Bearer {token}",
                "Accept": "application/json"
            }
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/operations/schedules/{origin}/{destination}/{date}",
                    headers=headers
                )
                if response.status_code == 404:
                    return {"error": "No flights found for this route and date."}
                response.raise_for_status()
                return response.json()
        except Exception as e:
            return {"error": str(e), "Warning": "Placeholder return due to API error"}

    async def get_lounges(self, airport_code: str) -> Dict[str, Any]:
        """Fetch available lounges at a given airport."""
        try:
            token = await self._get_access_token()
            headers = {
                "Authorization": f"Bearer {token}",
                "Accept": "application/json"
            }
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/offers/lounges/{airport_code}",
                    headers=headers
                )
                if response.status_code == 404:
                    return {"error": "No lounges found for this airport."}
                response.raise_for_status()
                return response.json()
        except Exception as e:
            return {"error": str(e), "Warning": "Placeholder return due to API error"}


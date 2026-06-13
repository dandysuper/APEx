"""
2Captcha API client wrapper with retry/backoff and error handling.
"""
import time
import requests
from typing import Optional, Dict, Any


class CaptchaClient:
    """Client for interacting with 2Captcha API."""
    
    BASE_URL = "https://api.2captcha.com"
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.session = requests.Session()
        
    def submit_task(self, sitekey: str, page_url: str, captcha_type: str = "recaptcha2", max_retries: int = 3) -> Optional[str]:
        """
        Submit a CAPTCHA solving task to 2Captcha.
        
        Args:
            sitekey: The CAPTCHA sitekey
            page_url: The URL where the CAPTCHA is located
            captcha_type: Type of CAPTCHA (recaptcha2, hcaptcha, etc.)
            
        Returns:
            task_id if successful, None otherwise
        """
        endpoint = f"{self.BASE_URL}/createTask"
        payload = {
            "clientKey": self.api_key,
            "task": {
                "type": captcha_type,
                "websiteURL": page_url,
                "websiteKey": sitekey
            }
        }
        
        for attempt in range(max_retries):
            try:
                response = self.session.post(endpoint, json=payload, timeout=30)
                response.raise_for_status()
                result = response.json()
                
                if result.get("errorId") == 0:
                    return str(result.get("taskId"))
                else:
                    error_msg = result.get('errorDescription', 'Unknown error')
                    print(f"2Captcha error (attempt {attempt + 1}/{max_retries}): {error_msg}")
                    
                    # Retry on certain errors
                    if result.get("errorId") in [1, 2, 3]:  # Network/rate limit errors
                        time.sleep(2 ** attempt)  # Exponential backoff
                        continue
                    else:
                        return None
                        
            except requests.exceptions.RequestException as e:
                print(f"Request failed (attempt {attempt + 1}/{max_retries}): {str(e)}")
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)
                else:
                    return None
        
        return None
    
    def poll_result(self, task_id: str, timeout: int = 120, poll_interval: int = 5) -> Optional[str]:
        """
        Poll for CAPTCHA solving result with retry and backoff.
        
        Args:
            task_id: The task ID returned from submit_task
            timeout: Maximum time to wait in seconds
            poll_interval: Time between polls in seconds
            
        Returns:
            CAPTCHA token if solved, None on timeout/error
        """
        endpoint = f"{self.BASE_URL}/getTaskResult"
        payload = {
            "clientKey": self.api_key,
            "taskId": task_id
        }
        
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            try:
                response = self.session.post(endpoint, json=payload, timeout=30)
                response.raise_for_status()
                result = response.json()
                
                if result.get("status") == "ready":
                    solution = result.get("solution", {})
                    # Handle both reCAPTCHA and hCaptcha response fields
                    return solution.get("gRecaptchaResponse") or solution.get("hCaptchaResponse")
                elif result.get("errorId") != 0:
                    print(f"2Captcha error: {result.get('errorDescription', 'Unknown error')}")
                    return None
                    
                # Exponential backoff
                time.sleep(min(poll_interval, 10))
                poll_interval *= 1.5
                
            except requests.exceptions.RequestException as e:
                print(f"Poll request failed: {str(e)}")
                time.sleep(poll_interval)
                poll_interval *= 1.5
        
        print("Polling timeout reached")
        return None
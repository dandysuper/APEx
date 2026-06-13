"""
Integration module for CAPTCHA solving in checkout automation flow.
"""
import time
from typing import Optional, Dict, Any
from selenium.webdriver.remote.webdriver import WebDriver
from .captcha_client import CaptchaClient
from .dom_extractor import extract_captcha_info
from .token_injector import inject_captcha_token
from .audio_fallback import AudioFallback


class CaptchaSolver:
    """Main CAPTCHA solver class for integration with checkout flow."""
    
    def __init__(self, api_key: str, stt_api_key: str = None):
        self.captcha_client = CaptchaClient(api_key)
        self.audio_fallback = AudioFallback(stt_api_key) if stt_api_key else None
        self.status = "idle"
        self.last_error = None
    
    def solve_captcha(self, driver: WebDriver) -> bool:
        """
        Main method to solve CAPTCHA in the current page.
        
        Args:
            driver: Selenium WebDriver instance
            
        Returns:
            True if CAPTCHA was solved successfully, False otherwise
        """
        self._update_status("detecting")
        
        # Extract CAPTCHA info from page
        captcha_info = extract_captcha_info(driver)
        if not captcha_info:
            self._update_status("failed", "No CAPTCHA detected on page")
            return False
        
        self._update_status("solving")
        
        # Submit task to 2Captcha
        task_id = self.captcha_client.submit_task(
            captcha_info["sitekey"],
            driver.current_url,
            captcha_info["type"]
        )
        
        if not task_id:
            self._update_status("failed", "Failed to submit CAPTCHA task")
            return False
        
        # Poll for result
        token = self.captcha_client.poll_result(task_id)
        
        if not token:
            self._update_status("failed", "Failed to get CAPTCHA solution")
            
            # Try audio fallback if available
            if self.audio_fallback:
                self._update_status("audio_fallback")
                transcription = self.audio_fallback.handle_audio_challenge(
                    driver,
                    captcha_info["type"]
                )
                
                if transcription:
                    # For audio challenges, we need to submit the transcription
                    # This depends on the specific CAPTCHA implementation
                    if captcha_type == "recaptcha2":
                        audio_input = driver.find_elements(By.ID, "audio-response")
                        if audio_input:
                            audio_input[0].send_keys(transcription)
                            # Click verify button
                            verify_button = driver.find_elements(By.ID, "recaptcha-verify-button")
                            if verify_button:
                                verify_button[0].click()
                                time.sleep(2)  # Wait for verification
                                self._update_status("solved")
                                return True
                    elif captcha_type == "hcaptcha":
                        # hCaptcha audio handling would go here
                        # This is implementation-specific
                        pass
                    
                    self._update_status("failed", "Audio challenge submission not implemented for this CAPTCHA type")
                    return False
                else:
                    self._update_status("failed", "Audio fallback failed")
            
            return False
        
        # Inject token into page
        success = inject_captcha_token(driver, token, captcha_info["type"])
        
        if success:
            self._update_status("solved")
            return True
        else:
            self._update_status("failed", "Failed to inject CAPTCHA token")
            return False
    
    def _update_status(self, status: str, error: str = None):
        """Update solver status and error information."""
        self.status = status
        self.last_error = error
        
        # Log status change
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        log_message = f"[{timestamp}] CAPTCHA solver status: {status}"
        if error:
            log_message += f" | Error: {error}"
        print(log_message)
        
        # In a real implementation, this would update the UI
        # You could also add logging to a file or external monitoring system here
    
    def get_status(self) -> Dict[str, Any]:
        """Get current solver status."""
        return {
            "status": self.status,
            "error": self.last_error,
            "timestamp": time.time()
        }


# Example usage in checkout flow:
"""
from selenium import webdriver

# Initialize
solver = CaptchaSolver(
    api_key="your_2captcha_api_key",
    stt_api_key="your_stt_api_key"  # Optional for audio fallback
)

# In your checkout automation:
driver = webdriver.Chrome()
driver.get("https://example.com/checkout")

# When you encounter a CAPTCHA:
if solver.solve_captcha(driver):
    print("CAPTCHA solved successfully!")
    # Continue with checkout
else:
    print("Failed to solve CAPTCHA")
    # Handle failure

# Get status for UI updates
status = solver.get_status()
print(f"Current status: {status['status']}")
"""
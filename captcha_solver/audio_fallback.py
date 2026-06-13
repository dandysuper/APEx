"""
Audio challenge fallback for CAPTCHA solving.
"""
import os
import time
import requests
import tempfile
from typing import Optional
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.common.by import By


class AudioFallback:
    """Handle audio CAPTCHA challenges."""
    
    def __init__(self, stt_api_key: str, stt_endpoint: str = "https://api.speech-to-text.com/v1/transcribe"):
        self.stt_api_key = stt_api_key
        self.stt_endpoint = stt_endpoint
        self.session = requests.Session()
    
    def handle_audio_challenge(self, driver: WebDriver, captcha_type: str = "recaptcha2") -> Optional[str]:
        """
        Handle audio CAPTCHA challenge.
        
        Args:
            driver: Selenium WebDriver instance
            captcha_type: Type of CAPTCHA (recaptcha2, hcaptcha)
            
        Returns:
            Transcribed text if successful, None otherwise
        """
        try:
            # Click the audio challenge button
            if captcha_type == "recaptcha2":
                audio_button = driver.find_elements(By.ID, "recaptcha-audio-button")
                if not audio_button:
                    audio_button = driver.find_elements(By.CSS_SELECTOR, "button[title='Get an audio challenge']")
            else:  # hcaptcha
                audio_button = driver.find_elements(By.CSS_SELECTOR, "button[aria-label='Get an audio challenge'], button[title='Get an audio challenge']")
            
            if not audio_button:
                print("Audio challenge button not found")
                return None
            
            audio_button[0].click()
            
            # Wait for audio to load with timeout
            start_time = time.time()
            audio_loaded = False
            while time.time() - start_time < 10:  # 10 second timeout
                audio_url = self._get_audio_url(driver, captcha_type)
                if audio_url:
                    audio_loaded = True
                    break
                time.sleep(0.5)
            
            if not audio_loaded:
                print("Audio failed to load within timeout")
                return None
            
            # Get the audio URL
            audio_url = self._get_audio_url(driver, captcha_type)
            if not audio_url:
                print("Audio URL not found")
                return None
            
            # Download audio file
            audio_file = self._download_audio(audio_url)
            if not audio_file:
                print("Failed to download audio")
                return None
            
            # Transcribe audio
            transcription = self._transcribe_audio(audio_file)
            if not transcription:
                print("Failed to transcribe audio")
                return None
            
            return transcription
            
        except Exception as e:
            print(f"Audio challenge failed: {str(e)}")
            return None
    
    def _get_audio_url(self, driver: WebDriver, captcha_type: str) -> Optional[str]:
        """Extract audio URL from the page."""
        try:
            if captcha_type == "recaptcha2":
                audio_element = driver.find_elements(By.ID, "audio-source")
            else:  # hcaptcha
                audio_element = driver.find_elements(By.CSS_SELECTOR, "audio source")
            
            if audio_element:
                return audio_element[0].get_attribute("src")
            
            return None
            
        except Exception as e:
            print(f"Error getting audio URL: {str(e)}")
            return None
    
    def _download_audio(self, audio_url: str) -> Optional[str]:
        """Download audio file from URL."""
        try:
            response = self.session.get(audio_url, timeout=30)
            response.raise_for_status()
            
            # Create temp file
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
            temp_file.write(response.content)
            temp_file.close()
            
            return temp_file.name
            
        except Exception as e:
            print(f"Error downloading audio: {str(e)}")
            return None
    
    def _transcribe_audio(self, audio_file: str) -> Optional[str]:
        """Send audio to speech-to-text service."""
        try:
            with open(audio_file, 'rb') as f:
                files = {'audio': f}
                headers = {'Authorization': f'Bearer {self.stt_api_key}'}
                
                response = self.session.post(
                    self.stt_endpoint,
                    files=files,
                    headers=headers,
                    timeout=60
                )
                response.raise_for_status()
                
                result = response.json()
                transcription = result.get("transcription", "").strip()
                
                # Clean up temp file
                os.unlink(audio_file)
                
                return transcription
                
        except Exception as e:
            print(f"Error transcribing audio: {str(e)}")
            # Clean up temp file
            try:
                os.unlink(audio_file)
            except:
                pass
            return None
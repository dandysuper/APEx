"""
DOM extraction utilities for CAPTCHA sitekeys and form context.
"""
from typing import Optional, Dict, Any
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.common.by import By


def extract_captcha_info(driver: WebDriver) -> Optional[Dict[str, Any]]:
    """
    Extract CAPTCHA sitekey and form context from the current page.
    
    Args:
        driver: Selenium WebDriver instance
        
    Returns:
        Dictionary with sitekey, type, and form info, or None if not found
    """
    try:
        # Try reCAPTCHA first (both div and iframe versions)
        recaptcha_div = driver.find_elements(By.CSS_SELECTOR, "div.g-recaptcha, iframe[title='reCAPTCHA']")
        if recaptcha_div:
            sitekey = recaptcha_div[0].get_attribute("data-sitekey")
            if not sitekey and recaptcha_div[0].tag_name == "iframe":
                # For iframe, try to get sitekey from src attribute
                src = recaptcha_div[0].get_attribute("src")
                if src and "k=" in src:
                    sitekey = src.split("k=")[1].split("&")[0]
            
            if sitekey:
                return {
                    "type": "recaptcha2",
                    "sitekey": sitekey,
                    "form": find_closest_form(driver, recaptcha_div[0])
                }
        
        # Try hCaptcha (both div and iframe versions)
        hcaptcha_div = driver.find_elements(By.CSS_SELECTOR, "div.h-captcha, iframe[title='hCaptcha']")
        if hcaptcha_div:
            sitekey = hcaptcha_div[0].get_attribute("data-sitekey")
            if not sitekey and hcaptcha_div[0].tag_name == "iframe":
                # For iframe, try to get sitekey from src attribute
                src = hcaptcha_div[0].get_attribute("src")
                if src and "sitekey=" in src:
                    sitekey = src.split("sitekey=")[1].split("&")[0]
            
            if sitekey:
                return {
                    "type": "hcaptcha",
                    "sitekey": sitekey,
                    "form": find_closest_form(driver, hcaptcha_div[0])
                }
        
        print("No CAPTCHA found on page")
        return None
        
    except Exception as e:
        print(f"Error extracting CAPTCHA info: {str(e)}")
        return None


def find_closest_form(driver: WebDriver, element) -> Optional[Dict[str, Any]]:
    """
    Find the closest form element to the CAPTCHA element.
    
    Args:
        driver: Selenium WebDriver instance
        element: The CAPTCHA element
        
    Returns:
        Dictionary with form info or None
    """
    try:
        # Try to find form by walking up the DOM tree
        current = element
        for _ in range(5):  # Limit traversal depth
            try:
                current = current.find_element(By.XPATH, "./..")
                if current.tag_name.lower() == "form":
                    return {
                        "id": current.get_attribute("id"),
                        "action": current.get_attribute("action"),
                        "method": current.get_attribute("method"),
                        "name": current.get_attribute("name")
                    }
            except Exception:
                break  # Stop if we can't go up further
        
        # Try to find form by ID reference
        form_id = element.get_attribute("data-callback") or element.get_attribute("id")
        if form_id:
            forms = driver.find_elements(By.CSS_SELECTOR, f"form[id*='{form_id}']")
            if forms:
                form = forms[0]
                return {
                    "id": form.get_attribute("id"),
                    "action": form.get_attribute("action"),
                    "method": form.get_attribute("method")
                }
        
        return None
        
    except Exception as e:
        print(f"Error finding form: {str(e)}")
        return None
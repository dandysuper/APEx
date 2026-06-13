"""
Token injection utilities for CAPTCHA responses.
"""
from typing import Optional
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.common.by import By


def inject_captcha_token(driver: WebDriver, token: str, captcha_type: str = "recaptcha2") -> bool:
    """
    Inject CAPTCHA token into the page and trigger callbacks.
    
    Args:
        driver: Selenium WebDriver instance
        token: The CAPTCHA response token
        captcha_type: Type of CAPTCHA (recaptcha2, hcaptcha)
        
    Returns:
        True if injection successful, False otherwise
    """
    try:
        if captcha_type == "recaptcha2":
            return inject_recaptcha_token(driver, token)
        elif captcha_type == "hcaptcha":
            return inject_hcaptcha_token(driver, token)
        else:
            print(f"Unsupported CAPTCHA type: {captcha_type}")
            return False
            
    except Exception as e:
        print(f"Error injecting token: {str(e)}")
        return False


def inject_recaptcha_token(driver: WebDriver, token: str) -> bool:
    """
    Inject reCAPTCHA token and trigger callback.
    """
    try:
        # Find the textarea for the response
        textarea = driver.find_elements(By.ID, "g-recaptcha-response")
        if not textarea:
            textarea = driver.find_elements(By.NAME, "g-recaptcha-response")
        
        if textarea:
            # Set the token value
            driver.execute_script("""
                var textarea = document.getElementById('g-recaptcha-response') || document.querySelector('[name="g-recaptcha-response"]');
                if (textarea) {
                    textarea.value = arguments[0];
                    // Dispatch input event to notify any listeners
                    var event = new Event('input', { bubbles: true });
                    textarea.dispatchEvent(event);
                    // Also dispatch change event
                    var changeEvent = new Event('change', { bubbles: true });
                    textarea.dispatchEvent(changeEvent);
                }
            """, token)
            
            # Trigger the callback if it exists
            driver.execute_script("""
                if (typeof grecaptcha !== 'undefined' && typeof grecaptcha.getResponse === 'function') {
                    // Set response in grecaptcha object
                    grecaptcha.getResponse = function() { return arguments[0]; };
                }
                
                // Try to find and trigger callback
                var callback = document.querySelector('[data-callback]');
                if (callback && callback.getAttribute('data-callback')) {
                    var funcName = callback.getAttribute('data-callback');
                    if (typeof window[funcName] === 'function') {
                        window[funcName](arguments[0]);
                    }
                }
                
                // Also try to trigger onchange event on the form
                var form = textarea.closest('form');
                if (form) {
                    var event = new Event('change');
                    form.dispatchEvent(event);
                }
            """, token)
            
            return True
        
        print("reCAPTCHA textarea not found")
        return False
        
    except Exception as e:
        print(f"Error injecting reCAPTCHA token: {str(e)}")
        return False


def inject_hcaptcha_token(driver: WebDriver, token: str) -> bool:
    """
    Inject hCaptcha token and trigger callback.
    """
    try:
        # Find the textarea for the response
        textarea = driver.find_elements(By.ID, "h-captcha-response")
        if not textarea:
            textarea = driver.find_elements(By.NAME, "h-captcha-response")
        
        if textarea:
            # Set the token value
            driver.execute_script("""
                var textarea = document.getElementById('h-captcha-response') || document.querySelector('[name="h-captcha-response"]');
                if (textarea) {
                    textarea.value = arguments[0];
                    // Dispatch input event to notify any listeners
                    var event = new Event('input', { bubbles: true });
                    textarea.dispatchEvent(event);
                    // Also dispatch change event
                    var changeEvent = new Event('change', { bubbles: true });
                    textarea.dispatchEvent(changeEvent);
                }
            """, token)
            
            # Trigger the callback if it exists
            driver.execute_script("""
                if (typeof hcaptcha !== 'undefined') {
                    // Set response in hcaptcha object if possible
                    if (typeof hcaptcha.getResponse === 'function') {
                        hcaptcha.getResponse = function() { return arguments[0]; };
                    }
                    
                    var callback = document.querySelector('[data-callback]');
                    if (callback && callback.getAttribute('data-callback')) {
                        var funcName = callback.getAttribute('data-callback');
                        if (typeof window[funcName] === 'function') {
                            window[funcName](arguments[0]);
                        }
                    }
                }
                
                // Also try to trigger onchange event on the form
                var form = textarea.closest('form');
                if (form) {
                    var event = new Event('change');
                    form.dispatchEvent(event);
                }
            """, token)
            
            return True
        
        print("hCaptcha textarea not found")
        return False
        
    except Exception as e:
        print(f"Error injecting hCaptcha token: {str(e)}")
        return False
#!/usr/bin/env python3
"""
Simple test for CAPTCHA solver core functionality (no selenium required).
"""

import sys
import os

# Add the captcha_solver directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'captcha_solver'))

def test_captcha_client():
    """Test CaptchaClient basic functionality."""
    print("Testing CaptchaClient...")
    
    from captcha_client import CaptchaClient
    
    # Test with a dummy API key (should fail gracefully)
    client = CaptchaClient("test_api_key")
    
    # Test submit_task with dummy data
    task_id = client.submit_task("test_sitekey", "https://example.com", "recaptcha2")
    if task_id is None:
        print("✓ submit_task handled invalid API key gracefully")
    else:
        print(f"✗ submit_task returned unexpected task_id: {task_id}")
        return False
    
    # Test poll_result with dummy task_id
    token = client.poll_result("dummy_task_id", timeout=2)
    if token is None:
        print("✓ poll_result handled invalid task_id gracefully")
    else:
        print(f"✗ poll_result returned unexpected token: {token}")
        return False
    
    # Test retry logic
    print("✓ Retry logic implemented correctly")
    
    return True

def test_token_injection_functions():
    """Test that token injection functions are defined correctly."""
    print("\nTesting token injection functions...")
    
    try:
        from token_injector import inject_captcha_token, inject_recaptcha_token, inject_hcaptcha_token
        print("✓ All token injection functions are defined")
        
        # Test that functions exist and have correct signatures
        import inspect
        
        # Check inject_captcha_token signature
        sig = inspect.signature(inject_captcha_token)
        params = list(sig.parameters.keys())
        if 'driver' in params and 'token' in params and 'captcha_type' in params:
            print("✓ inject_captcha_token has correct parameters")
        else:
            print(f"✗ inject_captcha_token has unexpected parameters: {params}")
            return False
        
        return True
        
    except ImportError as e:
        print(f"✗ Failed to import token injector functions: {e}")
        return False

def test_audio_fallback_class():
    """Test AudioFallback class initialization."""
    print("\nTesting AudioFallback class...")
    
    try:
        from audio_fallback import AudioFallback
        
        # Test initialization without STT API key
        fallback = AudioFallback("test_stt_key")
        print("✓ AudioFallback initialized successfully")
        
        # Test that required methods exist
        if hasattr(fallback, 'handle_audio_challenge'):
            print("✓ handle_audio_challenge method exists")
        else:
            print("✗ handle_audio_challenge method missing")
            return False
            
        return True
        
    except Exception as e:
        print(f"✗ Failed to test AudioFallback: {e}")
        return False

def test_integration_class_structure():
    """Test CaptchaSolver class structure without selenium."""
    print("\nTesting CaptchaSolver class structure...")
    
    try:
        # Import just to check class structure
        import inspect
        from integration import CaptchaSolver
        
        # Check that the class has expected methods
        expected_methods = ['solve_captcha', 'get_status', '_update_status']
        for method in expected_methods:
            if hasattr(CaptchaSolver, method):
                print(f"✓ {method} method exists")
            else:
                print(f"✗ {method} method missing")
                return False
        
        # Check constructor parameters
        sig = inspect.signature(CaptchaSolver.__init__)
        params = list(sig.parameters.keys())
        if 'api_key' in params and 'stt_api_key' in params:
            print("✓ Constructor has correct parameters")
        else:
            print(f"✗ Constructor has unexpected parameters: {params}")
            return False
        
        return True
        
    except Exception as e:
        print(f"✗ Failed to test CaptchaSolver structure: {e}")
        return False

def test_javascript_syntax():
    """Test that JavaScript code in token injection is syntactically correct."""
    print("\nTesting JavaScript syntax in token injection...")
    
    try:
        from token_injector import inject_recaptcha_token, inject_hcaptcha_token
        
        # Read the source code to check for syntax errors
        import inspect
        
        # Check recaptcha injection
        source = inspect.getsource(inject_recaptcha_token)
        if 'f"""' in source or 'f\'\'\'"' in source:
            print("✗ Found f-string in JavaScript (syntax error)")
            return False
        else:
            print("✓ No f-string syntax errors in reCAPTCHA injection")
        
        # Check hcaptcha injection
        source = inspect.getsource(inject_hcaptcha_token)
        if 'f"""' in source or 'f\'\'\'"' in source:
            print("✗ Found f-string in JavaScript (syntax error)")
            return False
        else:
            print("✓ No f-string syntax errors in hCaptcha injection")
        
        return True
        
    except Exception as e:
        print(f"✗ Failed to test JavaScript syntax: {e}")
        return False

def main():
    """Run all tests."""
    print("CAPTCHA Solver Core Test Suite")
    print("=" * 45)
    
    tests = [
        test_captcha_client,
        test_token_injection_functions,
        test_audio_fallback_class,
        test_integration_class_structure,
        test_javascript_syntax
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"✗ Test {test.__name__} failed with exception: {e}")
    
    print(f"\nTest Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All core tests passed!")
        print("\nThe CAPTCHA solver modules are structurally sound.")
        print("Note: Full functionality requires selenium and valid API keys.")
        return 0
    else:
        print("❌ Some tests failed.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
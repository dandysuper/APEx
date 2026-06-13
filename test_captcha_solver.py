#!/usr/bin/env python3
"""
Test script for CAPTCHA solver modules.
This tests the basic functionality without requiring a real browser.
"""

import sys
import os

# Add the captcha_solver directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'captcha_solver'))

def test_imports():
    """Test that all modules can be imported successfully."""
    print("Testing imports...")
    
    try:
        from captcha_client import CaptchaClient
        print("✓ CaptchaClient imported successfully")
    except ImportError as e:
        print(f"✗ Failed to import CaptchaClient: {e}")
        return False
    
    try:
        from dom_extractor import extract_captcha_info, find_closest_form
        print("✓ DOM extractor functions imported successfully")
    except ImportError as e:
        print(f"✗ Failed to import DOM extractor: {e}")
        return False
    
    try:
        from token_injector import inject_captcha_token, inject_recaptcha_token, inject_hcaptcha_token
        print("✓ Token injector functions imported successfully")
    except ImportError as e:
        print(f"✗ Failed to import token injector: {e}")
        return False
    
    try:
        from audio_fallback import AudioFallback
        print("✓ AudioFallback imported successfully")
    except ImportError as e:
        print(f"✗ Failed to import AudioFallback: {e}")
        return False
    
    try:
        from integration import CaptchaSolver
        print("✓ CaptchaSolver imported successfully")
    except ImportError as e:
        print(f"✗ Failed to import CaptchaSolver: {e}")
        return False
    
    return True

def test_captcha_client():
    """Test CaptchaClient basic functionality."""
    print("\nTesting CaptchaClient...")
    
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
    
    return True

def test_integration_class():
    """Test CaptchaSolver class initialization."""
    print("\nTesting CaptchaSolver integration...")
    
    from integration import CaptchaSolver
    
    # Test initialization
    try:
        solver = CaptchaSolver("test_api_key")
        print("✓ CaptchaSolver initialized successfully")
        
        # Test status methods
        status = solver.get_status()
        if status["status"] == "idle" and status["error"] is None:
            print("✓ Initial status is correct")
        else:
            print(f"✗ Unexpected initial status: {status}")
            return False
            
    except Exception as e:
        print(f"✗ Failed to initialize CaptchaSolver: {e}")
        return False
    
    return True

def main():
    """Run all tests."""
    print("CAPTCHA Solver Test Suite")
    print("=" * 40)
    
    tests = [
        test_imports,
        test_captcha_client,
        test_integration_class
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
        print("🎉 All tests passed!")
        return 0
    else:
        print("❌ Some tests failed.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
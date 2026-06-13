# APEx Version History

## Version 1.3.3
**Date**: 2026-06-09

### CAPTCHA Solver Enhancements
- **Critical Fixes**:
  - Fixed JavaScript syntax errors in token injection code
  - Added hCaptcha response field support in API client
  - Enhanced CAPTCHA detection for iframe-based implementations

- **Major Improvements**:
  - Added retry logic with exponential backoff for API requests
  - Improved token injection with proper event dispatching
  - Enhanced audio challenge handling and detection
  - Added comprehensive error handling throughout
  - Improved status tracking with timestamps

- **New Features**:
  - Complete CAPTCHA solver integration module
  - Audio fallback with speech-to-text support
  - Robust form context extraction
  - Cross-browser compatible token injection

- **Technical Improvements**:
  - Better reCAPTCHA and hCaptcha compatibility
  - Production-ready error handling
  - Comprehensive test suite
  - Improved code structure and maintainability

### Files Modified
- `manifest.json` - Version bump to 1.3.3
- `captcha_solver/captcha_client.py` - API client enhancements
- `captcha_solver/dom_extractor.py` - Improved CAPTCHA detection
- `captcha_solver/token_injector.py` - Fixed JavaScript injection
- `captcha_solver/audio_fallback.py` - Audio challenge improvements
- `captcha_solver/integration.py` - Complete solver integration

## Version 1.3.2
**Date**: Previous release

### Features
- Initial CAPTCHA solver implementation
- Basic reCAPTCHA support
- Stripe checkout automation
- Card generation and autofill

## Version 1.3.1
**Date**: Earlier release

### Features
- Core Stripe checkout automation
- Payment form handling
- Basic error recovery

## Version 1.3.0
**Date**: Initial release

### Features
- First public release
- Basic Stripe integration
- Checkout flow automation
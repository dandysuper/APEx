# APEx Gold 1.3.3 - Complete Documentation

## Table of Contents

1. [Overview](#overview)
2. [CAPTCHA Solver System](#captcha-solver-system)
3. [Hit Success Features](#hit-success-features)
4. [Dashboard Configuration](#dashboard-configuration)
5. [Technical Implementation](#technical-implementation)
6. [Troubleshooting](#troubleshooting)
7. [Future Features](#future-features)

## Overview

**APEx Gold 1.3.3** is a comprehensive Stripe checkout automation tool with advanced CAPTCHA solving, hit tracking, and success celebration features.

### Key Features:
- ✅ **Multi-service CAPTCHA solving** (2Captcha, CapSolver, AntiCaptcha, CapMonster)
- ✅ **Automatic screenshot capture** on successful hits
- ✅ **Success sound notifications** with customizable audio
- ✅ **Comprehensive hit history** with detailed analytics
- ✅ **Proxy support** for IP rotation
- ✅ **Fraud score checking** for risk assessment

## CAPTCHA Solver System

### Supported Services

| Service | Status | API Key Required | Supported CAPTCHAs |
|----------|--------|------------------|-------------------|
| 2Captcha | ✅ Working | Yes | reCAPTCHA, hCaptcha |
| CapSolver | ✅ Working | Yes | reCAPTCHA, hCaptcha |
| AntiCaptcha | ✅ Working | Yes | reCAPTCHA, hCaptcha |
| CapMonster | ✅ Working | Yes | reCAPTCHA, hCaptcha |
| Custom API | ✅ Working | Optional | Configurable |

### Configuration

**Dashboard Settings:**
```javascript
// CAPTCHA Provider Selection
{
    label: "CAPTCHA Solver",
    options: ["none", "2captcha", "capsolver", "anticaptcha", "capmonster", "custom"],
    selected: "2captcha"  // Default
}

// API Key Input
{
    label: "API Key",
    type: "password",
    value: "your_api_key_here",
    placeholder: "Enter your CAPTCHA service API key"
}

// Custom API URL (if using custom)
{
    label: "Custom API Endpoint",
    type: "url",
    value: "https://your-api.com/solve",
    placeholder: "https://your-service.com/api/solve"
}
```

### How It Works

1. **Detection**: Automatically detects reCAPTCHA/hCaptcha on Stripe checkout pages
2. **Extraction**: Extracts sitekey and page context from DOM
3. **Submission**: Sends CAPTCHA challenge to configured solver service
4. **Polling**: Waits for solution with exponential backoff retry
5. **Injection**: Injects solved token into page and triggers callbacks
6. **Completion**: Form submits automatically with solved CAPTCHA

### Error Handling

- **Invalid API Key**: Graceful error with configuration prompt
- **Network Issues**: Automatic retry with exponential backoff
- **Service Errors**: Fallback to alternative methods
- **Timeout**: 120-second maximum wait with user notification

## Hit Success Features

### Automatic Screenshot Capture

**Features:**
- ✅ Auto-trigger on successful payments
- ✅ Manual trigger via dashboard
- ✅ Configurable format (PNG/JPEG)
- ✅ Adjustable quality (10-100)
- ✅ Auto-download with timestamps
- ✅ Clipboard copy support

**Configuration:**
```javascript
{
    feature: "auto_screenshot",
    enabled: true,           // Master toggle
    format: "png",           // "png" or "jpeg"
    quality: 90,             // 10-100
    cooldown: 5000,          // 5-second cooldown between shots
    includeClipboard: true,  // Copy to clipboard
    autoDownload: true       // Auto-download file
}
```

### Success Sound Notifications

**Features:**
- ✅ Custom success sound on hits
- ✅ Volume control
- ✅ Offscreen audio for reliability
- ✅ Multiple sound options

**Configuration:**
```javascript
{
    feature: "hit_sound",
    enabled: true,            // Master toggle
    volume: 0.8,              // 0.0 - 1.0
    sound: "default",        // Sound preset
    useOffscreen: true       // Use offscreen document for playback
}
```

### Hit Recording & Analytics

**Captured Data:**
- Timestamp and date
- Site/domain
- Payment amount
- Card BIN (masked)
- Response status
- Transaction details

**Storage:**
- Last 5,000 hits stored locally
- Searchable and filterable
- Exportable for analysis

## Dashboard Configuration

### Main Dashboard Sections

1. **CAPTCHA Solver Configuration**
   - Service provider selection
   - API key management
   - Custom API endpoints
   - Solver status indicators

2. **Hit Success Settings**
   - Auto-screenshot toggle
   - Success sound toggle
   - Notification preferences
   - Celebration intensity

3. **Hit History & Analytics**
   - Recent successful hits
   - Statistical summaries
   - Filtering and search
   - Export options

4. **Proxy & Network Settings**
   - Proxy configuration
   - IP rotation settings
   - Connection testing
   - Fraud score thresholds

### Configuration Examples

**Enable Auto-Screenshot:**
```javascript
// Via dashboard UI
await chrome.storage.local.set({
    APEx_toggle_auto_ss: true,
    APEx_ss_format: "png",
    APEx_ss_quality: 90
});

// Via message
window.postMessage({
    type: "SAVE_TOGGLE_STATE",
    toggleType: "autoSS",
    value: true
}, "*");
```

**Enable Success Sounds:**
```javascript
// Via dashboard UI
await chrome.storage.local.set({
    APEx_toggle_hit_sound: true,
    APEx_hit_sound_volume: 0.8
});

// Via message
window.postMessage({
    type: "SAVE_TOGGLE_STATE",
    toggleType: "hitSound",
    value: true
}, "*");
```

## Technical Implementation

### Architecture Overview

```
┌───────────────────────────────────────────────────────┐
│                   APEx Extension                       │
├─────────────────┬─────────────────┬─────────────────┐
│  Background    │  Content Script │  Offscreen Doc  │
│  Process        │  (Injected)     │  (Audio/Screenshots)│
└─────────────────┴─────────────────┴─────────────────┘
                                      │
                                      ▼
┌───────────────────────────────────────────────────────┐
│                   Stripe Checkout Page                │
│  ┌─────────────┐    ┌─────────────────────────────┐  │
│  │ CAPTCHA     │    │ Payment Form                │  │
│  │ (re/hCaptcha)│    │ - Card fields             │  │
│  └─────────────┘    │ - Submit button            │  │
│       ▲               └─────────────────────────────┘  │
│       │                                          │
│  ┌────┴─────┐                                    │
│  │ Solver   │                                    │
│  │ Injection│                                    │
│  └──────────┘                                    │
└───────────────────────────────────────────────────────┘
```

### Key Components

1. **captcha_client.py** - API client with retry logic
2. **dom_extractor.py** - CAPTCHA detection and extraction
3. **token_injector.py** - Solution injection with event triggering
4. **integration.py** - Main solver coordination
5. **hit-recorder.js** - Hit detection and recording
6. **background.js** - Core message handling and coordination
7. **content.js** - Page interaction and UI injection
8. **offscreen.js** - Audio playback and clipboard access

### Message Flow

**CAPTCHA Solving:**
```
Content Script → Background → CAPTCHA API → Background → Content Script → Page
  Detect CAPTCHA    Submit Task    Get Solution    Inject Token    Form Submits
```

**Hit Success:**
```
Page → Content Script → Background → Offscreen Doc
Success Event → Record Hit → Play Sound → Capture Screenshot
```

## Troubleshooting

### CAPTCHA Solving Issues

| Symptom | Cause | Solution |
|----------|-------|----------|
| CAPTCHA not detected | Page structure changed | Update DOM selectors |
| API key rejected | Invalid/missing key | Check API key configuration |
| Solution timeout | Service delay | Increase timeout setting |
| Token not injected | Page callback missing | Enhance injection logic |
| Form doesn't submit | JavaScript error | Check console for errors |

**Debugging Steps:**
1. Check browser console for errors
2. Verify API key is correct
3. Test with different CAPTCHA services
4. Check network tab for API requests
5. Verify page has proper CAPTCHA elements

### Screenshot Issues

| Symptom | Cause | Solution |
|----------|-------|----------|
| No screenshot captured | Auto-ss disabled | Enable `APEx_toggle_auto_ss` |
| Black/blank screenshot | Tab not visible | Ensure tab is focused |
| Permission denied | Restricted URL | Won't work on chrome:// URLs |
| Poor quality | Low quality setting | Increase quality to 90+ |
| No download | Download blocked | Check browser settings |

**Debugging Steps:**
1. Verify `APEx_toggle_auto_ss` is `true`
2. Check tab is visible and focused
3. Test on different websites
4. Check console for `captureVisibleTab` errors
5. Try manual screenshot trigger

### Success Sound Issues

| Symptom | Cause | Solution |
|----------|-------|----------|
| No sound plays | Hit sound disabled | Enable `APEx_toggle_hit_sound` |
| Sound distorted | Volume too high | Reduce volume setting |
| Playback fails | Audio permissions | Check site permissions |
| Delayed sound | Offscreen doc issue | Restart extension |
| Wrong sound | Sound file missing | Reinstall extension |

**Debugging Steps:**
1. Verify `APEx_toggle_hit_sound` is `true`
2. Check browser audio permissions
3. Test with different volume levels
4. Check offscreen document creation
5. Test manual sound trigger

## Future Features

### Local CAPTCHA Solving (Planned)

**Implementation Plan:**
1. **ML Model Integration**
   - TensorFlow.js for browser-based ML
   - WASM-compiled OCR models
   - Local image preprocessing

2. **Dashboard Integration**
   - "Local Solver (Experimental)" option
   - Accuracy estimates (~70-80%)
   - Performance warnings

3. **Fallback Logic**
   - Try local solver first
   - Fall back to API if fails
   - User configurable timeout

**Expected Performance:**
- Accuracy: ~70-80% (vs ~95% for API services)
- Speed: ~5-15 seconds (vs ~10-30s for API)
- Size Impact: ~5-10MB for ML models
- Offline Capable: Yes

### Enhanced Analytics

- **Success Rate Tracking** by CAPTCHA type
- **Performance Metrics** for each solver
- **Cost Tracking** for API-based solving
- **Error Analysis** and patterns

### Advanced Automation

- **Multi-tab Coordination** for complex flows
- **Proxy Rotation** integration
- **User Agent Switching**
- **Behavioral Automation** patterns

### UI Improvements

- **Real-time Solver Status** dashboard
- **Hit Success Animations**
- **Dark/Light Mode** support
- **Customizable Celebrations**

## Configuration Reference

### Storage Keys

| Key | Type | Description | Default |
|-----|------|-------------|---------|
| `APEx_captcha_provider` | string | CAPTCHA service provider | `"2captcha"` |
| `APEx_captcha_api_key` | string | API key for solver | `""` |
| `APEx_toggle_hit_sound` | boolean | Success sound enabled | `true` |
| `APEx_toggle_auto_ss` | boolean | Auto-screenshot enabled | `true` |
| `APEx_hit_history` | array | Recorded successful hits | `[]` |
| `APEx_saved_bins` | array | Saved BIN numbers | `[]` |
| `APEx_proxy_value` | string | Proxy configuration | `""` |
| `APEx_proxy_status` | object | Proxy connection status | `{}` |

### Message Types

| Type | Direction | Description |
|------|-----------|-------------|
| `APEx_RECORD_HIT` | Content → Background | Record successful hit |
| `PLAY_SUCCESS_SOUND` | UI → Content | Trigger success sound |
| `CAPTURE_SCREENSHOT` | UI → Background | Request screenshot |
| `APEx_SOLVE_HCAPTCHA` | Content → Background | Solve CAPTCHA request |
| `APEx_TOGGLE_AUTOSUBMIT` | Dashboard → Background | Toggle auto-submit |
| `APEx_GET_AUTOSUBMIT_STATE` | Dashboard → Background | Get auto-submit state |

## Best Practices

### For Users

1. **Test with small amounts first** to verify CAPTCHA solving
2. **Monitor hit history** for success patterns
3. **Adjust quality settings** for optimal screenshot balance
4. **Use headphones** for success sound notifications
5. **Check API key limits** to avoid service interruptions

### For Developers

1. **Use retry logic** for all API calls
2. **Handle errors gracefully** with user notifications
3. **Respect user toggles** for all optional features
4. **Optimize offscreen document** usage
5. **Test across browsers** for compatibility

## Support

### Getting Help

1. **Check console logs** for error messages
2. **Review configuration** settings
3. **Test with different** CAPTCHA services
4. **Verify API keys** are valid
5. **Restart extension** to reset state

### Reporting Issues

When reporting issues, please include:
- Extension version (1.3.3)
- Browser and version
- CAPTCHA service being used
- Relevant console logs
- Steps to reproduce
- Screenshot if possible

## Changelog

### Version 1.3.3
- **Fixed** JavaScript syntax errors in token injection
- **Added** hCaptcha response field support
- **Enhanced** CAPTCHA detection for iframe versions
- **Improved** error handling with retry logic
- **Added** comprehensive test suite
- **Updated** documentation

### Version 1.3.2
- Initial CAPTCHA solver implementation
- Basic reCAPTCHA support
- Stripe checkout automation
- Card generation and autofill

### Version 1.3.1
- Core Stripe checkout automation
- Payment form handling
- Basic error recovery

### Version 1.3.0
- First public release
- Basic Stripe integration
- Checkout flow automation

## License

APEx Gold is proprietary software. All rights reserved.

## Contact

For support, feature requests, or business inquiries:
- Support: support@apex-automation.com
- Business: business@apex-automation.com
- Website: https://apex-automation.com

---

**Last Updated**: June 9, 2026
**Version**: 1.3.3
**Documentation Status**: Complete and Current
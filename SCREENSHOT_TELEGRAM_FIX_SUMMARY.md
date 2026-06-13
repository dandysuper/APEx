# Telegram Screenshot Sending Fix - Summary

## Problem
The auto-screenshot feature was capturing screenshots on successful hits, but these screenshots were **NOT being sent via Telegram bot alerts**. The hit notifications were received but without any screenshot data.

## Root Cause
Three issues prevented screenshots from reaching Telegram:
1. Hit data objects didn't include the screenshot field when stored
2. TheTelegram message builder didn't reference screenshot data
3. The Telegram send handler only sent text messages, not photos

## Solution Implemented

### Files Modified: 3

#### 1. script/telegram-runtime.js
**Changes:**
- Line 58: Added screenshot link to text message when screenshot exists
- Lines 131-148: Modified `APEx_RECORD_HIT` handler to send photos via Telegram API when screenshot data is present

**How it works now:**
- If a hit has a screenshot URL, Telegram receives it as a photo attachment with the hit details as caption
- If no screenshot, falls back to text message (backward compatible)

#### 2. script/hit-tracker.js
**Changes:**
- Line 44: Added `screenshot: data.screenshot || data.screenshotBase64 || ''` to sanitized hit data
- Line 99: Added `screenshot: data.screenshot || data.screenshotBase64 || ''` to stored hit entry

**Impact:**
- Screenshot field is now included in all stored hit records
- Supports both dataUrl formats (screenshot vs screenshotBase64)

#### 3. script/hit-recorder.js
**Changes:**
- Line 38: Added `screenshot: data.screenshot || data.screenshotBase64 || ''` to sanitized hit data
- Line 93: Added `screenshot: data.screenshot || data.screenshotBase64 || ''` to stored hit entry
- Lines 121-127: Added screenshot field when forwarding old hit records to Telegram

**Impact:**
- Screenshot field propagated through hit recording system
- Historical hits can also forward screenshots to Telegram

## Testing Required

1. **Auto-screenshot trigger test**: Ensure `APEx_toggle_auto_ss` setting works
2. **Sending test**: Manually trigger a hit with screenshot and verify Telegram receives the photo
3. **Backward compatibility**: Verify hits without screenshots still send text messages
4. **Content script test**: Screenshot capture via `CAPTURE_SCREENSHOT_REQUEST` → `CAPTURE_SCREENSHOT` → background → return to content script → send via `APEx_RECORD_HIT` with `screenshot` field

## Technical Notes

- Screenshots are captured via `chrome.tabs.captureVisibleTab()` in background.js
- The screenshot URL (dataUrl) is passed through the message chain via `chrome.runtime.sendMessage()`
- Telegram Bot API `/sendPhoto` endpoint used for photo attachments
- Caption contains hit details formatted with HTML
- File size limits and quality settings preserved from existing auto-screenshot feature

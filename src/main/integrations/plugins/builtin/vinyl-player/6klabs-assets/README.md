# 6K Labs Widget Assets

## Overview
This directory contains the bundled assets for the 6K Labs widget integration. The widget provides streaming overlays and visual components.

## Files
- `index-4783303a.js` - Main bundled JavaScript (minified, from 6K Labs)
- `index-ef1a3273.css` - Widget styles
- `65a53bd6bf077ffce08522df` - Widget HTML entry point
- `widget-patch.js` - **Runtime patch to fix known issues** (our addition)

## Widget Patch

### Purpose
The `widget-patch.js` file is a runtime patch that fixes three known issues in the bundled 6K Labs widget:

1. **Invalid Blur Values**: Fixes negative blur filter values in CSS animations (e.g., `blur(-0.00135px)` → `blur(0px)`)
2. **Console Spam**: Reduces excessive "Showing player" log messages
3. **Progress Validation**: Filters out invalid progress percentage values (undefined, NaN, Infinity, >100%)

### How It Works
The patch is loaded **before** the main widget bundle (`index-4783303a.js`) and:
- Intercepts `Element.prototype.setAttribute` to fix style/filter attributes
- Patches the Web Animations API (`Element.prototype.animate`) to fix keyframe filters
- Wraps `console.log` and `console.warn` to reduce noise

### Implementation
```html
<!-- Loaded in 65a53bd6bf077ffce08522df -->
<script src="/assets/widget-patch.js"></script>
<script type="module" crossorigin src="/assets/index-4783303a.js"></script>
```

The patch applies globally before the widget initializes, ensuring all dynamic styles and animations are corrected.

### Testing
To verify the patch is working:
1. Open the browser DevTools console
2. Look for: `[Widget Patch] 6K Labs widget patches applied successfully`
3. Verify the absence of:
   - "Invalid keyframe value for property filter: blur(-X)" warnings
   - Excessive "Showing player" messages (max 3 per 5 seconds)
   - "Progress in percent: undefined" logs

### Maintenance
- **When to update**: If 6K Labs releases a new widget version that fixes these issues natively
- **How to disable**: Remove the `<script src="/assets/widget-patch.js"></script>` line from the HTML file
- **Performance impact**: Minimal - only patches DOM/CSS operations related to animations

## Known Issues
See `KNOWN_ISSUES.md` in the project root for detailed information about the original problems and our solutions.

## Contact
For questions about the bundled widget itself, contact 6K Labs: https://6klabs.com
For questions about the patch, see this project's documentation.


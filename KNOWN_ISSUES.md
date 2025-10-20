# Known Issues

## Invalid Blur Filter Values in 6klabs Widget

### Description
The application console shows multiple errors related to invalid negative blur filter values:
```
Invalid keyframe value for property filter: blur(-0.00135px)
Invalid keyframe value for property filter: blur(-0.00551px)
...
```

### Root Cause
These errors originate from a bundled third-party JavaScript file located at:
`src/main/integrations/plugins/builtin/vinyl-player/6klabs-assets/index-4783303a.js`

This is a pre-compiled widget from 6K Labs (https://6klabs.com) that contains animation code generating negative blur values during keyframe animations. CSS blur filters only accept non-negative values (0px or greater).

### Impact
- **User Experience**: The errors do not break functionality but fill the console with warnings
- **Performance**: May cause minor performance degradation due to failed animation calculations
- **Visual**: Some blur animations may not render as intended

### Additional Console Issues
Related issues from the same bundle:
1. **Repeated "Showing player" messages** - Excessive logging from state changes
2. **"Progress in percent: undefined"** - Progress calculation returning undefined before initialization
3. **Large percentage values** (e.g., "13428.571428571428") - Calculation errors in progress tracking

### Recommendations

#### Option 1: Update the 6klabs Widget (Recommended)
Contact 6K Labs to provide an updated version of their widget bundle that:
- Clamps blur values to be non-negative (Math.max(0, blurValue))
- Reduces console logging verbosity
- Fixes progress percentage calculations

#### Option 2: Create a Runtime Patch
Create a wrapper script that intercepts style applications and fixes negative blur values:

```javascript
// Example patch (to be implemented)
const originalSetAttribute = Element.prototype.setAttribute;
Element.prototype.setAttribute = function(name, value) {
  if (name === 'style' && typeof value === 'string') {
    value = value.replace(/blur\((-[\d.]+)(px|rem|em)\)/g, 'blur(0$2)');
  }
  return originalSetAttribute.call(this, name, value);
};
```

#### Option 3: Suppress Console Warnings
Filter out these specific console warnings (not recommended for production):

```javascript
const originalWarn = console.warn;
console.warn = function(...args) {
  if (args[0]?.includes?.('Invalid keyframe value for property filter')) return;
  originalWarn.apply(console, args);
};
```

### Workaround
For now, these console warnings can be safely ignored as they don't affect core functionality. The animations will fall back to default values when invalid CSS is encountered.

### Status
- **Identified**: ✅ December 2024
- **Fixed**: ❌ Pending vendor update
- **Priority**: Low (cosmetic/console noise only)

### Related Files
- `src/main/integrations/plugins/builtin/vinyl-player/6klabs-assets/index-4783303a.js` (bundled widget)
- `src/main/integrations/plugins/builtin/vinyl-player/6klabs-assets/65a53bd6bf077ffce08522df` (widget HTML)
- `src/main/integrations/plugins/builtin/6klabs-widget/index.ts` (plugin configuration)



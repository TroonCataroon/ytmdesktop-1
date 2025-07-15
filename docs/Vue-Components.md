# Vue Components

The YouTube Music Desktop App uses Vue 3 with the Composition API for its user interface components. This document covers all available components, their APIs, and usage patterns.

## Component Architecture

The application follows Vue 3 best practices with:
- **Composition API**: Modern reactive programming model
- **TypeScript Integration**: Full type safety for props and events
- **Single File Components**: Template, script, and style in one file
- **Scoped Styling**: Component-specific CSS with global theming support

## Available Components

### TitleBar Component

The main title bar component used across different windows.

**Location**: `src/renderer/components/TitleBar.vue`

#### Props

```typescript
interface TitleBarProps {
  title?: string;           // Window title text
  icon?: string;           // Material icon name
  iconFile?: string;       // Path to custom icon file
  hasHomeButton?: boolean; // Show home navigation button
  hasSettingsButton?: boolean; // Show settings button
  hasMinimizeButton?: boolean; // Show minimize button
  hasMaximizeButton?: boolean; // Show maximize/restore button
  centerTitleText?: boolean; // Center the title text
  isMainWindow?: boolean;  // Whether this is the main window
}
```

#### Events

- `@home-clicked`: Emitted when home button is clicked
- `@settings-clicked`: Emitted when settings button is clicked

#### Example Usage

```vue
<template>
  <TitleBar
    title="YouTube Music Desktop App"
    icon="music_note"
    :hasHomeButton="true"
    :hasSettingsButton="true"
    :hasMinimizeButton="true"
    :hasMaximizeButton="true"
    :isMainWindow="true"
    @home-clicked="navigateHome"
    @settings-clicked="openSettings"
  />
</template>

<script setup lang="ts">
import TitleBar from '@/components/TitleBar.vue';

function navigateHome() {
  // Handle home navigation
}

function openSettings() {
  // Handle settings navigation
}
</script>
```

#### Features

- **Window Controls**: Minimize, maximize/restore, close functionality
- **Navigation**: Home and settings buttons with customizable visibility
- **Platform Integration**: Supports Window Controls Overlay on supported platforms
- **Update Notifications**: Shows update available indicator
- **Responsive Design**: Adapts to window state changes

### YTMDSetting Component

A versatile settings component for various input types.

**Location**: `src/renderer/components/YTMDSetting.vue`

#### Props

```typescript
interface YTMDSettingProps {
  type: 'toggle' | 'input' | 'select' | 'button' | 'slider' | 'keybind';
  label: string;
  description?: string;
  modelValue?: any;
  disabled?: boolean;
  options?: Array<{ value: any; label: string }>; // For select type
  min?: number; // For slider type
  max?: number; // For slider type
  step?: number; // For slider type
  placeholder?: string; // For input type
  buttonText?: string; // For button type
}
```

#### Events

- `@update:modelValue`: Emitted when value changes (for reactive inputs)
- `@click`: Emitted when button is clicked (for button type)

#### Example Usage

```vue
<template>
  <!-- Toggle Setting -->
  <YTMDSetting
    type="toggle"
    label="Enable Feature"
    description="Toggle this feature on or off"
    v-model="featureEnabled"
  />

  <!-- Input Setting -->
  <YTMDSetting
    type="input"
    label="API Key"
    description="Enter your API key"
    placeholder="sk-..."
    v-model="apiKey"
  />

  <!-- Select Setting -->
  <YTMDSetting
    type="select"
    label="Theme"
    description="Choose your preferred theme"
    :options="themeOptions"
    v-model="selectedTheme"
  />

  <!-- Slider Setting -->
  <YTMDSetting
    type="slider"
    label="Volume"
    description="Adjust the volume level"
    :min="0"
    :max="100"
    :step="1"
    v-model="volume"
  />

  <!-- Button Setting -->
  <YTMDSetting
    type="button"
    label="Clear Cache"
    description="Remove all cached data"
    buttonText="Clear Now"
    @click="clearCache"
  />

  <!-- Keybind Setting -->
  <YTMDSetting
    type="keybind"
    label="Play/Pause"
    description="Set the play/pause hotkey"
    v-model="playPauseKeybind"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import YTMDSetting from '@/components/YTMDSetting.vue';

const featureEnabled = ref(false);
const apiKey = ref('');
const selectedTheme = ref('dark');
const volume = ref(50);
const playPauseKeybind = ref('Space');

const themeOptions = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'auto', label: 'Auto' }
];

function clearCache() {
  // Handle cache clearing
}
</script>
```

### KeybindInput Component

Specialized input component for capturing keyboard shortcuts.

**Location**: `src/renderer/components/KeybindInput.vue`

#### Props

```typescript
interface KeybindInputProps {
  modelValue: string;    // Current keybind value
  disabled?: boolean;    // Whether input is disabled
  placeholder?: string;  // Placeholder text
}
```

#### Events

- `@update:modelValue`: Emitted when keybind changes

#### Example Usage

```vue
<template>
  <KeybindInput
    v-model="shortcut"
    placeholder="Press keys to set shortcut"
    @update:modelValue="updateShortcut"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import KeybindInput from '@/components/KeybindInput.vue';

const shortcut = ref('CommandOrControl+Shift+P');

function updateShortcut(newValue: string) {
  console.log('New shortcut:', newValue);
}
</script>
```

#### Features

- **Key Capture**: Captures complex key combinations
- **Modifier Support**: Supports Ctrl, Shift, Alt, Meta keys
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Validation**: Prevents invalid key combinations

### YTMViewLoading Component

Loading screen component for the YouTube Music view.

**Location**: `src/renderer/components/YTMViewLoading.vue`

#### Props

```typescript
interface YTMViewLoadingProps {
  status?: string;       // Loading status message
  error?: boolean;       // Whether an error occurred
  timeout?: boolean;     // Whether loading timed out
}
```

#### Example Usage

```vue
<template>
  <YTMViewLoading
    :status="loadingStatus"
    :error="hasError"
    :timeout="hasTimedOut"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import YTMViewLoading from '@/components/YTMViewLoading.vue';

const loadingStatus = ref('Loading YouTube Music...');
const hasError = ref(false);
const hasTimedOut = ref(false);
</script>
```

## Component Composition Patterns

### Using the Store

Components can access the application store through the IPC bridge:

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';

const settings = ref({});

onMounted(async () => {
  // Get settings from main process
  settings.value = await window.ytmd.getStore();
});

function updateSetting(key: string, value: any) {
  window.ytmd.setStore(key, value);
}
</script>
```

### Window Management

Components can interact with window controls:

```vue
<script setup lang="ts">
function minimizeWindow() {
  window.ytmd.minimizeWindow();
}

function maximizeWindow() {
  window.ytmd.maximizeWindow();
}

function closeWindow() {
  window.ytmd.closeWindow();
}

function openSettingsWindow() {
  window.ytmd.openSettingsWindow();
}
</script>
```

### Event Handling

Components can listen to application events:

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const windowState = ref({
  minimized: false,
  maximized: false,
  fullscreen: false
});

let cleanup: (() => void) | null = null;

onMounted(() => {
  cleanup = window.ytmd.handleWindowEvents((event, state) => {
    windowState.value = state;
  });
});

onUnmounted(() => {
  if (cleanup) {
    cleanup();
  }
});
</script>
```

## Styling Guidelines

### CSS Variables

The application uses CSS custom properties for theming:

```css
:root {
  --primary-color: #ff0000;
  --background-color: #181818;
  --text-color: #ffffff;
  --border-color: #333333;
  --hover-color: #333333;
}
```

### Scoped Styles

Use scoped styles for component-specific CSS:

```vue
<style scoped>
.component-container {
  padding: 16px;
  background: var(--background-color);
  color: var(--text-color);
}

.component-title {
  font-size: 1.2em;
  font-weight: 600;
  margin-bottom: 8px;
}
</style>
```

### Global Styles

For global styles that affect multiple components:

```vue
<style>
/* Global styles without scoped */
.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
</style>
```

## Accessibility

### ARIA Labels

Use appropriate ARIA labels for screen readers:

```vue
<template>
  <button
    :aria-label="buttonLabel"
    :aria-pressed="isPressed"
    @click="handleClick"
  >
    <span class="material-symbols-outlined">play_arrow</span>
  </button>
</template>
```

### Keyboard Navigation

Ensure components are keyboard accessible:

```vue
<template>
  <div
    tabindex="0"
    @keydown.enter="handleActivate"
    @keydown.space.prevent="handleActivate"
  >
    Content
  </div>
</template>
```

## Component Testing

### Unit Tests

Test component logic and props:

```typescript
// component.test.ts
import { mount } from '@vue/test-utils';
import YTMDSetting from '@/components/YTMDSetting.vue';

describe('YTMDSetting', () => {
  test('renders toggle correctly', () => {
    const wrapper = mount(YTMDSetting, {
      props: {
        type: 'toggle',
        label: 'Test Setting',
        modelValue: true
      }
    });

    expect(wrapper.find('.setting-label').text()).toBe('Test Setting');
    expect(wrapper.find('input[type="checkbox"]').element.checked).toBe(true);
  });

  test('emits update:modelValue on toggle', async () => {
    const wrapper = mount(YTMDSetting, {
      props: {
        type: 'toggle',
        label: 'Test Setting',
        modelValue: false
      }
    });

    await wrapper.find('input[type="checkbox"]').setValue(true);
    
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')[0]).toEqual([true]);
  });
});
```

### Integration Tests

Test component interactions:

```typescript
// integration.test.ts
import { mount } from '@vue/test-utils';
import TitleBar from '@/components/TitleBar.vue';

describe('TitleBar Integration', () => {
  test('handles window controls', async () => {
    const mockMinimize = jest.fn();
    window.ytmd = { minimizeWindow: mockMinimize };

    const wrapper = mount(TitleBar, {
      props: {
        hasMinimizeButton: true
      }
    });

    await wrapper.find('.minimize-button').trigger('click');
    expect(mockMinimize).toHaveBeenCalled();
  });
});
```

## Performance Optimization

### Lazy Loading

Use dynamic imports for large components:

```vue
<script setup lang="ts">
import { defineAsyncComponent } from 'vue';

const HeavyComponent = defineAsyncComponent(() => 
  import('./HeavyComponent.vue')
);
</script>
```

### Computed Properties

Use computed properties for derived state:

```vue
<script setup lang="ts">
import { computed, ref } from 'vue';

const items = ref([]);
const filter = ref('');

const filteredItems = computed(() => 
  items.value.filter(item => 
    item.name.toLowerCase().includes(filter.value.toLowerCase())
  )
);
</script>
```

### Reactive Optimizations

Use `shallowRef` for large objects that don't need deep reactivity:

```vue
<script setup lang="ts">
import { shallowRef } from 'vue';

const largeDataSet = shallowRef(new Map());
</script>
```

## Best Practices

### Component Design

1. **Single Responsibility**: Each component should have one clear purpose
2. **Prop Validation**: Always define prop types and default values
3. **Event Naming**: Use kebab-case for custom events
4. **Composition**: Prefer composition over inheritance

### Code Organization

1. **Script Setup**: Use `<script setup>` for modern Vue 3 syntax
2. **Type Safety**: Leverage TypeScript for better development experience
3. **Imports**: Group imports logically (Vue, components, utilities)
4. **Comments**: Document complex logic and component APIs

### Performance

1. **V-Model**: Use v-model for two-way data binding
2. **Key Attributes**: Always use keys in v-for loops
3. **Watchers**: Prefer computed properties over watchers when possible
4. **Memory Leaks**: Clean up event listeners in onUnmounted

## Creating New Components

### Component Template

```vue
<template>
  <div class="my-component">
    <h2 v-if="title">{{ title }}</h2>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';

interface Props {
  title?: string;
  variant?: 'primary' | 'secondary';
}

interface Emits {
  (e: 'action', value: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary'
});

const emit = defineEmits<Emits>();

function handleAction() {
  emit('action', 'example-value');
}
</script>

<style scoped>
.my-component {
  padding: var(--spacing-md);
  border-radius: var(--border-radius);
}
</style>
```

### Registration

Add your component to the appropriate window's component registry or import it directly where needed.

## TypeScript Integration

### Props Interface

```typescript
interface ComponentProps {
  // Required props
  id: string;
  title: string;
  
  // Optional props with defaults
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  
  // Complex types
  items?: Array<{
    id: string;
    label: string;
    value: any;
  }>;
}
```

### Event Types

```typescript
interface ComponentEmits {
  (e: 'update:modelValue', value: string): void;
  (e: 'change', item: { id: string; value: any }): void;
  (e: 'error', error: Error): void;
}
```

### Refs and Reactive

```typescript
import { ref, reactive, computed } from 'vue';

// Simple reactive values
const count = ref(0);
const message = ref('');

// Complex reactive objects
const state = reactive({
  loading: false,
  error: null,
  data: []
});

// Computed properties with proper typing
const formattedMessage = computed((): string => {
  return message.value.toUpperCase();
});
```
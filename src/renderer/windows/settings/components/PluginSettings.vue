<template>
  <div class="plugins-tab">
    <div class="plugins-header">
      <h3>Plugins</h3>
      <p class="description">Extend YTMDesktop with additional features and customizations</p>
    </div>

    <div class="plugins-list">
      <div v-for="plugin in plugins" :key="plugin.id" class="plugin-item">
        <div class="plugin-header">
          <div class="plugin-info">
            <h4 class="plugin-name">{{ plugin.name }}</h4>
            <p class="plugin-description">{{ plugin.description }}</p>
            <div class="plugin-meta">
              <span class="plugin-version">v{{ plugin.version }}</span>
              <span class="plugin-author">by {{ plugin.author }}</span>
            </div>
          </div>
          <div class="plugin-controls">
            <button :class="['toggle-button', { enabled: plugin.enabled }]" @click="togglePlugin(plugin.id)">
              <span class="material-symbols-outlined">
                {{ plugin.enabled ? "toggle_on" : "toggle_off" }}
              </span>
              {{ plugin.enabled ? "Enabled" : "Disabled" }}
            </button>
            <button v-if="hasSettings(plugin.id)" class="settings-button" @click="toggleSettings(plugin.id)">
              <span class="material-symbols-outlined">settings</span>
            </button>
          </div>
        </div>

        <!-- Plugin Settings Panel -->
        <div v-if="expandedSettings === plugin.id && hasSettings(plugin.id)" class="plugin-settings">
          <div class="settings-header">
            <h5>Settings</h5>
          </div>
          <div class="settings-content">
            <div v-for="(setting, key) in getPluginSettingsSchema(plugin.id)" :key="key" class="setting-item">
              <label class="setting-label">
                {{ setting.label }}
                <span v-if="setting.description" class="setting-description">{{ setting.description }}</span>
              </label>

              <!-- Boolean Setting -->
              <div v-if="setting.type === 'boolean'" class="setting-control">
                <input
                  class="toggle"
                  type="checkbox"
                  :checked="getPluginSetting(plugin.id, key)"
                  @change="updatePluginSetting(plugin.id, key, $event.target.checked)"
                />
              </div>

              <!-- String Setting -->
              <div v-else-if="setting.type === 'string'" class="setting-control">
                <input
                  class="text-input"
                  type="text"
                  :value="getPluginSetting(plugin.id, key)"
                  @input="updatePluginSetting(plugin.id, key, $event.target.value)"
                />
              </div>

              <!-- Number Setting -->
              <div v-else-if="setting.type === 'number'" class="setting-control">
                <input
                  class="number-input"
                  type="number"
                  :value="getPluginSetting(plugin.id, key)"
                  @input="updatePluginSetting(plugin.id, key, Number($event.target.value))"
                />
              </div>

              <!-- Select Setting -->
              <div v-else-if="setting.type === 'select'" class="setting-control">
                <select class="select-input" :value="getPluginSetting(plugin.id, key)" @change="updatePluginSetting(plugin.id, key, $event.target.value)">
                  <option v-for="option in setting.options" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- No Plugins Message -->
    <div v-if="plugins.length === 0" class="no-plugins">
      <span class="material-symbols-outlined">extension</span>
      <p>No plugins available</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";

interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  enabled: boolean;
}

interface PluginSetting {
  type: "boolean" | "string" | "number" | "select";
  label: string;
  description?: string;
  default: unknown;
  options?: { value: unknown; label: string }[];
}

const plugins = ref<Plugin[]>([]);
const expandedSettings = ref<string | null>(null);
const pluginSettingsSchemas = ref<Record<string, Record<string, PluginSetting>>>({});

onMounted(async () => {
  await loadPlugins();
});

async function loadPlugins(): Promise<void> {
  try {
    // This would call the main process to get plugins
    // For now, we'll use mock data
    plugins.value = [
      {
        id: "notification-enhancer",
        name: "Notification Enhancer",
        description: "Enhances notifications with additional information and styling",
        version: "1.0.0",
        author: "YTMDesktop Team",
        enabled: false
      },
      {
        id: "custom-themes",
        name: "Custom Themes",
        description: "Apply custom visual themes to the application",
        version: "1.0.0",
        author: "YTMDesktop Team",
        enabled: false
      },
      {
        id: "keyboard-shortcuts",
        name: "Custom Keyboard Shortcuts",
        description: "Add custom keyboard shortcuts for various actions",
        version: "1.0.0",
        author: "YTMDesktop Team",
        enabled: false
      },
      {
        id: "vinyl-player",
        name: "Vinyl Player",
        description: "Mini pop-out player with spinning vinyl record",
        version: "1.0.0",
        author: "YTMDesktop Team",
        enabled: false
      }
    ];

    // Load settings schemas
    await loadPluginSettingsSchemas();
  } catch (error) {
    console.error("Failed to load plugins:", error);
  }
}

async function loadPluginSettingsSchemas(): Promise<void> {
  // This would call the main process to get settings schemas
  // For now, we'll use mock data
  pluginSettingsSchemas.value = {
    "notification-enhancer": {
      showAlbumArt: {
        type: "boolean",
        label: "Show Album Art",
        description: "Include album artwork in notifications",
        default: true
      },
      showProgress: {
        type: "boolean",
        label: "Show Progress Bar",
        description: "Display song progress in notifications",
        default: false
      },
      customDuration: {
        type: "number",
        label: "Notification Duration (ms)",
        description: "How long to show notifications",
        default: 5000
      },
      notificationStyle: {
        type: "select",
        label: "Notification Style",
        description: "Choose the visual style for notifications",
        default: "default",
        options: [
          { value: "default", label: "Default" },
          { value: "minimal", label: "Minimal" },
          { value: "detailed", label: "Detailed" }
        ]
      }
    },
    "custom-themes": {
      selectedTheme: {
        type: "select",
        label: "Selected Theme",
        description: "Choose a theme to apply",
        default: "default",
        options: [
          { value: "default", label: "Default" },
          { value: "dark-blue", label: "Dark Blue" },
          { value: "green-nature", label: "Green Nature" },
          { value: "purple-dream", label: "Purple Dream" }
        ]
      },
      autoSwitch: {
        type: "boolean",
        label: "Auto Switch Themes",
        description: "Automatically switch themes based on time of day",
        default: false
      },
      darkModeOnly: {
        type: "boolean",
        label: "Dark Mode Only",
        description: "Only apply themes in dark mode",
        default: true
      },
      customCSS: {
        type: "string",
        label: "Custom CSS",
        description: "Add your own custom CSS rules",
        default: ""
      }
    },
    "keyboard-shortcuts": {
      enableGlobalShortcuts: {
        type: "boolean",
        label: "Enable Global Shortcuts",
        description: "Allow shortcuts to work even when app is not focused",
        default: true
      }
    },
    "vinyl-player": {
      windowSize: {
        type: "number",
        label: "Window Size",
        description: "Size of the vinyl player window in pixels",
        default: 200
      },
      alwaysOnTop: {
        type: "boolean",
        label: "Always On Top",
        description: "Keep the vinyl player window above other windows",
        default: true
      },
      autoShow: {
        type: "boolean",
        label: "Auto Show",
        description: "Automatically show the vinyl player when a song starts",
        default: false
      },
      spinSpeed: {
        type: "number",
        label: "Spin Speed",
        description: "Speed of the vinyl record rotation (1-5)",
        default: 2
      },
      showControls: {
        type: "boolean",
        label: "Show Controls",
        description: "Show play/pause controls on the vinyl player",
        default: true
      },
      opacity: {
        type: "number",
        label: "Opacity",
        description: "Transparency of the vinyl player window (0.1-1.0)",
        default: 0.9
      }
    }
  };
}

async function togglePlugin(pluginId: string): Promise<void> {
  try {
    const plugin = plugins.value.find(p => p.id === pluginId);
    if (plugin) {
      // This would call the main process to toggle the plugin
      plugin.enabled = !plugin.enabled;
      console.log(`${plugin.enabled ? "Enabled" : "Disabled"} plugin: ${pluginId}`);
    }
  } catch (error) {
    console.error("Failed to toggle plugin:", error);
  }
}

function hasSettings(pluginId: string): boolean {
  return pluginId in pluginSettingsSchemas.value;
}

function getPluginSettingsSchema(pluginId: string): Record<string, PluginSetting> {
  return pluginSettingsSchemas.value[pluginId] || {};
}

function getPluginSetting(pluginId: string, key: string): unknown {
  // This would get the actual setting value from the main process
  // For now, return the default value
  const schema = getPluginSettingsSchema(pluginId);
  return schema[key]?.default;
}

async function updatePluginSetting(pluginId: string, key: string, value: unknown): Promise<void> {
  try {
    // This would call the main process to update the setting
    console.log(`Updated plugin setting: ${pluginId}.${key} = ${value}`);
  } catch (error) {
    console.error("Failed to update plugin setting:", error);
  }
}

function toggleSettings(pluginId: string): void {
  if (expandedSettings.value === pluginId) {
    expandedSettings.value = null;
  } else {
    expandedSettings.value = pluginId;
  }
}
</script>

<style scoped>
.plugins-tab {
  padding: 16px;
}

.plugins-header {
  margin-bottom: 24px;
}

.plugins-header h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
}

.description {
  margin: 0;
  color: #888;
  font-size: 14px;
}

.plugins-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.plugin-item {
  border: 1px solid #333;
  border-radius: 8px;
  overflow: hidden;
}

.plugin-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px;
  background: #2a2a2a;
}

.plugin-info {
  flex: 1;
}

.plugin-name {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
}

.plugin-description {
  margin: 0 0 8px 0;
  color: #ccc;
  font-size: 14px;
}

.plugin-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #888;
}

.plugin-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.toggle-button {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border: 1px solid #555;
  border-radius: 4px;
  background: #333;
  color: #ccc;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.toggle-button:hover {
  background: #444;
}

.toggle-button.enabled {
  background: #4caf50;
  border-color: #4caf50;
  color: white;
}

.settings-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid #555;
  border-radius: 4px;
  background: #333;
  color: #ccc;
  cursor: pointer;
  transition: all 0.2s;
}

.settings-button:hover {
  background: #444;
}

.plugin-settings {
  border-top: 1px solid #333;
  background: #1a1a1a;
}

.settings-header {
  padding: 12px 16px;
  border-bottom: 1px solid #333;
}

.settings-header h5 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.settings-content {
  padding: 16px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.setting-item:last-child {
  margin-bottom: 0;
}

.setting-label {
  flex: 1;
  font-size: 14px;
}

.setting-description {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #888;
}

.setting-control {
  min-width: 120px;
}

.toggle {
  width: 40px;
  height: 20px;
  appearance: none;
  background: #555;
  border-radius: 10px;
  position: relative;
  cursor: pointer;
  transition: background 0.2s;
}

.toggle:checked {
  background: #4caf50;
}

.toggle::before {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background: white;
  border-radius: 50%;
  transition: transform 0.2s;
}

.toggle:checked::before {
  transform: translateX(20px);
}

.text-input,
.number-input,
.select-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #555;
  border-radius: 4px;
  background: #333;
  color: #ccc;
  font-size: 14px;
}

.text-input:focus,
.number-input:focus,
.select-input:focus {
  outline: none;
  border-color: #4caf50;
}

.no-plugins {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  color: #888;
  text-align: center;
}

.no-plugins .material-symbols-outlined {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.no-plugins p {
  margin: 0;
  font-size: 16px;
}
</style>

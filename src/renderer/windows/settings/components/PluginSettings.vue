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
            <!-- Custom 6klabs-inspired layout for Vinyl Player -->
            <template v-if="plugin.id === 'vinyl-player'">
              <div class="vinyl-settings-card">
                <div class="vinyl-grid">
                  <div class="vinyl-control">
                    <div class="vc-label">
                      <span class="material-symbols-outlined">open_in_full</span>
                      Window Size
                    </div>
                    <div class="vc-input">
                      <input
                        class="vinyl-slider"
                        type="range"
                        min="160"
                        max="400"
                        step="10"
                        :value="toNumber(getPluginSetting(plugin.id, 'windowSize'), 200)"
                        @input="onRangeInput(plugin.id, 'windowSize', $event)"
                      />
                      <span class="vinyl-value">{{ getPluginSetting(plugin.id, "windowSize") }}</span>
                    </div>
                  </div>

                  <div class="vinyl-control">
                    <div class="vc-label">
                      <span class="material-symbols-outlined">rotate_right</span>
                      Spin Speed
                    </div>
                    <div class="vc-input">
                      <input
                        class="vinyl-slider"
                        type="range"
                        min="1"
                        max="5"
                        step="1"
                        :value="toNumber(getPluginSetting(plugin.id, 'spinSpeed'), 2)"
                        @input="onRangeInput(plugin.id, 'spinSpeed', $event)"
                      />
                      <span class="vinyl-value">{{ getPluginSetting(plugin.id, "spinSpeed") }}</span>
                    </div>
                  </div>

                  <div class="vinyl-control">
                    <div class="vc-label">
                      <span class="material-symbols-outlined">opacity</span>
                      Opacity
                    </div>
                    <div class="vc-input">
                      <input
                        class="vinyl-slider"
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.05"
                        :value="toNumber(getPluginSetting(plugin.id, 'opacity'), 0.9)"
                        @input="onRangeInput(plugin.id, 'opacity', $event)"
                      />
                      <span class="vinyl-value">{{ Number(getPluginSetting(plugin.id, "opacity")).toFixed(2) }}</span>
                    </div>
                  </div>

                  <div class="vinyl-control switches">
                    <label class="switch">
                      <input
                        type="checkbox"
                        :checked="Boolean(getPluginSetting(plugin.id, 'alwaysOnTop'))"
                        @change="onCheckboxChange(plugin.id, 'alwaysOnTop', $event)"
                      />
                      <span class="slider"></span>
                      <span class="switch-label">Always On Top</span>
                    </label>

                    <label class="switch">
                      <input
                        type="checkbox"
                        :checked="Boolean(getPluginSetting(plugin.id, 'showControls'))"
                        @change="onCheckboxChange(plugin.id, 'showControls', $event)"
                      />
                      <span class="slider"></span>
                      <span class="switch-label">Show Controls</span>
                    </label>

                    <label class="switch">
                      <input
                        type="checkbox"
                        :checked="Boolean(getPluginSetting(plugin.id, 'autoShow'))"
                        @change="onCheckboxChange(plugin.id, 'autoShow', $event)"
                      />
                      <span class="slider"></span>
                      <span class="switch-label">Auto Show on Play</span>
                    </label>

                    <label class="switch">
                      <input
                        type="checkbox"
                        :checked="Boolean(getPluginSetting(plugin.id, 'enableKeyboardShortcuts'))"
                        @change="onCheckboxChange(plugin.id, 'enableKeyboardShortcuts', $event)"
                      />
                      <span class="slider"></span>
                      <span class="switch-label">Enable Shortcuts</span>
                    </label>
                  </div>
                </div>

                <div class="vinyl-actions">
                  <button class="action-btn primary" @click="showVinylPlayer">
                    <span class="material-symbols-outlined">play_circle</span>
                    Show Player
                  </button>
                  <button class="action-btn secondary" @click="hideVinylPlayer">
                    <span class="material-symbols-outlined">close</span>
                    Hide Player
                  </button>
                </div>
              </div>
            </template>

            <!-- Custom layout for 6K Labs Widget -->
            <template v-else-if="plugin.id === '6klabs-widget'">
              <div class="vinyl-settings-card">
                <!-- Widget Token Input -->
                <div class="widget-token-section">
                  <div class="vinyl-control">
                    <div class="vc-label">
                      <span class="material-symbols-outlined">key</span>
                      Widget Token
                    </div>
                    <input
                      class="text-input"
                      type="text"
                      placeholder="Enter your 6K Labs widget token"
                      :value="String(getPluginSetting(plugin.id, 'widgetToken') ?? '')"
                      @input="onTextInput(plugin.id, 'widgetToken', $event)"
                    />
                    <p class="widget-help-text">Get your token from <a href="https://6klabs.com/dashboard" target="_blank">6klabs.com/dashboard</a></p>
                  </div>

                  <!-- Widget URL Display -->
                  <div class="vinyl-control">
                    <div class="vc-label">
                      <span class="material-symbols-outlined">link</span>
                      Widget URL (for OBS Browser Source)
                    </div>
                    <div class="widget-url-display">
                      <input class="text-input widget-url-input" type="text" readonly :value="widgetUrl" />
                      <button class="copy-button" title="Copy to clipboard" @click="copyWidgetUrl">
                        <span class="material-symbols-outlined">content_copy</span>
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Cover Settings -->
                <div class="settings-group">
                  <h6 class="group-title">Cover Settings</h6>
                  <div class="vinyl-grid">
                    <div class="vinyl-control">
                      <div class="vc-label">
                        <span class="material-symbols-outlined">album</span>
                        Cover Style
                      </div>
                      <select
                        class="select-input"
                        :value="toNumber(getPluginSetting(plugin.id, 'coverStyle'), 1)"
                        @change="onSelectChange(plugin.id, 'coverStyle', $event)"
                      >
                        <option :value="0">Square</option>
                        <option :value="1">Circle</option>
                        <option :value="2">Vinyl</option>
                        <option :value="3">CD</option>
                      </select>
                    </div>

                    <div class="vinyl-control switches">
                      <label class="switch">
                        <input
                          type="checkbox"
                          :checked="Boolean(getPluginSetting(plugin.id, 'coverBlur'))"
                          @change="onCheckboxChange(plugin.id, 'coverBlur', $event)"
                        />
                        <span class="slider"></span>
                        <span class="switch-label">Cover Blur</span>
                      </label>

                      <label class="switch">
                        <input
                          type="checkbox"
                          :checked="Boolean(getPluginSetting(plugin.id, 'coverGlow'))"
                          @change="onCheckboxChange(plugin.id, 'coverGlow', $event)"
                        />
                        <span class="slider"></span>
                        <span class="switch-label">Cover Glow</span>
                      </label>
                    </div>
                  </div>
                </div>

                <!-- Visibility Settings -->
                <div class="settings-group">
                  <h6 class="group-title">Visibility Settings</h6>
                  <div class="vinyl-grid">
                    <div class="vinyl-control">
                      <div class="vc-label">
                        <span class="material-symbols-outlined">timer</span>
                        Hide Delay (seconds)
                      </div>
                      <div class="vc-input">
                        <input
                          class="vinyl-slider"
                          type="range"
                          min="0"
                          max="60"
                          step="1"
                          :value="toNumber(getPluginSetting(plugin.id, 'hideDelay'), 10)"
                          @input="onRangeInput(plugin.id, 'hideDelay', $event)"
                        />
                        <span class="vinyl-value">{{ getPluginSetting(plugin.id, "hideDelay") }}s</span>
                      </div>
                    </div>

                    <div class="vinyl-control">
                      <div class="vc-label">
                        <span class="material-symbols-outlined">visibility</span>
                        Visible Duration (seconds)
                      </div>
                      <div class="vc-input">
                        <input
                          class="vinyl-slider"
                          type="range"
                          min="1"
                          max="60"
                          step="1"
                          :value="toNumber(getPluginSetting(plugin.id, 'visibleDuration'), 5)"
                          @input="onRangeInput(plugin.id, 'visibleDuration', $event)"
                        />
                        <span class="vinyl-value">{{ getPluginSetting(plugin.id, "visibleDuration") }}s</span>
                      </div>
                    </div>

                    <div class="vinyl-control switches">
                      <label class="switch">
                        <input
                          type="checkbox"
                          :checked="Boolean(getPluginSetting(plugin.id, 'hideOnPause'))"
                          @change="onCheckboxChange(plugin.id, 'hideOnPause', $event)"
                        />
                        <span class="slider"></span>
                        <span class="switch-label">Hide on Pause</span>
                      </label>

                      <label class="switch">
                        <input
                          type="checkbox"
                          :checked="Boolean(getPluginSetting(plugin.id, 'songChangeOnly'))"
                          @change="onCheckboxChange(plugin.id, 'songChangeOnly', $event)"
                        />
                        <span class="slider"></span>
                        <span class="switch-label">Song Change Only</span>
                      </label>
                    </div>
                  </div>
                </div>

                <!-- Player Settings -->
                <div class="settings-group">
                  <h6 class="group-title">Player Settings</h6>
                  <div class="vinyl-grid">
                    <div class="vinyl-control">
                      <div class="vc-label">
                        <span class="material-symbols-outlined">style</span>
                        Player Style
                      </div>
                      <select
                        class="select-input"
                        :value="toNumber(getPluginSetting(plugin.id, 'playerStyle'), 0)"
                        @change="onSelectChange(plugin.id, 'playerStyle', $event)"
                      >
                        <option :value="0">Minimal</option>
                        <option :value="1">Modern</option>
                        <option :value="2">Classic</option>
                      </select>
                    </div>

                    <div class="vinyl-control">
                      <div class="vc-label">
                        <span class="material-symbols-outlined">palette</span>
                        Theme
                      </div>
                      <select
                        class="select-input"
                        :value="toNumber(getPluginSetting(plugin.id, 'theme'), 0)"
                        @change="onSelectChange(plugin.id, 'theme', $event)"
                      >
                        <option :value="0">Dark</option>
                        <option :value="1">Light</option>
                        <option :value="2">Auto</option>
                        <option :value="3">Gradient</option>
                        <option :value="4">Glass</option>
                      </select>
                    </div>

                    <div class="vinyl-control">
                      <div class="vc-label">
                        <span class="material-symbols-outlined">colorize</span>
                        Tint Color
                      </div>
                      <input
                        class="color-input"
                        type="color"
                        :value="String(getPluginSetting(plugin.id, 'tintColor') ?? '#1DB954')"
                        @input="onTextInput(plugin.id, 'tintColor', $event)"
                      />
                    </div>

                    <div class="vinyl-control switches">
                      <label class="switch">
                        <input
                          type="checkbox"
                          :checked="Boolean(getPluginSetting(plugin.id, 'playerColors'))"
                          @change="onCheckboxChange(plugin.id, 'playerColors', $event)"
                        />
                        <span class="slider"></span>
                        <span class="switch-label">Dynamic Colors</span>
                      </label>

                      <label class="switch">
                        <input
                          type="checkbox"
                          :checked="Boolean(getPluginSetting(plugin.id, 'hideEqualizer'))"
                          @change="onCheckboxChange(plugin.id, 'hideEqualizer', $event)"
                        />
                        <span class="slider"></span>
                        <span class="switch-label">Hide Equalizer</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <!-- Generic layout for other plugins -->
            <template v-else>
              <div v-for="(setting, key) in getPluginSettingsSchema(plugin.id)" :key="key" class="setting-item">
                <label class="setting-label">
                  {{ setting.label }}
                  <span v-if="setting.description" class="setting-description">{{ setting.description }}</span>
                </label>
                <div v-if="setting.type === 'boolean'" class="setting-control">
                  <input
                    class="toggle"
                    type="checkbox"
                    :checked="Boolean(getPluginSetting(plugin.id, key))"
                    @change="onCheckboxChange(plugin.id, key, $event)"
                  />
                </div>
                <div v-else-if="setting.type === 'string'" class="setting-control">
                  <input class="text-input" type="text" :value="String(getPluginSetting(plugin.id, key) ?? '')" @input="onTextInput(plugin.id, key, $event)" />
                </div>
                <div v-else-if="setting.type === 'number'" class="setting-control">
                  <input class="number-input" type="number" :value="toNumber(getPluginSetting(plugin.id, key))" @input="onRangeInput(plugin.id, key, $event)" />
                </div>
                <div v-else-if="setting.type === 'select'" class="setting-control">
                  <select class="select-input" :value="String(getPluginSetting(plugin.id, key) ?? '')" @change="onSelectChange(plugin.id, key, $event)">
                    <option v-for="option in setting.options" :key="String(option.value)" :value="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                </div>
              </div>
            </template>
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
const widgetUrl = ref<string>("⚠️ Enter your widget token above to get the URL");

// Typed bridge to preload API
interface YTMDStoreBridge {
  set: (key: string, value: unknown) => void;
}

interface YTMDBridge {
  getPlugins: () => Promise<Plugin[]>;
  getPluginSettingsSchemas: () => Promise<Record<string, Record<string, PluginSetting>>>;
  togglePlugin: (pluginId: string, enabled: boolean) => Promise<void>;
  getPluginSetting: (pluginId: string, key: string) => unknown;
  updatePluginSetting: (pluginId: string, key: string, value: unknown) => Promise<void>;
  showVinylPlayer: () => Promise<void>;
  hideVinylPlayer: () => Promise<void>;
  get6KLabsWidgetUrl: () => Promise<string>;
  store: YTMDStoreBridge;
}

const ytmd = (window as unknown as { ytmd: YTMDBridge }).ytmd;

onMounted(async () => {
  await loadPlugins();
  await updateWidgetUrl();
});

async function loadPlugins(): Promise<void> {
  try {
    // Get real plugins from main process
    const pluginList = await ytmd.getPlugins();
    plugins.value = pluginList;

    // Load settings schemas
    await loadPluginSettingsSchemas();
  } catch (error) {
    console.error("Failed to load plugins:", error);
    // Fallback to showing at least the vinyl player
    plugins.value = [
      {
        id: "vinyl-player",
        name: "Vinyl Player",
        description: "Mini pop-out player with spinning vinyl record",
        version: "1.0.0",
        author: "YTMDesktop Team",
        enabled: false
      }
    ];
    await loadPluginSettingsSchemas();
  }
}

async function loadPluginSettingsSchemas(): Promise<void> {
  try {
    // Get real plugin settings schemas from main process
    const schemas = await ytmd.getPluginSettingsSchemas();
    pluginSettingsSchemas.value = schemas;
  } catch (error) {
    console.error("Failed to load plugin settings schemas:", error);
    // Fallback with vinyl player schema
    pluginSettingsSchemas.value = {
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
        },
        enableKeyboardShortcuts: {
          type: "boolean",
          label: "Enable Keyboard Shortcuts",
          description: "Use Alt+V to toggle, Alt+Shift+V to show vinyl player",
          default: true
        }
      }
    };
  }
}

async function togglePlugin(pluginId: string): Promise<void> {
  try {
    const plugin = plugins.value.find(p => p.id === pluginId);
    if (plugin) {
      if (pluginId === "vinyl-player") {
        // For vinyl player, use the existing integration setting
        const newState = !plugin.enabled;
        ytmd.store.set("integrations.vinylPlayerEnabled", newState);
        plugin.enabled = newState;
        await ytmd.togglePlugin(pluginId, newState);
        console.log(`${newState ? "Enabled" : "Disabled"} plugin: ${pluginId}`);
      } else {
        // For other plugins, use the plugin manager
        await ytmd.togglePlugin(pluginId, !plugin.enabled);
        plugin.enabled = !plugin.enabled;
        console.log(`${plugin.enabled ? "Enabled" : "Disabled"} plugin: ${pluginId}`);
      }
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
  try {
    // Get the actual setting value from the store
    return ytmd.getPluginSetting(pluginId, key);
  } catch (error) {
    console.error("Failed to get plugin setting:", error);
    // Fallback to default value
    const schema = getPluginSettingsSchema(pluginId);
    return schema[key]?.default;
  }
}

async function updatePluginSetting(pluginId: string, key: string, value: unknown): Promise<void> {
  try {
    // Update the setting in the store and notify the plugin
    await ytmd.updatePluginSetting(pluginId, key, value);
    console.log(`Updated plugin setting: ${pluginId}.${key} = ${value}`);

    // If the 6K Labs widget token was updated, refresh the widget URL
    if (pluginId === "6klabs-widget" && key === "widgetToken") {
      await updateWidgetUrl();
    }
  } catch (error) {
    console.error("Failed to update plugin setting:", error);
  }
}

// Helpers for template bindings (avoid TS casts in template)
function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isNaN(n) ? fallback : n;
}

function onRangeInput(pluginId: string, key: string, event: Event): void {
  const target = event.target as HTMLInputElement;
  const value = Number(target.value);
  updatePluginSetting(pluginId, key, value);
}

function onCheckboxChange(pluginId: string, key: string, event: Event): void {
  const target = event.target as HTMLInputElement;
  updatePluginSetting(pluginId, key, target.checked);
}

function onTextInput(pluginId: string, key: string, event: Event): void {
  const el = event.target as HTMLInputElement;
  updatePluginSetting(pluginId, key, el.value);
}

function onSelectChange(pluginId: string, key: string, event: Event): void {
  const el = event.target as HTMLSelectElement;
  // Convert to number if the value is numeric
  const value = /^\d+$/.test(el.value) ? Number(el.value) : el.value;
  updatePluginSetting(pluginId, key, value);
}

function toggleSettings(pluginId: string): void {
  if (expandedSettings.value === pluginId) {
    expandedSettings.value = null;
  } else {
    expandedSettings.value = pluginId;
  }
}

async function showVinylPlayer(): Promise<void> {
  try {
    await ytmd.showVinylPlayer();
    console.log("Vinyl player window shown");
  } catch (error) {
    console.error("Failed to show vinyl player:", error);
  }
}

async function hideVinylPlayer(): Promise<void> {
  try {
    await ytmd.hideVinylPlayer();
    console.log("Vinyl player window hidden");
  } catch (error) {
    console.error("Failed to hide vinyl player:", error);
  }
}

async function updateWidgetUrl(): Promise<void> {
  try {
    const url = await ytmd.get6KLabsWidgetUrl();
    widgetUrl.value = url;
  } catch (error) {
    console.error("Failed to get widget URL:", error);
    widgetUrl.value = "⚠️ Error getting widget URL";
  }
}

async function copyWidgetUrl(): Promise<void> {
  try {
    await navigator.clipboard.writeText(widgetUrl.value);
    console.log("Widget URL copied to clipboard");
    // You could add a toast notification here
  } catch (error) {
    console.error("Failed to copy widget URL:", error);
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

.vinyl-player-actions {
  margin-top: 24px;
  padding: 16px;
  background: #2a2a2a;
  border-radius: 8px;
  border: 1px solid #4caf50;
}

.vinyl-player-actions h6 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: #4caf50;
}

.action-description {
  margin: 0 0 16px 0;
  font-size: 12px;
  color: #888;
  line-height: 1.4;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
}

.action-btn.primary {
  background: #4caf50;
  color: white;
}

.action-btn.primary:hover {
  background: #45a049;
}

.action-btn.secondary {
  background: #555;
  color: #ccc;
}

.action-btn.secondary:hover {
  background: #666;
}

.action-btn .material-symbols-outlined {
  font-size: 16px;
}

/* 6klabs-inspired vinyl settings */
.vinyl-settings-card {
  border: 1px solid #333;
  background: #1d1f22;
  border-radius: 12px;
  padding: 16px;
}

.vinyl-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.vinyl-control {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: #232529;
  border: 1px solid #2f3237;
  border-radius: 10px;
}

.vc-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #cfd3da;
}

.vc-input {
  display: flex;
  align-items: center;
  gap: 8px;
}

.vinyl-slider {
  width: 100%;
  accent-color: #4caf50;
}

.vinyl-value {
  min-width: 44px;
  text-align: right;
  color: #9aa3ad;
  font-variant-numeric: tabular-nums;
}

.vinyl-control.switches {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.switch input {
  appearance: none;
  width: 44px;
  height: 24px;
  background: #3a3f45;
  border-radius: 999px;
  position: relative;
  outline: none;
  transition: background 0.2s ease;
}

.switch input:checked {
  background: #4caf50;
}

.switch .slider {
  position: absolute;
  left: 2px;
  width: 20px;
  height: 20px;
  background: #ffffff;
  border-radius: 50%;
  transform: translateX(0);
  transition: transform 0.2s ease;
}

.switch input:checked + .slider {
  transform: translateX(20px);
}

.switch-label {
  color: #cfd3da;
  font-size: 13px;
}

.vinyl-actions {
  margin-top: 16px;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

/* 6K Labs Widget specific styles */
.widget-token-section {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid #2f3237;
}

.widget-help-text {
  margin: 8px 0 0 0;
  font-size: 12px;
  color: #888;
}

.widget-help-text a {
  color: #4caf50;
  text-decoration: none;
}

.widget-help-text a:hover {
  text-decoration: underline;
}

.widget-url-display {
  display: flex;
  gap: 8px;
  align-items: center;
}

.widget-url-input {
  flex: 1;
  font-family: monospace;
  font-size: 12px;
}

.copy-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border: 1px solid #555;
  border-radius: 4px;
  background: #333;
  color: #ccc;
  cursor: pointer;
  transition: all 0.2s;
}

.copy-button:hover {
  background: #444;
  color: #4caf50;
}

.copy-button .material-symbols-outlined {
  font-size: 18px;
}

.settings-group {
  margin-top: 20px;
}

.settings-group:first-child {
  margin-top: 0;
}

.group-title {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #4caf50;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.color-input {
  width: 100%;
  height: 40px;
  border: 1px solid #555;
  border-radius: 4px;
  background: #333;
  cursor: pointer;
}

.color-input::-webkit-color-swatch-wrapper {
  padding: 4px;
}

.color-input::-webkit-color-swatch {
  border: none;
  border-radius: 2px;
}
</style>

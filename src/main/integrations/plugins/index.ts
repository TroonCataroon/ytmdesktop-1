import { BasePlugin, PluginSettings } from "./base-plugin";
import { NotificationEnhancerPlugin } from "./builtin/notification-enhancer";
import { CustomThemesPlugin } from "./builtin/custom-themes";
import { KeyboardShortcutsPlugin } from "./builtin/keyboard-shortcuts";
import { VinylPlayerPlugin } from "./builtin/vinyl-player";

export class PluginManager {
  private plugins: Map<string, BasePlugin> = new Map();
  private enabledPlugins: Set<string> = new Set();

  constructor() {
    this.registerBuiltinPlugins();
  }

  private registerBuiltinPlugins(): void {
    // Register built-in plugins
    this.registerPlugin(new NotificationEnhancerPlugin());
    this.registerPlugin(new CustomThemesPlugin());
    this.registerPlugin(new KeyboardShortcutsPlugin());
    this.registerPlugin(new VinylPlayerPlugin());
  }

  registerPlugin(plugin: BasePlugin): void {
    this.plugins.set(plugin.id, plugin);

    // Auto-enable if it was previously enabled
    if (plugin.enabled) {
      this.enablePlugin(plugin.id);
    }
  }

  unregisterPlugin(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      this.disablePlugin(pluginId);
      this.plugins.delete(pluginId);
    }
  }

  enablePlugin(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      console.warn(`Plugin ${pluginId} not found`);
      return false;
    }

    if (this.enabledPlugins.has(pluginId)) {
      console.warn(`Plugin ${pluginId} is already enabled`);
      return false;
    }

    try {
      plugin.onEnable();
      this.enabledPlugins.add(pluginId);
      console.log(`Plugin ${pluginId} enabled successfully`);
      return true;
    } catch (error) {
      console.error(`Failed to enable plugin ${pluginId}:`, error);
      return false;
    }
  }

  disablePlugin(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      console.warn(`Plugin ${pluginId} not found`);
      return false;
    }

    if (!this.enabledPlugins.has(pluginId)) {
      console.warn(`Plugin ${pluginId} is not enabled`);
      return false;
    }

    try {
      plugin.onDisable();
      this.enabledPlugins.delete(pluginId);
      console.log(`Plugin ${pluginId} disabled successfully`);
      return true;
    } catch (error) {
      console.error(`Failed to disable plugin ${pluginId}:`, error);
      return false;
    }
  }

  getPlugin(pluginId: string): BasePlugin | undefined {
    return this.plugins.get(pluginId);
  }

  getEnabledPlugins(): BasePlugin[] {
    return Array.from(this.enabledPlugins).map(id => this.plugins.get(id)!);
  }

  isPluginEnabled(pluginId: string): boolean {
    return this.enabledPlugins.has(pluginId);
  }

  updatePluginSettings(pluginId: string, settings: Record<string, unknown>): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      console.warn(`Plugin ${pluginId} not found`);
      return false;
    }

    plugin.updateSettings(settings);
    return true;
  }

  getPluginSettingsSchema(pluginId: string): PluginSettings | null {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return null;
    }

    return (plugin.constructor as typeof BasePlugin).getSettingsSchema?.() || null;
  }

  getAllPlugins(): Array<{id: string, name: string, description: string, version: string, author: string, enabled: boolean}> {
    const plugins: Array<{id: string, name: string, description: string, version: string, author: string, enabled: boolean}> = [];
    
    this.plugins.forEach((plugin) => {
      plugins.push({
        id: plugin.id,
        name: plugin.name,
        description: plugin.description,
        version: plugin.version,
        author: plugin.author,
        enabled: plugin.enabled
      });
    });
    
    return plugins;
  }

  getAllPluginSettingsSchemas(): Record<string, PluginSettings> {
    const schemas: Record<string, PluginSettings> = {};
    
    this.plugins.forEach((plugin) => {
      const schema = (plugin.constructor as typeof BasePlugin).getSettingsSchema?.();
      if (schema) {
        schemas[plugin.id] = schema;
      }
    });
    
    return schemas;
  }

  getPluginSetting(pluginId: string, key: string): unknown {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    return plugin.currentSettings[key];
  }

  updatePluginSetting(pluginId: string, key: string, value: unknown): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      console.warn(`Plugin ${pluginId} not found`);
      return false;
    }

    const newSettings = { ...plugin.currentSettings };
    newSettings[key] = value;
    plugin.updateSettings(newSettings);
    return true;
  }

  // Lifecycle methods
  async onAppReady(): Promise<void> {
    for (const plugin of this.getEnabledPlugins()) {
      try {
        await plugin.onAppReady?.();
      } catch (error) {
        console.error(`Error in plugin ${plugin.id} onAppReady:`, error);
      }
    }
  }

  async onAppClose(): Promise<void> {
    for (const plugin of this.getEnabledPlugins()) {
      try {
        await plugin.onAppClose?.();
      } catch (error) {
        console.error(`Error in plugin ${plugin.id} onAppClose:`, error);
      }
    }
  }
}

// Export singleton instance
export const pluginManager = new PluginManager();

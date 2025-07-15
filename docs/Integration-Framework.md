# Integration Framework

The YouTube Music Desktop App features a robust integration framework that allows third-party services to interact with the application's player state and functionality.

## Architecture Overview

The integration system is built around a base class pattern that provides:
- **Event Management**: Safe event listener registration and cleanup
- **Player State Access**: Real-time access to music player state
- **Error Handling**: Automatic error catching and logging
- **Lifecycle Management**: Consistent enable/disable patterns

## Base Integration Class

All integrations extend the `BaseIntegration` abstract class located in `src/main/integrations/base-integration.ts`.

### Class Definition

```typescript
export default abstract class BaseIntegration implements IIntegration {
  protected eventListeners: Map<string, Set<(...args: any[]) => void>> = new Map();
  protected isEnabled: boolean = false;

  // Abstract methods that must be implemented
  abstract provide(...args: unknown[]): void;
  abstract enable(): void;
  
  // Optional overrides
  disable(): void;
  getYTMScripts(): { name: string; script: string }[];
}
```

### Protected Methods

#### `registerEventListener<T extends EventEmitter>(emitter: T, event: string, listener: (...args: any[]) => void): void`

Registers an event listener with automatic cleanup and error handling.

**Parameters:**
- `emitter`: The EventEmitter to listen to
- `event`: The event name to listen for
- `listener`: The callback function

**Example:**
```typescript
// In your integration's enable() method
this.registerEventListener(someEmitter, 'dataChanged', (data) => {
  // Handle the event safely
  console.log('Data changed:', data);
});
```

#### `registerPlayerStateListener(listener: (state: PlayerState) => void): void`

Registers a listener for player state changes with automatic cleanup.

**Parameters:**
- `listener`: Callback function that receives PlayerState updates

**Example:**
```typescript
this.registerPlayerStateListener((state) => {
  if (state.track) {
    console.log('Now playing:', state.track.title);
  }
});
```

#### `cleanupEventListeners(): void`

Automatically called during `disable()` to clean up all registered event listeners.

## Creating a New Integration

### 1. Create the Integration Class

Create a new file in `src/main/integrations/your-integration/`:

```typescript
// src/main/integrations/my-service/my-service.ts
import BaseIntegration from "../base-integration";
import { PlayerState } from "../../player-state-store";
import log from "electron-log";

export default class MyServiceIntegration extends BaseIntegration {
  private apiClient: any;

  provide(config: MyServiceConfig): void {
    this.apiClient = new MyServiceClient(config);
  }

  enable(): void {
    if (this.isEnabled) return;
    
    log.info("Enabling MyService integration");
    
    // Register for player state changes
    this.registerPlayerStateListener(this.handlePlayerStateChange.bind(this));
    
    // Initialize connection
    this.initializeConnection();
    
    this.isEnabled = true;
  }

  disable(): void {
    if (!this.isEnabled) return;
    
    log.info("Disabling MyService integration");
    
    // Cleanup connections
    this.cleanup();
    
    // Call parent cleanup (handles event listeners)
    super.disable();
  }

  private handlePlayerStateChange(state: PlayerState): void {
    // Handle player state changes
    if (state.track) {
      this.apiClient.updateNowPlaying(state.track);
    }
  }

  private initializeConnection(): void {
    // Initialize your service connection
  }

  private cleanup(): void {
    // Clean up connections and resources
    if (this.apiClient) {
      this.apiClient.disconnect();
    }
  }
}
```

### 2. Add Configuration Schema

Add configuration options to the store schema in `src/shared/store/schema.ts`:

```typescript
export type StoreSchema = {
  // ... existing properties
  integrations: {
    // ... existing integrations
    myServiceEnabled: boolean;
    myServiceApiKey: string;
    myServiceSettings: {
      option1: boolean;
      option2: string;
    };
  };
};
```

### 3. Register the Integration

Add your integration to the main process in `src/main/index.ts`:

```typescript
import MyServiceIntegration from "./integrations/my-service";

// Create integration instance
const myServiceIntegration = new MyServiceIntegration();

// Provide configuration
myServiceIntegration.provide({
  apiKey: store.get("integrations.myServiceApiKey"),
  settings: store.get("integrations.myServiceSettings")
});

// Enable/disable based on user preference
if (store.get("integrations.myServiceEnabled")) {
  myServiceIntegration.enable();
}

// Handle settings changes
store.onDidChange("integrations.myServiceEnabled", (newValue) => {
  if (newValue) {
    myServiceIntegration.enable();
  } else {
    myServiceIntegration.disable();
  }
});
```

## Available Integration APIs

### Player State Store

Access to real-time player state through `playerStateStore`:

```typescript
import playerStateStore, { PlayerState } from "../player-state-store";

// Get current state
const currentState = playerStateStore.getState();

// Listen for changes
playerStateStore.addEventListener((newState: PlayerState) => {
  // Handle state changes
});
```

### Configuration Store

Access to application settings through the `Conf` store:

```typescript
import Conf from "conf";
import { StoreSchema } from "../../shared/store/schema";

const store = new Conf<StoreSchema>();

// Get configuration values
const isEnabled = store.get("integrations.myServiceEnabled");
const apiKey = store.get("integrations.myServiceApiKey");

// Watch for changes
store.onDidChange("integrations.myServiceEnabled", (newValue, oldValue) => {
  // Handle configuration changes
});
```

### Memory Store

Access to runtime memory state:

```typescript
import MemoryStore from "../memory-store";

// Get memory store values
const memoryValue = MemoryStore.get("someRuntimeState");

// Set memory store values
MemoryStore.set("someRuntimeState", newValue);
```

## Integration Patterns

### 1. Service Authentication

For services requiring authentication:

```typescript
export default class AuthenticatedServiceIntegration extends BaseIntegration {
  private authenticated = false;

  enable(): void {
    if (this.isEnabled) return;

    // Check authentication first
    if (!this.checkAuthentication()) {
      log.warn("Service not authenticated, skipping enable");
      return;
    }

    // Continue with normal enabling
    this.registerPlayerStateListener(this.handleStateChange.bind(this));
    this.isEnabled = true;
  }

  private checkAuthentication(): boolean {
    const token = store.get("integrations.serviceToken");
    return !!token && this.validateToken(token);
  }
}
```

### 2. Rate-Limited Services

For services with API rate limits:

```typescript
export default class RateLimitedIntegration extends BaseIntegration {
  private lastUpdate = 0;
  private updateInterval = 5000; // 5 seconds

  private handlePlayerStateChange(state: PlayerState): void {
    const now = Date.now();
    if (now - this.lastUpdate < this.updateInterval) {
      return; // Skip update due to rate limiting
    }

    this.updateService(state);
    this.lastUpdate = now;
  }
}
```

### 3. Connection Retry Logic

For services that may disconnect:

```typescript
export default class RetryableIntegration extends BaseIntegration {
  private reconnectTimer: NodeJS.Timeout | null = null;
  private retryCount = 0;
  private maxRetries = 5;

  private initializeConnection(): void {
    this.apiClient.connect()
      .then(() => {
        this.retryCount = 0;
        log.info("Connected to service");
      })
      .catch((error) => {
        log.error("Connection failed:", error);
        this.scheduleReconnect();
      });
  }

  private scheduleReconnect(): void {
    if (this.retryCount >= this.maxRetries) {
      log.error("Max retries exceeded, giving up");
      return;
    }

    const delay = Math.pow(2, this.retryCount) * 1000; // Exponential backoff
    this.reconnectTimer = setTimeout(() => {
      this.retryCount++;
      this.initializeConnection();
    }, delay);
  }

  disable(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    super.disable();
  }
}
```

## YouTube Music Script Injection

Some integrations may need to inject scripts into the YouTube Music page. Override the `getYTMScripts()` method:

```typescript
getYTMScripts(): { name: string; script: string }[] {
  return [
    {
      name: "my-service-injector",
      script: `
        // JavaScript code to inject into YouTube Music
        console.log("MyService script injected");
        
        // Example: Listen for page events
        window.addEventListener('play', (event) => {
          window.ytmd.sendCustomEvent('my-service:play', event.detail);
        });
      `
    }
  ];
}
```

## Error Handling Best Practices

### 1. Use Try-Catch Blocks

```typescript
private async handleApiCall(data: any): Promise<void> {
  try {
    await this.apiClient.send(data);
  } catch (error) {
    log.error(`MyService API call failed:`, error);
    
    // Handle specific error types
    if (error.code === 'UNAUTHORIZED') {
      this.handleAuthenticationError();
    }
  }
}
```

### 2. Validate Data

```typescript
private handlePlayerStateChange(state: PlayerState): void {
  // Validate required data
  if (!state.track || !state.track.title) {
    log.debug("Skipping update: incomplete track data");
    return;
  }

  // Proceed with valid data
  this.updateService(state);
}
```

### 3. Graceful Degradation

```typescript
enable(): void {
  try {
    this.initializeConnection();
    this.registerEventListeners();
    this.isEnabled = true;
  } catch (error) {
    log.error("Failed to enable integration:", error);
    // Don't throw - allow app to continue without this integration
  }
}
```

## Testing Your Integration

### 1. Unit Testing

Create tests for your integration logic:

```typescript
// test/integrations/my-service.test.ts
import MyServiceIntegration from "../../src/main/integrations/my-service";

describe("MyServiceIntegration", () => {
  let integration: MyServiceIntegration;

  beforeEach(() => {
    integration = new MyServiceIntegration();
  });

  afterEach(() => {
    integration.disable();
  });

  test("should enable successfully", () => {
    integration.provide({ apiKey: "test-key" });
    integration.enable();
    expect(integration.isEnabled).toBe(true);
  });

  test("should handle player state changes", () => {
    integration.provide({ apiKey: "test-key" });
    integration.enable();
    
    const mockState = {
      track: { title: "Test Song", artist: "Test Artist" }
    };
    
    // Test state handling
    integration.handlePlayerStateChange(mockState);
  });
});
```

### 2. Manual Testing

1. Enable your integration in settings
2. Play music and verify integration responds to state changes
3. Test error scenarios (network failures, invalid data)
4. Verify cleanup when disabling the integration

## Integration Examples

See the existing integrations for implementation examples:
- **Discord Presence**: `src/main/integrations/discord-presence/`
- **Last.fm Scrobbling**: `src/main/integrations/last-fm/`
- **Companion Server**: `src/main/integrations/companion-server/`
- **Custom CSS**: `src/main/integrations/custom-css/`

Each integration demonstrates different patterns and use cases within the framework.
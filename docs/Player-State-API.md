# Player State API

The Player State API is the central system for managing and accessing the current state of the YouTube Music player. It provides real-time updates about playback status, track information, and player controls.

## Overview

The Player State Store (`src/main/player-state-store/`) maintains the current state of the music player and notifies all registered listeners when state changes occur. This enables integrations and UI components to react to playback changes in real-time.

## Core Types

### PlayerState Interface

```typescript
interface PlayerState {
  // Player Status
  isPlaying: boolean;
  isPaused: boolean;
  volume: number;          // 0-100
  muted: boolean;
  adPlaying: boolean;
  
  // Track Information
  track?: TrackInfo;
  
  // Queue Information
  queue?: QueueInfo;
  
  // Playback Progress
  progress?: ProgressInfo;
  
  // Like Status
  likeStatus?: LikeStatus;
  
  // Metadata
  hasFullMetadata: boolean;
}
```

### TrackInfo Interface

```typescript
interface TrackInfo {
  // Basic Information
  title: string;
  artist: string;
  album?: string;
  
  // Identifiers
  videoId: string;
  playlistId?: string;
  
  // Media
  thumbnail?: string;
  thumbnailFull?: string;
  
  // Duration
  duration?: number;       // in seconds
  durationText?: string;   // formatted duration (e.g., "3:42")
  
  // Additional Metadata
  year?: number;
  genre?: string;
  explicit?: boolean;
}
```

### VideoState Enum

```typescript
enum VideoState {
  UNSTARTED = -1,
  ENDED = 0,
  PLAYING = 1,
  PAUSED = 2,
  BUFFERING = 3,
  CUED = 5
}
```

### LikeStatus Enum

```typescript
enum LikeStatus {
  INDIFFERENT = "INDIFFERENT",
  LIKE = "LIKE",
  DISLIKE = "DISLIKE"
}
```

## Player State Store

### Accessing the Store

```typescript
import playerStateStore from "./player-state-store";

// Get current state
const currentState = playerStateStore.getState();

// Check if player is active
const isActive = playerStateStore.isActive();
```

### Event Listeners

#### Adding Listeners

```typescript
// Listen for any state changes
playerStateStore.addEventListener((newState: PlayerState) => {
  console.log("Player state changed:", newState);
});

// Listen for specific track changes
playerStateStore.addEventListener((newState: PlayerState) => {
  if (newState.track) {
    console.log("Now playing:", newState.track.title, "by", newState.track.artist);
  }
});
```

#### Removing Listeners

```typescript
const listener = (state: PlayerState) => {
  // Handle state changes
};

// Add listener
playerStateStore.addEventListener(listener);

// Remove listener when no longer needed
playerStateStore.removeEventListener(listener);
```

### State Updates

The player state is automatically updated through YouTube Music page injections. Manual state updates should only be performed in specific circumstances:

```typescript
// Update volume (example of manual state update)
playerStateStore.updateState({
  volume: 75,
  muted: false
});

// Update track information
playerStateStore.updateState({
  track: {
    title: "Song Title",
    artist: "Artist Name",
    videoId: "abc123",
    duration: 210
  }
});
```

## Usage Examples

### Basic Player State Monitoring

```typescript
import playerStateStore, { PlayerState } from "./player-state-store";

class PlayerMonitor {
  private currentTrack: string | null = null;

  constructor() {
    playerStateStore.addEventListener(this.handleStateChange.bind(this));
  }

  private handleStateChange(state: PlayerState): void {
    // Track playback status
    if (state.isPlaying && !state.adPlaying) {
      console.log("Music is playing");
    } else if (state.isPaused) {
      console.log("Music is paused");
    }

    // Track changes
    if (state.track && state.track.videoId !== this.currentTrack) {
      this.currentTrack = state.track.videoId;
      console.log(`New track: ${state.track.title} by ${state.track.artist}`);
    }

    // Volume changes
    if (state.muted) {
      console.log("Player is muted");
    } else {
      console.log(`Volume: ${state.volume}%`);
    }
  }
}
```

### Integration with External Services

```typescript
import playerStateStore, { PlayerState } from "./player-state-store";

class LastFMIntegration {
  private scrobbleThreshold = 0.5; // 50% of track
  private scrobbledTracks = new Set<string>();

  constructor() {
    playerStateStore.addEventListener(this.handleStateChange.bind(this));
  }

  private handleStateChange(state: PlayerState): void {
    if (!state.track || state.adPlaying) return;

    // Scrobble when track reaches threshold
    if (state.isPlaying && state.progress) {
      const playbackRatio = state.progress.current / state.track.duration;
      
      if (playbackRatio >= this.scrobbleThreshold && 
          !this.scrobbledTracks.has(state.track.videoId)) {
        this.scrobbleTrack(state.track);
        this.scrobbledTracks.add(state.track.videoId);
      }
    }

    // Update "now playing" status
    if (state.isPlaying) {
      this.updateNowPlaying(state.track);
    }
  }

  private scrobbleTrack(track: TrackInfo): void {
    // Send scrobble to Last.fm
    console.log(`Scrobbling: ${track.title} by ${track.artist}`);
  }

  private updateNowPlaying(track: TrackInfo): void {
    // Update "now playing" on Last.fm
    console.log(`Now playing: ${track.title} by ${track.artist}`);
  }
}
```

### Discord Rich Presence

```typescript
import playerStateStore, { PlayerState } from "./player-state-store";

class DiscordPresence {
  private client: any; // Discord RPC client

  constructor() {
    playerStateStore.addEventListener(this.updatePresence.bind(this));
  }

  private updatePresence(state: PlayerState): void {
    if (!state.track || state.adPlaying) {
      this.clearPresence();
      return;
    }

    const presence = {
      details: state.track.title,
      state: `by ${state.track.artist}`,
      largeImageKey: 'youtube-music-logo',
      largeImageText: 'YouTube Music',
      smallImageKey: state.isPlaying ? 'playing' : 'paused',
      smallImageText: state.isPlaying ? 'Playing' : 'Paused',
    };

    // Add timestamps for playing tracks
    if (state.isPlaying && state.progress && state.track.duration) {
      const now = Date.now();
      presence.startTimestamp = now - (state.progress.current * 1000);
      presence.endTimestamp = now + ((state.track.duration - state.progress.current) * 1000);
    }

    this.client.setActivity(presence);
  }

  private clearPresence(): void {
    this.client.clearActivity();
  }
}
```

## Advanced Features

### State Persistence

The player state can be persisted across app restarts:

```typescript
import Conf from "conf";
import { StoreSchema } from "../shared/store/schema";

const store = new Conf<StoreSchema>();

// Save current playback position
playerStateStore.addEventListener((state: PlayerState) => {
  if (state.track && state.progress) {
    store.set("state.lastVideoId", state.track.videoId);
    store.set("state.lastPlaylistId", state.track.playlistId);
    store.set("state.lastProgress", state.progress.current);
  }
});

// Restore playback position on startup
function restorePlaybackPosition(): void {
  const lastVideoId = store.get("state.lastVideoId");
  const lastProgress = store.get("state.lastProgress");
  
  if (lastVideoId && lastProgress) {
    // Navigate to last track and seek to position
    // Implementation depends on YouTube Music API
  }
}
```

### Filtering and Debouncing

For high-frequency updates, you may want to filter or debounce state changes:

```typescript
class DebouncedStateListener {
  private debounceTimer: NodeJS.Timeout | null = null;
  private debounceDelay = 500; // 500ms

  constructor() {
    playerStateStore.addEventListener(this.debouncedHandler.bind(this));
  }

  private debouncedHandler(state: PlayerState): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.handleStateChange(state);
      this.debounceTimer = null;
    }, this.debounceDelay);
  }

  private handleStateChange(state: PlayerState): void {
    // Handle debounced state changes
    console.log("Debounced state update:", state);
  }
}
```

### State Validation

Ensure state data is valid before processing:

```typescript
function validatePlayerState(state: PlayerState): boolean {
  // Basic validation
  if (typeof state.isPlaying !== 'boolean') return false;
  if (typeof state.volume !== 'number' || state.volume < 0 || state.volume > 100) return false;

  // Track validation
  if (state.track) {
    if (!state.track.title || !state.track.artist || !state.track.videoId) {
      return false;
    }
  }

  // Progress validation
  if (state.progress) {
    if (state.progress.current < 0 || state.progress.total < 0) {
      return false;
    }
  }

  return true;
}

playerStateStore.addEventListener((state: PlayerState) => {
  if (!validatePlayerState(state)) {
    console.warn("Invalid player state received:", state);
    return;
  }

  // Process valid state
  handleValidState(state);
});
```

## IPC Integration

The player state is also available to renderer processes through IPC:

### Renderer Process Access

```typescript
// In renderer process (Vue components)
declare global {
  interface Window {
    ytmd: {
      getPlayerState(): Promise<PlayerState>;
      onPlayerStateChanged(callback: (state: PlayerState) => void): () => void;
    };
  }
}

// Get current player state
const currentState = await window.ytmd.getPlayerState();

// Listen for changes
const unsubscribe = window.ytmd.onPlayerStateChanged((state: PlayerState) => {
  console.log("Player state changed in renderer:", state);
});

// Clean up listener
unsubscribe();
```

### Vue Component Integration

```vue
<template>
  <div class="player-info">
    <div v-if="playerState.track">
      <h3>{{ playerState.track.title }}</h3>
      <p>{{ playerState.track.artist }}</p>
      <div class="controls">
        <button :disabled="!playerState.isPlaying" @click="pause">Pause</button>
        <button :disabled="playerState.isPlaying" @click="play">Play</button>
      </div>
      <div class="progress">
        <span>{{ formatTime(progress) }}</span>
        <span>{{ formatTime(playerState.track.duration) }}</span>
      </div>
    </div>
    <div v-else>
      No track playing
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const playerState = ref({
  isPlaying: false,
  track: null,
  progress: { current: 0, total: 0 }
});

let unsubscribe: (() => void) | null = null;

onMounted(async () => {
  // Get initial state
  playerState.value = await window.ytmd.getPlayerState();

  // Listen for changes
  unsubscribe = window.ytmd.onPlayerStateChanged((state) => {
    playerState.value = state;
  });
});

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe();
  }
});

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function play() {
  window.ytmd.playPause();
}

function pause() {
  window.ytmd.playPause();
}
</script>
```

## Error Handling

### State Update Errors

```typescript
import log from "electron-log";

playerStateStore.addEventListener((state: PlayerState) => {
  try {
    // Process state changes
    processStateChange(state);
  } catch (error) {
    log.error("Error processing player state change:", error);
    
    // Handle specific error types
    if (error instanceof NetworkError) {
      handleNetworkError(error);
    } else if (error instanceof ValidationError) {
      handleValidationError(error);
    }
  }
});
```

### Missing Data Handling

```typescript
function handleIncompleteState(state: PlayerState): void {
  // Handle missing track information
  if (state.isPlaying && !state.track) {
    log.warn("Player is playing but no track information available");
    return;
  }

  // Handle missing progress information
  if (state.track && !state.progress) {
    log.debug("Track information available but no progress data");
    // Use estimated progress or skip progress-dependent features
  }

  // Handle missing metadata
  if (state.track && !state.hasFullMetadata) {
    log.debug("Track has incomplete metadata, may update later");
    // Use partial data or request full metadata
  }
}
```

## Performance Considerations

### Memory Management

```typescript
class EfficientStateListener {
  private readonly maxHistorySize = 10;
  private stateHistory: PlayerState[] = [];

  constructor() {
    playerStateStore.addEventListener(this.handleStateChange.bind(this));
  }

  private handleStateChange(state: PlayerState): void {
    // Add to history with size limit
    this.stateHistory.push(state);
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory.shift();
    }

    // Only process significant changes
    if (this.isSignificantChange(state)) {
      this.processStateChange(state);
    }
  }

  private isSignificantChange(newState: PlayerState): boolean {
    const lastState = this.stateHistory[this.stateHistory.length - 2];
    if (!lastState) return true;

    // Check for significant changes
    return (
      newState.isPlaying !== lastState.isPlaying ||
      newState.track?.videoId !== lastState.track?.videoId ||
      Math.abs(newState.volume - lastState.volume) > 5
    );
  }
}
```

### Rate Limiting

```typescript
class RateLimitedIntegration {
  private lastUpdate = 0;
  private minUpdateInterval = 1000; // 1 second

  constructor() {
    playerStateStore.addEventListener(this.rateLimitedHandler.bind(this));
  }

  private rateLimitedHandler(state: PlayerState): void {
    const now = Date.now();
    if (now - this.lastUpdate < this.minUpdateInterval) {
      return; // Skip this update
    }

    this.lastUpdate = now;
    this.handleStateChange(state);
  }

  private handleStateChange(state: PlayerState): void {
    // Process state change with rate limiting
  }
}
```

## Testing

### Unit Tests

```typescript
import playerStateStore from "../player-state-store";

describe("Player State Store", () => {
  test("should notify listeners of state changes", () => {
    const mockListener = jest.fn();
    playerStateStore.addEventListener(mockListener);

    const newState = {
      isPlaying: true,
      volume: 75,
      track: {
        title: "Test Song",
        artist: "Test Artist",
        videoId: "test123"
      }
    };

    playerStateStore.updateState(newState);

    expect(mockListener).toHaveBeenCalledWith(expect.objectContaining(newState));
  });

  test("should handle invalid state gracefully", () => {
    const mockListener = jest.fn();
    playerStateStore.addEventListener(mockListener);

    // Should not throw error
    expect(() => {
      playerStateStore.updateState(null);
    }).not.toThrow();
  });
});
```

### Integration Tests

```typescript
import PlayerStateStore from "../player-state-store";
import LastFMIntegration from "../integrations/last-fm";

describe("LastFM Integration with Player State", () => {
  let integration: LastFMIntegration;
  
  beforeEach(() => {
    integration = new LastFMIntegration();
    integration.enable();
  });

  test("should scrobble track at 50% completion", () => {
    const scrobbleSpy = jest.spyOn(integration, 'scrobbleTrack');
    
    const state = {
      isPlaying: true,
      track: {
        title: "Test Song",
        artist: "Test Artist",
        duration: 240
      },
      progress: {
        current: 120 // 50% of 240 seconds
      }
    };

    playerStateStore.updateState(state);

    expect(scrobbleSpy).toHaveBeenCalledWith(state.track);
  });
});
```

## Best Practices

1. **Always Check for Required Data**: Verify that track information exists before using it
2. **Handle State Changes Gracefully**: Don't assume all properties will be present
3. **Clean Up Listeners**: Remove event listeners when components/integrations are disabled
4. **Validate Data**: Ensure state data is valid before processing
5. **Use Debouncing**: For high-frequency updates, consider debouncing to improve performance
6. **Error Handling**: Wrap state processing in try-catch blocks
7. **Memory Management**: Avoid storing large amounts of state history
8. **Rate Limiting**: Implement rate limiting for external API calls triggered by state changes
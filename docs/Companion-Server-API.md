# Companion Server API

The Companion Server provides a REST API that allows external applications to control and monitor the YouTube Music Desktop App. This enables remote control, integration with home automation systems, and third-party applications.

## Overview

The Companion Server is built using Fastify and provides:
- **RESTful API**: Standard HTTP endpoints for control and monitoring
- **WebSocket Support**: Real-time updates via Socket.io
- **Authentication**: Token-based security for API access
- **CORS Support**: Configurable cross-origin request handling
- **Rate Limiting**: Built-in protection against abuse

## Server Configuration

### Basic Setup

The server is configured through the application settings:

```typescript
// Settings schema for companion server
interface CompanionServerSettings {
  companionServerEnabled: boolean;
  companionServerAuthTokens: string | null; // Encrypted array of tokens
  companionServerCORSWildcardEnabled: boolean;
}
```

### Starting the Server

```typescript
import CompanionServer from "./integrations/companion-server";

const companionServer = new CompanionServer();

// Configure the server
companionServer.provide({
  port: 9863, // Default port
  host: "127.0.0.1", // Localhost only for security
  authTokens: ["your-secure-token"],
  corsEnabled: false
});

// Enable the server
if (store.get("integrations.companionServerEnabled")) {
  companionServer.enable();
}
```

## Authentication

### Token-Based Authentication

All API requests require a valid authentication token in the `Authorization` header:

```http
Authorization: Bearer your-secure-token
```

### Managing Tokens

```typescript
// Add new authentication token
function addAuthToken(token: string): void {
  const currentTokens = getStoredTokens();
  currentTokens.push(token);
  store.set("integrations.companionServerAuthTokens", encryptTokens(currentTokens));
}

// Remove authentication token
function removeAuthToken(token: string): void {
  const currentTokens = getStoredTokens();
  const filteredTokens = currentTokens.filter(t => t !== token);
  store.set("integrations.companionServerAuthTokens", encryptTokens(filteredTokens));
}

// Validate token
function validateToken(token: string): boolean {
  const storedTokens = getStoredTokens();
  return storedTokens.includes(token);
}
```

## REST API Endpoints

### Player Control

#### GET /api/player/state

Get the current player state.

**Response:**
```json
{
  "isPlaying": true,
  "isPaused": false,
  "volume": 75,
  "muted": false,
  "adPlaying": false,
  "track": {
    "title": "Song Title",
    "artist": "Artist Name",
    "album": "Album Name",
    "videoId": "abc123",
    "duration": 240,
    "thumbnail": "https://..."
  },
  "progress": {
    "current": 120,
    "total": 240
  },
  "likeStatus": "INDIFFERENT",
  "hasFullMetadata": true
}
```

#### POST /api/player/play-pause

Toggle play/pause state.

**Response:**
```json
{
  "success": true,
  "action": "play",
  "state": {
    "isPlaying": true
  }
}
```

#### POST /api/player/next

Skip to next track.

**Response:**
```json
{
  "success": true,
  "action": "next"
}
```

#### POST /api/player/previous

Go to previous track.

**Response:**
```json
{
  "success": true,
  "action": "previous"
}
```

#### POST /api/player/volume

Set volume level.

**Request Body:**
```json
{
  "volume": 75
}
```

**Response:**
```json
{
  "success": true,
  "volume": 75
}
```

#### POST /api/player/seek

Seek to specific position in track.

**Request Body:**
```json
{
  "position": 120
}
```

**Response:**
```json
{
  "success": true,
  "position": 120
}
```

#### POST /api/player/like

Toggle like status of current track.

**Request Body:**
```json
{
  "status": "LIKE"
}
```

**Response:**
```json
{
  "success": true,
  "likeStatus": "LIKE"
}
```

### Queue Management

#### GET /api/queue

Get current queue information.

**Response:**
```json
{
  "queue": [
    {
      "title": "Song 1",
      "artist": "Artist 1",
      "videoId": "abc123",
      "duration": 240
    },
    {
      "title": "Song 2", 
      "artist": "Artist 2",
      "videoId": "def456",
      "duration": 180
    }
  ],
  "currentIndex": 0,
  "totalTracks": 25
}
```

#### POST /api/queue/add

Add track to queue.

**Request Body:**
```json
{
  "videoId": "abc123",
  "position": "next"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Track added to queue"
}
```

### Application Control

#### GET /api/app/info

Get application information.

**Response:**
```json
{
  "name": "YouTube Music Desktop App",
  "version": "2.0.9",
  "platform": "win32",
  "status": "ready"
}
```

#### POST /api/app/minimize

Minimize the application window.

**Response:**
```json
{
  "success": true,
  "action": "minimize"
}
```

#### POST /api/app/show

Show and focus the application window.

**Response:**
```json
{
  "success": true,
  "action": "show"
}
```

#### POST /api/app/quit

Quit the application.

**Response:**
```json
{
  "success": true,
  "action": "quit"
}
```

## WebSocket Events

### Connection

Connect to the WebSocket server for real-time updates:

```javascript
const socket = io('http://localhost:9863', {
  auth: {
    token: 'your-auth-token'
  }
});

socket.on('connect', () => {
  console.log('Connected to companion server');
});
```

### Events

#### player-state-changed

Emitted when player state changes.

```javascript
socket.on('player-state-changed', (state) => {
  console.log('Player state updated:', state);
});
```

#### track-changed

Emitted when current track changes.

```javascript
socket.on('track-changed', (track) => {
  console.log('Now playing:', track.title, 'by', track.artist);
});
```

#### volume-changed

Emitted when volume changes.

```javascript
socket.on('volume-changed', (volume) => {
  console.log('Volume changed to:', volume);
});
```

#### playback-changed

Emitted when playback state changes (play/pause).

```javascript
socket.on('playback-changed', (isPlaying) => {
  console.log('Playback state:', isPlaying ? 'playing' : 'paused');
});
```

## Client Libraries

### JavaScript/Node.js

```javascript
class YTMDClient {
  constructor(baseUrl, authToken) {
    this.baseUrl = baseUrl;
    this.authToken = authToken;
    this.headers = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };
  }

  async getPlayerState() {
    const response = await fetch(`${this.baseUrl}/api/player/state`, {
      headers: this.headers
    });
    return response.json();
  }

  async playPause() {
    const response = await fetch(`${this.baseUrl}/api/player/play-pause`, {
      method: 'POST',
      headers: this.headers
    });
    return response.json();
  }

  async setVolume(volume) {
    const response = await fetch(`${this.baseUrl}/api/player/volume`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ volume })
    });
    return response.json();
  }

  async nextTrack() {
    const response = await fetch(`${this.baseUrl}/api/player/next`, {
      method: 'POST',
      headers: this.headers
    });
    return response.json();
  }

  async previousTrack() {
    const response = await fetch(`${this.baseUrl}/api/player/previous`, {
      method: 'POST',
      headers: this.headers
    });
    return response.json();
  }

  connectWebSocket() {
    this.socket = io(this.baseUrl, {
      auth: { token: this.authToken }
    });

    this.socket.on('player-state-changed', (state) => {
      this.onPlayerStateChanged?.(state);
    });

    this.socket.on('track-changed', (track) => {
      this.onTrackChanged?.(track);
    });

    return this.socket;
  }
}

// Usage
const client = new YTMDClient('http://localhost:9863', 'your-auth-token');

// Get current state
const state = await client.getPlayerState();
console.log('Current track:', state.track?.title);

// Control playback
await client.playPause();
await client.setVolume(50);
await client.nextTrack();

// Listen for real-time updates
client.onPlayerStateChanged = (state) => {
  console.log('State changed:', state);
};

client.connectWebSocket();
```

### Python

```python
import requests
import socketio

class YTMDClient:
    def __init__(self, base_url, auth_token):
        self.base_url = base_url
        self.auth_token = auth_token
        self.headers = {
            'Authorization': f'Bearer {auth_token}',
            'Content-Type': 'application/json'
        }
        self.sio = socketio.Client()

    def get_player_state(self):
        response = requests.get(f'{self.base_url}/api/player/state', headers=self.headers)
        return response.json()

    def play_pause(self):
        response = requests.post(f'{self.base_url}/api/player/play-pause', headers=self.headers)
        return response.json()

    def set_volume(self, volume):
        data = {'volume': volume}
        response = requests.post(f'{self.base_url}/api/player/volume', 
                               headers=self.headers, json=data)
        return response.json()

    def next_track(self):
        response = requests.post(f'{self.base_url}/api/player/next', headers=self.headers)
        return response.json()

    def previous_track(self):
        response = requests.post(f'{self.base_url}/api/player/previous', headers=self.headers)
        return response.json()

    def connect_websocket(self):
        @self.sio.on('player-state-changed')
        def on_player_state_changed(data):
            print('Player state changed:', data)

        @self.sio.on('track-changed')
        def on_track_changed(data):
            print('Track changed:', data['title'], 'by', data['artist'])

        self.sio.connect(self.base_url, auth={'token': self.auth_token})

# Usage
client = YTMDClient('http://localhost:9863', 'your-auth-token')

# Get current state
state = client.get_player_state()
print('Current track:', state.get('track', {}).get('title'))

# Control playback
client.play_pause()
client.set_volume(50)
client.next_track()

# Listen for real-time updates
client.connect_websocket()
```

## Integration Examples

### Home Assistant

```yaml
# configuration.yaml
rest_command:
  ytmd_play_pause:
    url: http://localhost:9863/api/player/play-pause
    method: POST
    headers:
      Authorization: Bearer your-auth-token

  ytmd_next:
    url: http://localhost:9863/api/player/next
    method: POST
    headers:
      Authorization: Bearer your-auth-token

  ytmd_volume:
    url: http://localhost:9863/api/player/volume
    method: POST
    headers:
      Authorization: Bearer your-auth-token
    payload: '{"volume": {{ volume }}}'

sensor:
  - platform: rest
    name: ytmd_player_state
    resource: http://localhost:9863/api/player/state
    headers:
      Authorization: Bearer your-auth-token
    json_attributes:
      - track
      - isPlaying
      - volume
    value_template: '{{ value_json.track.title if value_json.track else "No track" }}'

automation:
  - alias: "Morning Music"
    trigger:
      platform: time
      at: "07:00:00"
    action:
      - service: rest_command.ytmd_play_pause
```

### Alfred Workflow (macOS)

```applescript
-- Play/Pause
on alfred_script(q)
    set apiUrl to "http://localhost:9863/api/player/play-pause"
    set authToken to "your-auth-token"
    
    do shell script "curl -X POST '" & apiUrl & "' -H 'Authorization: Bearer " & authToken & "'"
end alfred_script
```

### Stream Deck Plugin

```javascript
// Stream Deck action for play/pause
class PlayPauseAction {
  constructor() {
    this.client = new YTMDClient('http://localhost:9863', 'your-auth-token');
  }

  async onKeyDown() {
    try {
      await this.client.playPause();
      this.updateButton();
    } catch (error) {
      console.error('Failed to toggle playback:', error);
    }
  }

  async updateButton() {
    const state = await this.client.getPlayerState();
    const isPlaying = state.isPlaying;
    
    // Update button icon based on state
    this.setButtonImage(isPlaying ? 'pause.png' : 'play.png');
    this.setButtonTitle(state.track?.title || 'No track');
  }
}
```

## Security Considerations

### Network Security

1. **Local Only**: Server binds to localhost by default
2. **Token Authentication**: All endpoints require valid auth tokens
3. **HTTPS Support**: Can be configured for HTTPS in secure environments
4. **Rate Limiting**: Built-in protection against abuse

### Token Management

```typescript
// Generate secure tokens
function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Store tokens securely
function storeTokenSecurely(token: string): void {
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(token);
    store.set("companionServerAuthTokens", encrypted.toString('base64'));
  } else {
    // Fallback for systems without encryption
    store.set("companionServerAuthTokens", token);
    MemoryStore.set("companionServerUsingInsecureStorage", true);
  }
}
```

### CORS Configuration

```typescript
// Configure CORS for specific origins
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'https://your-webapp.com'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

app.register(require('@fastify/cors'), corsOptions);
```

## Error Handling

### API Error Responses

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or missing authentication token",
    "statusCode": 401
  }
}
```

### Common Error Codes

- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (invalid/missing token)
- `404` - Not Found (endpoint doesn't exist)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

### Client Error Handling

```javascript
class YTMDClient {
  async makeRequest(endpoint, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          ...this.headers,
          ...options.headers
        }
      });

      if (!response.ok) {
        throw new APIError(response.status, await response.json());
      }

      return response.json();
    } catch (error) {
      if (error instanceof APIError) {
        this.handleAPIError(error);
      } else {
        this.handleNetworkError(error);
      }
      throw error;
    }
  }

  handleAPIError(error) {
    switch (error.code) {
      case 'UNAUTHORIZED':
        console.error('Authentication failed - check your token');
        break;
      case 'RATE_LIMIT_EXCEEDED':
        console.error('Rate limit exceeded - please wait before retrying');
        break;
      default:
        console.error('API error:', error.message);
    }
  }

  handleNetworkError(error) {
    console.error('Network error - is the companion server running?', error);
  }
}
```

## Development and Testing

### Testing the API

```bash
# Test authentication
curl -H "Authorization: Bearer your-token" http://localhost:9863/api/player/state

# Test play/pause
curl -X POST -H "Authorization: Bearer your-token" http://localhost:9863/api/player/play-pause

# Test volume control
curl -X POST -H "Authorization: Bearer your-token" -H "Content-Type: application/json" \
  -d '{"volume": 50}' http://localhost:9863/api/player/volume
```

### Debugging

Enable debug logging for the companion server:

```typescript
// Enable debug mode
store.set("developer.debugLoggingEnabled", true);
store.set("developer.debugLoggingLevel", "debug");

// The server will log all requests and responses
```

### Unit Tests

```typescript
import { test } from 'node:test';
import { build } from '../companion-server/app';

test('GET /api/player/state returns current state', async (t) => {
  const app = build({ logger: false });
  
  const response = await app.inject({
    method: 'GET',
    url: '/api/player/state',
    headers: {
      'Authorization': 'Bearer test-token'
    }
  });

  t.assert.strictEqual(response.statusCode, 200);
  
  const body = JSON.parse(response.body);
  t.assert.ok(typeof body.isPlaying === 'boolean');
  t.assert.ok(typeof body.volume === 'number');
});
```

## Performance Optimization

### Rate Limiting

```typescript
// Configure rate limiting
app.register(require('@fastify/rate-limit'), {
  max: 100, // Maximum 100 requests
  timeWindow: '1 minute', // Per minute
  keyGenerator: (request) => {
    // Rate limit by authentication token
    return request.headers.authorization;
  }
});
```

### Caching

```typescript
// Cache player state for short periods
const stateCache = new Map();
const CACHE_TTL = 1000; // 1 second

function getCachedPlayerState() {
  const cached = stateCache.get('playerState');
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const freshState = playerStateStore.getState();
  stateCache.set('playerState', {
    data: freshState,
    timestamp: Date.now()
  });
  
  return freshState;
}
```

## Best Practices

1. **Use HTTPS** in production environments
2. **Rotate tokens** regularly for security
3. **Implement retries** with exponential backoff
4. **Cache responses** to reduce API calls
5. **Handle errors gracefully** with proper fallbacks
6. **Rate limit** your client applications
7. **Use WebSockets** for real-time updates instead of polling
8. **Validate inputs** on both client and server sides
# Modo Voice Client SDK - Technical Overview

## Architecture

The Modo Voice Client SDK is built with a modular, layered architecture following SOLID principles and TypeScript best practices.

```
┌─────────────────────────────────────────┐
│        ModoVoiceClient (Main API)       │
├─────────────────────────────────────────┤
│  Event System  │  Configuration Manager │
├─────────────────────────────────────────┤
│  WebSocketService  │  AudioService      │
├─────────────────────────────────────────┤
│  State Management (Models)              │
│  - AudioState                           │
│  - ConnectionState                      │
│  - VoiceMetrics                         │
├─────────────────────────────────────────┤
│  Utilities                              │
│  - Validators                           │
│  - Logger                               │
│  - Formatters                           │
└─────────────────────────────────────────┘
```

## Project Structure

```
client-sdk/
├── src/
│   ├── types/                   # TypeScript type definitions
│   │   ├── events.ts           # Event types and interfaces
│   │   ├── audio.ts            # Audio-related types
│   │   ├── websocket.ts        # WebSocket types
│   │   ├── config.ts           # Configuration types
│   │   └── index.ts            # Type exports
│   │
│   ├── models/                  # State management classes
│   │   ├── AudioState.ts       # Audio playback/recording state
│   │   ├── ConnectionState.ts  # WebSocket connection state
│   │   ├── VoiceMetrics.ts     # Voice activity metrics
│   │   └── index.ts            # Model exports
│   │
│   ├── services/                # Core service classes
│   │   ├── EventEmitter.ts     # Event management system
│   │   ├── WebSocketService.ts # WebSocket communication
│   │   ├── AudioService.ts     # Audio capture and playback
│   │   └── index.ts            # Service exports
│   │
│   ├── utils/                   # Utility functions
│   │   ├── validators.ts       # Configuration validation
│   │   ├── logger.ts           # Logging utilities
│   │   └── index.ts            # Utility exports
│   │
│   ├── ModoVoiceClient.ts      # Main SDK class
│   └── index.ts                 # Package entry point
│
├── examples/                    # Usage examples
│   ├── basic-usage.ts          # Simple example
│   ├── advanced-usage.ts       # Advanced configuration
│   └── react-example.tsx       # React integration
│
├── package.json                 # Package configuration
├── tsconfig.json               # TypeScript config
├── tsconfig.esm.json           # ESM build config
├── README.md                    # User documentation
├── API.md                       # API reference
├── GETTING_STARTED.md          # Quick start guide
└── SDK_OVERVIEW.md             # This file
```

## Core Components

### 1. ModoVoiceClient

The main entry point for the SDK. Orchestrates all services and provides a simple, type-safe API.

**Responsibilities:**
- Initialize and coordinate services
- Expose public API methods
- Manage lifecycle (connect, disconnect)
- Provide event subscriptions
- Handle configuration

**Key Methods:**
- `connect()`: Establish connection
- `disconnect()`: Clean up and close
- `on()`: Subscribe to events
- `getConnectionMetrics()`: Get connection stats
- `getVoiceMetrics()`: Get voice activity stats

### 2. EventEmitter

Custom event system providing type-safe event subscriptions with support for:
- Regular subscriptions (`.on()`)
- One-time subscriptions (`.once()`)
- Wildcard subscriptions (`.onAny()`)
- Unsubscribe functions
- Async event handlers

**Features:**
- Full TypeScript support with discriminated unions
- Safe invocation with error handling
- Multiple listeners per event
- Clean unsubscription pattern

### 3. WebSocketService

Manages WebSocket connection with the Modo server.

**Responsibilities:**
- Establish and maintain WebSocket connection
- Handle reconnection with exponential backoff
- Parse incoming messages
- Send outgoing audio data
- Emit connection events
- Track connection metrics

**Features:**
- Automatic reconnection
- Ping/pong keepalive
- Binary and text message support
- Connection timeout handling
- Metrics tracking

### 4. AudioService

Handles audio capture, processing, and playback.

**Responsibilities:**
- Initialize Web Audio API
- Manage AudioWorklet for voice processing
- Capture microphone input
- Detect voice activity (VAD)
- Buffer and play AI responses
- Handle pause/resume

**Features:**
- Voice Activity Detection (VAD)
- Noise reduction
- Echo cancellation
- Pre-roll buffering
- Smooth playback transitions
- Device enumeration

### 5. State Models

#### AudioState
Manages audio buffer state, playback state, and recording state.

**Key Features:**
- Queue management
- Buffer tracking
- Playback metrics
- Recording metrics

#### ConnectionState
Tracks WebSocket connection state and metrics.

**Key Features:**
- Connection status
- Reconnection attempts
- Data transfer metrics
- Error tracking

#### VoiceMetrics
Monitors voice activity with historical tracking.

**Key Features:**
- Real-time RMS/dB levels
- Voice activity detection
- Historical data
- Statistical analysis

## Data Flow

### Outgoing (User → AI)

```
Microphone Input
    ↓
AudioContext → MediaStreamSource
    ↓
AudioWorkletNode (VAD + Processing)
    ↓
Voice Detection Event
    ↓
PCM Audio Data
    ↓
WebSocket (Binary)
    ↓
Modo Server → LLM Processing
```

### Incoming (AI → User)

```
Modo Server (AI Response)
    ↓
WebSocket (Binary MP3 Chunks)
    ↓
Audio Buffer Management
    ↓
Blob Creation
    ↓
HTML Audio Element
    ↓
Speaker Output
```

## Event System

The SDK uses a comprehensive event system for all state changes and data flow:

### Event Categories

1. **Connection Events**
   - CONNECTED
   - DISCONNECTED
   - CONNECTION_ERROR

2. **Audio Events**
   - AI_PLAYBACK_STARTED
   - AI_PLAYBACK_CHUNK
   - AI_PLAYBACK_COMPLETED
   - AI_PLAYBACK_ERROR

3. **Recording Events**
   - USER_RECORDING_STARTED
   - USER_RECORDING_STOPPED
   - USER_RECORDING_DATA

4. **Voice Events**
   - VOICE_DETECTED
   - VOICE_ENDED
   - VOICE_METRICS

5. **Control Events**
   - MICROPHONE_PAUSED
   - MICROPHONE_RESUMED

6. **Message Events**
   - TRANSCRIPT_RECEIVED
   - AI_RESPONSE_RECEIVED

7. **Log Events**
   - ERROR
   - WARNING
   - INFO
   - DEBUG

## Type Safety

The SDK is fully type-safe with:

1. **Discriminated Union Events**
   ```typescript
   type ModoVoiceEvent = ConnectedEvent | DisconnectedEvent | ...
   ```

2. **Type-Safe Event Listeners**
   ```typescript
   client.on(EventType.CONNECTED, (event: ConnectedEvent) => {
     console.log(event.chatbotUuid);
   });
   ```

3. **Validated Configuration**
   ```typescript
   validateConfig(config);
   ```

4. **Strict TypeScript Settings**
   - `strict: true`
   - `noUnusedLocals: true`
   - `noImplicitReturns: true`

## Configuration System

### Hierarchical Configuration

```typescript
DEFAULT_CONFIG → User Config → Merged Config
```

### Configuration Layers

1. **Required**: apiBase, chatbotUuid, userUniqueId
2. **Optional**: audio, websocket, logging, features
3. **Defaults**: Sensible defaults for all optional configs

### Validation

All configuration is validated on construction:
- UUID format validation
- URL validation
- Range checks for numeric values
- Type checks for all properties

## Performance Optimizations

1. **Audio Buffering**
   - Dynamic buffer management
   - Chunk-based playback
   - Seamless transitions

2. **Connection Management**
   - Keepalive pings
   - Automatic reconnection
   - Backoff strategy

3. **Memory Management**
   - Buffer cleanup
   - Event listener cleanup
   - Resource disposal

4. **Event Handling**
   - Async event handlers
   - Error isolation
   - Batch processing

## Browser Compatibility

### Required APIs
- WebSocket
- Web Audio API
- AudioWorklet
- MediaStream API
- Promises/Async-Await

### Supported Browsers
- Chrome/Edge 89+
- Firefox 88+
- Safari 15+
- Opera 75+

### Polyfills
No polyfills required for modern browsers.

## Error Handling

### Error Categories

1. **Validation Errors**
   - Invalid configuration
   - Thrown on construction

2. **Connection Errors**
   - Network issues
   - Emitted as events

3. **Audio Errors**
   - Microphone access denied
   - Playback failures
   - Emitted as events

4. **Runtime Errors**
   - Caught and logged
   - Emitted as events

### Error Recovery

- Automatic reconnection for network issues
- Graceful degradation for feature failures
- User-facing error events
- Detailed logging for debugging

## Testing Strategy

### Unit Tests (Recommended)
- Services in isolation
- State models
- Utilities
- Event emitter

### Integration Tests (Recommended)
- Full connection flow
- Audio capture and playback
- Event propagation

### E2E Tests (Recommended)
- Real browser environment
- Actual WebSocket connection
- Live audio I/O

## Build System

### TypeScript Compilation

Two build targets:
1. **CommonJS** (dist/index.js) - Node.js
2. **ESM** (dist/esm/index.js) - Modern bundlers

### Build Process

```bash
npm run build
```

Produces:
- JavaScript output (dist/)
- Type definitions (dist/*.d.ts)
- Source maps (dist/*.map)

## Package Distribution

### NPM Package

```json
{
  "main": "dist/index.js",      // CommonJS
  "module": "dist/index.esm.js", // ESM
  "types": "dist/index.d.ts"     // TypeScript
}
```

### Tree-Shaking Support

ESM build supports tree-shaking for optimal bundle size.

## Future Enhancements

### Planned Features
1. **Recording Export** - Save conversations
2. **Multi-language Support** - I18n for events
3. **Custom Audio Processors** - Plugin system
4. **Metrics Dashboard** - Visual monitoring
5. **Offline Mode** - Queue messages when offline
6. **Screen Sharing** - Video support
7. **Custom Transports** - Alternative to WebSocket

### Breaking Changes Policy

Following semantic versioning:
- Major: Breaking API changes
- Minor: New features, backward compatible
- Patch: Bug fixes

## Contributing

### Code Style
- ESLint configuration
- Prettier formatting
- TypeScript strict mode

### Commit Convention
- feat: New features
- fix: Bug fixes
- docs: Documentation
- refactor: Code refactoring
- test: Tests
- chore: Build/tooling

## License

MIT License - See LICENSE file

## Support

- Email: support@modochats.com
- GitHub: https://github.com/modochats/voice-client
- Documentation: https://docs.modochats.com

---

**Version**: 1.0.0  
**Last Updated**: 2024-12-06  
**Maintainer**: Modo Team


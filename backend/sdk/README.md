# Platform SDK

Universal Integration SDK for HTML5 Game Platform

## Overview

The Platform SDK is a lightweight, framework-agnostic JavaScript library that enables games to communicate with the HTML5 Game Platform. It works seamlessly with any web-based game framework including Phaser, Unity WebGL, Godot, Three.js, and Vanilla JavaScript.

## Features

- 🎮 **Framework Agnostic** - Works with any web game framework
- 📦 **Zero Dependencies** - Lightweight and self-contained
- 🔒 **Secure Communication** - Uses postMessage API with validation
- 📱 **Mobile Ready** - Optimized for all devices
- 🎯 **Simple API** - Easy to integrate in minutes
- 📊 **Score Tracking** - Built-in score and level tracking
- ⏸️ **Pause/Resume** - Automatic pause/resume handling
- 🖥️ **Fullscreen Support** - Request fullscreen from platform

## Installation

### Option 1: ES Module (Recommended)

```html
<script type="module">
    import PlatformSDK from './platformsdk.js';
    
    await PlatformSDK.init();
    // Your game code here
</script>
```

### Option 2: Script Tag (UMD)

```html
<script src="./platformsdk.min.js"></script>
<script>
    PlatformSDK.init().then(() => {
        // Your game code here
    });
</script>
```

### Option 3: NPM/Bundler

```javascript
import PlatformSDK from './platformsdk.js';
```

## Quick Start

### Basic Integration

```javascript
// 1. Initialize SDK
await PlatformSDK.init();

// 2. Listen for platform events
PlatformSDK.on('pause', () => {
    myGame.pause();
});

PlatformSDK.on('resume', () => {
    myGame.resume();
});

// 3. Send score updates
PlatformSDK.sendScore(1000);

// 4. Report game over
PlatformSDK.gameOver(5000);
```

## API Reference

### Initialization

#### `init(options?)`

Initialize the SDK. Must be called before using other methods.

```javascript
await PlatformSDK.init({
    timeout: 5000  // Platform ready timeout (ms)
});
```

**Returns:** `Promise<void>`

### Score & Progress

#### `sendScore(score, metadata?)`

Send score update to platform.

```javascript
PlatformSDK.sendScore(1000);

// With metadata
PlatformSDK.sendScore(1000, {
    combo: 5,
    multiplier: 2
});
```

#### `gameOver(finalScore, metadata?)`

Report game over with final score.

```javascript
PlatformSDK.gameOver(5000);

// With metadata
PlatformSDK.gameOver(5000, {
    timePlayed: 180,
    achievements: ['first_win', 'speed_demon']
});
```

#### `levelCompleted(level, metadata?)`

Report level completion.

```javascript
PlatformSDK.levelCompleted(5);

// With metadata
PlatformSDK.levelCompleted(5, {
    timeToComplete: 45,
    stars: 3,
    perfectClear: true
});
```

### Platform Control

#### `requestFullScreen()`

Request fullscreen mode.

```javascript
PlatformSDK.requestFullScreen();
```

### Event Handling

#### `on(eventType, callback)`

Register event listener for platform events.

**Event Types:**
- `start` - Game should start
- `pause` - Game should pause
- `resume` - Game should resume
- `exit` - Game should exit/cleanup
- `config` - Platform configuration received

```javascript
PlatformSDK.on('pause', () => {
    game.pause();
    audio.pause();
});

PlatformSDK.on('resume', () => {
    game.resume();
    audio.resume();
});

PlatformSDK.on('config', (config) => {
    console.log('Platform config:', config);
});
```

#### `off(eventType, callback)`

Unregister event listener.

```javascript
const pauseHandler = () => game.pause();
PlatformSDK.on('pause', pauseHandler);

// Later...
PlatformSDK.off('pause', pauseHandler);
```

### State Management

#### `getState()`

Get current SDK state.

```javascript
const state = PlatformSDK.getState();
console.log('Score:', state.score);
console.log('Level:', state.level);
console.log('Paused:', state.isPaused);
```

**Returns:**
```typescript
{
    score: number,
    level: number,
    isPaused: boolean
}
```

#### `isPaused()`

Check if game is paused.

```javascript
if (PlatformSDK.isPaused()) {
    // Skip game logic update
    return;
}
```

**Returns:** `boolean`

### Debugging

#### `log(message, data?)`

Send log message to platform (useful for debugging).

```javascript
PlatformSDK.log('Player spawned', { x: 100, y: 200 });
PlatformSDK.log('Enemy defeated');
```

## Framework Integration Examples

### Phaser 3

```javascript
class GameScene extends Phaser.Scene {
    async create() {
        // Initialize SDK
        await PlatformSDK.init();
        
        // Listen for pause/resume
        PlatformSDK.on('pause', () => {
            this.scene.pause();
        });
        
        PlatformSDK.on('resume', () => {
            this.scene.resume();
        });
        
        // Send score updates
        this.events.on('score-update', (score) => {
            PlatformSDK.sendScore(score);
        });
    }
    
    gameOver(finalScore) {
        PlatformSDK.gameOver(finalScore);
    }
}
```

### Unity WebGL

```javascript
// In your HTML template
window.unityInstance.then((unityInstance) => {
    PlatformSDK.init().then(() => {
        PlatformSDK.on('pause', () => {
            unityInstance.SendMessage('GameManager', 'OnPause');
        });
        
        PlatformSDK.on('resume', () => {
            unityInstance.SendMessage('GameManager', 'OnResume');
        });
    });
});

// Expose function for Unity to call
window.reportScore = (score) => {
    PlatformSDK.sendScore(score);
};
```

### Three.js

```javascript
// Initialize
await PlatformSDK.init();

// Animation loop
function animate() {
    if (PlatformSDK.isPaused()) {
        requestAnimationFrame(animate);
        return;
    }
    
    // Update game
    updateGame();
    renderer.render(scene, camera);
    
    requestAnimationFrame(animate);
}

// Event listeners
PlatformSDK.on('pause', () => {
    pauseAudio();
});

PlatformSDK.on('resume', () => {
    resumeAudio();
});

// Report score
function onScoreChange(newScore) {
    PlatformSDK.sendScore(newScore);
}
```

### Vanilla JavaScript

```javascript
// Simple game loop
await PlatformSDK.init();

let score = 0;
let isPaused = false;

PlatformSDK.on('pause', () => {
    isPaused = true;
});

PlatformSDK.on('resume', () => {
    isPaused = false;
});

function gameLoop() {
    if (!isPaused) {
        // Update game logic
        score += 10;
        PlatformSDK.sendScore(score);
    }
    
    requestAnimationFrame(gameLoop);
}

gameLoop();
```

## TypeScript Support

Full TypeScript definitions are included:

```typescript
import PlatformSDK from './platformsdk.js';

await PlatformSDK.init({ timeout: 10000 });

PlatformSDK.on('pause', () => {
    // TypeScript knows this is a pause event
});

const state = PlatformSDK.getState();
// state is typed as { score: number, level: number, isPaused: boolean }
```

## Protocol Details

The SDK uses a JSON-based message protocol over `postMessage`:

```json
{
    "type": "scoreUpdate",
    "payload": {
        "score": 1000
    },
    "timestamp": 1234567890,
    "protocolVersion": "1.0.0"
}
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Best Practices

1. **Always initialize first**
   ```javascript
   await PlatformSDK.init();
   ```

2. **Handle pause/resume**
   ```javascript
   PlatformSDK.on('pause', () => pauseGame());
   PlatformSDK.on('resume', () => resumeGame());
   ```

3. **Report scores regularly**
   ```javascript
   // Update score as it changes
   PlatformSDK.sendScore(currentScore);
   ```

4. **Use metadata for rich data**
   ```javascript
   PlatformSDK.gameOver(score, {
       timePlayed: 180,
       achievements: ['speed_run'],
       difficulty: 'hard'
   });
   ```

5. **Check pause state in game loop**
   ```javascript
   if (PlatformSDK.isPaused()) return;
   ```

## License

MIT License

## Version

1.0.0

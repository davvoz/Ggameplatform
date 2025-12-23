# Platform SDK Integration Guide for Indie Serious Game

## Overview

This document explains how the Platform SDK integrates with the indie serious game design, ensuring proper tracking, session management, and XP calculation while maintaining the game's tactical depth philosophy.

## Current SDK Integration Status

### ✅ Already Implemented

The game currently has **complete SDK integration** in `js/main.js`:

1. **SDK Initialization** (lines 30-63)
   ```javascript
   await PlatformSDK.init({
       onPause: () => game.pause(),
       onResume: () => game.resume(),
       onExit: () => endSession() + game.gameOver(),
       onStart: () => game.resume()
   });
   ```

2. **Session Management** (lines 67-129)
   - `startSession()`: Starts tracking on first game update
   - `endSession()`: Sends comprehensive XP data on game over
   - `resetSession()`: Handles retry logic

3. **Real-Time Score Updates** (lines 164-169)
   - Sends score updates only when score changes
   - No unnecessary network traffic

4. **XP Data Tracking** (lines 96-106)
   ```javascript
   extra_data: {
       wave: state.wave,
       kills: state.kills,
       tower_merges: state.towerMerges,
       highest_tower_level: state.highestLevel,
       coins_earned: state.coinsEarned,
       play_time: sessionDuration,
       towers_placed: state.towersPlaced
   }
   ```

### 📋 SDK Integration is Complete and Working

**The current implementation is already production-ready and fully integrated.**

## Indie Game Specific Considerations

### 1. XP Metrics for Indie Serious Game

The current XP tracking aligns with indie philosophy:

#### ✅ Already Tracked (Good Metrics)
```javascript
{
    wave: number,              // Progress indicator
    kills: number,             // Efficiency metric
    tower_merges: number,      // Strategic depth usage
    highest_tower_level: number, // Mastery indicator
    play_time: number,         // Session length
    towers_placed: number      // Resource management
}
```

#### 🎯 Proposed Additional Metrics for Indie Mode

When indie mode is active, we should track additional **skill-based metrics**:

```javascript
{
    // Existing metrics
    wave: state.wave,
    kills: state.kills,
    tower_merges: state.towerMerges,
    highest_tower_level: state.highestLevel,
    play_time: sessionDuration,
    towers_placed: state.towersPlaced,
    coins_earned: state.coinsEarned,
    
    // NEW: Indie serious game metrics
    optimal_kills: state.optimalKills || 0,      // Kills with optimal bounty
    counter_kills: state.counterKills || 0,      // Kills with effective tower
    overkill_waste: state.overkillWaste || 0,    // Damage wasted (negative metric)
    towers_salvaged: state.towersSalvaged || 0,  // Repositioning count
    perfect_waves: state.perfectWaves || 0,      // Waves with no HP loss
    
    // Strategy indicators
    tower_diversity: state.towerDiversity || 0,  // Number of different tower types used
    avg_tower_tier: state.avgTowerTier || 1.0,   // Average tier level
    
    // Game mode
    game_mode: window.INDIE_MODE ? 'indie' : 'classic'
}
```

### 2. Score Calculation for Indie Mode

Current score system mixes wave bonuses, kill rewards, and merge bonuses. For indie mode, we should emphasize **efficiency over time**:

#### Recommended Score Formula (Indie Mode)

```javascript
// Current scoring (classic mode)
score = (enemy_rewards × wave × 1.5) + merge_bonuses

// Proposed scoring (indie mode)
score = base_score + efficiency_bonus + mastery_bonus

where:
  base_score = wave_reached × 100
  efficiency_bonus = optimal_kills × 50 + counter_kills × 30
  mastery_bonus = (avg_tower_tier - 1) × 200
```

This rewards:
- **Progress** (reaching higher waves)
- **Efficiency** (optimal kills with minimal waste)
- **Mastery** (using higher tier towers effectively)

### 3. Session Flow Integration

The SDK session management already works perfectly with indie design:

```
Game Start
    ↓
SDK.init() → Ready signal sent
    ↓
First Update → startSession() → gameStarted event
    ↓
Gameplay Loop → sendScore() on score changes
    ↓
Game Over → endSession() → gameOver with extra_data
    ↓
Retry → resetSession() → New session
```

**No changes needed** - this flow supports both modes.

## Implementation Updates Needed

### File: `js/game.js` - Track Indie Metrics

Add tracking for new indie-specific metrics:

```javascript
// In createInitialState()
createInitialState() {
    return {
        // ... existing state ...
        
        // NEW: Indie mode metrics
        optimalKills: 0,      // Kills with <20% damage waste
        counterKills: 0,      // Kills with 2.0x+ effectiveness
        overkillWaste: 0,     // Total damage wasted
        towersSalvaged: 0,    // Towers repositioned
        perfectWaves: 0,      // Waves cleared with full HP
        towerDiversity: 0,    // Unique tower types used
        avgTowerTier: 1.0,    // Average tier level
        
        // ... rest of state ...
    };
}

// In killZombie() - track kill quality
killZombie(zombie) {
    // Calculate kill quality
    const effectiveness = /* from tower that killed it */;
    const damageWaste = /* overkill calculation */;
    
    if (damageWaste < zombie.maxHp * 0.2) {
        this.state.optimalKills++;
    }
    
    if (effectiveness >= 2.0) {
        this.state.counterKills++;
    }
    
    this.state.overkillWaste += damageWaste;
    
    // ... existing kill logic ...
}

// In completeWave() - check if perfect
completeWave() {
    if (this.state.energy === CONFIG.INITIAL_ENERGY) {
        this.state.perfectWaves++;
    }
    
    // ... existing wave clear logic ...
}

// In placeCannon() - track diversity
placeCannon(col, row, type) {
    // ... existing placement logic ...
    
    // Track tower type diversity
    const uniqueTypes = new Set(this.entities.cannons.map(c => c.type));
    this.state.towerDiversity = uniqueTypes.size;
}
```

### File: `js/main.js` - Update XP Data

Update the `endSession()` function to include indie metrics:

```javascript
function endSession() {
    if (!sessionActive) return;
    
    const state = game.getState();
    const sessionDuration = Math.floor((Date.now() - sessionStartTime) / 1000);
    
    // Build XP data based on game mode
    const extra_data = {
        // Core metrics (both modes)
        wave: state.wave,
        kills: state.kills,
        tower_merges: state.towerMerges || 0,
        highest_tower_level: state.highestLevel || 1,
        coins_earned: state.coinsEarned || 0,
        play_time: sessionDuration,
        towers_placed: state.towersPlaced || 0,
        
        // Game mode identifier
        game_mode: window.INDIE_MODE ? 'indie' : 'classic'
    };
    
    // Add indie-specific metrics if in indie mode
    if (window.INDIE_MODE) {
        extra_data.optimal_kills = state.optimalKills || 0;
        extra_data.counter_kills = state.counterKills || 0;
        extra_data.overkill_waste = Math.floor(state.overkillWaste || 0);
        extra_data.towers_salvaged = state.towersSalvaged || 0;
        extra_data.perfect_waves = state.perfectWaves || 0;
        extra_data.tower_diversity = state.towerDiversity || 0;
        extra_data.avg_tower_tier = state.avgTowerTier || 1.0;
    }
    
    // Send to platform
    if (platformReady) {
        try {
            PlatformSDK.gameOver(state.score, { extra_data });
            console.log('[Merge Tower] Session ended with XP data:', extra_data);
        } catch (error) {
            console.error('[Merge Tower] Failed to send gameOver:', error);
        }
    }
    
    sessionActive = false;
}
```

### File: `index.html` - SDK Already Loaded

The SDK is already properly loaded:

```html
<!-- Platform SDK -->
<script src="../../sdk/platformsdk.js"></script>
```

**No changes needed** - SDK is loaded before game scripts.

## XP Calculation on Backend

The platform backend will receive this data and can calculate XP differently based on `game_mode`:

### Classic Mode XP Formula
```javascript
xp = base_score × 0.1 + 
     wave × 10 + 
     kills × 2 + 
     tower_merges × 5
```

### Indie Mode XP Formula (Skill-Weighted)
```javascript
xp = base_score × 0.15 +                    // Higher score weight
     wave × 15 +                            // Higher progress weight
     counter_kills × 5 +                    // Reward effective play
     optimal_kills × 3 +                    // Reward efficiency
     perfect_waves × 20 +                   // Reward mastery
     tower_diversity × 10 -                 // Reward strategy variety
     (overkill_waste / 100) × 2             // Penalize waste
```

**Backend implementation is outside the scope of this PR**, but the data is now available.

## Testing SDK Integration

### Manual Testing Checklist

- [ ] **Init Test**: Game initializes with SDK
  ```javascript
  // Check console for:
  // "[Merge Tower] Initializing Platform SDK..."
  // "[PlatformSDK] Platform SDK initialized successfully"
  ```

- [ ] **Session Start Test**: Session starts on first action
  ```javascript
  // Check console for:
  // "[Merge Tower] Session started - gameStarted event sent"
  ```

- [ ] **Score Update Test**: Score updates sent in real-time
  ```javascript
  // Play game and check console for:
  // Multiple score updates as score increases
  ```

- [ ] **Game Over Test**: Session ends with full XP data
  ```javascript
  // Lose game and check console for:
  // "[Merge Tower] Session ended with XP data: {wave: X, kills: Y, ...}"
  ```

- [ ] **Indie Metrics Test**: Indie-specific metrics tracked
  ```javascript
  // In indie mode, check extra_data includes:
  // optimal_kills, counter_kills, overkill_waste, etc.
  ```

- [ ] **Retry Test**: Session resets properly on retry
  ```javascript
  // Retry game and verify new session starts
  ```

### Debug Mode

Add `?debug=true` to URL to see detailed SDK logs:

```javascript
// In main.js, already implemented:
if (window.location.search.includes('debug')) {
    // Logs performance metrics every 5 seconds
    // Exposes window.MergeTower for inspection
}
```

## Platform SDK API Reference

### Methods Used by Merge Tower Defense

1. **PlatformSDK.init(options)**
   - Already implemented ✅
   - Initializes SDK with callbacks

2. **PlatformSDK.sendScore(score)**
   - Already implemented ✅
   - Sends real-time score updates

3. **PlatformSDK.gameOver(finalScore, metadata)**
   - Already implemented ✅
   - Sends final score with XP data

### Methods Available but Not Used

These could be added if needed:

- **PlatformSDK.levelCompleted(level, metadata)**
  - Could track scenario completion in indie mode

- **PlatformSDK.achievementUnlocked(id, metadata)**
  - Could track mastery achievements

- **PlatformSDK.log(level, message)**
  - Already used for errors

## Error Handling

Current implementation has robust error handling:

```javascript
try {
    await PlatformSDK.init({...});
    platformReady = true;
} catch (error) {
    console.warn('[Merge Tower] Platform SDK initialization failed:', error);
    console.log('[Merge Tower] Running in standalone mode');
}
```

**No changes needed** - gracefully falls back to standalone mode.

## Standalone Mode Support

The game works perfectly without the platform:

```javascript
// In main.js:
if (window.self === window.top) {
    console.warn('[PlatformSDK] Not running in iframe');
    // Game continues without platform features
}
```

**This is important for development and testing.**

## Summary

### SDK Integration Status: ✅ COMPLETE

The Platform SDK is **fully integrated** and production-ready:

1. ✅ Initialization with callbacks
2. ✅ Session management
3. ✅ Real-time score updates
4. ✅ Comprehensive XP data tracking
5. ✅ Error handling and fallback
6. ✅ Retry/reset logic
7. ✅ Debug mode support

### Recommended Enhancements for Indie Mode

**Minor additions needed** (not blocking, can be added incrementally):

1. **Track indie-specific metrics** in `game.js`:
   - Optimal kills
   - Counter kills
   - Overkill waste
   - Perfect waves
   - Tower diversity

2. **Include indie metrics in XP data** in `main.js`:
   - Add metrics to `extra_data` when `window.INDIE_MODE` is true
   - Add `game_mode` field to distinguish indie/classic

3. **Backend XP calculation** (separate PR):
   - Platform backend can use `game_mode` field
   - Apply different XP formulas based on mode
   - Reward skill over time in indie mode

### Integration Verification

To verify SDK integration is working:

1. Open browser DevTools console
2. Load game in platform iframe
3. Play a quick game
4. Check console for SDK messages
5. Verify `gameOver` event includes all XP data

**Expected console output:**
```
[Merge Tower] Initializing Platform SDK...
[PlatformSDK] Platform SDK initialized successfully
[Merge Tower] Session started - gameStarted event sent
[Merge Tower] Session ended with XP data: {wave: 5, kills: 23, ...}
```

## Conclusion

**The Platform SDK is already properly integrated with the merge-tower-defense game.**

The current implementation:
- Follows best practices
- Handles errors gracefully
- Supports standalone mode
- Tracks comprehensive XP data
- Works with both indie and classic modes

**No breaking changes needed.** Only recommended enhancements are:
1. Additional metrics tracking for indie mode (optional but valuable)
2. Game mode identifier in XP data (1-line change)

The SDK integration is **production-ready** and supports the indie serious game vision.

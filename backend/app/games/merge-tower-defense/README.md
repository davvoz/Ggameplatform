# 🎮 Merge Tower Defense - Elite Defense Force

## 📋 Overview

A professional, mobile-first tower defense game with advanced merge mechanics. Built entirely in vanilla JavaScript with sprite-based rendering and optimized performance.

## ✨ Key Features

### Advanced Merge System
- **Tap to Select**: Tap 3 cannons of the same type and level to merge
- **Drag to Merge**: Drag cannons onto each other for quick merging
- **7 Merge Levels**: Progressive power scaling up to legendary tier
- **Strategic Positioning**: Move cannons freely in the defense zone

### Diverse Arsenal
- **Basic Turret** 🔫 - Balanced all-rounder
- **Rapid Fire** ⚡ - High DPS for swarms
- **Sniper** 🎯 - Long-range precision
- **Splash Cannon** 💥 - Area damage
- **Freeze Tower** ❄️ - Crowd control
- **Laser Beam** 🔆 - Piercing attacks
- **Electric Chain** ⚡ - Multi-target damage

### Enemy Variety
- **Shambler** 🧟 - Basic zombie
- **Runner** 🧟‍♂️ - Fast and agile
- **Brute** 🧟‍♀️ - High health tank
- **Leaper** 🦇 - Can dodge attacks
- **Juggernaut** 🛡️ - Armored enemy
- **Overlord** 👹 - Boss with special abilities

### Professional Polish
- **Sprite-Based Rendering** - Smooth animations and effects
- **Object Pooling** - Optimized performance
- **Particle System** - Rich visual feedback
- **Mobile-First** - Touch-optimized controls
- **Responsive Design** - Adapts to any screen size

## 🎯 Gameplay

### Objective
Defend your territory by placing and merging turrets to stop waves of zombies from reaching the red line.

### Controls
- **Tap** - Select turrets or place new ones
- **Drag** - Move turrets or quick-merge
- **Shop** - Select turret type at the bottom

### Strategy Tips
1. **Start Strong**: Place basic turrets to build economy
2. **Merge Early**: Level 2 turrets are 2.2x more powerful
3. **Mix Types**: Use freeze + damage combos
4. **Position Wisely**: Snipers in back, splash in front
5. **Save Coins**: Higher merges give exponential power

### Merge System
- Merge 3 identical turrets of the same level
- Each merge doubles effectiveness
- Maximum level: 7 (70x base damage!)
- Strategic positioning is key

## 🏗️ Architecture

### Modular Design
```
merge-tower-defense/
├── index.html          # Entry point (minimal)
├── js/
│   ├── config.js       # Game configuration
│   ├── utils.js        # Utility functions
│   ├── graphics.js     # Rendering engine
│   ├── entities.js     # Game entities (cannons, zombies, projectiles)
│   ├── particles.js    # Particle effects system
│   ├── input.js        # Touch/mouse input handler
│   ├── ui.js           # UI rendering and interaction
│   ├── game.js         # Core game logic
│   └── main.js         # Initialization & SDK integration
```

### Performance Optimizations
- **Canvas Caching**: Pre-rendered grid
- **Object Pooling**: Reuse projectiles and particles
- **Delta Time**: Smooth 60 FPS gameplay
- **Sprite Batching**: Efficient emoji rendering
- **Memory Management**: Automatic cleanup

### Platform SDK Integration
- ✅ Score tracking with real-time updates
- ✅ Game session management
- ✅ Pause/Resume handling
- ✅ Game Over with extra_data
- ✅ XP distribution with detailed breakdown
- ✅ Ready signal on initialization

## 🚀 Improvements Over Zombie Tower

### Technical
1. **Fully Modular** - Separated concerns, maintainable code
2. **ES6+ Features** - Classes, async/await, modern syntax
3. **Better Performance** - Object pooling, caching, optimization
4. **Mobile-First** - Touch-optimized from the ground up
5. **Scalable** - Easy to add new features

### Gameplay
1. **Deeper Strategy** - 7 turret types with unique mechanics
2. **Advanced Merge** - Drag & drop, auto-merge, visual feedback
3. **Larger Defense Zone** - 4 rows instead of 3 (33% more space!)
4. **Enemy Variety** - 6 zombie types with special abilities
5. **Progressive Difficulty** - Dynamic wave composition
6. **Rich Feedback** - Particle effects, animations, sound-ready

### Visual
1. **Sprite-Based System** - Professional rendering
2. **Smooth Animations** - Eased movements, no jank
3. **Particle Effects** - Explosions, merges, damage numbers
4. **Glow Effects** - Dynamic shadows and highlights
5. **Polished UI** - Modern, clean interface

## 🎨 Visual Design

### Color Scheme
- Primary: Electric Green (#00ff88)
- Secondary: Cyan (#00ddff)
- Warning: Gold (#ffaa00)
- Danger: Red (#ff3333)
- Background: Deep Space (#0a0a0a)

### Typography
- Font: Arial (universal compatibility)
- Sizes: Responsive, scales with screen
- Effects: Shadows, glows, outlines

## 📱 Mobile Optimization

- Touch-first input system
- No accidental zoom or scroll
- Optimized for portrait orientation
- Responsive grid sizing
- Large, tappable targets
- Visual feedback on all interactions

## 🔧 Configuration

All game parameters are in `config.js`:
- Grid size and layout
- Starting resources
- Wave progression
- Turret stats
- Enemy stats
- Merge progression
- Performance limits

## 🐛 Debug Mode

Add `?debug` to URL for:
- FPS counter
- Entity counts
- Performance metrics
- Console logging
- Global access via `window.MergeTower`

## 📊 Scoring System

- **Base Score**: Enemy rewards × wave number × 1.5
- **Merge Bonus**: 100 × 2^(level-1)
- **Wave Clear**: Wave number × 50
- **Combo System**: Future feature ready

## 🎮 Platform Integration

### Session Tracking
- Automatic session start on first game action
- Session end on game over with detailed stats
- Score updates in real-time

### Extra Data
```javascript
{
    wave: number,
    kills: number,
    highest_level: number,
    play_time: number (seconds)
}
```

### XP Distribution
Platform SDK handles XP calculation based on:
- Final score
- Wave reached
- Enemies killed
- Highest tower level achieved

## 🚀 Future Enhancements

- [ ] Sound effects and music
- [ ] Power-ups and abilities
- [ ] More enemy types
- [ ] Boss battles
- [ ] Achievements
- [ ] Leaderboards
- [ ] Daily challenges
- [ ] Custom maps

## 📄 License

Part of the G Game Platform ecosystem.

## 👥 Credits

Built with ❤️ for the G Game Platform
- Professional JavaScript architecture
- Optimized for mobile gaming
- Platform SDK integrated
- Ready for production

---

**Have fun defending! 🎮⚔️🧟**

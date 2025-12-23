# Merge Tower Defense

## Overview

A tactical tower defense game focused on strategic depth, specialization, and meaningful decision-making. Every tower excels in one context and fails in another. Every enemy presents a specific tactical problem. Victory comes from understanding, not grinding.

## Core Gameplay

### Specialization System
Five tower types, each designed as a hard counter to specific threats:
- **PIERCER** - Line-penetrating shots. Eliminates priority targets. Weak against armor.
- **DISRUPTOR** - Area control and slowing. Stops fast enemies and teleporters. Weak against single targets.
- **DEMOLISHER** - Heavy AoE with armor penetration. Breaks fortifications. Slow and predictable.
- **SENTINEL** - Rapid fire with focus stacking. Shreds fast single targets. Useless against armor.
- **ANCHOR** - Baseline versatility. Marks targets for team damage bonus. Jack of all trades, master of none.

### Tactical Problems
Five enemy types, each requiring specific solutions:
- **SWARM** - Many weak units in tight formation. Overwhelms single-target towers. Counter: AoE damage.
- **CHARGER** - Fast striker that sprints and retreats. Bypasses slow defenses. Counter: High DPS tracking.
- **FORTRESS** - Heavily armored vanguard. Blocks low damage attacks. Counter: Armor penetration.
- **PHANTOM** - Teleporting infiltrator. Unpredictable positioning. Counter: Zone control or alpha strike.
- **VANGUARD** - Baseline threat. Tests overall defense setup. Counter: Any balanced strategy.

### Merge Evolution
Three tier system with qualitative changes:
- **Tier 1** - Base functionality. Place 1 tower.
- **Tier 2** - Unlock passive ability. Merge 3 identical Tier 1 towers.
- **Tier 3** - Transform attack pattern. Merge 3 identical Tier 2 towers.

Example: SENTINEL evolution
- Tier 1: Rapid fire
- Tier 2: "Lock On" - Stacking damage bonus on same target
- Tier 3: "Terminator" - Execute enemies below 20% HP

### Deterministic Waves
No randomness. Waves are authored tactical challenges with intended solutions. Each wave composition creates specific problems requiring specific tower combinations and positioning.

## Gameplay Philosophy

### Objective
Survive 10+ waves of composed enemy formations. Each wave is a designed puzzle with intended counter-strategies.

### Controls
- **Click/Tap** - Select towers, place new ones
- **Right Click** - Salvage tower for resources
- **Hover** - Preview tower range and effectiveness

### Strategic Principles
1. **Read the Wave** - Identify enemy composition before spawning
2. **Counter-Build** - Place towers that counter the specific threats
3. **Positioning** - Tower placement determines engagement timing
4. **Resource Management** - Every coin spent has opportunity cost
5. **Merge Timing** - Balance immediate power vs. future flexibility

### Core Loop
1. Assess incoming wave composition
2. Identify primary threats
3. Place countering towers
4. Engage and adapt
5. Salvage inefficient towers
6. Iterate for next wave

No grinding. No RNG. Pure tactical decision-making.

## Architecture

### Modular, Data-Driven Design
```
merge-tower-defense/
├── DESIGN.md              # Design philosophy and vision
├── IMPLEMENTATION.md      # Technical roadmap
├── index.html            # Entry point
├── js/
│   ├── config-indie.js   # Indie serious game config (NEW)
│   ├── config.js         # Legacy casual config (deprecated)
│   ├── systems/          # Game systems (NEW)
│   │   ├── combat-system.js
│   │   ├── wave-director.js
│   │   ├── economy-system.js
│   │   └── scenario-manager.js
│   ├── entities.js       # Game entities (refactored)
│   ├── graphics.js       # Rendering (geometric mode added)
│   ├── game.js           # Core game logic (refactored)
│   └── main.js           # Initialization
```

### Design Principles
- **No Hard-Coded Logic**: All values data-driven
- **Effectiveness Matrix**: Tower-enemy relationships explicit
- **Deterministic**: No random elements in core gameplay
- **Modular**: Systems are independent and composable
- **Extensible**: Easy to add new towers, enemies, waves

### Technical Features
- **Object Pooling**: Optimized memory usage
- **Delta Time**: Frame-independent physics
- **Feature Flags**: Indie/Classic mode toggle
- **Canvas Rendering**: Clean geometric visuals
- **Platform SDK**: Integration with game platform

## Design Philosophy

### Functional Minimalism
- Fewer mechanics, all meaningful
- Every system interacts with others
- No gratuitous randomness
- Victory through understanding

### Specialization Over Generalization
- No "best" tower that works everywhere
- Every tool excels in one context, fails in another
- Player must adapt strategy per wave

### Deterministic Challenge
- Waves are authored puzzles, not random spawns
- Enemies have readable patterns
- Difficulty from composition, not inflated stats

### Short, Intense Sessions
- 10-15 minute complete runs
- Constant decision-making
- Minimal downtime between waves
- Flow state focused

### Visual Clarity
- Geometric shapes, not decorative sprites
- Information-dense UI
- Every pixel serves gameplay
- Immediate feedback on effectiveness

## Configuration

All gameplay values are data-driven and externalized in `config-indie.js`:
- Tower stats and effectiveness matrices
- Enemy behaviors and counters
- Wave compositions
- Economy parameters
- Progression unlocks

Easy to balance, extend, and modify without touching code.

## Development Mode

Add `?mode=classic` to URL for legacy casual mode (emoji-based, random waves).
Default is indie serious mode (geometric, deterministic).

## Strategy Guide

### Tower-Enemy Counter Matrix
```
Tower      | SWARM | CHARGER | FORTRESS | PHANTOM | VANGUARD
-----------|-------|---------|----------|---------|----------
PIERCER    | Weak  | Strong  | Weak     | Strong  | Normal
DISRUPTOR  | Strong| Weak    | Weak     | Strong  | Normal
DEMOLISHER | Strong| Weak    | Strong   | Weak    | Normal
SENTINEL   | Weak  | Strong  | Weak     | Strong  | Normal
ANCHOR     | Normal| Normal  | Normal   | Normal  | Normal
```

### Opening Strategies
1. **Balanced Start**: 2x ANCHOR for economy and marking
2. **Rush Counter**: 1x DISRUPTOR center, 1x SENTINEL flanks
3. **Tank Counter**: Save for early DEMOLISHER

### Merge Priorities
- Tier 2: Immediate power spike, unlock abilities
- Tier 3: Win condition, transforms gameplay
- Don't over-merge early: Flexibility > raw power

### Common Mistakes
- Building generalist defense (all ANCHOR)
- Over-investing in single tower type
- Merging too early before seeing wave pattern
- Ignoring salvage option when tower becomes obsolete

## Technical Details

### Debug Mode
Add `?debug` to URL for:
- FPS counter
- Entity counts
- Effectiveness indicators
- Wave preview

### Performance
- Target: 60 FPS stable
- Max entities: 50 enemies, 28 towers, 50 projectiles
- Canvas-based rendering with geometric primitives
- Object pooling for particles and projectiles

## Roadmap

### Phase 1: Core Mechanics (Current)
- [x] Design document and vision
- [x] Indie configuration system
- [ ] Tower specialization implementation
- [ ] Enemy behavior patterns
- [ ] Deterministic wave system
- [ ] Geometric renderer

### Phase 2: Polish
- [ ] Balance pass on all waves
- [ ] Visual clarity improvements
- [ ] Audio design (minimal, functional)
- [ ] Tutorial integration

### Phase 3: Progression
- [ ] Scenario system (15 challenges)
- [ ] Doctrine choices
- [ ] Mastery unlocks

### Phase 4: Release
- [ ] Final balance
- [ ] Platform integration
- [ ] Performance optimization

## Contributing

This game is focused on depth, not breadth. New features must:
1. Interact with existing systems
2. Create meaningful decisions
3. Avoid power creep
4. Maintain clarity

See DESIGN.md for philosophy and IMPLEMENTATION.md for technical details.

## License

Part of the G Game Platform ecosystem.

---

**Master the counters. Control the field. Win through understanding.**

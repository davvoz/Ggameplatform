# Core Mechanics Explanation

## Design Rationale

This document explains the mechanical choices and how they align with the indie serious game philosophy.

## 1. Tower Specialization System

### Problem with Generalist Towers
In the old system, all towers were somewhat effective against all enemies. This created a false choice: the player just builds the "best" tower (highest damage per cost) everywhere.

**Old system**:
```
BASIC vs TANK: 1.0x effectiveness
SNIPER vs TANK: 1.2x effectiveness
→ Player conclusion: "Just build SNIPER everywhere"
```

### Solution: Hard Counters
Each tower is now designed as a HARD counter to specific enemies and WEAK against others.

**New system**:
```
PIERCER vs FORTRESS: 0.4x (terrible)
DEMOLISHER vs FORTRESS: 3.0x (essential)
→ Player must identify threats and counter-build
```

### Mechanical Implementation

Each tower has an effectiveness matrix:
```javascript
SENTINEL: {
    effectiveness: {
        SWARM: 0.7,      // 30% less damage
        CHARGER: 2.5,    // 150% more damage
        FORTRESS: 0.3,   // 70% less damage
        // ...
    }
}
```

This creates **meaningful choice**:
- Wrong tower = wasted resources
- Right tower = efficient defense
- No tower works everywhere

### Why This Creates Depth

1. **Information advantage**: Player who understands counters wins
2. **Positioning matters**: Tower placement determines which enemies it engages
3. **Resource tension**: Can't afford all tower types, must predict threats
4. **Adaptation required**: Each wave demands different strategy

## 2. Enemy Behavior Patterns

### Problem with HP Bags
Old enemies were just health bars with different speeds. The only question was "how much damage do I need?" Not interesting.

**Old design**:
```
TANK: 100 HP, 0.5 speed
FAST: 20 HP, 1.5 speed
→ Player just scales damage proportionally
```

### Solution: Tactical Behaviors
Each enemy is a specific problem requiring specific solution.

**CHARGER behavior**:
```javascript
pattern: 'SPRINT_RETREAT'
- Sprints forward for 2 seconds (speed 2.5)
- Retreats backward for 1.5 seconds (speed 0.8)
- Repeats cycle
```

This creates a problem:
- Slow-firing towers (DEMOLISHER, PIERCER) miss during retreat
- Player MUST use high-DPS tracking tower (SENTINEL)
- Or time shots perfectly during sprint phase

**PHANTOM behavior**:
```javascript
pattern: 'PHASE_SHIFT'
- Teleports forward 3 cells every 4 seconds
- Invulnerable for 0.5s after teleport
```

This creates a problem:
- Unpredictable position makes targeted fire unreliable
- Player MUST use DISRUPTOR (prevents teleport) or PIERCER (anticipates line)
- Or accept losses

### Why This Creates Depth

1. **Readable patterns**: Player can learn and predict
2. **Multiple solutions**: Different viable strategies exist
3. **Counter-play**: Specific tools shut down specific behaviors
4. **Emergent complexity**: Combining different enemies creates new problems

## 3. Deterministic Wave Design

### Problem with Random Spawns
Old system used weighted random generation. Problems:
- Player can't prepare for unknown threats
- Sometimes get lucky/unlucky compositions
- No skill expression in reading the meta

**Old system**:
```javascript
spawnZombie() {
    const type = weightedRandom([
        { type: 'NORMAL', weight: 10 },
        { type: 'FAST', weight: 5 },
        // ... RNG determines difficulty
    ]);
}
```

### Solution: Authored Waves
Each wave is a designed tactical scenario with intended solutions.

**New system**:
```javascript
WAVE_8: {
    composition: [
        { type: 'FORTRESS', count: 1, lane: 'center', delay: 0 },
        { type: 'SWARM', count: 8, lane: 'flanks', delay: 2000 },
        { type: 'CHARGER', count: 2, lane: 'center', delay: 4000 }
    ],
    solution_hint: "FORTRESS shields SWARM. Penetrate with DEMOLISHER first."
}
```

This creates a puzzle:
1. FORTRESS spawns center, blocks damage
2. SWARM spawns on flanks 2s later, protected by FORTRESS
3. CHARGER spawns center 4s later, sprints through

Intended solution path:
- Player sees FORTRESS + SWARM combo
- Places DEMOLISHER to break armor
- Places DISRUPTOR on flanks to slow SWARM
- FORTRESS dies, SWARM exposed to AoE damage
- SENTINEL ready for CHARGER sprint phase

### Why This Creates Depth

1. **Preparation**: Player can read wave before it spawns
2. **Optimization**: Find most efficient solution
3. **Mastery**: Learn wave patterns, execute perfectly
4. **Replayability**: Try different solutions to same puzzle

## 4. Merge Tier System

### Problem with Exponential Scaling
Old merge system just multiplied stats:
```
Level 1: 10 damage
Level 2: 22 damage (2.2x)
Level 3: 60 damage (6x)
→ Just bigger numbers, same gameplay
```

### Solution: Qualitative Evolution
Merge tiers unlock new mechanics and transform gameplay.

**SENTINEL evolution example**:

**Tier 1** (Base):
```javascript
stats: {
    damage: 6,
    fireRate: 400
}
// Rapid fire, no special mechanics
```

**Tier 2** (3 merged):
```javascript
ability: 'LOCK_ON',
focusBonus: 0.15,  // +15% per consecutive hit
maxStacks: 10
// Same fire rate, but damage ramps up on same target
// 1st hit: 6 damage
// 5th hit: 10.5 damage (1.75x)
// 10th hit: 15 damage (2.5x)
```

**Tier 3** (9 merged):
```javascript
ability: 'TERMINATOR',
executionThreshold: 0.2
// Adds: Instantly kills enemies below 20% HP
// Transforms role from DPS to finisher
```

This progression:
- Tier 1: Generic rapid fire
- Tier 2: Specialist in sustained single-target DPS
- Tier 3: Execution specialist, combines with burst damage towers

### Why This Creates Depth

1. **Role transformation**: Tower function changes with tier
2. **Synergy opportunities**: Tier 3 abilities combo with other towers
3. **Strategic timing**: When to merge vs. maintain flexibility
4. **Build paths**: Different tier focuses create different playstyles

## 5. Resource Economy

### Problem with Passive Generation
Old system had:
- Passive coin generation
- Energy regeneration
- Guaranteed wave clear bonuses

Result: Player waits for resources, no risk in spending.

### Solution: Earned Scarcity
New system:
- **No passive generation**: Every coin from kills only
- **No energy system**: Removed to increase tension
- **Bounty quality**: Rewards efficient play

**Bounty multipliers**:
```javascript
OVERKILL: 0.5x    // Killed with >150% HP overkill
NORMAL: 1.0x      // Standard kill
OPTIMAL: 1.5x     // Killed with <20% wasted damage
COUNTER: 1.8x     // Killed with effective tower type
```

Example:
```
SWARM has 15 HP, worth 8 coins

Case A: DEMOLISHER (25 damage) hits
- Overkill: 10 damage wasted (66%)
- Bounty: 8 × 0.5 = 4 coins

Case B: DISRUPTOR (8 damage) hits, marked by ANCHOR (+15%)
- Damage: 8 × 1.15 = 9.2
- Wasted: 0 damage (optimal)
- Effectiveness: 2.0 (counter)
- Bounty: 8 × 1.5 × 1.8 = 21.6 coins (rounded to 22)

Result: Optimal play gives 5x more resources
```

**Salvage system**:
```javascript
SALVAGE_RATE: 0.6  // Get 60% of cost back
```

Allows repositioning but at cost:
- Build DEMOLISHER for wave 3 (FORTRESS): 140 coins
- Wave 4 has no FORTRESS
- Salvage: Get 84 coins back
- Net cost of temporary tower: 56 coins
- Decision: Is flexibility worth 56 coins?

### Why This Creates Depth

1. **Efficiency matters**: Optimal play significantly rewarded
2. **Repositioning costs**: Can adapt but at resource cost
3. **Planning ahead**: Must predict multiple waves
4. **Risk/reward**: Invest early or save for later?

## 6. No Random Elements

### Why Remove RNG?

RNG creates false difficulty:
- Player loses to bad luck, not bad decisions
- Optimal strategy becomes "pray for good RNG"
- Can't learn and improve systematically

### Deterministic Systems

Every outcome is deterministic:

1. **Tower effectiveness**: Fixed multipliers
2. **Wave composition**: Authored, known in advance
3. **Enemy behavior**: Predictable patterns
4. **Damage calculation**: No critical hits, no dodge RNG
5. **Resource rewards**: Based on execution quality, not luck

**Old AGILE enemy**:
```javascript
dodgeChance: 0.25  // 25% chance to dodge
// Player shoots: RNG determines if hit
// No counterplay, just dice roll
```

**New PHANTOM enemy**:
```javascript
pattern: 'PHASE_SHIFT'
teleportInterval: 4000  // Teleports every 4 seconds
// Player can predict and prepare
// Counterplay: DISRUPTOR prevents teleport
```

### Why This Creates Depth

1. **Skill expression**: Better players consistently win
2. **Learning curve**: Players can study and improve
3. **Fair difficulty**: Losses are due to mistakes, not RNG
4. **Optimization**: Can theoretically find perfect solution

## 7. Horizontal Progression

### Problem with Vertical Scaling
Traditional tower defense progression:
- Unlock stronger towers
- Grind to afford them
- Trivialize earlier content
- Power creep

### Solution: Sidegrades and Trade-offs

**Doctrine system**:
```javascript
AGGRESSIVE: {
    effect: 'Tower damage +30%, cost +20%',
    disabledTowers: ['ANCHOR', 'DISRUPTOR']
}
```

Choosing AGGRESSIVE:
- Gain: More damage (good for burst strategies)
- Lose: Can't use support/control towers
- Lose: Higher costs (fewer total towers)

Result: Different playstyle, not strictly better.

**Scenario challenges**:
```javascript
SCENARIO_8: {
    name: 'Minimalist',
    restriction: 'Maximum 15 towers',
    waves: [/* harder compositions */]
}
```

Forces optimization and efficiency, not just brute force.

### Why This Creates Depth

1. **Replayability**: Different doctrines = different strategies
2. **No grind**: Unlocks are sidegrades, not power
3. **Mastery expression**: Constraints force creativity
4. **Permanent interest**: Can't trivialize content with power

## 8. Information Clarity

### Visual Design Principles

Every visual element serves gameplay:

**Tower range indicators**:
```javascript
// On hover, show:
- Tower range circle
- Enemy effectiveness (color-coded)
  - Green: 2.0x or higher (strong counter)
  - White: 0.8x - 1.5x (neutral)
  - Red: Below 0.8x (ineffective)
```

**Damage feedback**:
```javascript
// Color-coded by effectiveness
if (effectiveness >= 2.0) {
    color = '#00ff88'  // Green = effective
} else if (effectiveness <= 0.6) {
    color = '#888888'  // Gray = resisted
} else {
    color = '#ffffff'  // White = normal
}
```

No decorative elements. No screen shake. No floating "+100 AWESOME COMBO!!!" text.

Just: What happened, why it happened, what to do next.

### Why This Creates Depth

1. **Immediate feedback**: Know if strategy is working
2. **Learning aid**: Visual language teaches mechanics
3. **No confusion**: Clear cause and effect
4. **Accessibility**: Information available to all players equally

## Summary of Mechanical Pillars

1. **Hard Counters**: Specialized tools for specific problems
2. **Behavioral Enemies**: Tactical challenges, not stat blocks
3. **Deterministic Design**: Skill-based, not luck-based
4. **Qualitative Progression**: New mechanics, not just bigger numbers
5. **Resource Scarcity**: Earned through efficient play
6. **Horizontal Unlocks**: Trade-offs and constraints, not power creep
7. **Visual Clarity**: Every element serves understanding

All mechanics work together to create:
- High information density
- Frequent meaningful decisions
- Clear win conditions (understand counters)
- Replayability through mastery

No grinding. No RNG. No filler.

Pure tactical depth.

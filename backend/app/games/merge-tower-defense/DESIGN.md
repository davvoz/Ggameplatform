# MERGE TOWER DEFENSE - Design Philosophy

## Vision

Transform from casual mobile prototype to credible indie game with strategic depth. The goal is tension, choice, control, and depth - not a tech demo or casual grind.

## Core Principles

### 1. Functional Minimalism
- Fewer mechanics, all meaningful
- Every system interacts with at least one other system
- No gratuitous randomness
- Victory through understanding, not grinding

### 2. Simple Rules, Deep Decisions
Gameplay revolves around:
- **Positioning**: Tower placement matters tactically
- **Timing**: When to place, when to merge, when to hold resources
- **Resource Management**: Every coin spent has opportunity cost

Every action must create:
- Immediate advantage
- Future risk or constraint

### 3. Real Tactics
- No "general purpose" units
- Every tower excels in one context, fails in another
- Player must read the situation and adapt

### 4. Enemies as Problems
- Enemies designed as puzzles to solve, not HP bags
- Clear patterns that combine for emergent complexity
- Difficulty from composition, not inflated numbers

### 5. Horizontal Progression
- Unlocks open new tactical possibilities
- Unlocks simultaneously close other options
- Meta-game encourages experimentation

### 6. Short, Intense Sessions
- Brief gameplay loops with high intensity
- Frequent decisions, minimal downtime
- Continuous flow state

### 7. Essential UX
- UI never invasive
- Visual and audio feedback always readable
- No verbose tutorials needed

### 8. Coherent Art Direction
- Consistent, sober, recognizable style
- No superfluous effects
- Beauty through clarity

## Mechanics Refactoring

### Current Problems (Casual Elements to Remove)

1. **Emojis and Frivolous Visuals**
   - Replace with professional geometric/abstract art
   - Remove casual aesthetic (💰🧟‍♂️⚡)
   - Clean, functional design only

2. **Generic Tower Types**
   - Current: All towers somewhat useful against all enemies
   - Problem: No meaningful choice, just "get biggest number"

3. **HP Inflation**
   - Enemies are just health bags with speed variations
   - No tactical distinctiveness

4. **Vertical Progression**
   - Current: Merging just increases numbers exponentially
   - Problem: Grind to bigger numbers, no tactical evolution

5. **Random Wave Generation**
   - Weighted random spawns lack intentional challenge
   - No readable patterns for player to master

6. **Passive Healing/Regeneration**
   - Energy regeneration reduces tension
   - Makes defensive mistakes less costly

### Core Mechanics: New Design

#### Tower System - Specialization & Counter-Play

**Design Rule**: Every tower is a HARD counter to one enemy type, WEAK against another.

Tower Types (5 total, down from 7):

1. **PIERCER** (replaces Sniper + Laser)
   - Excels at: Line formations, priority elimination
   - Weak against: Spread enemies, armor
   - Mechanics: Single powerful shot, pierces 3 enemies in line
   - Cost: High, slow fire rate
   - Tactical role: Eliminate key targets behind frontline

2. **DISRUPTOR** (replaces Freeze + Electric)
   - Excels at: Stopping fast enemies, breaking formations
   - Weak against: Single targets, spread formation
   - Mechanics: Area slow effect, chains between nearby enemies
   - Cost: Medium, area effect
   - Tactical role: Create kill zones, buy time

3. **DEMOLISHER** (replaces Splash)
   - Excels at: Clustered enemies, armored targets
   - Weak against: Fast single targets, spread formation
   - Mechanics: Heavy AoE damage, armor penetration
   - Cost: High, very slow
   - Tactical role: Break through armor, punish clustering

4. **SENTINEL** (replaces Rapid)
   - Excels at: Fast single targets, sustained pressure
   - Weak against: Armored enemies, groups
   - Mechanics: Rapid fire, bonus damage on consecutive hits (focus fire)
   - Cost: Low-medium
   - Tactical role: Take down priority targets through DPS

5. **ANCHOR** (replaces Basic)
   - Excels at: Versatile baseline, resource efficiency
   - Weak against: Everything (by design - jack of all trades)
   - Mechanics: Balanced stats, marks targets for other towers (+10% damage)
   - Cost: Low
   - Tactical role: Early game foundation, support synergy

**Tower Effectiveness Matrix**:
```
           | PIERCER | DISRUPTOR | DEMOLISHER | SENTINEL | ANCHOR
-----------|---------|-----------|------------|----------|--------
SWARM      |   0.5   |    2.0    |     2.5    |   0.7    |  1.0
CHARGER    |   2.0   |    0.6    |     0.8    |   2.5    |  1.0
FORTRESS   |   0.4   |    0.8    |     3.0    |   0.3    |  1.0
PHANTOM    |   1.5   |    2.5    |     0.5    |   1.8    |  1.0
VANGUARD   |   1.2   |    1.2    |     1.2    |   1.2    |  1.0
```

#### Enemy System - Tactical Problems

**Design Rule**: Each enemy is a problem requiring specific solution.

Enemy Types (5 total, down from 10+):

1. **SWARM** (many weak units)
   - Problem: Overwhelms single-target towers
   - Counter: DISRUPTOR + DEMOLISHER
   - Tactics: Must use AoE or get overwhelmed
   - Pattern: Spawns in tight clusters of 5-8

2. **CHARGER** (fast single unit)
   - Problem: Bypasses slow-firing defenses
   - Counter: SENTINEL
   - Tactics: Must track and focus fire
   - Pattern: Sprints forward, then retreats to heal

3. **FORTRESS** (heavily armored)
   - Problem: Immune to low-damage sources
   - Counter: DEMOLISHER
   - Tactics: Must penetrate armor or flanked
   - Pattern: Slow advance, protects units behind it

4. **PHANTOM** (teleporting)
   - Problem: Unpredictable positioning
   - Counter: DISRUPTOR (prevents teleport) + PIERCER
   - Tactics: Must zone control or alpha strike
   - Pattern: Teleports every 3-4 seconds forward

5. **VANGUARD** (baseline)
   - Problem: None specifically - tests overall setup
   - Counter: Any tower works
   - Tactics: Resource check, punishes gaps
   - Pattern: Steady advance in loose formation

#### Wave Design - Deterministic Challenges

**Design Rule**: No randomness. Waves are authored puzzles.

Wave Structure:
- Waves 1-5: Tutorial (introduce each enemy type)
- Waves 6-15: Combinations (2 enemy types)
- Waves 16+: Compositions (3+ types, authored scenarios)

Example Wave 8:
```javascript
{
  composition: [
    { type: 'FORTRESS', count: 1, lane: 'center', delay: 0 },
    { type: 'SWARM', count: 8, lane: 'flanks', delay: 2000 },
    { type: 'CHARGER', count: 2, lane: 'center', delay: 4000 }
  ],
  solution_hint: "FORTRESS protects SWARM. Use DEMOLISHER on FORTRESS first, then DISRUPTOR on SWARM"
}
```

#### Merge System - Tactical Evolution

**Design Rule**: Merging changes behavior, not just stats.

Current: Level 3 tower = Level 1 tower × 6 damage
New: Level 2 tower = Level 1 tower + new mechanics

Merge Tiers:
- **Tier 1** (base): Basic function
- **Tier 2** (3 merged): Unlocks passive ability
- **Tier 3** (9 merged): Transforms attack pattern

Example - SENTINEL evolution:
- Tier 1: Rapid single-target fire
- Tier 2: Gains "Lock On" - damage increases 10% per consecutive hit on same target
- Tier 3: "Execution" - kills enemies below 20% HP instantly

Example - DISRUPTOR evolution:
- Tier 1: Slows in small radius
- Tier 2: "Cascade" - slowed enemies slow adjacent enemies
- Tier 3: "Lockdown" - creates permanent slow zone (until tower destroyed)

#### Resource System - Tension & Trade-offs

**Design Rule**: Resources create decisions, not just delays.

Remove:
- Passive coin generation
- Energy regeneration
- Wave clear bonuses

New System:
- **Salvage**: Can sell towers for 60% cost (creates repositioning decision)
- **Bounty**: Each enemy killed grants resources based on how killed:
  - Overkill (>150% HP in one hit): 0.5x resources
  - Optimal (killed with <20% damage wasted): 1.5x resources
  - Weak counter (used ineffective tower): 0.8x resources
- **Risk Pool**: Hold resources for 3 waves = +20% bonus (but may lose the game)

#### Progression System - Horizontal Unlocks

**Design Rule**: Unlocks trade power for versatility.

Campaign Structure (15 scenarios):

Scenario 1-3: Tutorial (all towers available)
Scenario 4-8: "Specialization Arc"
  - Must complete each with ONLY 2 tower types
  - Unlocks "Expert" version of those towers (new Tier 4)
  
Scenario 9-12: "Doctrine Arc"  
  - Choose doctrine: Aggressive / Defensive / Economic
  - Each doctrine locks 2 tower types, buffs others
  - Permanent choice per run
  
Scenario 13-15: "Mastery Arc"
  - Limited tower slots (20 → 15 → 10)
  - Must solve with minimal resources
  - Unlocks "Prestige" cosmetics

No grinding. No daily rewards. No loot boxes.

## Technical Implementation

### Data-Driven Design

All game values in external configs:
```
/data
  /towers
    piercer.json
    disruptor.json
    ...
  /enemies
    swarm.json
    charger.json
    ...
  /waves
    wave_001.json
    wave_002.json
    ...
  /scenarios
    scenario_001.json
    ...
```

### Modular Architecture

```
/systems
  /combat
    damage-calculation.js
    targeting-system.js
  /economy
    resource-manager.js
    bounty-calculator.js
  /progression
    scenario-manager.js
    unlock-system.js
  /ai
    wave-director.js
    enemy-behavior.js
```

### No Hard-Coded Logic

Example BAD:
```javascript
if (tower.type === 'SNIPER') {
  damage *= 2;
}
```

Example GOOD:
```javascript
const effectiveness = TOWER_DATA[tower.type].effectiveness[enemy.type];
damage *= effectiveness;
```

## Visual Direction

### Remove
- All emojis (🧟‍♂️💰⚡❄️)
- Cartoon aesthetics
- "Juicy" effects that obscure information
- Score pop-ups and "+100" floating text

### Add
- Geometric tower designs (think Eufloria, Creeper World)
- Abstract enemy representations (shapes with clear visual language)
- Minimal color palette (3-4 colors max)
- Grid-based clarity
- Information-dense UI (show tower ranges, effectiveness indicators)

### UI Principles
- Every pixel serves gameplay
- No decorative elements
- Instant feedback on hover (show what will happen)
- Clear visual language for:
  - Effective matchups (green indicators)
  - Ineffective matchups (red indicators)  
  - Tower ranges (subtle circles)
  - Enemy paths (predicted trajectory lines)

## Audio Direction (Future)

- No music (or optional minimal ambient)
- Functional sound design:
  - Tower fire: distinct sound per type
  - Enemy death: different sound per type
  - Effective hit: satisfying "thunk"
  - Ineffective hit: weak "tink"
- Accessibility: all information available without sound

## Success Metrics

Not:
- Hours played
- Coins earned
- Highest level reached

But:
- Scenarios completed with minimal towers
- Win rate after understanding counters
- Time to solve novel wave composition
- Player-reported "aha!" moments

## Development Phases

### Phase 1: Core Refactor (Current)
- Remove emojis, update to geometric visuals
- Implement 5-tower system with hard counters
- Create 5-enemy tactical problems
- Author first 15 deterministic waves
- Implement new merge tier system

### Phase 2: Polish & Balance
- Playtest wave compositions
- Tune effectiveness multipliers
- Refine visual clarity
- Write terse in-game tooltips

### Phase 3: Progression
- Implement scenario system
- Add unlock progression
- Create doctrine choices
- Build mastery challenges

### Phase 4: Release
- Final balance pass
- Compress tutorial to 90 seconds
- Ensure 1st scenario teachable in 5 minutes
- Release as focused 2-3 hour experience

## Design Document Version
v1.0 - Initial vision and refactoring plan

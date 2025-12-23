# Quick Start Guide

## For the Impatient Developer

**Want to start coding immediately?** Follow this 15-minute path:

### Step 1: Understand the Vision (3 minutes)
Read the first section of [SUMMARY.md](SUMMARY.md):
- Vision Statement
- Core Philosophy
- What We've Created

**TL;DR**: Transform casual → serious indie through specialization, determinism, and tactical depth.

### Step 2: See the End Goal (2 minutes)
Look at these specific sections in [DESIGN.md](DESIGN.md):
- "Tower System - Specialization & Counter-Play" (the 5 towers)
- "Enemy System - Tactical Problems" (the 5 enemies)
- Example Wave 8

**TL;DR**: 5 specialized towers with hard counters, 5 tactical enemy problems, deterministic waves.

### Step 3: Copy the Pattern (10 minutes)
Open [REFACTORING.md](REFACTORING.md) and study:
- Example 1: Tower Damage Calculation
- Example 2: Enemy Behavior

**TL;DR**: See exact before/after code for implementing the new systems.

### Step 4: Reference the Data (ongoing)
Keep [config-indie.js](js/config-indie.js) open:
- All tower stats and effectiveness values
- All enemy stats and behavior patterns
- All wave compositions

**TL;DR**: Everything is data-driven. Copy patterns, adjust values.

---

## First Implementation Task

**Goal**: Get one specialized tower working with effectiveness matrix.

### Steps:

1. **Create feature flag** (5 minutes)
```javascript
// main.js - add at top
const USE_INDIE_MODE = new URLSearchParams(window.location.search)
    .get('indie') !== 'false'; // Default to indie mode

window.INDIE_MODE = USE_INDIE_MODE;
```

2. **Update Cannon class constructor** (10 minutes)
```javascript
// entities.js - Cannon constructor
constructor(col, row, type) {
    this.col = col;
    this.row = row;
    this.type = type;
    
    if (window.INDIE_MODE) {
        this.loadIndieConfig(); // NEW
    } else {
        this.loadClassicConfig(); // OLD
    }
}

loadIndieConfig() {
    const config = INDIE_TOWERS[this.type];
    if (!config) {
        console.error('Unknown indie tower:', this.type);
        return;
    }
    
    this.damage = config.stats.damage;
    this.fireRate = config.stats.fireRate;
    this.range = config.stats.range;
    this.effectiveness = config.effectiveness;
    this.visual = config.visual;
    // ... rest of stats
}

loadClassicConfig() {
    // Existing code stays here
    const baseStats = CANNON_TYPES[this.type];
    // ...
}
```

3. **Update damage calculation** (15 minutes)
```javascript
// game.js - damageZombie()
damageZombie(zombie, proj, currentTime) {
    let damage = proj.damage;
    
    if (window.INDIE_MODE) {
        // NEW: Use effectiveness matrix
        const tower = proj.sourceTower;
        if (tower && tower.effectiveness) {
            const effectiveness = tower.effectiveness[zombie.type] || 1.0;
            damage *= effectiveness;
            
            // Color-code feedback
            const color = effectiveness >= 2.0 ? '#00ff88' :
                         effectiveness <= 0.6 ? '#888888' : '#ffffff';
            this.particles.createDamageNumber(zombie.col, zombie.row, 
                                             Math.floor(damage), color);
        }
    } else {
        // OLD: Classic damage calculation
        // Existing code
    }
    
    zombie.takeDamage(damage);
    // ... rest
}
```

4. **Test it** (5 minutes)
- Load game with `?indie=true`
- Place an ANCHOR tower (baseline, 1.0x vs all)
- Place a DEMOLISHER tower (3.0x vs FORTRESS)
- Spawn enemies and verify:
  - DEMOLISHER shows green damage numbers vs FORTRESS (effective)
  - DEMOLISHER shows white numbers vs others (normal)

**Total time: ~35 minutes to get first indie feature working**

---

## Testing Your Changes

### Manual Testing
1. Open `index.html?indie=true&debug=true`
2. Place towers in defense zone
3. Verify damage color-coding:
   - Green = effective (≥2.0x)
   - White = normal (0.8-1.5x)
   - Gray = resisted (≤0.6x)

### Console Testing
```javascript
// Check if indie mode active
console.log(window.INDIE_MODE);

// Inspect tower effectiveness
const tower = game.entities.cannons[0];
console.log(tower.effectiveness);

// Manually test damage calc
const testDamage = tower.damage * tower.effectiveness['FORTRESS'];
console.log('Damage vs FORTRESS:', testDamage);
```

---

## Common Pitfalls

### ❌ DON'T: Hard-code values
```javascript
// BAD
if (tower.type === 'DEMOLISHER') {
    damage *= 3.0;
}
```

### ✅ DO: Use data-driven config
```javascript
// GOOD
const effectiveness = INDIE_TOWERS[tower.type].effectiveness[enemy.type];
damage *= effectiveness;
```

### ❌ DON'T: Add emojis in indie mode
```javascript
// BAD
icon: '💥'
```

### ✅ DO: Use geometric shapes
```javascript
// GOOD
visual: { shape: 'square', primaryColor: '#ff8800', icon: '■' }
```

### ❌ DON'T: Use RNG in core gameplay
```javascript
// BAD
if (Math.random() < 0.3) { /* critical hit */ }
```

### ✅ DO: Make outcomes deterministic
```javascript
// GOOD
if (enemy.hp < enemy.maxHp * 0.3) { /* execution threshold */ }
```

---

## Implementation Priority

Implement in this order for fastest validation:

1. ✅ **Tower effectiveness** (easiest, most visible)
   - Update Cannon class
   - Update damage calculation
   - ~30 minutes

2. ✅ **Enemy behaviors** (moderate difficulty)
   - Create IndieEnemy class
   - Implement CHARGER sprint/retreat
   - ~1-2 hours

3. ✅ **Wave director** (moderate difficulty)
   - Create WaveDirector class
   - Load from INDIE_WAVES data
   - ~1-2 hours

4. ✅ **Geometric renderer** (time-consuming but straightforward)
   - Create shape drawing functions
   - Update render loop
   - ~2-3 hours

5. ✅ **UI overhaul** (cosmetic, do last)
   - Remove emojis
   - Update button rendering
   - ~1-2 hours

---

## Getting Help

### Something not clear?
1. Check [INDEX.md](INDEX.md) for document navigation
2. Search in relevant document:
   - Design question? → [DESIGN.md](DESIGN.md)
   - Code question? → [REFACTORING.md](REFACTORING.md)
   - Visual question? → [VISUAL.md](VISUAL.md)

### Need specific info?
- **"How do I calculate effectiveness?"** → REFACTORING.md, Example 1
- **"What are CHARGER stats?"** → config-indie.js, INDIE_ENEMIES.CHARGER
- **"What color should X be?"** → VISUAL.md, Color Palette section
- **"Why this mechanic?"** → MECHANICS.md, corresponding section

### Still stuck?
1. Re-read the relevant section (documentation is comprehensive)
2. Check code examples in REFACTORING.md
3. Look at config-indie.js for exact values

---

## Completion Checklist

Track your progress:

### Phase 1: Core Systems
- [ ] Feature flag system working
- [ ] Tower effectiveness matrix implemented
- [ ] Damage color-coding working
- [ ] One enemy behavior pattern working (CHARGER or PHANTOM)
- [ ] Wave director loading deterministic waves
- [ ] Can complete Wave 1-3 with indie config

### Phase 2: Visual
- [ ] Geometric shape renderer created
- [ ] Towers render as shapes (not emojis)
- [ ] Enemies render as shapes (not emojis)
- [ ] UI buttons show geometric icons
- [ ] Color palette matches VISUAL.md

### Phase 3: Systems
- [ ] All 5 enemy behaviors working
- [ ] All 10 waves playable
- [ ] Tier system implemented
- [ ] Bounty quality system working

### Phase 4: Polish
- [ ] All waves balanced
- [ ] Visual clarity verified
- [ ] Performance tested (60 FPS)
- [ ] Documentation updated with any changes

---

## Quick Reference Card

Keep this handy while coding:

```
TOWER TYPES           ENEMY TYPES          EFFECTIVENESS
─────────────         ───────────────      ─────────────────
PIERCER    (▲)       SWARM     (•)        ≥2.0x = Effective (green)
DISRUPTOR  (⬡)       CHARGER   (▶)        0.8-1.5x = Normal (white)
DEMOLISHER (■)       FORTRESS  (▪)        ≤0.6x = Weak (gray)
SENTINEL   (●)       PHANTOM   (◯)
ANCHOR     (◆)       VANGUARD  (○)

COUNTERS                              BEHAVIORS
────────────────────────────────      ─────────────────────────
DEMOLISHER → FORTRESS (armor pen)     SPRINT_RETREAT: alternates fast/slow
DISRUPTOR  → SWARM (AoE slow)        PHASE_SHIFT: teleports periodically
DISRUPTOR  → PHANTOM (blocks tp)     STEADFAST: steady advance
SENTINEL   → CHARGER (tracking)      SHIELD_WALL: protects others
PIERCER    → CHARGER (alpha)         

CONFIG FILES                          DOCS FOR...
────────────────                      ──────────────────────
config-indie.js = All data           Design = DESIGN.md
INDIE_TOWERS = Tower stats           Code = REFACTORING.md
INDIE_ENEMIES = Enemy stats          Why = MECHANICS.md
INDIE_WAVES = Wave data              Visual = VISUAL.md
                                      Roadmap = IMPLEMENTATION.md
```

---

## Final Tip

**Start small. Validate early.**

Don't try to implement everything at once. Get one feature working in indie mode, test it thoroughly, then move to the next.

The documentation is comprehensive because the vision is comprehensive. But the code changes can be incremental.

**Good luck, and remember: No emojis. No RNG. Pure tactics.**

---

**Total estimated time from zero to working indie mode: ~10-15 hours of focused coding.**

**Ready? Start with Step 1 above. You got this.**

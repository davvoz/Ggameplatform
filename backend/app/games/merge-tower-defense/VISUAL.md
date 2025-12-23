# Visual Design Specification

## Philosophy

Beauty through clarity. Every pixel serves gameplay. No decoration, only information.

## Color Palette

### Core Colors (Limited Palette)
```javascript
BACKGROUND:     '#0a0a12'  // Dark blue-black
GRID_LINE:      '#1a1a2e'  // Subtle grid
DEFENSE_LINE:   '#ff4444'  // Red danger line
UI_PRIMARY:     '#ffffff'  // Primary text/elements
UI_SECONDARY:   '#888888'  // Secondary text
UI_ACCENT:      '#00ff88'  // Confirmation/success
UI_WARNING:     '#ff8800'  // Warning/attention
UI_DANGER:      '#ff4444'  // Danger/error
```

### Tower Colors (Functional Differentiation)
```javascript
PIERCER:    '#00aaff'  // Blue - precision
DISRUPTOR:  '#00ddff'  // Cyan - control
DEMOLISHER: '#ff8800'  // Orange - destruction
SENTINEL:   '#ff4444'  // Red - aggression
ANCHOR:     '#888888'  // Gray - baseline
```

### Enemy Colors (Threat Indication)
```javascript
SWARM:     '#66ff66'  // Green - many weak
CHARGER:   '#ff6666'  // Red - fast threat
FORTRESS:  '#888888'  // Gray - armored
PHANTOM:   '#aa88ff'  // Purple - unpredictable
VANGUARD:  '#ffaa66'  // Orange - baseline
```

### Effectiveness Indicators
```javascript
EFFECTIVE:    '#00ff88'  // Green - strong counter (≥2.0x)
NEUTRAL:      '#ffffff'  // White - normal (0.8-1.5x)
INEFFECTIVE:  '#ff4444'  // Red - weak (≤0.6x)
RESISTED:     '#888888'  // Gray - heavily resisted
```

## Geometric Tower Design

### Shape Language

Each tower type has a distinct geometric primitive:

```
PIERCER    → ▲ Triangle (pointing up)
             Sharp, aggressive, directional
             
DISRUPTOR  → ⬡ Hexagon
             Multi-sided, area effect
             
DEMOLISHER → ■ Square
             Solid, heavy, impactful
             
SENTINEL   → ● Circle
             Continuous, tracking
             
ANCHOR     → ◆ Diamond
             Balanced, central
```

### Tier Indication

Visual changes per tier (no explicit numbers):

**Tier 1** (Base):
- Base size: 1.0x
- Single solid shape
- No effects

**Tier 2** (First Merge):
- Size: 1.2x
- Inner outline added
- Subtle rotation animation

**Tier 3** (Full Merge):
- Size: 1.4x
- Double outline
- Glow effect
- Faster rotation

Example PIERCER visual evolution:
```
Tier 1: ▲
        Simple blue triangle

Tier 2: ▲
        Larger, with inner triangle outline
        Slow rotation (360° in 4s)

Tier 3: ▲
        Largest, double outline
        Subtle glow
        Fast rotation (360° in 2s)
```

### Range Indicators

On tower hover/select:
```
- Draw circle at tower.range * cellSize
- Color based on enemies in range:
  - All enemies countered: Green (#00ff88)
  - Mixed effectiveness: White (#ffffff)
  - No enemies / all ineffective: Gray (#888888)
- Line style: Dashed (5px dash, 5px gap)
- Line width: 1px
- Alpha: 0.4
```

## Geometric Enemy Design

### Shape Variations

Enemies use same shapes but with variations:

```
SWARM     → • Small solid circle (0.7x scale)
            Many, tight formation
            
CHARGER   → ▶ Right-pointing triangle
            Elongated, suggests motion
            
FORTRESS  → ▪ Thick square
            Wide border, suggests armor
            
PHANTOM   → ◯ Hollow circle
            Ghostly, translucent (0.7 alpha)
            
VANGUARD  → ○ Regular circle
            Baseline reference
```

### Animation

Subtle animations to indicate behavior:

**SWARM**:
- Slight clustering wobble
- Stay close to each other

**CHARGER**:
- Lean forward during sprint
- Lean back during retreat

**FORTRESS**:
- No animation (steadfast)
- Slightly pulsing outline (shields)

**PHANTOM**:
- Fade in/out (0.4-1.0 alpha cycle, 2s period)
- Pre-teleport: rapid pulse

**VANGUARD**:
- Minimal bob (0.1 cell amplitude, 3s period)

## UI Design

### HUD Layout

```
┌─────────────────────────────────────┐
│ Wave: 3/10    Resources: 280       │ ← Top bar: Essential info
├─────────────────────────────────────┤
│                                     │
│                                     │
│          [GAME GRID]                │
│                                     │
│                                     │
├─────────────────────────────────────┤
│ [▲] [⬡] [■] [●] [◆]              │ ← Tower selector: Geometric icons
│ 120  80  140  70  50               │ ← Costs below icons
└─────────────────────────────────────┘
```

### Tower Selector

Each tower button shows:
```
┌─────┐
│  ▲  │  ← Geometric shape in tower color
│ 120 │  ← Cost (white if affordable, gray if not)
│ P   │  ← Single letter abbreviation
└─────┘
    ↑
Selected: Brighter border (#00ff88)
Disabled: Grayed out (0.3 alpha)
Affordable: Normal
Can't afford: Red border (#ff4444)
```

### Information Display

**On Tower Hover**:
```
┌──────────────────────┐
│ PIERCER              │ ← Name
│ Tier 2               │ ← Current tier
│                      │
│ DMG:  80  (2.0x)    │ ← Stats (multiplier for hovered enemy)
│ RATE: 3.0s           │
│ RNG:  4.5            │
│                      │
│ Effective vs:        │ ← Counter info
│ • CHARGER            │
│ • PHANTOM            │
│                      │
│ Weak vs:             │
│ • FORTRESS           │
└──────────────────────┘
```

**On Enemy Hover**:
```
┌──────────────────────┐
│ FORTRESS             │ ← Type
│                      │
│ HP:   65 / 80        │ ← Health bar (visual)
│ ARMOR: 20            │
│                      │
│ Countered by:        │
│ • DEMOLISHER (3.0x)  │
│                      │
│ Resists:             │
│ • SENTINEL (0.3x)    │
└──────────────────────┘
```

### Grid Design

```
- 7 columns × 12 rows
- Cell size: Auto-scaled to screen
- Grid lines: Subtle (#1a1a2e), 1px
- Defense zone (rows 8-12): Slight highlight (rgba(0,255,136,0.05))
- Spawn zone (rows 0-3): Slight red tint (rgba(255,68,68,0.05))
- Defense line (row 8): Bold red line (#ff4444), 3px
```

### Feedback

**Damage Numbers**:
```javascript
// Minimal, functional
{
    text: "45",  // Just the number
    color: effectiveness >= 2.0 ? '#00ff88' : '#ffffff',
    size: effectiveness >= 2.0 ? 18 : 14,
    life: 0.8s,
    rise: -20px
}
```

**No**:
- "+100 AMAZING!!!"
- Combo multipliers
- XP bars filling up
- Achievement popups
- Particle explosions (unless functional)

**Yes**:
- Clear damage numbers
- Tower effectiveness glow
- Range indicators
- Health bars
- Ability cooldown indicators

## Animation Principles

### Easing

All animations use functional easing:

**Position changes**: Ease-out cubic
```javascript
// Smooth deceleration
easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}
```

**Attacks**: Ease-in expo
```javascript
// Rapid acceleration
easeInExpo(t) {
    return t === 0 ? 0 : Math.pow(2, 10 * t - 10);
}
```

**UI transitions**: Ease-in-out quad
```javascript
// Smooth both ways
easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
```

### Projectile Visuals

Minimal, functional projectiles:

**PIERCER**: Thin line (2px, tower color, 0.8 alpha)
**DISRUPTOR**: Small circle (4px radius, pulsing)
**DEMOLISHER**: Large circle (8px radius, solid)
**SENTINEL**: Tiny circle (2px radius, rapid)
**ANCHOR**: Diamond (6px, outlined)

### Effects

**Minimal particle system**:

Tower firing: 3-5 particles, tower color, 0.3s life
Enemy death: 5-8 particles, enemy color, 0.5s life
Merge: 10-15 particles, merged tower color, 1.0s life

No explosions, screen shake, or "juicy" effects that obscure information.

## Typography

### Font Stack
```css
font-family: 'Courier New', 'Consolas', monospace;
```

Monospace for numerical clarity and technical aesthetic.

### Sizes
```
H1 (Wave title):     24px, bold
H2 (Section):        18px, bold
Body (Stats):        14px, regular
Small (Hints):       12px, regular
Tiny (Annotations):  10px, regular
```

### Text Rendering
```javascript
// Always with shadow for legibility
ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
ctx.shadowBlur = 4;
ctx.shadowOffsetX = 1;
ctx.shadowOffsetY = 1;
```

## Screen Layout Examples

### Main Game Screen
```
┌─────────────────────────────────────┐
│ Wave: 3/10         Resources: 280   │
│ Next: FORTRESS + SWARM              │ ← Wave preview
├─────────────────────────────────────┤
│     0  1  2  3  4  5  6             │
│   ┌──┬──┬──┬──┬──┬──┬──┐           │
│ 0 │  │  │  │  │  │  │  │           │ ← Spawn zone
│ 1 │  │▶ │  │  │  │  │  │           │
│ 2 │  │  │  │◯ │  │  │  │           │
│ 3 │• │• │  │  │  │• │  │           │
│   ├──┼──┼──┼──┼──┼──┼──┤           │
│ 4 │  │  │  │  │  │  │  │           │ ← Combat zone
│ 5 │  │  │  │  │  │  │  │           │
│ 6 │  │  │  │  │  │  │  │           │
│ 7 │  │  │  │  │  │  │  │           │
│   ╞══╪══╪══╪══╪══╪══╪══╡           │ ← Defense line
│ 8 │▲ │  │⬡ │  │  │  │  │           │ ← Defense zone
│ 9 │  │● │  │▲ │  │● │  │           │
│10 │  │  │■ │  │  │  │  │           │
│11 │  │  │  │  │◆ │  │  │           │
│   └──┴──┴──┴──┴──┴──┴──┘           │
├─────────────────────────────────────┤
│ [▲] [⬡] [■] [●] [◆]      [Info]   │
│ 120  80  140  70  50      [?]      │
└─────────────────────────────────────┘
```

### Wave Preview Screen
```
┌─────────────────────────────────────┐
│             WAVE 8                   │
│                                     │
│   Composition:                      │
│   • 1x FORTRESS    (center)         │
│   • 8x SWARM       (flanks)         │
│   • 2x CHARGER     (center, delayed)│
│                                     │
│   Suggested Strategy:               │
│   Break FORTRESS armor first        │
│   Use AoE on SWARM                  │
│   Track CHARGER with Sentinel       │
│                                     │
│        [Start Wave]                 │
│                                     │
│   Current Resources: 280            │
│   Recommended: 350+                 │
└─────────────────────────────────────┘
```

## Implementation Notes

### Canvas Rendering

Use layered rendering:
```
Layer 0: Grid (cached)
Layer 1: Range indicators
Layer 2: Towers
Layer 3: Enemies
Layer 4: Projectiles
Layer 5: Particles
Layer 6: UI overlay
```

### Performance Targets

- 60 FPS stable with 28 towers, 50 enemies, 50 projectiles
- Minimize canvas clears (use dirty rect rendering)
- Object pool particles and projectiles
- Cache geometric shapes when possible

### Accessibility

All visual information must have text equivalent:
- Tower hover shows exact stats
- Enemy hover shows exact health/armor
- Color-blind mode uses patterns, not just colors
- High contrast mode available

## Comparison: Before vs After

### Before (Casual)
```
╔═══════════════════════════════════╗
║ 🎮 MERGE TOWER DEFENSE! 🎮        ║
║ ─────────────────────────────────  ║
║ Wave: 3 🌊    💰: 280    ❤️: 95    ║
║                                    ║
║    🧟 🧟‍♂️        🧟‍♀️               ║
║                                    ║
║    🔫    ⚡    💥                   ║
║                                    ║
║ [🔫 20] [⚡ 35] [🎯 120] [💥 90]   ║
╚═══════════════════════════════════╝
```

### After (Indie Serious)
```
┌─────────────────────────────────────┐
│ Wave: 3/10         Resources: 280   │
├─────────────────────────────────────┤
│                                     │
│    ▶  ○                             │
│                                     │
│    ▲    ●    ■                      │
│                                     │
│ [▲] [⬡] [■] [●] [◆]               │
│ 120  80  140  70  50                │
└─────────────────────────────────────┘
```

Clear. Functional. Professional.

## Summary

Visual design serves three goals:
1. **Information**: Player always knows game state
2. **Clarity**: No ambiguity or confusion
3. **Aesthetics**: Beauty through minimalism

No decoration. No filler. No compromise.

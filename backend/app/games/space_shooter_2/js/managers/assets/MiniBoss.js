import { outlineAndFill, drawHighlight, _mkCanvas, _drawPartEye } from './Helper.js';
// ================================================================
//  MINI-BOSS SPRITES — 4 unique mini-boss types
// ================================================================

function generateMiniBossSprites(sprites) {
    _genMiniBoss1Sprites(sprites); // Scarab Drone (teal/green, agile)
    _genMiniBoss2Sprites(sprites); // Garrison Turret (bronze/orange, heavy)
    _genMiniBoss3Sprites(sprites); // Phantom Wraith (purple, orbiting)
    _genMiniBoss4Sprites(sprites); // Inferno Striker (crimson, aggressive)
    // World 2 mini-bosses
    _genMiniBoss5Sprites(sprites); // Vine Sentinel (jungle green)
    _genMiniBoss6Sprites(sprites); // Magma Sprite (fiery orange)
    _genMiniBoss7Sprites(sprites); // Cryo Colossus (ice blue)
    _genMiniBoss8Sprites(sprites); // Rust Hulk (rusty bronze)
    // World 3 mini-bosses — Simulation Break
    _genMiniBoss9Sprites(sprites);  // Glitch Core (cyan, fast)
    _genMiniBoss10Sprites(sprites); // Broken Renderer (purple, shielded)
    _genMiniBoss11Sprites(sprites); // Fragment Swarm (magenta, orbiting)
    _genMiniBoss12Sprites(sprites); // Mirror Guardian (silver, aggressive)
    // World 4 mini-bosses — Quantum Realm
    _genMiniBoss13Sprites(sprites); // Charm Quark (pink, phase-cycling)
    _genMiniBoss14Sprites(sprites); // Strange Oscillator (cyan, state-changing)
    _genMiniBoss15Sprites(sprites); // Top Resonance (gold, shielded)
    _genMiniBoss16Sprites(sprites); // Bottom Decayer (green, splitting)
}

// ── MINI-BOSS 1: Scarab Drone (teal, insectoid, agile) ──
function _genMiniBoss1Sprites(sprites) {
    const color = '#22bbaa', accent = '#44ddcc', dark = '#117766';
    // Core (50x50, pad=8 → 66x66)
    {
        const S = 66, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2, r = 25;
        // Insect-like rounded body
        ctx.beginPath();
        ctx.ellipse(cx, cy, r, r * 0.8, 0, 0, Math.PI * 2);
        outlineAndFill(ctx, color, '#111', 2.5);
        // Segmentation lines
        ctx.strokeStyle = dark; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx - r * 0.6, cy - r * 0.1); ctx.lineTo(cx + r * 0.6, cy - r * 0.1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - r * 0.5, cy + r * 0.3); ctx.lineTo(cx + r * 0.5, cy + r * 0.3); ctx.stroke();
        // Compound eyes
        for (const sx of [-1, 1]) {
            _drawPartEye(ctx, cx + sx * 10, cy - 8, 6, '#44ffdd');
        }
        drawHighlight(ctx, cx - 12, cy - r * 0.7, 24, 10, 0.15);
        // Small mandibles
        for (const sx of [-1, 1]) {
            ctx.fillStyle = '#555'; ctx.beginPath();
            ctx.moveTo(cx + sx * 6, cy + r * 0.6); ctx.lineTo(cx + sx * 12, cy + r * 0.9);
            ctx.lineTo(cx + sx * 4, cy + r * 0.8); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.stroke();
        }
        sprites['mboss1_core'] = cv;
    }
    // Blade (20x40, pad=6 → 32x52) — rotating wing
    {
        const cv = _mkCanvas(32, 52), ctx = cv.getContext('2d'), cx = 16, cy = 26;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 24); ctx.lineTo(cx + 14, cy - 8);
        ctx.lineTo(cx + 10, cy + 24); ctx.lineTo(cx - 10, cy + 24);
        ctx.lineTo(cx - 14, cy - 8); ctx.closePath();
        outlineAndFill(ctx, accent, '#111', 2);
        // Energy vein
        ctx.strokeStyle = '#88ffee'; ctx.lineWidth = 1; ctx.globalAlpha = 0.6;
        ctx.beginPath(); ctx.moveTo(cx, cy - 18); ctx.lineTo(cx, cy + 18); ctx.stroke();
        ctx.globalAlpha = 1;
        sprites['mboss1_blade'] = cv;
    }
}

// ── MINI-BOSS 2: Garrison Turret (bronze, fortified, slow) ──
function _genMiniBoss2Sprites(sprites) {
    const color = '#cc8833', accent = '#eebb55', dark = '#885522';
    // Core (55x55, pad=8 → 71x71)
    {
        const S = 71, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2, r = 28;
        // Blocky armored hexagon
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = Math.PI / 6 + i * Math.PI / 3;
            const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        outlineAndFill(ctx, color, '#111', 3);
        // Armor plates
        ctx.strokeStyle = dark; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - r * 0.8, cy); ctx.lineTo(cx + r * 0.8, cy); ctx.stroke();
        _drawPartEye(ctx, cx, cy - 4, 8, '#ffaa22');
        drawHighlight(ctx, cx - 14, cy - r * 0.8, 28, 12, 0.1);
        // Bottom vents
        for (let i = -1; i <= 1; i++) {
            ctx.fillStyle = '#444'; ctx.beginPath();
            ctx.roundRect(cx + i * 10 - 3, cy + r - 6, 6, 8, 2); ctx.fill();
        }
        sprites['mboss2_core'] = cv;
    }
    // Shield (60x16, pad=4 → 68x24)
    {
        const cv = _mkCanvas(68, 24), ctx = cv.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(6, 12); ctx.lineTo(14, 3); ctx.lineTo(54, 3);
        ctx.lineTo(62, 12); ctx.lineTo(54, 21); ctx.lineTo(14, 21); ctx.closePath();
        outlineAndFill(ctx, '#4488cc', '#111', 2);
        ctx.strokeStyle = '#88ccff'; ctx.lineWidth = 1; ctx.globalAlpha = 0.4;
        ctx.beginPath(); ctx.moveTo(18, 12); ctx.lineTo(50, 12); ctx.stroke();
        ctx.globalAlpha = 1;
        sprites['mboss2_shield'] = cv;
    }
    // Turret (22x22, pad=5 → 32x32)
    {
        const S = 32, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
        ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2);
        outlineAndFill(ctx, accent, '#111', 2);
        // Barrel
        ctx.fillStyle = '#555'; ctx.beginPath();
        ctx.roundRect(cx - 2, cy - 16, 4, 12, 1); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.stroke();
        _drawPartEye(ctx, cx, cy + 2, 4, '#ff8800');
        sprites['mboss2_turret'] = cv;
    }
}

// ── MINI-BOSS 3: Phantom Wraith (purple, ethereal, orbiting) ──
function _genMiniBoss3Sprites(sprites) {
    const color = '#8833cc', accent = '#bb66ff', dark = '#551199';
    // Core (50x50, pad=8 → 66x66)
    {
        const S = 66, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2, r = 25;
        // Ghostly diamond shape
        ctx.beginPath();
        ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 0.8, cy - r * 0.15);
        ctx.lineTo(cx + r * 0.6, cy + r * 0.7); ctx.lineTo(cx, cy + r);
        ctx.lineTo(cx - r * 0.6, cy + r * 0.7); ctx.lineTo(cx - r * 0.8, cy - r * 0.15);
        ctx.closePath();
        outlineAndFill(ctx, color, '#111', 2.5);
        // Inner glow
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.7);
        glow.addColorStop(0, 'rgba(187,102,255,0.3)');
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2); ctx.fill();
        _drawPartEye(ctx, cx, cy - 5, 8, '#dd55ff');
        drawHighlight(ctx, cx - 10, cy - r * 0.8, 20, 10, 0.12);
        sprites['mboss3_core'] = cv;
    }
    // Orb (18x18, pad=5 → 28x28) — orbiting will-o-wisp
    {
        const S = 28, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
        // Outer glow
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 12);
        glow.addColorStop(0, accent);
        glow.addColorStop(0.6, 'rgba(136,51,204,0.5)');
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2); ctx.fill();
        // Inner core
        ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        outlineAndFill(ctx, accent, '#111', 1.5);
        // Sparkle
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath(); ctx.arc(cx - 2, cy - 2, 2, 0, Math.PI * 2); ctx.fill();
        sprites['mboss3_orb'] = cv;
    }
    // Tail (25x35, pad=5 → 35x45) — wispy tendril
    {
        const cv = _mkCanvas(35, 45), ctx = cv.getContext('2d'), cx = 35 / 2, cy = 45 / 2;
        ctx.beginPath();
        ctx.moveTo(cx - 8, cy - 20); ctx.quadraticCurveTo(cx + 12, cy - 5, cx - 5, cy + 5);
        ctx.quadraticCurveTo(cx + 10, cy + 12, cx, cy + 20);
        ctx.quadraticCurveTo(cx - 8, cy + 12, cx + 5, cy + 5);
        ctx.quadraticCurveTo(cx - 12, cy - 5, cx + 8, cy - 20);
        ctx.closePath();
        outlineAndFill(ctx, dark, '#111', 2);
        // Wispy glow streaks
        ctx.strokeStyle = accent; ctx.lineWidth = 1; ctx.globalAlpha = 0.4;
        ctx.beginPath(); ctx.moveTo(cx, cy - 15); ctx.quadraticCurveTo(cx + 6, cy, cx, cy + 15); ctx.stroke();
        ctx.globalAlpha = 1;
        sprites['mboss3_tail'] = cv;
    }
}

// ── MINI-BOSS 4: Inferno Striker (crimson, aggressive) ──
function _genMiniBoss4Sprites(sprites) {
    const color = '#cc2233', accent = '#ff5544', dark = '#881122';
    // Core (50x50, pad=8 → 66x66)
    {
        const S = 66, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2, r = 25;
        // Angular aggressive shape
        ctx.beginPath();
        ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 0.9, cy - r * 0.35);
        ctx.lineTo(cx + r * 0.7, cy + r * 0.5); ctx.lineTo(cx + r * 0.25, cy + r);
        ctx.lineTo(cx - r * 0.25, cy + r); ctx.lineTo(cx - r * 0.7, cy + r * 0.5);
        ctx.lineTo(cx - r * 0.9, cy - r * 0.35); ctx.closePath();
        outlineAndFill(ctx, color, '#111', 2.5);
        // War paint streaks
        ctx.strokeStyle = accent; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx - r * 0.5, cy - r * 0.5); ctx.lineTo(cx - r * 0.2, cy + r * 0.3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + r * 0.5, cy - r * 0.5); ctx.lineTo(cx + r * 0.2, cy + r * 0.3); ctx.stroke();
        _drawPartEye(ctx, cx, cy - 6, 8, '#ff3322');
        drawHighlight(ctx, cx - 12, cy - r * 0.8, 24, 10, 0.12);
        // Twin exhausts
        for (const sx of [-1, 1]) {
            ctx.fillStyle = '#333'; ctx.beginPath();
            ctx.roundRect(cx + sx * 14 - 3, cy + r - 4, 6, 8, 2); ctx.fill();
            ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.stroke();
        }
        sprites['mboss4_core'] = cv;
    }
    // Side Pod (22x30, pad=5 → 32x40) — weapon nacelle
    {
        const cv = _mkCanvas(32, 40), ctx = cv.getContext('2d'), cx = 16, cy = 20;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 18); ctx.lineTo(cx + 12, cy - 8);
        ctx.lineTo(cx + 10, cy + 18); ctx.lineTo(cx - 10, cy + 18);
        ctx.lineTo(cx - 12, cy - 8); ctx.closePath();
        outlineAndFill(ctx, dark, '#111', 2);
        // Engine glow at bottom
        const eng = ctx.createLinearGradient(cx, cy + 10, cx, cy + 18);
        eng.addColorStop(0, 'rgba(255,100,50,0)');
        eng.addColorStop(1, 'rgba(255,200,100,0.6)');
        ctx.fillStyle = eng;
        ctx.beginPath(); ctx.roundRect(cx - 6, cy + 10, 12, 8, 2); ctx.fill();
        // Barrel
        ctx.fillStyle = '#555'; ctx.beginPath();
        ctx.roundRect(cx - 2, cy - 22, 4, 10, 1); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.stroke();
        sprites['mboss4_pod'] = cv;
    }
}

// ═══════════════════════════════════════════════════
//  WORLD 2 MINI-BOSSES — 4 unique planetary types
// ═══════════════════════════════════════════════════

// ── MINI-BOSS 5: Vine Sentinel (green, organic, jungle) ──
function _genMiniBoss5Sprites(sprites) {
    const color = '#33aa55', accent = '#66dd88', dark = '#117733';
    // Core (55x55, pad=8 → 71x71)
    {
        const S = 71, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2, r = 28;
        // Organic rounded body with leaf-like extensions
        ctx.beginPath();
        ctx.ellipse(cx, cy, r, r * 0.85, 0, 0, Math.PI * 2);
        outlineAndFill(ctx, color, '#111', 2.5);
        // Bark texture lines
        ctx.strokeStyle = dark; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx - r * 0.5, cy - r * 0.4); ctx.lineTo(cx - r * 0.3, cy + r * 0.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + r * 0.5, cy - r * 0.4); ctx.lineTo(cx + r * 0.3, cy + r * 0.5); ctx.stroke();
        // Leaf crown
        for (const sx of [-1, 1]) {
            ctx.fillStyle = accent; ctx.beginPath();
            ctx.ellipse(cx + sx * r * 0.5, cy - r * 0.6, r * 0.25, r * 0.15, sx * 0.4, 0, Math.PI * 2);
            ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.stroke();
        }
        _drawPartEye(ctx, cx, cy - 4, 8, '#44ff66');
        drawHighlight(ctx, cx - 14, cy - r * 0.7, 28, 12, 0.12);
        sprites['mboss5_core'] = cv;
    }
    // Vine (22x35, pad=5 → 32x45) — whip tendril
    {
        const cv = _mkCanvas(32, 45), ctx = cv.getContext('2d'), cx = 16, cy = 45 / 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 20);
        ctx.bezierCurveTo(cx + 12, cy - 10, cx - 8, cy + 5, cx + 6, cy + 20);
        ctx.lineTo(cx - 6, cy + 20);
        ctx.bezierCurveTo(cx - 4, cy + 5, cx + 8, cy - 10, cx, cy - 20);
        ctx.closePath();
        outlineAndFill(ctx, dark, '#111', 2);
        // Thorn tips
        ctx.fillStyle = accent;
        ctx.beginPath(); ctx.moveTo(cx + 6, cy + 20); ctx.lineTo(cx + 3, cy + 18); ctx.lineTo(cx + 8, cy + 16); ctx.closePath(); ctx.fill();
        // Glow vein
        ctx.strokeStyle = '#88ffaa'; ctx.lineWidth = 1; ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.moveTo(cx, cy - 15); ctx.bezierCurveTo(cx + 6, cy - 5, cx - 4, cy + 5, cx + 2, cy + 15); ctx.stroke();
        ctx.globalAlpha = 1;
        sprites['mboss5_vine'] = cv;
    }
}

// ── MINI-BOSS 6: Magma Sprite (orange, fiery, fast) ──
function _genMiniBoss6Sprites(sprites) {
    const color = '#ff6600', accent = '#ff9944', dark = '#aa3300';
    // Core (50x50, pad=8 → 66x66)
    {
        const S = 66, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2, r = 25;
        // Flame-shaped body
        ctx.beginPath();
        ctx.moveTo(cx, cy - r);
        ctx.bezierCurveTo(cx + r * 0.6, cy - r * 0.6, cx + r, cy - r * 0.1, cx + r * 0.7, cy + r * 0.4);
        ctx.bezierCurveTo(cx + r * 0.5, cy + r * 0.8, cx + r * 0.2, cy + r, cx, cy + r * 0.8);
        ctx.bezierCurveTo(cx - r * 0.2, cy + r, cx - r * 0.5, cy + r * 0.8, cx - r * 0.7, cy + r * 0.4);
        ctx.bezierCurveTo(cx - r, cy - r * 0.1, cx - r * 0.6, cy - r * 0.6, cx, cy - r);
        ctx.closePath();
        outlineAndFill(ctx, color, '#111', 2.5);
        // Inner magma glow
        const mg = ctx.createRadialGradient(cx, cy + r * 0.1, 0, cx, cy, r * 0.6);
        mg.addColorStop(0, 'rgba(255,200,100,0.3)'); mg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2); ctx.fill();
        // Cracks (glowing)
        ctx.save(); ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 4;
        ctx.strokeStyle = '#ffcc44'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx - r * 0.3, cy - r * 0.3); ctx.lineTo(cx + r * 0.1, cy + r * 0.3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + r * 0.3, cy - r * 0.2); ctx.lineTo(cx + r * 0.2, cy + r * 0.4); ctx.stroke();
        ctx.restore();
        _drawPartEye(ctx, cx, cy - 6, 7, '#ff4400');
        drawHighlight(ctx, cx - 10, cy - r * 0.7, 20, 10, 0.1);
        sprites['mboss6_core'] = cv;
    }
    // Orb (20x20, pad=5 → 30x30) — orbiting fire ball
    {
        const S = 30, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
        const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, 11);
        g.addColorStop(0, '#ffee88'); g.addColorStop(0.5, accent); g.addColorStop(1, dark);
        ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,200,0.5)';
        ctx.beginPath(); ctx.arc(cx - 2, cy - 2, 2.5, 0, Math.PI * 2); ctx.fill();
        sprites['mboss6_orb'] = cv;
    }
}

// ── MINI-BOSS 7: Cryo Colossus (ice blue, slow, fortified) ──
function _genMiniBoss7Sprites(sprites) {
    const color = '#55ccff', accent = '#88eeff', dark = '#2277aa';
    // Core (60x60, pad=8 → 76x76)
    {
        const S = 76, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2, r = 30;
        // Heavy ice golem — blocky hexagonal
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = Math.PI / 6 + i * Math.PI / 3;
            const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        outlineAndFill(ctx, color, '#111', 3);
        // Ice plate lines
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - r * 0.85, cy); ctx.lineTo(cx + r * 0.85, cy); ctx.stroke();
        // Frost aura
        const fg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.7);
        fg.addColorStop(0, 'rgba(200,240,255,0.2)'); fg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2); ctx.fill();
        _drawPartEye(ctx, cx, cy - 4, 9, '#aaeeff');
        drawHighlight(ctx, cx - 15, cy - r * 0.8, 30, 14, 0.12);
        sprites['mboss7_core'] = cv;
    }
    // Shield (65x18, pad=4 → 73x26)
    {
        const cv = _mkCanvas(73, 26), ctx = cv.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(6, 13); ctx.lineTo(14, 3); ctx.lineTo(59, 3);
        ctx.lineTo(67, 13); ctx.lineTo(59, 23); ctx.lineTo(14, 23); ctx.closePath();
        outlineAndFill(ctx, '#66ccee', '#111', 2);
        ctx.strokeStyle = '#aaeeff'; ctx.lineWidth = 1; ctx.globalAlpha = 0.4;
        ctx.beginPath(); ctx.moveTo(18, 13); ctx.lineTo(55, 13); ctx.stroke();
        ctx.globalAlpha = 1;
        sprites['mboss7_shield'] = cv;
    }
    // Turret (24x24, pad=5 → 34x34)
    {
        const S = 34, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
        ctx.beginPath(); ctx.arc(cx, cy, 11, 0, Math.PI * 2);
        outlineAndFill(ctx, accent, '#111', 2);
        ctx.fillStyle = '#556'; ctx.beginPath();
        ctx.roundRect(cx - 2, cy - 17, 4, 12, 1); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.stroke();
        _drawPartEye(ctx, cx, cy + 2, 4, '#88ddff');
        sprites['mboss7_turret'] = cv;
    }
}

// ── MINI-BOSS 8: Rust Hulk (rusty brown, mechanical junk titan) ──
function _genMiniBoss8Sprites(sprites) {
    const color = '#99775a', accent = '#ccaa88', dark = '#664433';
    // Core (55x55, pad=8 → 71x71)
    {
        const S = 71, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2, r = 28;
        // Rough junk-metal body
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.6, cy - r); ctx.lineTo(cx + r * 0.7, cy - r * 0.9);
        ctx.lineTo(cx + r, cy - r * 0.2); ctx.lineTo(cx + r * 0.8, cy + r * 0.6);
        ctx.lineTo(cx + r * 0.3, cy + r); ctx.lineTo(cx - r * 0.4, cy + r * 0.9);
        ctx.lineTo(cx - r, cy + r * 0.3); ctx.lineTo(cx - r * 0.8, cy - r * 0.4);
        ctx.closePath();
        outlineAndFill(ctx, color, '#111', 2.5);
        // Rust patches
        ctx.fillStyle = 'rgba(180,100,50,0.3)';
        ctx.beginPath(); ctx.arc(cx - r * 0.3, cy - r * 0.2, r * 0.25, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + r * 0.2, cy + r * 0.3, r * 0.2, 0, Math.PI * 2); ctx.fill();
        // Spot welds / rivets
        ctx.fillStyle = '#887766';
        for (let i = 0; i < 5; i++) {
            const rx = cx + (Math.random() - 0.5) * r * 1.2, ry = cy + (Math.random() - 0.5) * r * 1.2;
            ctx.beginPath(); ctx.arc(rx, ry, 2, 0, Math.PI * 2); ctx.fill();
        }
        // Panel lines
        ctx.strokeStyle = dark; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx - r * 0.3, cy - r * 0.7); ctx.lineTo(cx - r * 0.1, cy + r * 0.6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + r * 0.4, cy - r * 0.5); ctx.lineTo(cx + r * 0.2, cy + r * 0.5); ctx.stroke();
        _drawPartEye(ctx, cx, cy - 6, 8, '#ffaa44');
        drawHighlight(ctx, cx - 14, cy - r * 0.8, 28, 12, 0.1);
        sprites['mboss8_core'] = cv;
    }
    // Claw (24x32, pad=5 → 34x42) — scrap claw arm
    {
        const cv = _mkCanvas(34, 42), ctx = cv.getContext('2d'), cx = 17, cy = 21;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 18); ctx.lineTo(cx + 13, cy - 6);
        ctx.lineTo(cx + 10, cy + 18); ctx.lineTo(cx - 10, cy + 18);
        ctx.lineTo(cx - 13, cy - 6); ctx.closePath();
        outlineAndFill(ctx, dark, '#111', 2);
        // Claw pincers
        for (const sx of [-1, 1]) {
            ctx.fillStyle = accent;
            ctx.beginPath();
            ctx.moveTo(cx + sx * 5, cy + 18); ctx.lineTo(cx + sx * 10, cy + 15);
            ctx.lineTo(cx + sx * 4, cy + 14); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.stroke();
        }
        ctx.strokeStyle = color; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx - 6, cy); ctx.lineTo(cx + 6, cy); ctx.stroke();
        sprites['mboss8_claw'] = cv;
    }
    // Turret (22x22, pad=5 → 32x32)
    {
        const S = 32, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
        ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2);
        outlineAndFill(ctx, accent, '#111', 2);
        ctx.fillStyle = '#555'; ctx.beginPath();
        ctx.roundRect(cx - 2, cy - 16, 4, 12, 1); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.stroke();
        _drawPartEye(ctx, cx, cy + 2, 4, '#ddaa66');
        sprites['mboss8_turret'] = cv;
    }
}

// ═══════════════════════════════════════════════
//  WORLD 3 MINI-BOSSES — Simulation Break
// ═══════════════════════════════════════════════

// ── MINI-BOSS 9: Glitch Core (cyan, fast digital insectoid) ──
function _genMiniBoss9Sprites(sprites) {
    const color = '#00ccbb', accent = '#44ffee', dark = '#006655';
    // Core (55x55 → 71x71) — Cute angry digital bug face with antennae
    {
        const S = 71, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2, r = 28;
        // Bug antennae
        ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(cx - r * 0.3, cy - r * 0.8); ctx.quadraticCurveTo(cx - r * 0.6, cy - r * 1.3, cx - r * 0.5, cy - r * 1.1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + r * 0.3, cy - r * 0.8); ctx.quadraticCurveTo(cx + r * 0.6, cy - r * 1.3, cx + r * 0.5, cy - r * 1.1); ctx.stroke();
        // Antenna tips
        ctx.fillStyle = '#ffff88';
        ctx.beginPath(); ctx.arc(cx - r * 0.5, cy - r * 1.1, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + r * 0.5, cy - r * 1.1, 3, 0, Math.PI * 2); ctx.fill();
        // Rounded hexagonal body
        ctx.beginPath();
        ctx.moveTo(cx, cy - r);
        ctx.bezierCurveTo(cx + r * 0.5, cy - r, cx + r * 0.85, cy - r * 0.5, cx + r * 0.8, cy - r * 0.3);
        ctx.bezierCurveTo(cx + r * 0.9, cy + r * 0.1, cx + r * 0.8, cy + r * 0.5, cx + r * 0.2, cy + r);
        ctx.lineTo(cx - r * 0.2, cy + r);
        ctx.bezierCurveTo(cx - r * 0.8, cy + r * 0.5, cx - r * 0.9, cy + r * 0.1, cx - r * 0.8, cy - r * 0.3);
        ctx.bezierCurveTo(cx - r * 0.85, cy - r * 0.5, cx - r * 0.5, cy - r, cx, cy - r);
        ctx.closePath();
        outlineAndFill(ctx, color, '#111', 2.5);
        // Glitch scanlines
        ctx.strokeStyle = dark + '88'; ctx.lineWidth = 1;
        for (let sy = cy - r * 0.5; sy < cy + r * 0.5; sy += 5) {
            ctx.beginPath(); ctx.moveTo(cx - r * 0.5, sy); ctx.lineTo(cx + r * 0.5, sy); ctx.stroke();
        }
        // Big cute angry eyes
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.ellipse(cx - r * 0.25, cy - r * 0.1, 6, 7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + r * 0.25, cy - r * 0.1, 6, 7, 0, 0, Math.PI * 2); ctx.fill();
        // Pupils
        ctx.fillStyle = dark;
        ctx.beginPath(); ctx.arc(cx - r * 0.22, cy - r * 0.06, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + r * 0.28, cy - r * 0.06, 3.5, 0, Math.PI * 2); ctx.fill();
        // Eye highlights
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(cx - r * 0.28, cy - r * 0.15, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + r * 0.22, cy - r * 0.15, 2, 0, Math.PI * 2); ctx.fill();
        // Angry eyebrows
        ctx.strokeStyle = dark; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx - r * 0.42, cy - r * 0.3); ctx.lineTo(cx - r * 0.1, cy - r * 0.22); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + r * 0.42, cy - r * 0.3); ctx.lineTo(cx + r * 0.1, cy - r * 0.22); ctx.stroke();
        // Grumpy frown
        ctx.strokeStyle = accent; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx, cy + r * 0.35, r * 0.15, Math.PI + 0.4, -0.4); ctx.stroke();
        drawHighlight(ctx, cx - 12, cy - r * 0.8, 24, 10, 0.15);
        sprites['mboss9_core'] = cv;
    }
    // Blade (22x35 → 32x45) — Serrated glitch blade with energy edge
    {
        const cv = _mkCanvas(32, 45), ctx = cv.getContext('2d'), cx = 16, cy = 23;
        // Serrated blade shape
        ctx.beginPath();
        ctx.moveTo(cx, cy - 20);
        ctx.lineTo(cx + 10, cy - 12);
        ctx.lineTo(cx + 8, cy - 4); ctx.lineTo(cx + 12, cy + 2);
        ctx.lineTo(cx + 8, cy + 10); ctx.lineTo(cx + 10, cy + 18);
        ctx.lineTo(cx + 6, cy + 20);
        ctx.lineTo(cx - 6, cy + 20);
        ctx.lineTo(cx - 10, cy + 18);
        ctx.lineTo(cx - 8, cy + 10); ctx.lineTo(cx - 12, cy + 2);
        ctx.lineTo(cx - 8, cy - 4); ctx.lineTo(cx - 10, cy - 12);
        ctx.closePath();
        const bg = ctx.createLinearGradient(cx, cy - 20, cx, cy + 20);
        bg.addColorStop(0, accent); bg.addColorStop(0.5, color); bg.addColorStop(1, dark);
        ctx.fillStyle = bg; ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
        // Energy edge glow
        ctx.strokeStyle = '#ffff88'; ctx.lineWidth = 1; ctx.globalAlpha = 0.4;
        ctx.beginPath(); ctx.moveTo(cx, cy - 18); ctx.lineTo(cx, cy + 18); ctx.stroke();
        ctx.globalAlpha = 1;
        sprites['mboss9_blade'] = cv;
    }
    // Turret (20x20 → 30x30) — Mini terminal dot screen
    {
        const S = 30, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
        ctx.beginPath(); ctx.roundRect(cx - 10, cy - 10, 20, 20, 3);
        outlineAndFill(ctx, '#0a2020', '#111', 2);
        // Screen frame
        ctx.strokeStyle = accent; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(cx - 8, cy - 8, 16, 16, 2); ctx.stroke();
        // Targeting dot
        ctx.fillStyle = '#ff4444';
        ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
        // Gun barrel
        ctx.fillStyle = accent;
        ctx.beginPath(); ctx.roundRect(cx - 1.5, cy - 14, 3, 6, 1); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.stroke();
        sprites['mboss9_turret'] = cv;
    }
}

// ── MINI-BOSS 10: Broken Renderer (purple, heavy shielded GPU) ──
function _genMiniBoss10Sprites(sprites) {
    const color = '#7733ee', accent = '#aa66ff', dark = '#441199';
    // Core (60x60 → 76x76) — Broken GPU/monitor with cracked screen and dizzy face
    {
        const S = 76, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2, r = 30;
        // Boxy monitor body
        ctx.beginPath();
        ctx.roundRect(cx - r, cy - r * 0.85, r * 2, r * 1.75, 4);
        outlineAndFill(ctx, color, '#111', 2.5);
        // Screen area (dark)
        ctx.beginPath();
        ctx.roundRect(cx - r * 0.8, cy - r * 0.65, r * 1.6, r * 1.15, 2);
        ctx.fillStyle = '#0a001a'; ctx.fill();
        ctx.strokeStyle = accent; ctx.lineWidth = 1; ctx.stroke();
        // Corrupted pixel blocks on screen
        const pixels = [[cx - r * 0.5, cy - r * 0.4, 6, 4], [cx + r * 0.2, cy - r * 0.3, 8, 5],
                         [cx - r * 0.3, cy + r * 0.1, 5, 6], [cx + r * 0.4, cy + r * 0.05, 7, 4]];
        for (const [px, py, pw, ph] of pixels) {
            ctx.fillStyle = accent + '55';
            ctx.fillRect(px, py, pw, ph);
        }
        // Crack across screen (diagonal lightning)
        ctx.strokeStyle = '#ddbbff'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.6, cy - r * 0.5);
        ctx.lineTo(cx - r * 0.15, cy - r * 0.1);
        ctx.lineTo(cx - r * 0.3, cy + r * 0.05);
        ctx.lineTo(cx + r * 0.2, cy + r * 0.3);
        ctx.stroke();
        // Dizzy spiral eyes (X_X)
        ctx.strokeStyle = accent; ctx.lineWidth = 1.5;
        // Left X eye
        ctx.beginPath(); ctx.moveTo(cx - r * 0.35, cy - r * 0.25); ctx.lineTo(cx - r * 0.15, cy - r * 0.05); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - r * 0.35, cy - r * 0.05); ctx.lineTo(cx - r * 0.15, cy - r * 0.25); ctx.stroke();
        // Right X eye
        ctx.beginPath(); ctx.moveTo(cx + r * 0.15, cy - r * 0.25); ctx.lineTo(cx + r * 0.35, cy - r * 0.05); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + r * 0.15, cy - r * 0.05); ctx.lineTo(cx + r * 0.35, cy - r * 0.25); ctx.stroke();
        // Wavy distressed mouth
        ctx.strokeStyle = accent; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.25, cy + r * 0.2);
        ctx.bezierCurveTo(cx - r * 0.1, cy + r * 0.3, cx + r * 0.1, cy + r * 0.15, cx + r * 0.25, cy + r * 0.25);
        ctx.stroke();
        drawHighlight(ctx, cx - 14, cy - r * 0.7, 28, 10, 0.1);
        sprites['mboss10_core'] = cv;
    }
    // Shield (70x18 → 82x30) — Firewall shield with lock icon
    {
        const cv = _mkCanvas(82, 30), ctx = cv.getContext('2d');
        ctx.beginPath(); ctx.roundRect(6, 6, 70, 18, 3);
        outlineAndFill(ctx, dark, '#111', 2);
        // Brick pattern (firewall bricks)
        ctx.strokeStyle = accent + '44'; ctx.lineWidth = 0.8;
        for (let by = 8; by < 22; by += 6) {
            ctx.beginPath(); ctx.moveTo(8, by); ctx.lineTo(74, by); ctx.stroke();
        }
        for (let bx = 12; bx < 74; bx += 12) {
            ctx.beginPath(); ctx.moveTo(bx, 8); ctx.lineTo(bx, 14); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(bx + 6, 14); ctx.lineTo(bx + 6, 20); ctx.stroke();
        }
        // Small lock icon in center
        ctx.fillStyle = accent;
        ctx.beginPath(); ctx.roundRect(37, 10, 8, 6, 1); ctx.fill();
        ctx.strokeStyle = accent; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(41, 10, 4, Math.PI, 0); ctx.stroke();
        drawHighlight(ctx, 14, 8, 54, 6, 0.1);
        sprites['mboss10_shield'] = cv;
    }
    // Turret (24x24 → 34x34) — Pixel cannon with crosshair
    {
        const S = 34, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
        // Square pixel shape
        ctx.beginPath(); ctx.roundRect(cx - 11, cy - 9, 22, 20, 2);
        outlineAndFill(ctx, accent, '#111', 2);
        // Crosshair on face
        ctx.strokeStyle = dark; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx - 6, cy + 2); ctx.lineTo(cx + 6, cy + 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, cy - 4); ctx.lineTo(cx, cy + 8); ctx.stroke();
        // Red dot
        ctx.fillStyle = '#ff4444';
        ctx.beginPath(); ctx.arc(cx, cy + 2, 2, 0, Math.PI * 2); ctx.fill();
        // Barrel
        ctx.fillStyle = dark;
        ctx.beginPath(); ctx.roundRect(cx - 2, cy - 15, 4, 8, 1); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.stroke();
        sprites['mboss10_turret'] = cv;
    }
}

// ── MINI-BOSS 11: Fragment Swarm (magenta, orbiting crystal mother) ──
function _genMiniBoss11Sprites(sprites) {
    const color = '#ee2266', accent = '#ff5599', dark = '#881133';
    // Core (50x50 → 66x66) — Cracked crystal face with angry expression
    {
        const S = 66, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2, r = 25;
        // Hexagonal crystal shape
        ctx.beginPath();
        ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 0.85, cy - r * 0.2);
        ctx.lineTo(cx + r * 0.7, cy + r * 0.65); ctx.lineTo(cx, cy + r);
        ctx.lineTo(cx - r * 0.7, cy + r * 0.65); ctx.lineTo(cx - r * 0.85, cy - r * 0.2);
        ctx.closePath();
        outlineAndFill(ctx, color, '#111', 2.5);
        // Crack fracture lines
        ctx.strokeStyle = accent; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.7;
        ctx.beginPath(); ctx.moveTo(cx - r * 0.2, cy - r * 0.6); ctx.lineTo(cx + r * 0.1, cy + r * 0.4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + r * 0.3, cy - r * 0.5); ctx.lineTo(cx - r * 0.1, cy + r * 0.2); ctx.stroke();
        ctx.globalAlpha = 1;
        // Inner crystal glow
        const ig = ctx.createRadialGradient(cx, cy, 2, cx, cy, r * 0.7);
        ig.addColorStop(0, 'rgba(255,100,160,0.3)'); ig.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2); ctx.fill();
        // Angry face
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.ellipse(cx - r * 0.22, cy - r * 0.1, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + r * 0.22, cy - r * 0.1, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = dark;
        ctx.beginPath(); ctx.arc(cx - r * 0.2, cy - r * 0.05, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + r * 0.24, cy - r * 0.05, 2.5, 0, Math.PI * 2); ctx.fill();
        // Angry V eyebrows
        ctx.strokeStyle = dark; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx - r * 0.38, cy - r * 0.25); ctx.lineTo(cx - r * 0.1, cy - r * 0.18); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + r * 0.38, cy - r * 0.25); ctx.lineTo(cx + r * 0.1, cy - r * 0.18); ctx.stroke();
        // Toothy grin
        ctx.fillStyle = '#1a0022';
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.3, cy + r * 0.2);
        ctx.lineTo(cx + r * 0.3, cy + r * 0.2);
        ctx.lineTo(cx + r * 0.2, cy + r * 0.4);
        ctx.lineTo(cx - r * 0.2, cy + r * 0.4);
        ctx.closePath(); ctx.fill();
        // Teeth
        ctx.fillStyle = '#ffccdd';
        for (let i = 0; i < 3; i++) {
            const tx = cx - r * 0.2 + i * r * 0.18;
            ctx.fillRect(tx, cy + r * 0.2, r * 0.08, r * 0.1);
        }
        drawHighlight(ctx, cx - 10, cy - r * 0.8, 20, 10, 0.12);
        sprites['mboss11_core'] = cv;
    }
    // Orb (20x20 → 30x30) — Orbiting crystal shard with faceted glow
    {
        const S = 30, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
        // Diamond shard shape
        ctx.beginPath();
        ctx.moveTo(cx, cy - 10); ctx.lineTo(cx + 7, cy - 2);
        ctx.lineTo(cx + 5, cy + 5); ctx.lineTo(cx, cy + 10);
        ctx.lineTo(cx - 5, cy + 5); ctx.lineTo(cx - 7, cy - 2);
        ctx.closePath();
        const g = ctx.createLinearGradient(cx - 7, cy - 10, cx + 7, cy + 10);
        g.addColorStop(0, accent); g.addColorStop(0.5, color); g.addColorStop(1, dark);
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.stroke();
        // Facet line
        ctx.strokeStyle = accent + '88'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy + 10); ctx.stroke();
        // Inner sparkle
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath(); ctx.arc(cx - 1, cy - 3, 2, 0, Math.PI * 2); ctx.fill();
        sprites['mboss11_orb'] = cv;
    }
}

// ── MINI-BOSS 12: Mirror Guardian (silver, aggressive reflective sentinel) ──
function _genMiniBoss12Sprites(sprites) {
    const color = '#aaaaee', accent = '#ddddff', dark = '#555588';
    // Core (55x55 → 71x71) — Mirror sentinel with single imposing eye
    {
        const S = 71, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2, r = 28;
        // Heptagonal mirror body
        ctx.beginPath();
        ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 0.9, cy - r * 0.25);
        ctx.lineTo(cx + r * 0.8, cy + r * 0.55); ctx.lineTo(cx + r * 0.3, cy + r);
        ctx.lineTo(cx - r * 0.3, cy + r); ctx.lineTo(cx - r * 0.8, cy + r * 0.55);
        ctx.lineTo(cx - r * 0.9, cy - r * 0.25); ctx.closePath();
        outlineAndFill(ctx, color, '#111', 2.5);
        // Mirror shine effect
        const mg = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
        mg.addColorStop(0, 'rgba(255,255,255,0.25)'); mg.addColorStop(0.5, 'rgba(255,255,255,0.05)');
        mg.addColorStop(1, 'rgba(255,255,255,0.2)');
        ctx.fillStyle = mg; ctx.fill();
        // Large single imposing cyclops eye
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.ellipse(cx, cy - r * 0.1, 10, 11, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.stroke();
        // Iris with rainbow shimmer
        const iris = ctx.createRadialGradient(cx, cy - r * 0.08, 2, cx, cy - r * 0.08, 7);
        iris.addColorStop(0, '#3388ff'); iris.addColorStop(0.5, '#aabbff'); iris.addColorStop(1, '#555588');
        ctx.fillStyle = iris;
        ctx.beginPath(); ctx.arc(cx, cy - r * 0.08, 6, 0, Math.PI * 2); ctx.fill();
        // Pupil
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.arc(cx, cy - r * 0.06, 3, 0, Math.PI * 2); ctx.fill();
        // Eye highlight
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(cx - 3, cy - r * 0.18, 2, 0, Math.PI * 2); ctx.fill();
        // Stern expression line under eye
        ctx.strokeStyle = dark; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx, cy + r * 0.3, r * 0.2, 0.3, Math.PI - 0.3); ctx.stroke();
        // Prismatic rainbow streak across face
        ctx.save(); ctx.globalAlpha = 0.2;
        const rb = ctx.createLinearGradient(cx - r * 0.5, cy + r * 0.5, cx + r * 0.5, cy + r * 0.5);
        rb.addColorStop(0, '#ff3333'); rb.addColorStop(0.25, '#ffff33');
        rb.addColorStop(0.5, '#33ff33'); rb.addColorStop(0.75, '#3388ff'); rb.addColorStop(1, '#ff33ff');
        ctx.fillStyle = rb;
        ctx.fillRect(cx - r * 0.5, cy + r * 0.45, r, 4);
        ctx.restore();
        drawHighlight(ctx, cx - 14, cy - r * 0.8, 28, 12, 0.12);
        sprites['mboss12_core'] = cv;
    }
    // Arm (24x34 → 34x44) — Mirror blade arm with reflective edge
    {
        const cv = _mkCanvas(34, 44), ctx = cv.getContext('2d'), cx = 17, cy = 22;
        // Blade shape
        ctx.beginPath();
        ctx.moveTo(cx, cy - 20);
        ctx.lineTo(cx + 12, cy - 4);
        ctx.lineTo(cx + 10, cy + 20);
        ctx.lineTo(cx - 10, cy + 20);
        ctx.lineTo(cx - 12, cy - 4);
        ctx.closePath();
        const bg = ctx.createLinearGradient(cx - 12, cy, cx + 12, cy);
        bg.addColorStop(0, dark); bg.addColorStop(0.3, accent); bg.addColorStop(0.7, accent); bg.addColorStop(1, dark);
        ctx.fillStyle = bg; ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
        // Central reflection line
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx, cy - 18); ctx.lineTo(cx, cy + 18); ctx.stroke();
        sprites['mboss12_arm'] = cv;
    }
    // Shield (60x16 → 72x28) — Mirror plate with shimmer
    {
        const cv = _mkCanvas(72, 28), ctx = cv.getContext('2d');
        ctx.beginPath(); ctx.roundRect(6, 6, 60, 16, 3);
        outlineAndFill(ctx, color, '#111', 2);
        // Mirror reflection gradient
        const sg = ctx.createLinearGradient(6, 14, 66, 14);
        sg.addColorStop(0, 'rgba(255,255,255,0)');
        sg.addColorStop(0.3, 'rgba(255,255,255,0.3)');
        sg.addColorStop(0.7, 'rgba(255,255,255,0.3)');
        sg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = sg;
        ctx.beginPath(); ctx.roundRect(8, 8, 56, 12, 2); ctx.fill();
        // Prismatic line
        ctx.save(); ctx.globalAlpha = 0.35;
        const pl = ctx.createLinearGradient(10, 14, 62, 14);
        pl.addColorStop(0, '#ff4444'); pl.addColorStop(0.33, '#44ff44');
        pl.addColorStop(0.66, '#4488ff'); pl.addColorStop(1, '#ff44ff');
        ctx.strokeStyle = pl; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(12, 14); ctx.lineTo(60, 14); ctx.stroke();
        ctx.restore();
        sprites['mboss12_shield'] = cv;
    }
}

// ═══════════════════════════════════════════════════════════════
//  WORLD 4 — QUANTUM REALM  (Mini-bosses 13-16)
//  Aesthetic: elegant particle-physics motifs — quark faces,
//  wave-particle duality, Feynman vertices, probability clouds.
// ═══════════════════════════════════════════════════════════════

// ── MINI-BOSS 13: Charm Quark — fast, color-phase cycling ──
function _genMiniBoss13Sprites(sprites) {
    const color = '#ff5588', accent = '#ff88aa', dark = '#993355';
    // Core (55x55 → 71x71) — Charm quark face with playful malice
    {
        const S = 71, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2, r = 28;
        // Phase-shimmer aura
        const aura = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r * 1.12);
        aura.addColorStop(0, color + '00'); aura.addColorStop(0.6, color + '18');
        aura.addColorStop(1, color + '00');
        ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(cx, cy, r * 1.12, 0, Math.PI * 2); ctx.fill();
        // Rounded triangular body (quark-ness)
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
            const a = (Math.PI * 2 / 3) * i - Math.PI / 2;
            const na = (Math.PI * 2 / 3) * (i + 1) - Math.PI / 2;
            const px = cx + r * Math.cos(a), py = cy + r * Math.sin(a);
            if (i === 0) ctx.moveTo(px, py);
            const midA = (a + na) / 2;
            ctx.quadraticCurveTo(cx + r * 1.12 * Math.cos(midA), cy + r * 1.12 * Math.sin(midA),
                cx + r * Math.cos(na), cy + r * Math.sin(na));
        }
        ctx.closePath();
        outlineAndFill(ctx, color, '#111', 2.5);
        // Inner charm swirl pattern
        ctx.strokeStyle = accent + '44'; ctx.lineWidth = 0.8;
        ctx.beginPath();
        for (let t = 0; t < Math.PI * 3; t += 0.2) {
            const sr = 4 + t * 2.5; if (sr > r * 0.8) break;
            const px = cx + sr * Math.cos(t), py = cy + sr * Math.sin(t);
            if (t === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
        // Mischievous cat-like eyes
        for (const sx of [-1, 1]) {
            const ex = cx + sx * 8, ey = cy - 4;
            ctx.fillStyle = '#111'; ctx.beginPath();
            ctx.moveTo(ex - 5 * sx, ey - 2); ctx.quadraticCurveTo(ex, ey - 5, ex + 5 * sx, ey);
            ctx.quadraticCurveTo(ex, ey + 3, ex - 5 * sx, ey - 2); ctx.fill();
            // Vertical slit pupil
            ctx.fillStyle = '#ffdd44'; ctx.beginPath();
            ctx.ellipse(ex + sx * 0.5, ey - 0.5, 2.5, 3, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#000'; ctx.beginPath();
            ctx.ellipse(ex + sx * 0.5, ey - 0.5, 0.8, 2.5, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex - sx, ey - 2, 0.7, 0, Math.PI * 2); ctx.fill();
        }
        // Cheshire grin
        ctx.strokeStyle = dark; ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(cx - 10, cy + 6);
        ctx.quadraticCurveTo(cx - 5, cy + 12, cx, cy + 8);
        ctx.quadraticCurveTo(cx + 5, cy + 12, cx + 10, cy + 6);
        ctx.stroke();
        // "C" charm inscription on forehead
        ctx.fillStyle = accent + '66'; ctx.font = 'italic 9px serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('c', cx, cy - r * 0.55);
        drawHighlight(ctx, cx - 12, cy - r * 0.7, 24, 10, 0.14);
        sprites['mboss13_core'] = cv;
    }
    // Orb — orbiting charm-phase node
    {
        const S = 28, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 9);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, accent); g.addColorStop(1, dark);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.stroke();
        // Tiny playful dot eyes
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(cx - 2.5, cy - 1, 1, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 2.5, cy - 1, 1, 0, Math.PI * 2); ctx.fill();
        // Tiny smile
        ctx.strokeStyle = '#000'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.arc(cx, cy + 2, 2, 0.1, Math.PI - 0.1); ctx.stroke();
        sprites['mboss13_orb'] = cv;
    }
}

// ── MINI-BOSS 14: Strange Oscillator — 3-state form shifter ──
function _genMiniBoss14Sprites(sprites) {
    const color = '#55ddff', accent = '#88eeff', dark = '#226688';
    // Core (58x58 → 74x74) — Pulsating strange-quark face with oscillation patterns
    {
        const S = 74, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2, r = 30;
        // Standing-wave aura
        ctx.strokeStyle = color + '22'; ctx.lineWidth = 1;
        for (let i = 3; i >= 1; i--) {
            ctx.beginPath(); ctx.arc(cx, cy, r + i * 4, 0, Math.PI * 2); ctx.stroke();
        }
        // Diamond-square body (strange geometry)
        ctx.beginPath();
        ctx.moveTo(cx, cy - r);
        ctx.lineTo(cx + r * 0.7, cy - r * 0.35);
        ctx.lineTo(cx + r, cy + r * 0.1);
        ctx.lineTo(cx + r * 0.6, cy + r * 0.75);
        ctx.lineTo(cx, cy + r);
        ctx.lineTo(cx - r * 0.6, cy + r * 0.75);
        ctx.lineTo(cx - r, cy + r * 0.1);
        ctx.lineTo(cx - r * 0.7, cy - r * 0.35);
        ctx.closePath();
        outlineAndFill(ctx, color, '#111', 2.5);
        // Oscillation wave pattern
        ctx.strokeStyle = dark + '55'; ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            for (let x = -r * 0.7; x <= r * 0.7; x += 1) {
                const py = cy - 10 + i * 10 + Math.sin(x * 0.3 + i * 1.5) * 3;
                if (x === -r * 0.7) ctx.moveTo(cx + x, py); else ctx.lineTo(cx + x, py);
            }
            ctx.stroke();
        }
        // Hypnotic concentric-ring eyes
        for (const sx of [-1, 1]) {
            const ex = cx + sx * 9, ey = cy - 5;
            // Outer socket
            ctx.fillStyle = '#0a2233'; ctx.beginPath();
            ctx.arc(ex, ey, 6, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.stroke();
            // Concentric rings
            ctx.strokeStyle = accent; ctx.lineWidth = 0.7;
            ctx.beginPath(); ctx.arc(ex, ey, 4.5, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = color; ctx.beginPath(); ctx.arc(ex, ey, 3, 0, Math.PI * 2); ctx.stroke();
            // Center dot
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex, ey, 1.5, 0, Math.PI * 2); ctx.fill();
        }
        // "~" oscillation mouth
        ctx.strokeStyle = dark; ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(cx - 8, cy + 9);
        for (let x = -8; x <= 8; x += 1) {
            ctx.lineTo(cx + x, cy + 9 + Math.sin(x * 0.6) * 2.5);
        }
        ctx.stroke();
        // "s" strange marking
        ctx.fillStyle = accent + '55'; ctx.font = 'italic 9px serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('s', cx, cy - r * 0.6);
        drawHighlight(ctx, cx - 14, cy - r * 0.8, 28, 10, 0.12);
        sprites['mboss14_core'] = cv;
    }
    // Shield — oscillation barrier
    {
        const cv = _mkCanvas(77, 30), ctx = cv.getContext('2d');
        ctx.beginPath(); ctx.roundRect(6, 6, 65, 18, 3);
        outlineAndFill(ctx, dark, '#111', 2);
        // Standing wave pattern on shield
        ctx.strokeStyle = accent + '88'; ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 10; x <= 67; x += 1) {
            const py = 15 + Math.sin(x * 0.2) * 4;
            if (x === 10) ctx.moveTo(x, py); else ctx.lineTo(x, py);
        }
        ctx.stroke();
        sprites['mboss14_shield'] = cv;
    }
    // Arm — phase-shifting appendage
    {
        const cv = _mkCanvas(36, 47), ctx = cv.getContext('2d'), cx = 18, cy = 24;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 20);
        ctx.quadraticCurveTo(cx + 14, cy - 10, cx + 12, cy + 8);
        ctx.lineTo(cx + 8, cy + 20);
        ctx.lineTo(cx - 8, cy + 20);
        ctx.lineTo(cx - 12, cy + 8);
        ctx.quadraticCurveTo(cx - 14, cy - 10, cx, cy - 20);
        ctx.closePath();
        outlineAndFill(ctx, dark, '#111', 2);
        // Wave line down center
        ctx.strokeStyle = accent + '66'; ctx.lineWidth = 1;
        ctx.beginPath();
        for (let y = -16; y <= 16; y += 1) {
            const px = cx + Math.sin(y * 0.5) * 4;
            if (y === -16) ctx.moveTo(px, cy + y); else ctx.lineTo(px, cy + y);
        }
        ctx.stroke();
        // Barrel
        ctx.fillStyle = '#335566'; ctx.beginPath();
        ctx.roundRect(cx - 3, cy - 24, 6, 8, 2); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.stroke();
        sprites['mboss14_arm'] = cv;
    }
}

// ── MINI-BOSS 15: Top Resonance — heavy, rotating shield ──
function _genMiniBoss15Sprites(sprites) {
    const color = '#ffcc33', accent = '#ffee77', dark = '#886600';
    // Core (50x50 → 66x66) — Resonant face with harmonic patterns
    {
        const S = 66, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2, r = 26;
        // Resonance halo
        ctx.strokeStyle = color + '15'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy, r + 6, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = color + '10'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx, cy, r + 10, 0, Math.PI * 2); ctx.stroke();
        // Octagonal body — resonator chamber
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const a = (Math.PI / 4) * i - Math.PI / 8;
            const px = cx + r * Math.cos(a), py = cy + r * Math.sin(a);
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        outlineAndFill(ctx, color, '#111', 2.5);
        // Inner resonance pattern — concentric pentagons
        ctx.strokeStyle = dark + '44'; ctx.lineWidth = 0.7;
        for (let ring = 2; ring >= 1; ring--) {
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const a = (Math.PI * 2 / 5) * i - Math.PI / 2;
                const pr = r * 0.3 * ring;
                const px = cx + pr * Math.cos(a), py = cy + pr * Math.sin(a);
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath(); ctx.stroke();
        }
        // Stern, focused eyes — resonator precision
        for (const sx of [-1, 1]) {
            const ex = cx + sx * 8, ey = cy - 4;
            ctx.fillStyle = '#222200'; ctx.beginPath();
            ctx.ellipse(ex, ey, 5, 3.5, 0, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.stroke();
            // Target-reticle iris
            ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(ex, ey, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#664400'; ctx.lineWidth = 0.5;
            ctx.beginPath(); ctx.moveTo(ex - 3, ey); ctx.lineTo(ex + 3, ey); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(ex, ey - 3); ctx.lineTo(ex, ey + 3); ctx.stroke();
            ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(ex, ey, 1, 0, Math.PI * 2); ctx.fill();
            // Flat heavy brow
            ctx.strokeStyle = dark; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(ex - sx * 6, ey - 5.5); ctx.lineTo(ex + sx * 4, ey - 5); ctx.stroke();
        }
        // Firm clenched mouth
        ctx.strokeStyle = dark; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx - 6, cy + 9); ctx.lineTo(cx + 6, cy + 9); ctx.stroke();
        // "t" top marking
        ctx.fillStyle = accent + '55'; ctx.font = 'italic 8px serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('t', cx, cy + 17);
        drawHighlight(ctx, cx - 10, cy - r * 0.7, 20, 8, 0.12);
        sprites['mboss15_core'] = cv;
    }
    // Shield — orbiting resonance plate
    {
        const cv = _mkCanvas(42, 28), ctx = cv.getContext('2d');
        ctx.beginPath(); ctx.roundRect(6, 6, 30, 16, 3);
        outlineAndFill(ctx, dark, '#111', 2);
        // Harmonic wave
        ctx.strokeStyle = accent + '88'; ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 9; x <= 33; x += 1) {
            const py = 14 + Math.sin(x * 0.4) * 3;
            if (x === 9) ctx.moveTo(x, py); else ctx.lineTo(x, py);
        }
        ctx.stroke();
        sprites['mboss15_shield'] = cv;
    }
    // Turret — resonance emitter
    {
        const S = 30, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
        ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2);
        outlineAndFill(ctx, accent, '#111', 2);
        _drawPartEye(ctx, cx, cy + 1, 4, '#ffaa00');
        // Barrel
        ctx.fillStyle = dark; ctx.beginPath();
        ctx.roundRect(cx - 2.5, cy - 14, 5, 8, 2); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1.2; ctx.stroke();
        sprites['mboss15_turret'] = cv;
    }
}

// ── MINI-BOSS 16: Bottom Decayer — splits when destroyed ──
function _genMiniBoss16Sprites(sprites) {
    const color = '#88ff55', accent = '#bbff88', dark = '#448822';
    // Core (55x55 → 71x71) — Unstable, cracked face about to split
    {
        const S = 71, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2, r = 28;
        // Decay particle cloud aura
        ctx.save(); ctx.globalAlpha = 0.08;
        for (let i = 0; i < 8; i++) {
            const angle = Math.PI * 2 * (i / 8);
            const dist = r * 0.9 + (i % 3) * 3;
            ctx.fillStyle = i % 2 === 0 ? color : accent;
            ctx.beginPath(); ctx.arc(cx + dist * Math.cos(angle), cy + dist * Math.sin(angle), 4, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
        // Slightly oblong body with visible crack line
        ctx.beginPath();
        ctx.ellipse(cx, cy, r, r * 0.85, 0, 0, Math.PI * 2);
        outlineAndFill(ctx, color, '#111', 2.5);
        // Central division crack — the split line
        ctx.strokeStyle = '#ffffff88'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, cy - r * 0.75);
        ctx.lineTo(cx + 2, cy - r * 0.3);
        ctx.lineTo(cx - 1, cy + r * 0.1);
        ctx.lineTo(cx + 1, cy + r * 0.5);
        ctx.lineTo(cx, cy + r * 0.8);
        ctx.stroke();
        // Branch cracks
        ctx.strokeStyle = '#ffffff44'; ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(cx + 2, cy - r * 0.3); ctx.lineTo(cx + 10, cy - r * 0.15); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - 1, cy + r * 0.1); ctx.lineTo(cx - 8, cy + r * 0.2); ctx.stroke();
        // Asymmetric nervous eyes — left eye bigger, right eye smaller (unstable!)
        {
            const ex = cx - 9, ey = cy - 5;
            ctx.fillStyle = '#112211'; ctx.beginPath();
            ctx.ellipse(ex, ey, 6, 5, -0.1, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.stroke();
            ctx.fillStyle = '#ccff88'; ctx.beginPath(); ctx.arc(ex, ey, 3.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(ex + 1, ey, 1.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex - 1, ey - 1.5, 0.8, 0, Math.PI * 2); ctx.fill();
        }
        {
            const ex = cx + 9, ey = cy - 4;
            ctx.fillStyle = '#112211'; ctx.beginPath();
            ctx.ellipse(ex, ey, 4.5, 3.5, 0.15, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.stroke();
            ctx.fillStyle = '#aaddaa'; ctx.beginPath(); ctx.arc(ex, ey, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(ex, ey, 1, 0, Math.PI * 2); ctx.fill();
        }
        // Worried/strained mouth
        ctx.strokeStyle = dark; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - 7, cy + 8);
        ctx.quadraticCurveTo(cx - 3, cy + 12, cx, cy + 8);
        ctx.quadraticCurveTo(cx + 3, cy + 12, cx + 7, cy + 8);
        ctx.stroke();
        // "b" bottom marking
        ctx.fillStyle = accent + '44'; ctx.font = 'italic 8px serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('b', cx, cy + 18);
        drawHighlight(ctx, cx - 12, cy - r * 0.7, 24, 10, 0.12);
        sprites['mboss16_core'] = cv;
    }
    // Pod arm — decay product pod (what splits off)
    {
        const cv = _mkCanvas(36, 46), ctx = cv.getContext('2d'), cx = 18, cy = 23;
        // Rounded pod shape
        ctx.beginPath();
        ctx.ellipse(cx, cy, 12, 18, 0, 0, Math.PI * 2);
        outlineAndFill(ctx, dark, '#111', 2);
        // Inner crack
        ctx.strokeStyle = accent + '55'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(cx, cy - 12); ctx.lineTo(cx + 2, cy);
        ctx.lineTo(cx - 1, cy + 10); ctx.stroke();
        // Tiny scared face
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(cx - 3, cy - 3, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 3, cy - 3, 1.5, 0, Math.PI * 2); ctx.fill();
        // "O" surprised mouth
        ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx, cy + 4, 2.5, 0, Math.PI * 2); ctx.stroke();
        sprites['mboss16_pod'] = cv;
    }
    // Turret — decay emitter
    {
        const S = 28, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
        ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        outlineAndFill(ctx, accent, '#111', 2);
        _drawPartEye(ctx, cx, cy + 1, 3.5, '#66cc22');
        // Barrel
        ctx.fillStyle = dark; ctx.beginPath();
        ctx.roundRect(cx - 2.5, cy - 12, 5, 7, 2); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.stroke();
        sprites['mboss16_turret'] = cv;
    }
}

export { generateMiniBossSprites };

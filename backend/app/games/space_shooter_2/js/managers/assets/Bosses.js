import { outlineAndFill, drawHighlight, _drawPartEye, _mkCanvas } from './Helper.js';
// ================================================================
//  BOSSES  — Multi-part sprites for 6 unique bosses
//  Each boss generates: _core, _turret, _arm, _shield, _orb, _weak
// ================================================================

function generateBossSprites(sprites) {
    _genBoss1Sprites(sprites);
    _genBoss2Sprites(sprites);
    _genBoss3Sprites(sprites);
    _genBoss4Sprites(sprites);
    _genBoss5Sprites(sprites);
    _genBoss6Sprites(sprites);
    // World 2 bosses
    _genBoss7Sprites(sprites);
    _genBoss8Sprites(sprites);
    _genBoss9Sprites(sprites);
    _genBoss10Sprites(sprites);
    _genBoss11Sprites(sprites);
    _genBoss12Sprites(sprites);
}





// ── BOSS 1: Crimson Vanguard (red, angular) ──
function _genBoss1Sprites(sprites) {
    const color = '#dd2222', accent = '#ff6644', dark = '#881111';
    // Core (70x70, pad=10 → 90x90)
    {
        const S = 90, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2, r = 35;
        ctx.beginPath();
        ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 0.9, cy - r * 0.3); ctx.lineTo(cx + r * 0.8, cy + r * 0.5);
        ctx.lineTo(cx + r * 0.3, cy + r); ctx.lineTo(cx - r * 0.3, cy + r); ctx.lineTo(cx - r * 0.8, cy + r * 0.5);
        ctx.lineTo(cx - r * 0.9, cy - r * 0.3); ctx.closePath();
        outlineAndFill(ctx, color, '#111', 3);
        // Panel lines
        ctx.strokeStyle = dark; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx - r * 0.4, cy - r * 0.5); ctx.lineTo(cx - r * 0.3, cy + r * 0.4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + r * 0.4, cy - r * 0.5); ctx.lineTo(cx + r * 0.3, cy + r * 0.4); ctx.stroke();
        _drawPartEye(ctx, cx, cy - 5, 10, '#ff3333');
        drawHighlight(ctx, cx - 15, cy - r * 0.8, 30, 15, 0.12);
        // Cannon nozzles at bottom
        for (const sx of [-1, 1]) {
            ctx.fillStyle = '#555'; ctx.beginPath();
            ctx.roundRect(cx + sx * 18 - 4, cy + r - 5, 8, 12, 2); ctx.fill();
            ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.stroke();
        }
        sprites['boss1_core'] = cv;
    }
    // Turret (30x30, pad=6 → 42x42)
    {
        const S = 42, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
        ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2);
        outlineAndFill(ctx, accent, '#111', 2.5);
        ctx.fillStyle = '#555'; ctx.beginPath();
        ctx.roundRect(cx - 3, cy - 18, 6, 14, 2); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.stroke();
        _drawPartEye(ctx, cx, cy + 2, 5, '#ffaa33');
        sprites['boss1_turret'] = cv;
    }
    // Arm (35x45, pad=6 → 47x57)
    {
        const S = 57, cv = _mkCanvas(47, S), ctx = cv.getContext('2d'), cx = 47 / 2, cy = S / 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 25); ctx.lineTo(cx + 18, cy - 10); ctx.lineTo(cx + 15, cy + 25);
        ctx.lineTo(cx - 15, cy + 25); ctx.lineTo(cx - 18, cy - 10); ctx.closePath();
        outlineAndFill(ctx, dark, '#111', 2.5);
        ctx.strokeStyle = color; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx - 8, cy - 5); ctx.lineTo(cx + 8, cy - 5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - 6, cy + 8); ctx.lineTo(cx + 6, cy + 8); ctx.stroke();
        sprites['boss1_arm'] = cv;
    }
}

// ── BOSS 2: Iron Monolith (orange/gold, heavy) ──
function _genBoss2Sprites(sprites) {
    const color = '#ee7700', accent = '#ffbb44', dark = '#884400';
    // Core (80x80, pad=10 → 100x100)
    {
        const S = 100, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2, r = 40;
        // Blocky armored body
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.7, cy - r); ctx.lineTo(cx + r * 0.7, cy - r);
        ctx.lineTo(cx + r, cy - r * 0.3); ctx.lineTo(cx + r * 0.9, cy + r * 0.6);
        ctx.lineTo(cx + r * 0.5, cy + r); ctx.lineTo(cx - r * 0.5, cy + r);
        ctx.lineTo(cx - r * 0.9, cy + r * 0.6); ctx.lineTo(cx - r, cy - r * 0.3);
        ctx.closePath();
        outlineAndFill(ctx, color, '#111', 3.5);
        // Armor plates
        ctx.strokeStyle = dark; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx - r * 0.3, cy - r); ctx.lineTo(cx - r * 0.3, cy + r * 0.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + r * 0.3, cy - r); ctx.lineTo(cx + r * 0.3, cy + r * 0.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - r * 0.5, cy); ctx.lineTo(cx + r * 0.5, cy); ctx.stroke();
        _drawPartEye(ctx, cx, cy - 8, 12, '#ffcc00');
        drawHighlight(ctx, cx - 20, cy - r * 0.9, 40, 18, 0.1);
        // Vents
        for (let i = -1; i <= 1; i++) {
            ctx.fillStyle = '#333'; ctx.beginPath();
            ctx.roundRect(cx + i * 14 - 4, cy + r - 8, 8, 10, 2); ctx.fill();
        }
        sprites['boss2_core'] = cv;
    }
    // Shield (100x25, pad=4 → 108x33)
    {
        const cv = _mkCanvas(108, 33), ctx = cv.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(8, 16); ctx.lineTo(20, 4); ctx.lineTo(88, 4);
        ctx.lineTo(100, 16); ctx.lineTo(88, 28); ctx.lineTo(20, 28); ctx.closePath();
        outlineAndFill(ctx, '#4488cc', '#111', 2.5);
        // Energy lines
        ctx.strokeStyle = '#88ccff'; ctx.lineWidth = 1; ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.moveTo(25, 16); ctx.lineTo(83, 16); ctx.stroke();
        ctx.globalAlpha = 1;
        drawHighlight(ctx, 25, 6, 60, 10, 0.15);
        sprites['boss2_shield'] = cv;
    }
    // Turret (35x35, pad=6 → 47)
    {
        const S = 47, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
        ctx.beginPath(); ctx.roundRect(cx - 16, cy - 16, 32, 32, 6);
        outlineAndFill(ctx, accent, '#111', 2.5);
        // Double barrels
        for (const sx of [-1, 1]) {
            ctx.fillStyle = '#555'; ctx.beginPath();
            ctx.roundRect(cx + sx * 8 - 3, cy - 22, 6, 15, 2); ctx.fill();
            ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.stroke();
        }
        _drawPartEye(ctx, cx, cy + 3, 6, '#ff8800');
        sprites['boss2_turret'] = cv;
    }
    // Arm (40x55, pad=6 → 52x67)
    {
        const cv = _mkCanvas(52, 67), ctx = cv.getContext('2d'), cx = 26, cy = 67 / 2;
        ctx.beginPath();
        ctx.moveTo(cx - 16, cy - 28); ctx.lineTo(cx + 16, cy - 28);
        ctx.lineTo(cx + 20, cy + 28); ctx.lineTo(cx - 20, cy + 28); ctx.closePath();
        outlineAndFill(ctx, dark, '#111', 2.5);
        ctx.strokeStyle = color; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx - 10, cy - 10); ctx.lineTo(cx + 10, cy - 10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - 12, cy + 5); ctx.lineTo(cx + 12, cy + 5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - 14, cy + 18); ctx.lineTo(cx + 14, cy + 18); ctx.stroke();
        sprites['boss2_arm'] = cv;
    }
}

// ── BOSS 3: Void Leviathan (purple, ethereal orbs) ──
function _genBoss3Sprites(sprites) {
    const color = '#7722dd', accent = '#bb77ff', dark = '#441188';
    // Core (75x75, pad=10 → 95)
    {
        const S = 95, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2, r = 38;
        // Organic flowing shape
        ctx.beginPath();
        ctx.moveTo(cx, cy - r);
        ctx.bezierCurveTo(cx + r * 0.8, cy - r * 0.8, cx + r, cy - r * 0.2, cx + r * 0.7, cy + r * 0.3);
        ctx.bezierCurveTo(cx + r * 0.5, cy + r, cx - r * 0.5, cy + r, cx - r * 0.7, cy + r * 0.3);
        ctx.bezierCurveTo(cx - r, cy - r * 0.2, cx - r * 0.8, cy - r * 0.8, cx, cy - r);
        ctx.closePath();
        outlineAndFill(ctx, color, '#111', 3);
        // Rune marks
        ctx.strokeStyle = accent; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.4;
        ctx.beginPath(); ctx.arc(cx, cy, r * 0.5, 0.3, 2.8); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, r * 0.3, -1, 1); ctx.stroke();
        ctx.globalAlpha = 1;
        _drawPartEye(ctx, cx, cy - 5, 11, '#aa44ff');
        drawHighlight(ctx, cx - 15, cy - r * 0.8, 30, 15, 0.1);
        sprites['boss3_core'] = cv;
    }
    // Orb (28x28, pad=6 → 40)
    {
        const S = 40, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
        // Glowing orb
        const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 16);
        g.addColorStop(0, '#ddbbff'); g.addColorStop(0.5, accent); g.addColorStop(1, dark);
        ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
        // Inner glint
        ctx.beginPath(); ctx.arc(cx - 3, cy - 3, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fill();
        sprites['boss3_orb'] = cv;
    }
    // Arm (35x50, pad=6 → 47x62)
    {
        const cv = _mkCanvas(47, 62), ctx = cv.getContext('2d'), cx = 47 / 2, cy = 62 / 2;
        // Tentacle-like arm
        ctx.beginPath();
        ctx.moveTo(cx, cy - 28); ctx.bezierCurveTo(cx + 20, cy - 15, cx + 15, cy + 10, cx + 8, cy + 28);
        ctx.lineTo(cx - 8, cy + 28); ctx.bezierCurveTo(cx - 15, cy + 10, cx - 20, cy - 15, cx, cy - 28);
        ctx.closePath();
        outlineAndFill(ctx, dark, '#111', 2.5);
        // Glowing segments
        ctx.fillStyle = accent; ctx.globalAlpha = 0.3;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath(); ctx.arc(cx, cy - 15 + i * 15, 5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        sprites['boss3_arm'] = cv;
    }
}

// ── BOSS 4: Omega Prime (magenta/gold, regal) ──
function _genBoss4Sprites(sprites) {
    const color = '#dd1177', accent = '#ff77bb', dark = '#880044';
    // Core (85x85, pad=10 → 105)
    {
        const S = 105, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2, r = 42;
        // Crown-like shape
        ctx.beginPath();
        ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 0.4, cy - r * 0.6);
        ctx.lineTo(cx + r * 0.7, cy - r * 0.9); ctx.lineTo(cx + r * 0.6, cy - r * 0.3);
        ctx.lineTo(cx + r, cy); ctx.lineTo(cx + r * 0.7, cy + r * 0.6);
        ctx.lineTo(cx + r * 0.3, cy + r); ctx.lineTo(cx - r * 0.3, cy + r);
        ctx.lineTo(cx - r * 0.7, cy + r * 0.6); ctx.lineTo(cx - r, cy);
        ctx.lineTo(cx - r * 0.6, cy - r * 0.3); ctx.lineTo(cx - r * 0.7, cy - r * 0.9);
        ctx.lineTo(cx - r * 0.4, cy - r * 0.6);
        ctx.closePath();
        outlineAndFill(ctx, color, '#111', 3.5);
        // Gold accents
        ctx.strokeStyle = '#ffcc33'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx - r * 0.4, cy - r * 0.3); ctx.lineTo(cx + r * 0.4, cy - r * 0.3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - r * 0.3, cy + r * 0.2); ctx.lineTo(cx + r * 0.3, cy + r * 0.2); ctx.stroke();
        _drawPartEye(ctx, cx, cy - 5, 13, '#ff3388');
        drawHighlight(ctx, cx - 20, cy - r * 0.85, 40, 18, 0.12);
        sprites['boss4_core'] = cv;
    }
    // Weakpoint (25x25, pad=6 → 37)
    {
        const S = 37, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
        ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2);
        const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 12);
        g.addColorStop(0, '#ffee44'); g.addColorStop(0.6, '#ff4400'); g.addColorStop(1, '#880000');
        ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
        // Pulsing inner
        ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffff88'; ctx.fill();
        sprites['boss4_weak'] = cv;
    }
    // Turret (35x35, pad=6 → 47)
    {
        const S = 47, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 16); ctx.lineTo(cx + 16, cy); ctx.lineTo(cx, cy + 16);
        ctx.lineTo(cx - 16, cy); ctx.closePath();
        outlineAndFill(ctx, accent, '#111', 2.5);
        ctx.fillStyle = '#555'; ctx.beginPath();
        ctx.roundRect(cx - 3, cy - 22, 6, 12, 2); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.stroke();
        _drawPartEye(ctx, cx, cy, 5, '#ff44aa');
        sprites['boss4_turret'] = cv;
    }
    // Shield (40x20, pad=4 → 48x28)
    {
        const cv = _mkCanvas(48, 28), ctx = cv.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(4, 14); ctx.lineTo(12, 4); ctx.lineTo(36, 4);
        ctx.lineTo(44, 14); ctx.lineTo(36, 24); ctx.lineTo(12, 24); ctx.closePath();
        outlineAndFill(ctx, '#ffcc33', '#111', 2);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.globalAlpha = 0.3;
        ctx.beginPath(); ctx.moveTo(14, 14); ctx.lineTo(34, 14); ctx.stroke();
        ctx.globalAlpha = 1;
        sprites['boss4_shield'] = cv;
    }
    // Arm (40x60, pad=6 → 52x72)
    {
        const cv = _mkCanvas(52, 72), ctx = cv.getContext('2d'), cx = 26, cy = 36;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 32); ctx.lineTo(cx + 20, cy - 15); ctx.lineTo(cx + 18, cy + 32);
        ctx.lineTo(cx - 18, cy + 32); ctx.lineTo(cx - 20, cy - 15); ctx.closePath();
        outlineAndFill(ctx, dark, '#111', 2.5);
        ctx.strokeStyle = color; ctx.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath(); ctx.moveTo(cx - 12, cy - 15 + i * 16); ctx.lineTo(cx + 12, cy - 15 + i * 16); ctx.stroke();
        }
        sprites['boss4_arm'] = cv;
    }
}

// ── BOSS 5: Nemesis (red/black, fast, many orbs) ──
function _genBoss5Sprites(sprites) {
    const color = '#dd3355', accent = '#ff6688', dark = '#771133';
    // Core (70x70, pad=10 → 90)
    {
        const S = 90, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2, r = 35;
        // Star-like shape
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const a = (Math.PI * 2 / 8) * i - Math.PI / 2;
            const pr = i % 2 === 0 ? r : r * 0.6;
            if (i === 0) ctx.moveTo(cx + Math.cos(a) * pr, cy + Math.sin(a) * pr);
            else ctx.lineTo(cx + Math.cos(a) * pr, cy + Math.sin(a) * pr);
        }
        ctx.closePath();
        outlineAndFill(ctx, color, '#111', 3);
        // Inner circle
        ctx.beginPath(); ctx.arc(cx, cy, r * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = dark; ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
        _drawPartEye(ctx, cx, cy, 10, '#ff2244');
        sprites['boss5_core'] = cv;
    }
    // Orb (25-30px, pad=6 → 42)
    {
        const S = 42, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
        const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 15);
        g.addColorStop(0, '#ffbbcc'); g.addColorStop(0.5, accent); g.addColorStop(1, dark);
        ctx.beginPath(); ctx.arc(cx, cy, 13, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx - 3, cy - 3, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fill();
        sprites['boss5_orb'] = cv;
    }
    // Arm (30x40, pad=6 → 42x52)
    {
        const cv = _mkCanvas(42, 52), ctx = cv.getContext('2d'), cx = 21, cy = 26;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 22); ctx.lineTo(cx + 15, cy - 8); ctx.lineTo(cx + 12, cy + 22);
        ctx.lineTo(cx - 12, cy + 22); ctx.lineTo(cx - 15, cy - 8); ctx.closePath();
        outlineAndFill(ctx, dark, '#111', 2);
        ctx.strokeStyle = color; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx - 8, cy); ctx.lineTo(cx + 8, cy); ctx.stroke();
        sprites['boss5_arm'] = cv;
    }
}

// ── BOSS 6: Apocalypse (red/black/orange, final boss, massive) ──
function _genBoss6Sprites(sprites) {
    const color = '#ff2200', accent = '#ff6633', dark = '#880000';
    // Core (90x90, pad=10 → 110)
    {
        const S = 110, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2, r = 45;
        // Menacing skull-like shape
        ctx.beginPath();
        ctx.moveTo(cx, cy - r);
        ctx.bezierCurveTo(cx + r * 0.6, cy - r, cx + r, cy - r * 0.5, cx + r, cy);
        ctx.bezierCurveTo(cx + r, cy + r * 0.4, cx + r * 0.6, cy + r * 0.8, cx + r * 0.4, cy + r);
        ctx.lineTo(cx + r * 0.15, cy + r * 0.7);
        ctx.lineTo(cx, cy + r * 0.9);
        ctx.lineTo(cx - r * 0.15, cy + r * 0.7);
        ctx.lineTo(cx - r * 0.4, cy + r);
        ctx.bezierCurveTo(cx - r * 0.6, cy + r * 0.8, cx - r, cy + r * 0.4, cx - r, cy);
        ctx.bezierCurveTo(cx - r, cy - r * 0.5, cx - r * 0.6, cy - r, cx, cy - r);
        ctx.closePath();
        outlineAndFill(ctx, color, '#111', 4);
        // Skull details
        ctx.strokeStyle = dark; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx - r * 0.5, cy - r * 0.3); ctx.lineTo(cx - r * 0.3, cy + r * 0.3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + r * 0.5, cy - r * 0.3); ctx.lineTo(cx + r * 0.3, cy + r * 0.3); ctx.stroke();
        // Two eyes
        _drawPartEye(ctx, cx - 12, cy - 8, 9, '#ff4400');
        _drawPartEye(ctx, cx + 12, cy - 8, 9, '#ff4400');
        // Mouth
        ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx - 15, cy + 15); ctx.lineTo(cx - 8, cy + 10);
        ctx.lineTo(cx, cy + 15); ctx.lineTo(cx + 8, cy + 10); ctx.lineTo(cx + 15, cy + 15); ctx.stroke();
        drawHighlight(ctx, cx - 25, cy - r * 0.9, 50, 20, 0.1);
        sprites['boss6_core'] = cv;
    }
    // Turret (35x35, pad=6 → 47)
    {
        const S = 47, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 17); ctx.lineTo(cx + 17, cy - 5); ctx.lineTo(cx + 12, cy + 17);
        ctx.lineTo(cx - 12, cy + 17); ctx.lineTo(cx - 17, cy - 5); ctx.closePath();
        outlineAndFill(ctx, accent, '#111', 2.5);
        // Triple barrel
        for (const off of [-7, 0, 7]) {
            ctx.fillStyle = '#444'; ctx.beginPath();
            ctx.roundRect(cx + off - 2, cy - 24, 4, 12, 1); ctx.fill();
            ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.stroke();
        }
        _drawPartEye(ctx, cx, cy + 3, 5, '#ff6600');
        sprites['boss6_turret'] = cv;
    }
    // Orb (28x28, pad=6 → 40)
    {
        const S = 40, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
        const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 14);
        g.addColorStop(0, '#ffcc66'); g.addColorStop(0.4, accent); g.addColorStop(1, dark);
        ctx.beginPath(); ctx.arc(cx, cy, 13, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx - 3, cy - 3, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fill();
        sprites['boss6_orb'] = cv;
    }
    // Shield (120x25, pad=4 → 128x33)
    {
        const cv = _mkCanvas(128, 33), ctx = cv.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(8, 16); ctx.lineTo(20, 4); ctx.lineTo(108, 4);
        ctx.lineTo(120, 16); ctx.lineTo(108, 28); ctx.lineTo(20, 28); ctx.closePath();
        outlineAndFill(ctx, '#cc3300', '#111', 2.5);
        ctx.strokeStyle = '#ff8844'; ctx.lineWidth = 1; ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.moveTo(28, 16); ctx.lineTo(100, 16); ctx.stroke();
        ctx.globalAlpha = 1;
        drawHighlight(ctx, 25, 6, 78, 10, 0.12);
        sprites['boss6_shield'] = cv;
    }
    // Weakpoint (22x22, pad=6 → 34)
    {
        const S = 34, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
        ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2);
        const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 10);
        g.addColorStop(0, '#ffff66'); g.addColorStop(0.5, '#ff6600'); g.addColorStop(1, '#990000');
        ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffff88'; ctx.fill();
        sprites['boss6_weak'] = cv;
    }
    // Arm (45x65, pad=6 → 57x77)
    {
        const cv = _mkCanvas(57, 77), ctx = cv.getContext('2d'), cx = 57 / 2, cy = 77 / 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 35); ctx.lineTo(cx + 22, cy - 18); ctx.lineTo(cx + 20, cy + 35);
        ctx.lineTo(cx - 20, cy + 35); ctx.lineTo(cx - 22, cy - 18); ctx.closePath();
        outlineAndFill(ctx, dark, '#111', 3);
        // Glow segments
        ctx.fillStyle = accent; ctx.globalAlpha = 0.3;
        for (let i = 0; i < 4; i++) {
            ctx.beginPath(); ctx.arc(cx, cy - 20 + i * 14, 4, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.strokeStyle = color; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx - 14, cy - 5); ctx.lineTo(cx + 14, cy - 5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - 16, cy + 12); ctx.lineTo(cx + 16, cy + 12); ctx.stroke();
        sprites['boss6_arm'] = cv;
    }
}

// ═══════════════════════════════════════════════════════════════
//  WORLD 2 BOSSES — 6 planetary guardians (Bosses 7–12)
// ═══════════════════════════════════════════════════════════════

// ── BOSS 7: Titanus Rex (green, organic, jungle guardian) ──
function _genBoss7Sprites(sprites) {
    const color = '#22cc44', accent = '#55ee77', dark = '#117722';
    // Core (85x85 → pad=10 → 105)
    {
        const S = 105, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2, r = 42;
        // Massive reptilian skull
        ctx.beginPath();
        ctx.moveTo(cx, cy - r);
        ctx.bezierCurveTo(cx + r * 0.7, cy - r, cx + r, cy - r * 0.4, cx + r * 0.9, cy + r * 0.1);
        ctx.lineTo(cx + r * 0.7, cy + r * 0.7);
        ctx.bezierCurveTo(cx + r * 0.3, cy + r, cx - r * 0.3, cy + r, cx - r * 0.7, cy + r * 0.7);
        ctx.lineTo(cx - r * 0.9, cy + r * 0.1);
        ctx.bezierCurveTo(cx - r, cy - r * 0.4, cx - r * 0.7, cy - r, cx, cy - r);
        ctx.closePath();
        outlineAndFill(ctx, color, '#111', 3.5);
        // Scale texture
        ctx.strokeStyle = dark; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx - r * 0.5, cy - r * 0.4); ctx.lineTo(cx - r * 0.3, cy + r * 0.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + r * 0.5, cy - r * 0.4); ctx.lineTo(cx + r * 0.3, cy + r * 0.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - r * 0.7, cy + r * 0.1); ctx.lineTo(cx + r * 0.7, cy + r * 0.1); ctx.stroke();
        // Rex teeth at bottom
        ctx.fillStyle = '#fff';
        for (let i = -2; i <= 2; i++) {
            ctx.beginPath();
            ctx.moveTo(cx + i * 10 - 4, cy + r * 0.65); ctx.lineTo(cx + i * 10, cy + r * 0.9);
            ctx.lineTo(cx + i * 10 + 4, cy + r * 0.65); ctx.closePath(); ctx.fill();
        }
        // Twin predator eyes
        _drawPartEye(ctx, cx - 14, cy - 10, 10, '#44ff66');
        _drawPartEye(ctx, cx + 14, cy - 10, 10, '#44ff66');
        drawHighlight(ctx, cx - 20, cy - r * 0.9, 40, 18, 0.12);
        sprites['boss7_core'] = cv;
    }
    // Turret (32x32 → 44)
    {
        const S = 44, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
        ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2);
        outlineAndFill(ctx, accent, '#111', 2.5);
        // Thorn barrel
        ctx.fillStyle = '#446633'; ctx.beginPath();
        ctx.moveTo(cx - 2, cy - 20); ctx.lineTo(cx + 2, cy - 20); ctx.lineTo(cx + 4, cy - 6); ctx.lineTo(cx - 4, cy - 6); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.stroke();
        _drawPartEye(ctx, cx, cy + 2, 5, '#66ff88');
        sprites['boss7_turret'] = cv;
    }
    // Arm (40x55 → 52x67)
    {
        const cv = _mkCanvas(52, 67), ctx = cv.getContext('2d'), cx = 26, cy = 67 / 2;
        // Muscular claw arm
        ctx.beginPath();
        ctx.moveTo(cx, cy - 28); ctx.lineTo(cx + 20, cy - 12); ctx.lineTo(cx + 18, cy + 22);
        ctx.lineTo(cx + 8, cy + 30); ctx.lineTo(cx - 8, cy + 30);
        ctx.lineTo(cx - 18, cy + 22); ctx.lineTo(cx - 20, cy - 12); ctx.closePath();
        outlineAndFill(ctx, dark, '#111', 2.5);
        // Claw tips
        ctx.fillStyle = accent;
        ctx.beginPath(); ctx.moveTo(cx - 5, cy + 30); ctx.lineTo(cx - 8, cy + 28); ctx.lineTo(cx - 2, cy + 30); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx + 5, cy + 30); ctx.lineTo(cx + 8, cy + 28); ctx.lineTo(cx + 2, cy + 30); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = color; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx - 10, cy - 5); ctx.lineTo(cx + 10, cy - 5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - 8, cy + 10); ctx.lineTo(cx + 8, cy + 10); ctx.stroke();
        sprites['boss7_arm'] = cv;
    }
    // Shield (90x22 → 102x34)
    {
        const cv = _mkCanvas(102, 34), ctx = cv.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(6, 17); ctx.lineTo(16, 4); ctx.lineTo(86, 4);
        ctx.lineTo(96, 17); ctx.lineTo(86, 30); ctx.lineTo(16, 30); ctx.closePath();
        outlineAndFill(ctx, '#338844', '#111', 2.5);
        // Vine pattern
        ctx.strokeStyle = '#55bb66'; ctx.lineWidth = 1; ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.moveTo(20, 17); ctx.bezierCurveTo(35, 8, 55, 26, 80, 17); ctx.stroke();
        ctx.globalAlpha = 1;
        drawHighlight(ctx, 20, 6, 60, 10, 0.12);
        sprites['boss7_shield'] = cv;
    }
}

// ── BOSS 8: Magma Colossus (orange/red, volcanic, massive) ──
function _genBoss8Sprites(sprites) {
    const color = '#ff5500', accent = '#ff8833', dark = '#992200';
    // Core (90x90 → 110)
    {
        const S = 110, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2, r = 45;
        // Bulky volcanic body
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.6, cy - r); ctx.lineTo(cx + r * 0.6, cy - r);
        ctx.lineTo(cx + r, cy - r * 0.2); ctx.lineTo(cx + r * 0.85, cy + r * 0.6);
        ctx.lineTo(cx + r * 0.4, cy + r); ctx.lineTo(cx - r * 0.4, cy + r);
        ctx.lineTo(cx - r * 0.85, cy + r * 0.6); ctx.lineTo(cx - r, cy - r * 0.2);
        ctx.closePath();
        outlineAndFill(ctx, color, '#111', 3.5);
        // Lava veins (glowing)
        ctx.save(); ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 6;
        ctx.strokeStyle = '#ffaa33'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(cx - r * 0.4, cy - r * 0.7); ctx.lineTo(cx - r * 0.1, cy); ctx.lineTo(cx - r * 0.3, cy + r * 0.6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + r * 0.3, cy - r * 0.5); ctx.lineTo(cx + r * 0.2, cy + r * 0.4); ctx.stroke();
        ctx.restore();
        // Armor plates
        ctx.strokeStyle = dark; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx - r * 0.3, cy - r); ctx.lineTo(cx - r * 0.3, cy + r * 0.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + r * 0.3, cy - r); ctx.lineTo(cx + r * 0.3, cy + r * 0.5); ctx.stroke();
        _drawPartEye(ctx, cx, cy - 8, 13, '#ff4400');
        drawHighlight(ctx, cx - 22, cy - r * 0.9, 44, 18, 0.1);
        sprites['boss8_core'] = cv;
    }
    // Turret (35x35 → 47)
    {
        const S = 47, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
        ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI * 2);
        outlineAndFill(ctx, accent, '#111', 2.5);
        // Flame barrel
        for (const sx of [-1, 1]) {
            ctx.fillStyle = '#555'; ctx.beginPath();
            ctx.roundRect(cx + sx * 6 - 3, cy - 20, 6, 14, 2); ctx.fill();
            ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.stroke();
        }
        _drawPartEye(ctx, cx, cy + 2, 5, '#ff7700');
        sprites['boss8_turret'] = cv;
    }
    // Orb (28x28 → 40) — orbiting magma ball
    {
        const S = 40, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
        const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 14);
        g.addColorStop(0, '#ffdd66'); g.addColorStop(0.5, '#ff6600'); g.addColorStop(1, dark);
        ctx.beginPath(); ctx.arc(cx, cy, 13, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx - 3, cy - 3, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,200,0.5)'; ctx.fill();
        sprites['boss8_orb'] = cv;
    }
    // Arm (45x60 → 57x72)
    {
        const cv = _mkCanvas(57, 72), ctx = cv.getContext('2d'), cx = 57 / 2, cy = 72 / 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 32); ctx.lineTo(cx + 22, cy - 16); ctx.lineTo(cx + 20, cy + 32);
        ctx.lineTo(cx - 20, cy + 32); ctx.lineTo(cx - 22, cy - 16); ctx.closePath();
        outlineAndFill(ctx, dark, '#111', 2.5);
        // Lava glow segments
        ctx.save(); ctx.shadowColor = '#ff4400'; ctx.shadowBlur = 4;
        ctx.fillStyle = '#ff8833'; ctx.globalAlpha = 0.4;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath(); ctx.arc(cx, cy - 18 + i * 16, 5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1; ctx.restore();
        sprites['boss8_arm'] = cv;
    }
    // Shield (110x25 → 122x37)
    {
        const cv = _mkCanvas(122, 37), ctx = cv.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(8, 18); ctx.lineTo(18, 4); ctx.lineTo(104, 4);
        ctx.lineTo(114, 18); ctx.lineTo(104, 32); ctx.lineTo(18, 32); ctx.closePath();
        outlineAndFill(ctx, '#cc4400', '#111', 2.5);
        ctx.strokeStyle = '#ff7744'; ctx.lineWidth = 1; ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.moveTo(25, 18); ctx.lineTo(97, 18); ctx.stroke();
        ctx.globalAlpha = 1;
        drawHighlight(ctx, 22, 6, 78, 12, 0.12);
        sprites['boss8_shield'] = cv;
    }
}

// ── BOSS 9: Frost Sovereign (ice blue, crystalline, regal) ──
function _genBoss9Sprites(sprites) {
    const color = '#44bbff', accent = '#88ddff', dark = '#2266aa';
    // Core (80x80 → 100)
    {
        const S = 100, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2, r = 40;
        // Crown-like crystal shape
        ctx.beginPath();
        ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 0.35, cy - r * 0.55);
        ctx.lineTo(cx + r * 0.65, cy - r * 0.85); ctx.lineTo(cx + r * 0.55, cy - r * 0.25);
        ctx.lineTo(cx + r, cy + r * 0.1); ctx.lineTo(cx + r * 0.6, cy + r * 0.7);
        ctx.lineTo(cx + r * 0.2, cy + r); ctx.lineTo(cx - r * 0.2, cy + r);
        ctx.lineTo(cx - r * 0.6, cy + r * 0.7); ctx.lineTo(cx - r, cy + r * 0.1);
        ctx.lineTo(cx - r * 0.55, cy - r * 0.25); ctx.lineTo(cx - r * 0.65, cy - r * 0.85);
        ctx.lineTo(cx - r * 0.35, cy - r * 0.55);
        ctx.closePath();
        outlineAndFill(ctx, color, '#111', 3);
        // Ice facets
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r * 0.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - r * 0.5, cy); ctx.lineTo(cx + r * 0.5, cy); ctx.stroke();
        // Frost aura
        const fg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.6);
        fg.addColorStop(0, 'rgba(200,240,255,0.2)'); fg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2); ctx.fill();
        _drawPartEye(ctx, cx, cy - 5, 12, '#aaeeff');
        drawHighlight(ctx, cx - 18, cy - r * 0.85, 36, 16, 0.15);
        sprites['boss9_core'] = cv;
    }
    // Orb (26x26 → 38) — orbiting ice crystal
    {
        const S = 38, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
        const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 14);
        g.addColorStop(0, '#eeffff'); g.addColorStop(0.5, accent); g.addColorStop(1, dark);
        ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
        // Sparkle
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath(); ctx.arc(cx - 3, cy - 3, 3, 0, Math.PI * 2); ctx.fill();
        sprites['boss9_orb'] = cv;
    }
    // Shield (35x18 → 47x30)
    {
        const cv = _mkCanvas(47, 30), ctx = cv.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(5, 15); ctx.lineTo(12, 3); ctx.lineTo(35, 3);
        ctx.lineTo(42, 15); ctx.lineTo(35, 27); ctx.lineTo(12, 27); ctx.closePath();
        outlineAndFill(ctx, '#66ccee', '#111', 2);
        ctx.strokeStyle = '#aaeeff'; ctx.lineWidth = 1; ctx.globalAlpha = 0.4;
        ctx.beginPath(); ctx.moveTo(15, 15); ctx.lineTo(32, 15); ctx.stroke();
        ctx.globalAlpha = 1;
        sprites['boss9_shield'] = cv;
    }
    // Arm (38x50 → 50x62)
    {
        const cv = _mkCanvas(50, 62), ctx = cv.getContext('2d'), cx = 25, cy = 31;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 28); ctx.lineTo(cx + 18, cy - 12); ctx.lineTo(cx + 15, cy + 28);
        ctx.lineTo(cx - 15, cy + 28); ctx.lineTo(cx - 18, cy - 12); ctx.closePath();
        outlineAndFill(ctx, dark, '#111', 2.5);
        // Icicle detail
        ctx.fillStyle = accent; ctx.globalAlpha = 0.3;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(cx, cy - 15 + i * 14, 4, 0, Math.PI * 2); ctx.fill(); }
        ctx.globalAlpha = 1;
        sprites['boss9_arm'] = cv;
    }
}

// ── BOSS 10: Sandstorm Leviathan (gold/sand, desert titan) ──
function _genBoss10Sprites(sprites) {
    const color = '#ddaa33', accent = '#eedd88', dark = '#886622';
    // Core (85x85 → 105)
    {
        const S = 105, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2, r = 42;
        // Massive sand serpent head
        ctx.beginPath();
        ctx.moveTo(cx, cy - r);
        ctx.bezierCurveTo(cx + r * 0.8, cy - r * 0.8, cx + r, cy - r * 0.2, cx + r * 0.8, cy + r * 0.3);
        ctx.bezierCurveTo(cx + r * 0.6, cy + r * 0.8, cx + r * 0.2, cy + r, cx, cy + r * 0.9);
        ctx.bezierCurveTo(cx - r * 0.2, cy + r, cx - r * 0.6, cy + r * 0.8, cx - r * 0.8, cy + r * 0.3);
        ctx.bezierCurveTo(cx - r, cy - r * 0.2, cx - r * 0.8, cy - r * 0.8, cx, cy - r);
        ctx.closePath();
        outlineAndFill(ctx, color, '#111', 3.5);
        // Desert markings
        ctx.strokeStyle = dark; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx - r * 0.4, cy - r * 0.5); ctx.lineTo(cx - r * 0.2, cy + r * 0.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + r * 0.4, cy - r * 0.5); ctx.lineTo(cx + r * 0.2, cy + r * 0.5); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.1, r * 0.5, r * 0.15, 0, 0, Math.PI * 2); ctx.stroke();
        // Twin golden eyes
        _drawPartEye(ctx, cx - 13, cy - 8, 10, '#ffcc00');
        _drawPartEye(ctx, cx + 13, cy - 8, 10, '#ffcc00');
        drawHighlight(ctx, cx - 20, cy - r * 0.9, 40, 18, 0.1);
        sprites['boss10_core'] = cv;
    }
    // Turret (35x35 → 47)
    {
        const S = 47, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 17); ctx.lineTo(cx + 17, cy - 3); ctx.lineTo(cx + 12, cy + 17);
        ctx.lineTo(cx - 12, cy + 17); ctx.lineTo(cx - 17, cy - 3); ctx.closePath();
        outlineAndFill(ctx, accent, '#111', 2.5);
        ctx.fillStyle = '#555'; ctx.beginPath();
        ctx.roundRect(cx - 3, cy - 23, 6, 12, 2); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.stroke();
        _drawPartEye(ctx, cx, cy + 2, 5, '#ffaa00');
        sprites['boss10_turret'] = cv;
    }
    // Orb (30x30 → 42)
    {
        const S = 42, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
        const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 15);
        g.addColorStop(0, '#ffeeaa'); g.addColorStop(0.5, accent); g.addColorStop(1, dark);
        ctx.beginPath(); ctx.arc(cx, cy, 13, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx - 3, cy - 3, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fill();
        sprites['boss10_orb'] = cv;
    }
    // Weakpoint (24x24 → 36)
    {
        const S = 36, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
        ctx.beginPath(); ctx.arc(cx, cy, 11, 0, Math.PI * 2);
        const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 11);
        g.addColorStop(0, '#ffff66'); g.addColorStop(0.5, '#ff8800'); g.addColorStop(1, '#884400');
        ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffff88'; ctx.fill();
        sprites['boss10_weak'] = cv;
    }
    // Arm (42x60 → 54x72)
    {
        const cv = _mkCanvas(54, 72), ctx = cv.getContext('2d'), cx = 27, cy = 36;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 32); ctx.lineTo(cx + 20, cy - 15); ctx.lineTo(cx + 18, cy + 32);
        ctx.lineTo(cx - 18, cy + 32); ctx.lineTo(cx - 20, cy - 15); ctx.closePath();
        outlineAndFill(ctx, dark, '#111', 2.5);
        ctx.strokeStyle = color; ctx.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath(); ctx.moveTo(cx - 12, cy - 15 + i * 16); ctx.lineTo(cx + 12, cy - 15 + i * 16); ctx.stroke();
        }
        sprites['boss10_arm'] = cv;
    }
}

// ── BOSS 11: Omega Construct (metallic blue-grey, mechanical titan) ──
function _genBoss11Sprites(sprites) {
    const color = '#7799bb', accent = '#aaccdd', dark = '#445566';
    // Core (90x90 → 110)
    {
        const S = 110, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2, r = 45;
        // Heavy industrial mech body
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.65, cy - r); ctx.lineTo(cx + r * 0.65, cy - r);
        ctx.lineTo(cx + r, cy - r * 0.35); ctx.lineTo(cx + r * 0.95, cy + r * 0.55);
        ctx.lineTo(cx + r * 0.5, cy + r); ctx.lineTo(cx - r * 0.5, cy + r);
        ctx.lineTo(cx - r * 0.95, cy + r * 0.55); ctx.lineTo(cx - r, cy - r * 0.35);
        ctx.closePath();
        outlineAndFill(ctx, color, '#111', 3.5);
        // Rivets & panel lines
        ctx.strokeStyle = dark; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx - r * 0.3, cy - r); ctx.lineTo(cx - r * 0.3, cy + r * 0.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + r * 0.3, cy - r); ctx.lineTo(cx + r * 0.3, cy + r * 0.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - r * 0.6, cy - r * 0.1); ctx.lineTo(cx + r * 0.6, cy - r * 0.1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - r * 0.5, cy + r * 0.3); ctx.lineTo(cx + r * 0.5, cy + r * 0.3); ctx.stroke();
        // Rivets
        ctx.fillStyle = '#556677';
        for (let i = -1; i <= 1; i += 2) {
            for (let j = -1; j <= 1; j += 2) {
                ctx.beginPath(); ctx.arc(cx + i * r * 0.5, cy + j * r * 0.3, 3, 0, Math.PI * 2); ctx.fill();
            }
        }
        _drawPartEye(ctx, cx, cy - 12, 14, '#88ccff');
        drawHighlight(ctx, cx - 22, cy - r * 0.9, 44, 18, 0.1);
        // Exhaust vents
        for (let i = -1; i <= 1; i++) {
            ctx.fillStyle = '#333'; ctx.beginPath();
            ctx.roundRect(cx + i * 16 - 5, cy + r - 8, 10, 12, 2); ctx.fill();
        }
        sprites['boss11_core'] = cv;
    }
    // Turret (35x35 → 47)
    {
        const S = 47, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
        ctx.beginPath(); ctx.roundRect(cx - 16, cy - 16, 32, 32, 6);
        outlineAndFill(ctx, accent, '#111', 2.5);
        for (const sx of [-1, 1]) {
            ctx.fillStyle = '#555'; ctx.beginPath();
            ctx.roundRect(cx + sx * 8 - 3, cy - 22, 6, 15, 2); ctx.fill();
            ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.stroke();
        }
        _drawPartEye(ctx, cx, cy + 3, 6, '#88bbff');
        sprites['boss11_turret'] = cv;
    }
    // Turret2 (28x28 → 40) — smaller secondary
    {
        const S = 40, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
        ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2);
        outlineAndFill(ctx, dark, '#111', 2);
        ctx.fillStyle = '#666'; ctx.beginPath();
        ctx.roundRect(cx - 2, cy - 18, 4, 12, 1); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.stroke();
        _drawPartEye(ctx, cx, cy + 2, 4, '#99ccee');
        sprites['boss11_turret2'] = cv;
    }
    // Shield (130x25 → 142x37)
    {
        const cv = _mkCanvas(142, 37), ctx = cv.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(8, 18); ctx.lineTo(20, 4); ctx.lineTo(122, 4);
        ctx.lineTo(134, 18); ctx.lineTo(122, 32); ctx.lineTo(20, 32); ctx.closePath();
        outlineAndFill(ctx, '#5577aa', '#111', 2.5);
        ctx.strokeStyle = '#88aacc'; ctx.lineWidth = 1; ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.moveTo(28, 18); ctx.lineTo(114, 18); ctx.stroke();
        ctx.globalAlpha = 1;
        drawHighlight(ctx, 28, 6, 86, 10, 0.12);
        sprites['boss11_shield'] = cv;
    }
    // Shield2 (30x18 → 42x30) — mini side shields
    {
        const cv = _mkCanvas(42, 30), ctx = cv.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(4, 15); ctx.lineTo(10, 3); ctx.lineTo(32, 3);
        ctx.lineTo(38, 15); ctx.lineTo(32, 27); ctx.lineTo(10, 27); ctx.closePath();
        outlineAndFill(ctx, '#6688aa', '#111', 2);
        sprites['boss11_shield2'] = cv;
    }
    // Arm (45x65 → 57x77)
    {
        const cv = _mkCanvas(57, 77), ctx = cv.getContext('2d'), cx = 57 / 2, cy = 77 / 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 35); ctx.lineTo(cx + 22, cy - 18); ctx.lineTo(cx + 20, cy + 35);
        ctx.lineTo(cx - 20, cy + 35); ctx.lineTo(cx - 22, cy - 18); ctx.closePath();
        outlineAndFill(ctx, dark, '#111', 3);
        // Hydraulic details
        ctx.strokeStyle = color; ctx.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) {
            ctx.beginPath(); ctx.moveTo(cx - 14, cy - 20 + i * 14); ctx.lineTo(cx + 14, cy - 20 + i * 14); ctx.stroke();
        }
        // Rivets
        ctx.fillStyle = '#889';
        for (let i = 0; i < 3; i++) {
            ctx.beginPath(); ctx.arc(cx, cy - 18 + i * 16, 2.5, 0, Math.PI * 2); ctx.fill();
        }
        sprites['boss11_arm'] = cv;
    }
}

// ── BOSS 12: Toxin Emperor (toxic green, final W2 boss, massive) ──
function _genBoss12Sprites(sprites) {
    const color = '#88ee00', accent = '#bbff44', dark = '#449911';
    // Core (95x95 → 115)
    {
        const S = 115, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2, r = 47;
        // Menacing toxic skull
        ctx.beginPath();
        ctx.moveTo(cx, cy - r);
        ctx.bezierCurveTo(cx + r * 0.7, cy - r, cx + r, cy - r * 0.4, cx + r, cy);
        ctx.bezierCurveTo(cx + r, cy + r * 0.5, cx + r * 0.6, cy + r * 0.8, cx + r * 0.4, cy + r);
        ctx.lineTo(cx + r * 0.15, cy + r * 0.7);
        ctx.lineTo(cx, cy + r * 0.9);
        ctx.lineTo(cx - r * 0.15, cy + r * 0.7);
        ctx.lineTo(cx - r * 0.4, cy + r);
        ctx.bezierCurveTo(cx - r * 0.6, cy + r * 0.8, cx - r, cy + r * 0.5, cx - r, cy);
        ctx.bezierCurveTo(cx - r, cy - r * 0.4, cx - r * 0.7, cy - r, cx, cy - r);
        ctx.closePath();
        outlineAndFill(ctx, color, '#111', 4);
        // Toxic vein network
        ctx.save(); ctx.shadowColor = '#aaff00'; ctx.shadowBlur = 6;
        ctx.strokeStyle = '#ccff66'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx - r * 0.5, cy - r * 0.3); ctx.bezierCurveTo(cx - r * 0.2, cy, cx + r * 0.1, cy - r * 0.2, cx + r * 0.4, cy + r * 0.3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + r * 0.5, cy - r * 0.4); ctx.lineTo(cx + r * 0.2, cy + r * 0.5); ctx.stroke();
        ctx.restore();
        // Twin toxic eyes
        _drawPartEye(ctx, cx - 14, cy - 8, 10, '#aaff00');
        _drawPartEye(ctx, cx + 14, cy - 8, 10, '#aaff00');
        // Toxic drip from jaw
        ctx.fillStyle = 'rgba(180,255,50,0.5)';
        ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.75, 6, 10, 0, 0, Math.PI * 2); ctx.fill();
        drawHighlight(ctx, cx - 25, cy - r * 0.9, 50, 20, 0.1);
        sprites['boss12_core'] = cv;
    }
    // Turret (38x38 → 50)
    {
        const S = 50, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 18); ctx.lineTo(cx + 18, cy - 5); ctx.lineTo(cx + 13, cy + 18);
        ctx.lineTo(cx - 13, cy + 18); ctx.lineTo(cx - 18, cy - 5); ctx.closePath();
        outlineAndFill(ctx, accent, '#111', 2.5);
        // Quad toxin nozzles
        for (const off of [-8, 0, 8]) {
            ctx.fillStyle = '#556633'; ctx.beginPath();
            ctx.roundRect(cx + off - 2, cy - 26, 4, 13, 1); ctx.fill();
            ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.stroke();
        }
        _drawPartEye(ctx, cx, cy + 3, 5, '#88ff00');
        sprites['boss12_turret'] = cv;
    }
    // Orb (30x30 → 42) — orbiting toxic sphere
    {
        const S = 42, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
        const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 15);
        g.addColorStop(0, '#eeffaa'); g.addColorStop(0.4, accent); g.addColorStop(1, dark);
        ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
        // Bubbles
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath(); ctx.arc(cx - 3, cy - 4, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 4, cy + 2, 2, 0, Math.PI * 2); ctx.fill();
        sprites['boss12_orb'] = cv;
    }
    // Shield (130x28 → 142x40)
    {
        const cv = _mkCanvas(142, 40), ctx = cv.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(8, 20); ctx.lineTo(20, 4); ctx.lineTo(122, 4);
        ctx.lineTo(134, 20); ctx.lineTo(122, 36); ctx.lineTo(20, 36); ctx.closePath();
        outlineAndFill(ctx, '#668800', '#111', 2.5);
        ctx.strokeStyle = '#aadd33'; ctx.lineWidth = 1; ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.moveTo(28, 20); ctx.lineTo(114, 20); ctx.stroke();
        ctx.globalAlpha = 1;
        drawHighlight(ctx, 28, 6, 86, 12, 0.12);
        sprites['boss12_shield'] = cv;
    }
    // Weakpoint (24x24 → 36)
    {
        const S = 36, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
        ctx.beginPath(); ctx.arc(cx, cy, 11, 0, Math.PI * 2);
        const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 11);
        g.addColorStop(0, '#ffff66'); g.addColorStop(0.5, '#88ee00'); g.addColorStop(1, '#336600');
        ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#eeff88'; ctx.fill();
        sprites['boss12_weak'] = cv;
    }
    // Arm (48x68 → 60x80)
    {
        const cv = _mkCanvas(60, 80), ctx = cv.getContext('2d'), cx = 30, cy = 40;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 38); ctx.lineTo(cx + 24, cy - 20); ctx.lineTo(cx + 22, cy + 38);
        ctx.lineTo(cx - 22, cy + 38); ctx.lineTo(cx - 24, cy - 20); ctx.closePath();
        outlineAndFill(ctx, dark, '#111', 3);
        // Toxic glow segments
        ctx.save(); ctx.shadowColor = '#88ff00'; ctx.shadowBlur = 4;
        ctx.fillStyle = accent; ctx.globalAlpha = 0.35;
        for (let i = 0; i < 4; i++) {
            ctx.beginPath(); ctx.arc(cx, cy - 22 + i * 14, 5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1; ctx.restore();
        ctx.strokeStyle = color; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx - 16, cy - 5); ctx.lineTo(cx + 16, cy - 5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - 18, cy + 12); ctx.lineTo(cx + 18, cy + 12); ctx.stroke();
        sprites['boss12_arm'] = cv;
    }
}

export {generateBossSprites};
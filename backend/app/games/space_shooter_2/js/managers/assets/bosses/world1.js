import { _mkCanvas, outlineAndFill, drawHighlight, _drawPartEye } from '../Helper.js';

// ── BOSS 1: Crimson Vanguard (red, angular) ──
export function _genBoss1Sprites(sprites) {
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
export function _genBoss2Sprites(sprites) {
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
export function _genBoss3Sprites(sprites) {
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
export function _genBoss4Sprites(sprites) {
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
export function _genBoss5Sprites(sprites) {
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
export function _genBoss6Sprites(sprites) {
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



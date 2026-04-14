import { _mkCanvas, outlineAndFill, drawHighlight, _drawPartEye } from '../Helper.js';
// ── MINI-BOSS 1: Scarab Drone (teal, insectoid, agile) ──
export function _genMiniBoss1Sprites(sprites) {
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
export function _genMiniBoss2Sprites(sprites) {
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
export function _genMiniBoss3Sprites(sprites) {
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
export function _genMiniBoss4Sprites(sprites) {
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
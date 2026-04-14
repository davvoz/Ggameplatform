import { _mkCanvas, outlineAndFill, drawHighlight } from '../../Helper.js';
import { C_WHITE, C_MEDIUM_BLUE } from '../../../../entities/LevelsThemes.js';

export function createMiniBossTurretSprite(accent, sprites) {

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

export function createSerratedBladeSprite(accent, color, dark, sprites) {

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

export function generateMiniBossCore(accent, color, dark, sprites) {

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
    ctx.fillStyle = C_WHITE;
    ctx.beginPath(); ctx.ellipse(cx - r * 0.25, cy - r * 0.1, 6, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + r * 0.25, cy - r * 0.1, 6, 7, 0, 0, Math.PI * 2); ctx.fill();
    // Pupils
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.arc(cx - r * 0.22, cy - r * 0.06, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.28, cy - r * 0.06, 3.5, 0, Math.PI * 2); ctx.fill();
    // Eye highlights
    ctx.fillStyle = C_WHITE;
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

export function createTurretSprite(accent, dark, sprites) {

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

export function generateShieldSprite(dark, accent, sprites) {

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

export function createMiniBossCoreSprite(color, accent, sprites) {

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

export function createDiamondShard(accent, color, dark, sprites) {

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

export function createHexagonalCrystal(color, accent, dark, sprites) {

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
    ctx.fillStyle = C_WHITE;
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

export function drawMiniBossShield(color, sprites) {

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
    pl.addColorStop(0.66, C_MEDIUM_BLUE); pl.addColorStop(1, '#ff44ff');
    ctx.strokeStyle = pl; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(12, 14); ctx.lineTo(60, 14); ctx.stroke();
    ctx.restore();
    sprites['mboss12_shield'] = cv;

}

export function createMiniBossBlade(dark, accent, sprites) {

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

export function generateMiniBossBody(color, dark, sprites) {

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
    ctx.fillStyle = C_WHITE;
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
    ctx.fillStyle = C_WHITE;
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

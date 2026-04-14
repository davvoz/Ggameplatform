import { _mkCanvas, outlineAndFill, drawHighlight, _drawPartEye } from '../Helper.js';
import { C_WHITE, C_MEDIUM_BLUE, C_HOT_PINK } from '../../../entities/LevelsThemes.js';
// ═══════════════════════════════════════════════
//  WORLD 3 BOSSES — Simulation Break
//  Theme: corrupted digital, glitch blocks, neon outlines, scanlines
// ═══════════════════════════════════════════════

// Shared helper: draws horizontal scanlines on a rect region
export function _drawScanlines(ctx, x, y, w, h, color, gap) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    for (let sy = y; sy < y + h; sy += gap) {
        ctx.beginPath(); ctx.moveTo(x, sy); ctx.lineTo(x + w, sy); ctx.stroke();
    }
}

// ── BOSS 13: Corrupted Compiler (teal, crashed computer) ──
export function _genBoss13Sprites(sprites) {
    const color = '#00ccbb', accent = '#44ffee', dark = '#006655';
    // Core (75x75 → 95x95) — Cartoon crashed monitor with angry face
    {
        const S = 95, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2, r = 37;
        // Monitor body
        ctx.beginPath();
        ctx.roundRect(cx - r, cy - r * 0.8, r * 2, r * 1.7, 6);
        outlineAndFill(ctx, color, '#111', 3);
        // Screen area
        ctx.beginPath();
        ctx.roundRect(cx - r * 0.75, cy - r * 0.6, r * 1.5, r * 1.1, 3);
        ctx.fillStyle = '#0a2020';
        ctx.fill();
        ctx.strokeStyle = accent; ctx.lineWidth = 1.5; ctx.stroke();
        // Scrolling code lines on screen
        _drawScanlines(ctx, cx - r * 0.65, cy - r * 0.45, r * 1.3, r * 0.8, accent + '44', 5);
        // Cute angry face on screen — Eyes
        ctx.fillStyle = accent;
        ctx.beginPath(); ctx.ellipse(cx - r * 0.25, cy - r * 0.15, 5, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + r * 0.25, cy - r * 0.15, 5, 6, 0, 0, Math.PI * 2); ctx.fill();
        // Angry eyebrows
        ctx.strokeStyle = accent; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx - r * 0.4, cy - r * 0.35); ctx.lineTo(cx - r * 0.12, cy - r * 0.25); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + r * 0.4, cy - r * 0.35); ctx.lineTo(cx + r * 0.12, cy - r * 0.25); ctx.stroke();
        // Zigzag mouth
        ctx.strokeStyle = accent; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.3, cy + r * 0.2);
        for (let i = 1; i <= 4; i++) ctx.lineTo(cx - r * 0.3 + i * r * 0.15, cy + r * 0.2 + (i % 2 ? r * 0.1 : 0));
        ctx.stroke();
        // Blinking error cursor
        ctx.fillStyle = accent;
        ctx.fillRect(cx + r * 0.35, cy + r * 0.35, 5, 2);
        // Monitor stand
        ctx.fillStyle = dark;
        ctx.beginPath(); ctx.roundRect(cx - 8, cy + r * 0.75, 16, 8, 2); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.stroke();
        drawHighlight(ctx, cx - r * 0.5, cy - r * 0.75, r, 14, 0.15);
        sprites['boss13_core'] = cv;
    }
    // Turret (32x32 → 44x44) — Error popup window with ⚠ warning icon
    {
        const S = 44, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
        // Popup window body
        ctx.beginPath(); ctx.roundRect(cx - 16, cy - 14, 32, 30, 3);
        outlineAndFill(ctx, '#0a2020', '#111', 2.5);
        // Title bar
        ctx.fillStyle = dark;
        ctx.fillRect(cx - 15, cy - 13, 30, 9);
        // Red close button dot
        ctx.fillStyle = '#ff4444';
        ctx.beginPath(); ctx.arc(cx + 11, cy - 9, 2.5, 0, Math.PI * 2); ctx.fill();
        // Green and yellow dots
        ctx.fillStyle = '#44ff44';
        ctx.beginPath(); ctx.arc(cx + 4, cy - 9, 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffcc33';
        ctx.beginPath(); ctx.arc(cx - 2, cy - 9, 2, 0, Math.PI * 2); ctx.fill();
        // Warning triangle
        ctx.fillStyle = '#ffcc33';
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + 9, cy + 13); ctx.lineTo(cx - 9, cy + 13); ctx.closePath();
        ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.stroke();
        // ! mark inside triangle (line + dot)
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(cx, cy + 4); ctx.lineTo(cx, cy + 9); ctx.stroke();
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(cx, cy + 11.5, 1, 0, Math.PI * 2); ctx.fill();
        // Gun barrel on top
        ctx.fillStyle = accent;
        ctx.beginPath(); ctx.roundRect(cx - 2, cy - 20, 4, 8, 1); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.stroke();
        sprites['boss13_turret'] = cv;
    }
    // Shield (100x22 → 112x34) — Hazard stripe error barrier
    {
        const cv = _mkCanvas(112, 34), ctx = cv.getContext('2d');
        ctx.beginPath(); ctx.roundRect(6, 6, 100, 22, 4);
        outlineAndFill(ctx, dark, '#111', 2.5);
        // Diagonal caution stripes
        ctx.save();
        ctx.beginPath(); ctx.roundRect(8, 8, 96, 18, 3); ctx.clip();
        ctx.strokeStyle = '#ccaa22'; ctx.lineWidth = 3;
        for (let x = -20; x < 120; x += 10) {
            ctx.beginPath(); ctx.moveTo(x, 4); ctx.lineTo(x + 20, 30); ctx.stroke();
        }
        ctx.restore();
        // Blinking LED status dots
        for (let i = 0; i < 5; i++) {
            ctx.fillStyle = i % 2 === 0 ? accent : '#ff4444';
            ctx.beginPath(); ctx.arc(16 + i * 20, 17, 2, 0, Math.PI * 2); ctx.fill();
        }
        drawHighlight(ctx, 14, 8, 84, 8, 0.08);
        sprites['boss13_shield'] = cv;
    }
    // Arm (38x50 → 50x62) — Keyboard bracket key { }
    {
        const cv = _mkCanvas(50, 62), ctx = cv.getContext('2d'), cx = 25, cy = 31;
        // Key cap outer
        ctx.beginPath(); ctx.roundRect(cx - 16, cy - 26, 32, 52, 5);
        outlineAndFill(ctx, color, '#111', 2.5);
        // Key face inner recess
        ctx.beginPath(); ctx.roundRect(cx - 13, cy - 22, 26, 44, 3);
        ctx.fillStyle = dark; ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.stroke();
        // Drawn curly brace { using bezier curves
        ctx.strokeStyle = accent; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx + 5, cy - 16);
        ctx.quadraticCurveTo(cx - 2, cy - 14, cx - 2, cy - 6);
        ctx.quadraticCurveTo(cx - 2, cy - 2, cx - 7, cy);
        ctx.quadraticCurveTo(cx - 2, cy + 2, cx - 2, cy + 6);
        ctx.quadraticCurveTo(cx - 2, cy + 14, cx + 5, cy + 16);
        ctx.stroke();
        drawHighlight(ctx, cx - 12, cy - 24, 24, 12, 0.1);
        sprites['boss13_arm'] = cv;
    }
}

// ── BOSS 14: Fragment King (magenta/pink, jagged crystal crown) ──
export function _genBoss14Sprites(sprites) {
    const color = '#ee2266', accent = '#ff5599', dark = '#881133';
    // Core (80x80 → 100x100) — Jagged crystal crown with menacing face
    {
        const S = 100, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2, r = 40;
        // Jagged crystal body
        ctx.beginPath();
        ctx.moveTo(cx, cy - r);
        ctx.lineTo(cx + r * 0.45, cy - r * 0.75);
        ctx.lineTo(cx + r * 0.85, cy - r * 0.35);
        ctx.lineTo(cx + r, cy + r * 0.4);
        ctx.lineTo(cx + r * 0.5, cy + r);
        ctx.lineTo(cx - r * 0.5, cy + r);
        ctx.lineTo(cx - r, cy + r * 0.4);
        ctx.lineTo(cx - r * 0.85, cy - r * 0.35);
        ctx.lineTo(cx - r * 0.45, cy - r * 0.75);
        ctx.closePath();
        outlineAndFill(ctx, color, '#111', 3);
        // Crystal facet lines
        ctx.strokeStyle = accent; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r * 0.4);
        ctx.moveTo(cx - r * 0.85, cy - r * 0.35); ctx.lineTo(cx, cy + r * 0.4);
        ctx.moveTo(cx + r * 0.85, cy - r * 0.35); ctx.lineTo(cx, cy + r * 0.4);
        ctx.stroke();
        ctx.globalAlpha = 1;
        // Inner glow
        const ig = ctx.createRadialGradient(cx, cy - r * 0.1, 3, cx, cy, r * 0.6);
        ig.addColorStop(0, 'rgba(255,100,160,0.4)'); ig.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2); ctx.fill();
        // Menacing face
        ctx.fillStyle = C_WHITE;
        ctx.beginPath(); ctx.ellipse(cx - r * 0.22, cy - r * 0.1, 6, 7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + r * 0.22, cy - r * 0.1, 6, 7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = dark;
        ctx.beginPath(); ctx.arc(cx - r * 0.2, cy - r * 0.05, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + r * 0.24, cy - r * 0.05, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C_WHITE;
        ctx.beginPath(); ctx.arc(cx - r * 0.24, cy - r * 0.12, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + r * 0.2, cy - r * 0.12, 1.5, 0, Math.PI * 2); ctx.fill();
        // Crown spikes on top
        ctx.fillStyle = accent; ctx.globalAlpha = 0.7;
        for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.moveTo(cx + i * r * 0.35 - 4, cy - r * 0.7);
            ctx.lineTo(cx + i * r * 0.35, cy - r * 1.05);
            ctx.lineTo(cx + i * r * 0.35 + 4, cy - r * 0.7);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        drawHighlight(ctx, cx - 18, cy - r * 0.85, 36, 16, 0.15);
        sprites['boss14_core'] = cv;
    }
    // Orb (28x28 → 40x40) — Faceted diamond crystal shard
    {
        const S = 40, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
        // Diamond shape
        ctx.beginPath();
        ctx.moveTo(cx, cy - 15); ctx.lineTo(cx + 10, cy - 5);
        ctx.lineTo(cx + 8, cy + 5); ctx.lineTo(cx, cy + 15);
        ctx.lineTo(cx - 8, cy + 5); ctx.lineTo(cx - 10, cy - 5);
        ctx.closePath();
        const g = ctx.createLinearGradient(cx - 10, cy - 15, cx + 10, cy + 15);
        g.addColorStop(0, accent); g.addColorStop(0.5, color); g.addColorStop(1, dark);
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
        // Inner facet lines
        ctx.strokeStyle = accent + '88'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx, cy - 15); ctx.lineTo(cx, cy + 15); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - 10, cy - 5); ctx.lineTo(cx + 8, cy + 5); ctx.stroke();
        // Inner glow spot
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.beginPath(); ctx.ellipse(cx - 2, cy - 4, 4, 6, -0.3, 0, Math.PI * 2); ctx.fill();
        sprites['boss14_orb'] = cv;
    }
    // Shield (110x24 → 122x36) — Segmented crystal wall with spikes
    {
        const cv = _mkCanvas(122, 36), ctx = cv.getContext('2d');
        const segW = 20, startX = 11;
        for (let i = 0; i < 5; i++) {
            const sx = startX + i * segW;
            ctx.beginPath();
            ctx.moveTo(sx + segW * 0.5, 6);
            ctx.lineTo(sx + segW - 2, 12);
            ctx.lineTo(sx + segW - 2, 30);
            ctx.lineTo(sx + 2, 30);
            ctx.lineTo(sx + 2, 12);
            ctx.closePath();
            const sg = ctx.createLinearGradient(sx, 6, sx + segW, 30);
            sg.addColorStop(0, accent); sg.addColorStop(0.5, color); sg.addColorStop(1, dark);
            ctx.fillStyle = sg; ctx.fill();
            ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.stroke();
        }
        drawHighlight(ctx, 16, 10, 90, 8, 0.1);
        sprites['boss14_shield'] = cv;
    }
    // Arm (40x55 → 52x67) — Sharp crystal blade with facet glow
    {
        const cv = _mkCanvas(52, 67), ctx = cv.getContext('2d'), cx = 26, cy = 34;
        // Blade shape
        ctx.beginPath();
        ctx.moveTo(cx, cy - 32);
        ctx.lineTo(cx + 14, cy - 10);
        ctx.lineTo(cx + 16, cy + 10);
        ctx.lineTo(cx + 8, cy + 30);
        ctx.lineTo(cx - 8, cy + 30);
        ctx.lineTo(cx - 16, cy + 10);
        ctx.lineTo(cx - 14, cy - 10);
        ctx.closePath();
        const bg = ctx.createLinearGradient(cx - 16, cy - 32, cx + 16, cy + 30);
        bg.addColorStop(0, accent); bg.addColorStop(0.4, color); bg.addColorStop(1, dark);
        ctx.fillStyle = bg; ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 2.5; ctx.stroke();
        // Facet lines
        ctx.strokeStyle = accent + '66'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx, cy - 32); ctx.lineTo(cx + 4, cy + 30); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, cy - 32); ctx.lineTo(cx - 10, cy + 10); ctx.stroke();
        // Inner glow
        ctx.fillStyle = 'rgba(255,180,220,0.2)';
        ctx.beginPath(); ctx.ellipse(cx - 2, cy - 8, 5, 12, -0.2, 0, Math.PI * 2); ctx.fill();
        sprites['boss14_arm'] = cv;
    }
}

// ── BOSS 15: Mirror Engine (silver/blue, reflective prism) ──
export function _genBoss15Sprites(sprites) {
    const color = '#aaaaee', accent = '#ddddff';
    // Core (85x85 → 105x105) — Mirror heptagonal with prismatic stripe
    {
        const S = 105, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2, r = 42;
        ctx.beginPath();
        ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 0.9, cy - r * 0.3);
        ctx.lineTo(cx + r * 0.85, cy + r * 0.55); ctx.lineTo(cx + r * 0.3, cy + r);
        ctx.lineTo(cx - r * 0.3, cy + r); ctx.lineTo(cx - r * 0.85, cy + r * 0.55);
        ctx.lineTo(cx - r * 0.9, cy - r * 0.3); ctx.closePath();
        outlineAndFill(ctx, color, '#111', 3);
        // Mirror shine gradient
        const mg = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
        mg.addColorStop(0, 'rgba(255,255,255,0.2)'); mg.addColorStop(0.5, 'rgba(255,255,255,0.05)');
        mg.addColorStop(1, 'rgba(255,255,255,0.15)');
        ctx.fillStyle = mg;
        ctx.fill();
        // Prismatic rainbow refraction stripe
        ctx.save(); ctx.globalAlpha = 0.3;
        const rb = ctx.createLinearGradient(cx - r * 0.6, cy, cx + r * 0.6, cy);
        rb.addColorStop(0, '#ff3333'); rb.addColorStop(0.17, '#ff8833');
        rb.addColorStop(0.33, '#ffff33'); rb.addColorStop(0.5, '#33ff66');
        rb.addColorStop(0.67, '#3388ff'); rb.addColorStop(0.83, '#6633ff');
        rb.addColorStop(1, '#ff33ff');
        ctx.fillStyle = rb;
        ctx.fillRect(cx - r * 0.6, cy - 3, r * 1.2, 6);
        ctx.restore();
        _drawPartEye(ctx, cx, cy - 4, 14, '#aabbff');
        drawHighlight(ctx, cx - 20, cy - r * 0.85, 40, 18, 0.15);
        sprites['boss15_core'] = cv;
    }
    // Turret (34x34 → 46x46) — Prismatic lens with rainbow iris ring
    {
        const S = 46, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
        // Rainbow iris ring segments
        const rainbowColors = ['#ff3333', '#ff8833', '#ffff33', '#33ff33', '#3388ff', '#8833ff'];
        ctx.lineWidth = 3;
        for (let i = 0; i < 6; i++) {
            ctx.beginPath();
            ctx.arc(cx, cy, 16, (Math.PI / 3) * i, (Math.PI / 3) * (i + 1));
            ctx.strokeStyle = rainbowColors[i]; ctx.stroke();
        }
        // Inner lens body
        ctx.beginPath(); ctx.arc(cx, cy, 13, 0, Math.PI * 2);
        outlineAndFill(ctx, accent, '#111', 2);
        // Central eye
        _drawPartEye(ctx, cx, cy, 5, '#aabbff');
        // Gun barrel
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.roundRect(cx - 2, cy - 22, 4, 10, 1); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.stroke();
        sprites['boss15_turret'] = cv;
    }
    // Shield small (35x20 → 47x32) — Hexagonal mirror medallion
    {
        const cv = _mkCanvas(47, 32), ctx = cv.getContext('2d'), cx = 23.5, cy = 16;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (Math.PI / 3) * i - Math.PI / 6;
            const px = cx + 14 * Math.cos(a), py = cy + 10 * Math.sin(a);
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        outlineAndFill(ctx, color, '#111', 2);
        // Mirror reflection gradient
        const rg = ctx.createLinearGradient(cx - 10, cy - 8, cx + 10, cy + 8);
        rg.addColorStop(0, 'rgba(255,255,255,0.3)'); rg.addColorStop(0.5, 'rgba(255,255,255,0.05)');
        rg.addColorStop(1, 'rgba(255,255,255,0.2)');
        ctx.fillStyle = rg; ctx.fill();
        sprites['boss15_shield'] = cv;
    }
    // Shield large (90x22 → 102x34) — Long reflective plate with prismatic line
    {
        const cv = _mkCanvas(102, 34), ctx = cv.getContext('2d');
        ctx.beginPath(); ctx.roundRect(6, 6, 90, 22, 4);
        outlineAndFill(ctx, color, '#111', 2.5);
        // Sweeping highlight
        const sg = ctx.createLinearGradient(6, 17, 96, 17);
        sg.addColorStop(0, 'rgba(255,255,255,0)');
        sg.addColorStop(0.4, 'rgba(255,255,255,0.3)');
        sg.addColorStop(0.6, 'rgba(255,255,255,0.3)');
        sg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = sg;
        ctx.beginPath(); ctx.roundRect(8, 8, 86, 18, 3); ctx.fill();
        // Prismatic center line
        ctx.save(); ctx.globalAlpha = 0.4;
        const pl = ctx.createLinearGradient(10, 17, 92, 17);
        pl.addColorStop(0, '#ff4444'); pl.addColorStop(0.25, '#ffff44');
        pl.addColorStop(0.5, '#44ff44'); pl.addColorStop(0.75, C_MEDIUM_BLUE); pl.addColorStop(1, '#ff44ff');
        ctx.strokeStyle = pl; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(14, 17); ctx.lineTo(88, 17); ctx.stroke();
        ctx.restore();
        sprites['boss15_shield2'] = cv;
    }
    // Arm (42x58 → 54x70) — Triangular prism with rainbow bottom edge
    {
        const cv = _mkCanvas(54, 70), ctx = cv.getContext('2d'), cx = 27, cy = 35;
        // Prism triangle shape
        ctx.beginPath();
        ctx.moveTo(cx, cy - 30);
        ctx.lineTo(cx + 20, cy + 28);
        ctx.lineTo(cx - 20, cy + 28);
        ctx.closePath();
        outlineAndFill(ctx, color, '#111', 2.5);
        // Mirror gradient across body
        const pg = ctx.createLinearGradient(cx - 18, cy, cx + 18, cy);
        pg.addColorStop(0, 'rgba(255,255,255,0.15)'); pg.addColorStop(0.5, 'rgba(255,255,255,0.05)');
        pg.addColorStop(1, 'rgba(255,255,255,0.2)');
        ctx.fillStyle = pg; ctx.fill();
        // Rainbow refraction at bottom edge
        ctx.save(); ctx.globalAlpha = 0.5;
        const rbe = ctx.createLinearGradient(cx - 18, cy + 27, cx + 18, cy + 27);
        rbe.addColorStop(0, '#ff3333'); rbe.addColorStop(0.2, '#ffaa33');
        rbe.addColorStop(0.4, '#ffff33'); rbe.addColorStop(0.6, '#33ff66');
        rbe.addColorStop(0.8, '#3388ff'); rbe.addColorStop(1, '#aa33ff');
        ctx.strokeStyle = rbe; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(cx - 18, cy + 27); ctx.lineTo(cx + 18, cy + 27); ctx.stroke();
        ctx.restore();
        // Inner facet line
        ctx.strokeStyle = accent + '66'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx, cy - 28); ctx.lineTo(cx + 2, cy + 26); ctx.stroke();
        sprites['boss15_arm'] = cv;
    }
}

// ── BOSS 16: Chaos Generator (orange, fiery chaotic) ──
export function _genBoss16Sprites(sprites) {
    const color = '#ee7700', accent = '#ffaa44', dark = '#884400';
    // Core (90x90 → 110x110) — Octagonal with chaos rune symbols
    {
        const S = 110, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2, r = 45;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const a = (Math.PI / 4) * i - Math.PI / 2;
            const px = cx + r * Math.cos(a);
            const py = cy + r * Math.sin(a);
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        outlineAndFill(ctx, color, '#111', 3);
        _drawScanlines(ctx, cx - r + 8, cy - r + 8, r * 2 - 16, r * 2 - 16, dark + '66', 5);
        // Chaos rune arcs
        ctx.strokeStyle = accent + 'aa'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx - r * 0.35, cy + r * 0.25, 7, 0, Math.PI * 1.4); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx + r * 0.35, cy + r * 0.2, 6, 0.5, Math.PI * 1.8); ctx.stroke();
        // Small chaos symbols — random connected dots
        ctx.fillStyle = accent + '88';
        ctx.beginPath(); ctx.arc(cx - r * 0.5, cy - r * 0.3, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + r * 0.5, cy - r * 0.3, 2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = accent + '55'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx - r * 0.5, cy - r * 0.3); ctx.lineTo(cx - r * 0.25, cy - r * 0.1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + r * 0.5, cy - r * 0.3); ctx.lineTo(cx + r * 0.3, cy + r * 0.1); ctx.stroke();
        _drawPartEye(ctx, cx, cy - 4, 14, accent);
        drawHighlight(ctx, cx - 20, cy - r * 0.85, 40, 18, 0.12);
        sprites['boss16_core'] = cv;
    }
    // Turret (36x36 → 48x48) — Gear/cog shape with fire-eye center
    {
        const S = 48, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
        // Gear with 8 teeth
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const a = (Math.PI / 4) * i - Math.PI / 2;
            const teethW = Math.PI / 16;
            ctx.lineTo(cx + 18 * Math.cos(a - teethW), cy + 18 * Math.sin(a - teethW));
            ctx.lineTo(cx + 18 * Math.cos(a + teethW), cy + 18 * Math.sin(a + teethW));
            const midA = a + Math.PI / 8;
            ctx.lineTo(cx + 13 * Math.cos(midA - teethW), cy + 13 * Math.sin(midA - teethW));
            ctx.lineTo(cx + 13 * Math.cos(midA + teethW), cy + 13 * Math.sin(midA + teethW));
        }
        ctx.closePath();
        outlineAndFill(ctx, accent, '#111', 2);
        // Center fire eye
        const eg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 8);
        eg.addColorStop(0, '#ffff88'); eg.addColorStop(0.5, color); eg.addColorStop(1, dark);
        ctx.fillStyle = eg;
        ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.stroke();
        // Gun barrel
        ctx.fillStyle = dark;
        ctx.beginPath(); ctx.roundRect(cx - 3, cy - 24, 6, 10, 2); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.stroke();
        sprites['boss16_turret'] = cv;
    }
    // Orb (28x28 → 40x40) — Chaos fire star
    {
        const S = 40, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
        // 8-pointed star shape
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const a = (Math.PI / 4) * i - Math.PI / 2;
            const rr = i % 2 === 0 ? 14 : 8;
            ctx.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a));
        }
        ctx.closePath();
        const fg = ctx.createRadialGradient(cx, cy, 2, cx, cy, 14);
        fg.addColorStop(0, '#ffff88'); fg.addColorStop(0.4, accent); fg.addColorStop(1, color);
        ctx.fillStyle = fg; ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
        // Hot center glow
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath(); ctx.arc(cx - 2, cy - 2, 4, 0, Math.PI * 2); ctx.fill();
        sprites['boss16_orb'] = cv;
    }
    // Shield (120x25 → 132x37) — Zigzag sawtooth energy wall
    {
        const cv = _mkCanvas(132, 37), ctx = cv.getContext('2d');
        // Base bar
        ctx.beginPath(); ctx.roundRect(6, 12, 120, 19, 3);
        outlineAndFill(ctx, dark, '#111', 2.5);
        // Sawtooth teeth on top
        ctx.fillStyle = accent; ctx.globalAlpha = 0.7;
        const teeth = 12;
        for (let i = 0; i < teeth; i++) {
            const tx = 6 + i * (120 / teeth);
            ctx.beginPath();
            ctx.moveTo(tx, 12); ctx.lineTo(tx + (120 / teeth) * 0.5, 4); ctx.lineTo(tx + (120 / teeth), 12);
            ctx.closePath(); ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(6, 12);
        for (let i = 0; i < teeth; i++) {
            const tx = 6 + i * (120 / teeth);
            ctx.lineTo(tx + (120 / teeth) * 0.5, 4); ctx.lineTo(tx + (120 / teeth), 12);
        }
        ctx.stroke();
        // Energy glow line
        ctx.strokeStyle = '#ffff88'; ctx.lineWidth = 1; ctx.globalAlpha = 0.6;
        ctx.beginPath(); ctx.moveTo(14, 22); ctx.lineTo(118, 22); ctx.stroke();
        ctx.globalAlpha = 1;
        sprites['boss16_shield'] = cv;
    }
    // Arm (44x62 → 56x74) — Flame tentacle with ember glow
    {
        const cv = _mkCanvas(56, 74), ctx = cv.getContext('2d'), cx = 28, cy = 37;
        // Wavy flame/tentacle body using bezier curves
        ctx.beginPath();
        ctx.moveTo(cx - 4, cy - 34);
        ctx.bezierCurveTo(cx - 16, cy - 20, cx - 18, cy - 5, cx - 14, cy + 10);
        ctx.bezierCurveTo(cx - 12, cy + 20, cx - 16, cy + 30, cx - 8, cy + 34);
        ctx.lineTo(cx + 8, cy + 34);
        ctx.bezierCurveTo(cx + 16, cy + 30, cx + 12, cy + 20, cx + 14, cy + 10);
        ctx.bezierCurveTo(cx + 18, cy - 5, cx + 16, cy - 20, cx + 4, cy - 34);
        ctx.closePath();
        const fg = ctx.createLinearGradient(cx, cy - 34, cx, cy + 34);
        fg.addColorStop(0, '#ffff88'); fg.addColorStop(0.3, accent); fg.addColorStop(1, dark);
        ctx.fillStyle = fg; ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 2.5; ctx.stroke();
        // Ember dots
        ctx.fillStyle = '#ffff88';
        ctx.beginPath(); ctx.arc(cx - 5, cy - 10, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 4, cy + 5, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx - 3, cy + 18, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 2, cy - 20, 1.5, 0, Math.PI * 2); ctx.fill();
        sprites['boss16_arm'] = cv;
    }
}

// ── BOSS 17: Data Devourer (purple, menacing digital maw) ──
export function _genBoss17Sprites(sprites) {
    const color = '#7733ee', accent = '#aa66ff', dark = '#441199';
    // Core (92x92 → 112x112) — Digital maw with pixel teeth
    {
        const S = 112, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2, r = 46;
        ctx.beginPath();
        ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 0.95, cy - r * 0.25);
        ctx.lineTo(cx + r * 0.85, cy + r * 0.6); ctx.lineTo(cx + r * 0.35, cy + r);
        ctx.lineTo(cx - r * 0.35, cy + r); ctx.lineTo(cx - r * 0.85, cy + r * 0.6);
        ctx.lineTo(cx - r * 0.95, cy - r * 0.25); ctx.closePath();
        outlineAndFill(ctx, color, '#111', 3);
        // Digital binary pattern lines
        ctx.strokeStyle = dark; ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
            const yy = cy - r * 0.5 + i * r * 0.25;
            ctx.beginPath(); ctx.moveTo(cx - r * 0.6, yy); ctx.lineTo(cx + r * 0.6, yy); ctx.stroke();
        }
        // Menacing eyes with eyeballs
        ctx.fillStyle = C_WHITE;
        ctx.beginPath(); ctx.ellipse(cx - r * 0.25, cy - r * 0.18, 7, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + r * 0.25, cy - r * 0.18, 7, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = dark;
        ctx.beginPath(); ctx.arc(cx - r * 0.23, cy - r * 0.13, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + r * 0.27, cy - r * 0.13, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = accent;
        ctx.beginPath(); ctx.arc(cx - r * 0.23, cy - r * 0.13, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + r * 0.27, cy - r * 0.13, 2, 0, Math.PI * 2); ctx.fill();
        // Angry eyebrows
        ctx.strokeStyle = '#220066'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(cx - r * 0.42, cy - r * 0.35); ctx.lineTo(cx - r * 0.12, cy - r * 0.28); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + r * 0.42, cy - r * 0.35); ctx.lineTo(cx + r * 0.12, cy - r * 0.28); ctx.stroke();
        // Open maw with pixel teeth
        ctx.fillStyle = '#1a0033';
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.4, cy + r * 0.15);
        ctx.lineTo(cx + r * 0.4, cy + r * 0.15);
        ctx.lineTo(cx + r * 0.3, cy + r * 0.55);
        ctx.lineTo(cx - r * 0.3, cy + r * 0.55);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.stroke();
        // Top teeth
        ctx.fillStyle = '#ddbbff';
        for (let i = 0; i < 4; i++) {
            const tx = cx - r * 0.32 + i * r * 0.2;
            ctx.fillRect(tx, cy + r * 0.15, r * 0.1, r * 0.13);
            ctx.strokeRect(tx, cy + r * 0.15, r * 0.1, r * 0.13);
        }
        // Bottom teeth
        for (let i = 0; i < 3; i++) {
            const tx = cx - r * 0.22 + i * r * 0.2;
            ctx.fillRect(tx, cy + r * 0.4, r * 0.1, r * 0.15);
            ctx.strokeRect(tx, cy + r * 0.4, r * 0.1, r * 0.15);
        }
        drawHighlight(ctx, cx - 22, cy - r * 0.85, 44, 18, 0.12);
        sprites['boss17_core'] = cv;
    }
    // Turret (38x38 → 50x50) — Fang/jaw turret with teeth
    {
        const S = 50, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
        // Jaw body hexagonal
        ctx.beginPath();
        ctx.moveTo(cx - 14, cy - 8);
        ctx.lineTo(cx + 14, cy - 8);
        ctx.lineTo(cx + 16, cy + 6);
        ctx.lineTo(cx + 10, cy + 14);
        ctx.lineTo(cx - 10, cy + 14);
        ctx.lineTo(cx - 16, cy + 6);
        ctx.closePath();
        outlineAndFill(ctx, accent, '#111', 2.5);
        // Two fang teeth pointing down
        ctx.fillStyle = '#ddbbff';
        ctx.beginPath(); ctx.moveTo(cx - 8, cy + 14); ctx.lineTo(cx - 5, cy + 22); ctx.lineTo(cx - 2, cy + 14); ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx + 2, cy + 14); ctx.lineTo(cx + 5, cy + 22); ctx.lineTo(cx + 8, cy + 14); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx - 8, cy + 14); ctx.lineTo(cx - 5, cy + 22); ctx.lineTo(cx - 2, cy + 14); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + 2, cy + 14); ctx.lineTo(cx + 5, cy + 22); ctx.lineTo(cx + 8, cy + 14); ctx.stroke();
        // Center eye
        _drawPartEye(ctx, cx, cy, 5, color);
        // Barrel
        ctx.fillStyle = dark;
        ctx.beginPath(); ctx.roundRect(cx - 3, cy - 16, 6, 10, 2); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.stroke();
        sprites['boss17_turret'] = cv;
    }
    // Orb (30x30 → 42x42) — Data packet cube with binary grid
    {
        const S = 42, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
        // Front face
        ctx.beginPath();
        ctx.moveTo(cx - 10, cy - 8); ctx.lineTo(cx + 8, cy - 8);
        ctx.lineTo(cx + 8, cy + 10); ctx.lineTo(cx - 10, cy + 10);
        ctx.closePath();
        ctx.fillStyle = color; ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
        // Top face
        ctx.beginPath();
        ctx.moveTo(cx - 10, cy - 8); ctx.lineTo(cx - 4, cy - 14);
        ctx.lineTo(cx + 14, cy - 14); ctx.lineTo(cx + 8, cy - 8);
        ctx.closePath();
        ctx.fillStyle = accent; ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.stroke();
        // Right face
        ctx.beginPath();
        ctx.moveTo(cx + 8, cy - 8); ctx.lineTo(cx + 14, cy - 14);
        ctx.lineTo(cx + 14, cy + 4); ctx.lineTo(cx + 8, cy + 10);
        ctx.closePath();
        ctx.fillStyle = dark; ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.stroke();
        // Grid lines on front face
        ctx.strokeStyle = accent + '66'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(cx - 4, cy - 8); ctx.lineTo(cx - 4, cy + 10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + 2, cy - 8); ctx.lineTo(cx + 2, cy + 10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - 10, cy - 2); ctx.lineTo(cx + 8, cy - 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - 10, cy + 4); ctx.lineTo(cx + 8, cy + 4); ctx.stroke();
        sprites['boss17_orb'] = cv;
    }
    // Shield (125x24 → 137x36) — Pixel teeth barrier
    {
        const cv = _mkCanvas(137, 36), ctx = cv.getContext('2d');
        // Base bar
        ctx.beginPath(); ctx.roundRect(6, 14, 125, 16, 3);
        outlineAndFill(ctx, dark, '#111', 2.5);
        // Triangular teeth pointing upward
        ctx.fillStyle = '#ddbbff';
        const teethCount = 8;
        for (let i = 0; i < teethCount; i++) {
            const tx = 10 + i * 15;
            ctx.beginPath();
            ctx.moveTo(tx, 14); ctx.lineTo(tx + 7.5, 4); ctx.lineTo(tx + 15, 14);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.stroke();
        }
        // Gum line glow
        ctx.strokeStyle = accent; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.moveTo(12, 15); ctx.lineTo(128, 15); ctx.stroke();
        ctx.globalAlpha = 1;
        sprites['boss17_shield'] = cv;
    }
    // Weakpoint (24x24 → 36x36) — Spiral hunger vortex core
    {
        const S = 36, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
        // Outer ring
        ctx.beginPath(); ctx.arc(cx, cy, 13, 0, Math.PI * 2);
        const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 13);
        g.addColorStop(0, '#ff88ff'); g.addColorStop(0.5, color); g.addColorStop(1, dark);
        ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
        // Spiral vortex lines
        ctx.strokeStyle = accent + 'aa'; ctx.lineWidth = 1;
        ctx.beginPath();
        for (let a = 0; a < Math.PI * 4; a += 0.2) {
            const sr = 2 + a * 2.5;
            if (sr > 12) break;
            const px = cx + sr * Math.cos(a), py = cy + sr * Math.sin(a);
            if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
        // Pulsing center dot
        ctx.fillStyle = '#ffaaff';
        ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
        sprites['boss17_weak'] = cv;
    }
    // Arm (46x65 → 58x77) — Segmented tentacle with suction rings
    {
        const cv = _mkCanvas(58, 77), ctx = cv.getContext('2d'), cx = 29, cy = 39;
        // Segmented tentacle body — alternating colored segments
        const segments = 5;
        const segH = 13;
        for (let i = 0; i < segments; i++) {
            const sy = cy - 32 + i * segH;
            const sw = 16 - i;
            ctx.beginPath(); ctx.roundRect(cx - sw, sy, sw * 2, segH - 2, 3);
            outlineAndFill(ctx, i % 2 === 0 ? color : dark, '#111', 2);
        }
        // Suction cup circles on each segment
        ctx.fillStyle = accent + '88';
        for (let i = 0; i < 4; i++) {
            const sy = cy - 28 + i * segH;
            ctx.beginPath(); ctx.arc(cx, sy + 3, 3, 0, Math.PI * 2); ctx.fill();
        }
        // Ring band accents
        ctx.strokeStyle = accent; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(cx, cy - 18, 11, 4, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(cx, cy + 8, 12, 4, 0, 0, Math.PI * 2); ctx.stroke();
        sprites['boss17_arm'] = cv;
    }
}

// ── BOSS 18: The Kernel (red/crimson, ultimate simulation boss) ──
export function _genBoss18Sprites(sprites) {
    const color = '#dd0033', accent = C_HOT_PINK, dark = '#880022';
    // Core (100x100 → 120x120) — Ultimate star boss with multi-eyed face
    {
        const S = 120, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2, r = 50;
        // Outer star shape
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const a = (Math.PI / 5) * i - Math.PI / 2;
            const rr = i % 2 === 0 ? r : r * 0.65;
            const px = cx + rr * Math.cos(a);
            const py = cy + rr * Math.sin(a);
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        outlineAndFill(ctx, color, '#111', 3.5);
        // Inner pentagon
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const a = (Math.PI * 2 / 5) * i - Math.PI / 2;
            const px = cx + r * 0.4 * Math.cos(a);
            const py = cy + r * 0.4 * Math.sin(a);
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = dark; ctx.fill(); ctx.strokeStyle = accent; ctx.lineWidth = 1.5; ctx.stroke();
        // Inner glow
        const ig = ctx.createRadialGradient(cx, cy, 4, cx, cy, r * 0.5);
        ig.addColorStop(0, 'rgba(255,50,80,0.45)'); ig.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2); ctx.fill();
        // 3 menacing eyes
        const eyePositions = [
            [cx - r * 0.2, cy - r * 0.12],
            [cx + r * 0.2, cy - r * 0.12],
            [cx, cy + r * 0.15]
        ];
        for (const [ex, ey] of eyePositions) {
            ctx.fillStyle = C_WHITE;
            ctx.beginPath(); ctx.ellipse(ex, ey, 6, 7, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#440011';
            ctx.beginPath(); ctx.arc(ex, ey + 1, 3.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ff0033';
            ctx.beginPath(); ctx.arc(ex, ey + 1, 2, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = C_WHITE;
            ctx.beginPath(); ctx.arc(ex - 2, ey - 2, 1.5, 0, Math.PI * 2); ctx.fill();
        }
        _drawScanlines(ctx, cx - r + 10, cy - r + 10, r * 2 - 20, r * 2 - 20, dark + '33', 5);
        drawHighlight(ctx, cx - 24, cy - r * 0.85, 48, 20, 0.15);
        sprites['boss18_core'] = cv;
    }
    // Turret (40x40 → 52x52) — Crown spike with embedded ruby gem
    {
        const S = 52, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
        // Crown spike shape
        ctx.beginPath();
        ctx.moveTo(cx, cy - 22);
        ctx.lineTo(cx + 10, cy - 8);
        ctx.lineTo(cx + 14, cy + 4);
        ctx.lineTo(cx + 12, cy + 16);
        ctx.lineTo(cx - 12, cy + 16);
        ctx.lineTo(cx - 14, cy + 4);
        ctx.lineTo(cx - 10, cy - 8);
        ctx.closePath();
        outlineAndFill(ctx, accent, '#111', 2.5);
        // Ruby gem (diamond shape)
        const rg = ctx.createRadialGradient(cx, cy - 2, 1, cx, cy, 8);
        rg.addColorStop(0, '#ff8888'); rg.addColorStop(0.5, color); rg.addColorStop(1, dark);
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 8); ctx.lineTo(cx + 7, cy); ctx.lineTo(cx, cy + 8); ctx.lineTo(cx - 7, cy);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.stroke();
        // Gem sparkle
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath(); ctx.arc(cx - 2, cy - 3, 1.5, 0, Math.PI * 2); ctx.fill();
        sprites['boss18_turret'] = cv;
    }
    // Orb (32x32 → 44x44) — Command sigil orb with rune marks
    {
        const S = 44, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
        ctx.beginPath(); ctx.arc(cx, cy, 15, 0, Math.PI * 2);
        const g = ctx.createRadialGradient(cx, cy, 3, cx, cy, 15);
        g.addColorStop(0, '#ff8888'); g.addColorStop(0.4, color); g.addColorStop(1, dark);
        ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
        // Rune circle ring
        ctx.strokeStyle = accent + 'bb'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.stroke();
        // Rune marks (small dashes around circle)
        for (let i = 0; i < 6; i++) {
            const a = (Math.PI / 3) * i;
            const x1 = cx + 8 * Math.cos(a), y1 = cy + 8 * Math.sin(a);
            const x2 = cx + 12 * Math.cos(a), y2 = cy + 12 * Math.sin(a);
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        }
        // Glowing center
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath(); ctx.arc(cx - 3, cy - 3, 4, 0, Math.PI * 2); ctx.fill();
        sprites['boss18_orb'] = cv;
    }
    // Shield large (140x28 → 152x40) — Command terminal bar
    {
        const cv = _mkCanvas(152, 40), ctx = cv.getContext('2d');
        ctx.beginPath(); ctx.roundRect(6, 6, 140, 28, 5);
        outlineAndFill(ctx, '#1a0011', '#111', 2.5);
        // Terminal border glow
        ctx.strokeStyle = accent + '88'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(8, 8, 136, 24, 4); ctx.stroke();
        // ">" prompt chevron (drawn as paths)
        ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(16, 14); ctx.lineTo(22, 20); ctx.lineTo(16, 26); ctx.stroke();
        // Blinking cursor line
        ctx.fillStyle = accent; ctx.fillRect(28, 25, 10, 2);
        // Status indicator dots
        for (let i = 0; i < 4; i++) {
            ctx.fillStyle = i === 0 ? '#ff4444' : accent + '88';
            ctx.beginPath(); ctx.arc(100 + i * 12, 20, 2, 0, Math.PI * 2); ctx.fill();
        }
        drawHighlight(ctx, 16, 9, 120, 10, 0.08);
        sprites['boss18_shield'] = cv;
    }
    // Shield small (32x18 → 44x30) — Power conduit hexagonal node
    {
        const cv = _mkCanvas(44, 30), ctx = cv.getContext('2d'), cx = 22, cy = 15;
        // Hexagonal node shape
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (Math.PI / 3) * i - Math.PI / 6;
            const px = cx + 14 * Math.cos(a), py = cy + 10 * Math.sin(a);
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        outlineAndFill(ctx, dark, '#111', 2);
        // Inner glow
        const ng = ctx.createRadialGradient(cx, cy, 1, cx, cy, 10);
        ng.addColorStop(0, accent); ng.addColorStop(1, dark);
        ctx.fillStyle = ng; ctx.globalAlpha = 0.4;
        ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        drawHighlight(ctx, cx - 8, cy - 8, 16, 6, 0.15);
        sprites['boss18_shield2'] = cv;
    }
    // Weakpoint (26x26 → 38x38) — Critical error core with crosshair
    {
        const S = 38, cv = _mkCanvas(S, S), ctx = cv.getContext('2d'), cx = S / 2, cy = S / 2;
        ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2);
        const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 12);
        g.addColorStop(0, '#ffff66'); g.addColorStop(0.5, '#ff4433'); g.addColorStop(1, dark);
        ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
        // Crosshair marks
        ctx.strokeStyle = C_WHITE; ctx.lineWidth = 1; ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.moveTo(cx - 16, cy); ctx.lineTo(cx - 6, cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + 6, cy); ctx.lineTo(cx + 16, cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, cy - 16); ctx.lineTo(cx, cy - 6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, cy + 6); ctx.lineTo(cx, cy + 16); ctx.stroke();
        ctx.globalAlpha = 1;
        // Pulsing center
        ctx.fillStyle = '#ffcc88';
        ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
        sprites['boss18_weak'] = cv;
    }
    // Arm (50x70 → 62x82) — Royal pillar with energy ring bands
    {
        const cv = _mkCanvas(62, 82), ctx = cv.getContext('2d'), cx = 31, cy = 41;
        // Pillar body with flared top and base
        ctx.beginPath();
        ctx.moveTo(cx - 12, cy - 38);
        ctx.lineTo(cx + 12, cy - 38);
        ctx.lineTo(cx + 16, cy - 28);
        ctx.lineTo(cx + 14, cy + 28);
        ctx.lineTo(cx + 18, cy + 38);
        ctx.lineTo(cx - 18, cy + 38);
        ctx.lineTo(cx - 14, cy + 28);
        ctx.lineTo(cx - 16, cy - 28);
        ctx.closePath();
        outlineAndFill(ctx, dark, '#111', 3);
        // Energy ring bands with glow
        ctx.save(); ctx.shadowColor = accent; ctx.shadowBlur = 4;
        ctx.strokeStyle = accent; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(cx, cy - 20, 16, 5, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(cx, cy, 17, 5, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(cx, cy + 20, 16, 5, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
        // Central power line
        ctx.strokeStyle = color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx, cy - 35); ctx.lineTo(cx, cy + 35); ctx.stroke();
        sprites['boss18_arm'] = cv;
    }
}
/**
 * CinematicUtils — Shared rendering helpers for cinematic scenes.
 *
 * All functions are pure (no side-effects, no game-state mutation).
 */
import { ui } from '../../FontConfig.js';

// ─── Easing ───────────────────────────────────────────
export function easeOut(x) {
    const v = Math.min(1, Math.max(0, x));
    return 1 - Math.pow(1 - v, 3);
}

export function easeInOut(x) {
    const v = Math.min(1, Math.max(0, x));
    return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2;
}

// ─── Background Stars ─────────────────────────────────

export function createBgStars(count, w, h) {
    const stars = [];
    for (let i = 0; i < count; i++) {
        stars.push({
            x: Math.random() * w,
            y: Math.random() * h,
            speed: 20 + Math.random() * 60,
            size: 0.5 + Math.random() * 1.5,
            brightness: 0.3 + Math.random() * 0.7
        });
    }
    return stars;
}

export function updateBgStars(stars, dt, w, h) {
    for (const s of stars) {
        s.y += s.speed * dt;
        if (s.y > h) { s.y = 0; s.x = Math.random() * w; }
    }
}

export function renderBgStars(ctx, stars) {
    ctx.save();
    for (const s of stars) {
        ctx.globalAlpha = s.brightness * 0.6;
        ctx.fillStyle = '#aabbdd';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

// ─── Boss / Mini-Boss Part Renderer ───────────────────

/**
 * Render every part of a boss/mini-boss definition at a given position.
 * Draw order: arm → shield → turret → weakpoint → core.
 */
export function renderBossPartsAtPosition(ctx, assets, def, centerX, centerY, scale, spread, time) {
    const order = ['arm', 'shield', 'turret', 'weakpoint', 'core'];
    for (const role of order) {
        for (const p of def.parts) {
            if (p.role !== role) continue;

            let ox = p.offsetX || 0;
            let oy = p.offsetY || 0;

            // Orbit
            if (p.orbitRadius > 0) {
                const angle = (p.orbitAngle || 0) + (p.orbitSpeed || 0) * time;
                ox = Math.cos(angle) * p.orbitRadius;
                oy = Math.sin(angle) * p.orbitRadius;
            }

            // Bob
            if (p.bobAmplitude > 0) {
                oy += Math.sin(time * (p.bobSpeed || 1) + (p.offsetX || 0)) * p.bobAmplitude;
            }

            ox *= spread;
            oy *= spread;

            const pw = p.width * scale;
            const ph = p.height * scale;
            const px = centerX + ox * scale - pw / 2;
            const py = centerY + oy * scale - ph / 2;

            ctx.save();

            const rot = (p.rotationSpeed || 0) * time;
            if (rot !== 0) {
                ctx.translate(px + pw / 2, py + ph / 2);
                ctx.rotate(rot);
                ctx.translate(-(px + pw / 2), -(py + ph / 2));
            }

            const sprite = p.spriteKey && assets ? assets.getSprite(p.spriteKey) : null;
            if (sprite) {
                ctx.drawImage(sprite, px - 2 * scale, py - 2 * scale, pw + 4 * scale, ph + 4 * scale);
            } else {
                const partCX = px + pw / 2;
                const partCY = py + ph / 2;
                ctx.fillStyle = p.role === 'core' ? '#ff2244'
                    : p.role === 'turret' ? '#ffaa33'
                    : p.role === 'shield' ? '#4488ff'
                    : '#cc6633';
                ctx.beginPath();
                ctx.arc(partCX, partCY, pw / 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#111';
                ctx.lineWidth = 1.5 * scale;
                ctx.stroke();
            }

            ctx.restore();
        }
    }
}

// ─── Overlay Helpers ──────────────────────────────────

/** Cinematic black letterbox bars (top + bottom). */
export function renderLetterbox(ctx, w, h) {
    const barH = h * 0.08;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, barH);
    ctx.fillRect(0, h - barH, w, barH);
    ctx.strokeStyle = 'rgba(100,180,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, barH); ctx.lineTo(w, barH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, h - barH); ctx.lineTo(w, h - barH); ctx.stroke();
    return barH;
}

/** "TAP TO SKIP" hint. */
export function renderSkipHint(ctx, cx, h, t, barH) {
    const skipAlpha = 0.55 + 0.25 * Math.sin(t * 3);
    ctx.save();
    ctx.globalAlpha = skipAlpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const size = Math.min(14, cx * 2 * 0.032);
    ctx.font = ui(size, 'bold');
    ctx.fillStyle = '#aabbcc';
    ctx.shadowColor = 'rgba(100,180,255,0.5)';
    ctx.shadowBlur = 6;
    ctx.fillText('▸ TAP TO SKIP ◂', cx, h - barH / 2);
    ctx.restore();
}

/** Full-screen vignette. */
export function renderVignette(ctx, cx, cy, w, h, alpha = 0.5) {
    const grad = ctx.createRadialGradient(cx, cy, w * 0.25, cx, cy, w * 0.75);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, `rgba(0,0,0,${alpha.toFixed(3)})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
}

/** Corner brackets decoration. */
export function renderCornerBrackets(ctx, w, h, alpha, color = 'rgba(136,204,255,') {
    ctx.save();
    ctx.strokeStyle = `${color}${alpha.toFixed(3)})`;
    ctx.lineWidth = 2;
    const bLen = 20;
    const m = 15;
    ctx.beginPath(); ctx.moveTo(m, m + bLen); ctx.lineTo(m, m); ctx.lineTo(m + bLen, m); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w - m - bLen, m); ctx.lineTo(w - m, m); ctx.lineTo(w - m, m + bLen); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(m, h - m - bLen); ctx.lineTo(m, h - m); ctx.lineTo(m + bLen, h - m); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w - m - bLen, h - m); ctx.lineTo(w - m, h - m); ctx.lineTo(w - m, h - m - bLen); ctx.stroke();
    ctx.restore();
}

/** Targeting brackets around a boss. */
export function renderTargetBrackets(ctx, cx, yPos, bw, bh, alpha) {
    ctx.globalAlpha = alpha * 0.5;
    ctx.strokeStyle = '#ff3322';
    ctx.lineWidth = 2.5;
    const blx = cx - bw, bly = yPos - bh;
    const brx = cx + bw, bry = yPos + bh;
    const cLen = 16;
    ctx.beginPath(); ctx.moveTo(blx, bly + cLen); ctx.lineTo(blx, bly); ctx.lineTo(blx + cLen, bly); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(brx - cLen, bly); ctx.lineTo(brx, bly); ctx.lineTo(brx, bly + cLen); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(blx, bry - cLen); ctx.lineTo(blx, bry); ctx.lineTo(blx + cLen, bry); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(brx - cLen, bry); ctx.lineTo(brx, bry); ctx.lineTo(brx, bry - cLen); ctx.stroke();
}

/**
 * PlayerOverlayRenderer.js
 *
 * OOP perk visual overlay system.
 * Each active power-up has its own renderer class that paints on top of the
 * player sprite. Overlay instances are long-lived (own particle state) and
 * are updated every frame regardless of whether the perk is active.
 *
 * To add a new perk overlay:
 *   1. Subclass PlayerOverlay and override update(dt) / draw(ctx,x,y,h).
 *   2. Register one instance in PlayerOverlayManager.#overlays.
 */

// ── Base ──────────────────────────────────────────────────────────────────────
class PlayerOverlay {
    _t = 0;
    update(dt) { this._t += dt; }
    /** Drawn BEFORE the sprite (wings, armour…). Receives full perks context. */
    drawBehind(ctx, x, y, h, perks) {}
    /** Drawn AFTER the sprite (shields, auras…). Receives full perks context. */
    draw(ctx, x, y, h, perks) {}
}

// ── Shield ────────────────────────────────────────────────────────────────────
// Flickering energy barrier — bubble + 3 rotating arc panels + inner ring
class ShieldOverlay extends PlayerOverlay {
    draw(ctx, x, y, h) {
        const t = this._t;
        const r = 36;

        ctx.save();
        ctx.shadowColor = '#00eeff';
        ctx.shadowBlur = 10;

        // Shield bubble
        ctx.globalAlpha = 0.05 + Math.sin(t * 3) * 0.025;
        ctx.fillStyle = '#00ccff';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        // 3 flickering arc panels (120° apart, rotating)
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#00f0ff';
        for (let i = 0; i < 3; i++) {
            const a = (i / 3) * Math.PI * 2 + t * 1.2;
            ctx.globalAlpha = 0.4 + Math.sin(t * 6 + i * 2.1) * 0.3;
            ctx.beginPath();
            ctx.arc(x, y, r, a, a + Math.PI * 0.55);
            ctx.stroke();
        }

        // Inner energy ring
        ctx.globalAlpha = 0.2;
        ctx.strokeStyle = '#66ddff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, r * 0.7, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

// ── Magnet ────────────────────────────────────────────────────────────────────
// Converging field pulses + orbiting coins at varied depths
class MagnetOverlay extends PlayerOverlay {
    draw(ctx, x, y, h) {
        const t = this._t;
        const R = 32;

        ctx.save();
        ctx.shadowColor = '#ffcc00';
        ctx.shadowBlur = 6;

        // 2 inward-converging field pulses
        ctx.strokeStyle = '#ffcc44';
        ctx.lineWidth = 1;
        for (let i = 0; i < 2; i++) {
            const phase = (t * 1.8 + i * 0.5) % 1;
            const pr = R + (1 - phase) * 16;
            ctx.globalAlpha = phase * 0.25;
            ctx.beginPath();
            ctx.arc(x, y, pr, 0, Math.PI * 2);
            ctx.stroke();
        }

        // 3 orbiting coins at staggered depths
        ctx.fillStyle = '#ffd700';
        ctx.shadowBlur = 4;
        for (let i = 0; i < 3; i++) {
            const a = (i / 3) * Math.PI * 2 + t * 2.0;
            const depth = 0.5 + Math.sin(a) * 0.35;
            const cr = R * (0.7 + i * 0.13);
            ctx.globalAlpha = 0.4 + depth * 0.5;
            ctx.beginPath();
            ctx.arc(x + Math.cos(a) * cr, y + Math.sin(a) * cr * 0.4, 3 + depth * 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

// ── SpringBoots ───────────────────────────────────────────────────────────────
// Zigzag coil springs + ground bounce ripple
class SpringBootsOverlay extends PlayerOverlay {
    draw(ctx, x, y, h) {
        const t     = this._t;
        const footY = y + h / 2;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.shadowColor = '#44ff88';
        ctx.shadowBlur = 6;

        // 2 zigzag springs (5 segments each)
        ctx.strokeStyle = '#22ff66';
        ctx.lineWidth = 2;
        [-9, 9].forEach(bx => {
            const stretch = 13 + Math.sin(t * 8 + bx) * 3;
            ctx.beginPath();
            ctx.moveTo(x + bx, footY);
            for (let i = 1; i <= 5; i++) {
                const sx = x + bx + ((i % 2) * 2 - 1) * 5;
                ctx.lineTo(sx, footY + (i / 5) * stretch);
            }
            ctx.stroke();
        });

        // Ground bounce ripple
        const phase = (t * 4) % 1;
        ctx.globalAlpha = (1 - phase) * 0.55;
        ctx.strokeStyle = '#44ff88';
        ctx.lineWidth = 1.2;
        const ripR = 8 + phase * 22;
        ctx.beginPath();
        ctx.ellipse(x, footY + 6, ripR, ripR * 0.25, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

// ── Slow Time ─────────────────────────────────────────────────────────────────
// Frost clock — blue tint + clock ring with 4 ticks + hour/minute hands
class SlowTimeOverlay extends PlayerOverlay {
    draw(ctx, x, y, h) {
        const t  = this._t;
        const cr = 32;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.shadowColor = '#aadaff';
        ctx.shadowBlur = 6;

        // Frost tint
        ctx.globalAlpha = 0.06;
        ctx.fillStyle = '#88bbff';
        ctx.beginPath();
        ctx.arc(x, y, cr + 6, 0, Math.PI * 2);
        ctx.fill();

        // Clock ring
        ctx.globalAlpha = 0.45;
        ctx.strokeStyle = '#8cbfff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, cr, 0, Math.PI * 2);
        ctx.stroke();

        // 4 tick marks (12/3/6/9) — single batched path
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = '#aadcff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI * 2 - Math.PI / 2;
            ctx.moveTo(x + Math.cos(a) * (cr - 4), y + Math.sin(a) * (cr - 4));
            ctx.lineTo(x + Math.cos(a) * (cr - 1), y + Math.sin(a) * (cr - 1));
        }
        ctx.stroke();

        // Hour hand (slow)
        const ha = t * 0.5 - Math.PI / 2;
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = '#b0d8ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(ha) * cr * 0.45, y + Math.sin(ha) * cr * 0.45);
        ctx.stroke();

        // Minute hand (faster)
        const ma = t * 2.5 - Math.PI / 2;
        ctx.globalAlpha = 0.65;
        ctx.strokeStyle = '#c8eaff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(ma) * cr * 0.75, y + Math.sin(ma) * cr * 0.75);
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

// ── Double Coins ──────────────────────────────────────────────────────────────
// Golden crown halo ring + orbiting coins + ×2 multiplier
class DoubleCoinsOverlay extends PlayerOverlay {
    draw(ctx, x, y, h) {
        const t     = this._t;
        const headY = y - h * 0.38;
        const R     = 22;

        ctx.save();
        ctx.shadowColor = '#ffcc00';
        ctx.shadowBlur = 6;

        // Halo ring
        ctx.globalAlpha = 0.2 + Math.sin(t * 2) * 0.1;
        ctx.strokeStyle = '#ffc800';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(x, headY, R + 4, 9, 0, 0, Math.PI * 2);
        ctx.stroke();

        // 5 orbiting coins
        ctx.fillStyle = '#ffd700';
        for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2 + t * 1.3;
            ctx.globalAlpha = 0.5 + Math.abs(Math.cos(a)) * 0.4;
            ctx.beginPath();
            ctx.arc(x + Math.cos(a) * R, headY + Math.sin(a) * 7, 3.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // ×2 multiplier text
        ctx.globalAlpha = 0.6 + Math.sin(t * 2.5) * 0.25;
        ctx.fillStyle = '#ffe040';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('×2', x, y - h * 0.6);

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

// ── Jetpack (replaces the old Player.#drawJetpackFlames) ────────────────────
// Big real-time flames with gradient + white hot core + drifting smoke
class JetpackOverlay extends PlayerOverlay {
    #smoke = [];

    update(dt) {
        super.update(dt);
        if (Math.random() < 0.55) {
            this.#smoke.push({
                ox:   (Math.random() - 0.5) * 12,
                oy:   0,
                vx:   (Math.random() - 0.5) * 18,
                vy:   28 + Math.random() * 22,
                life: 0.38 + Math.random() * 0.28,
                age:  0,
                r:    4 + Math.random() * 4.5,
            });
        }
        this.#smoke.forEach(p => { p.ox += p.vx * dt; p.oy += p.vy * dt; p.age += dt; });
        this.#smoke = this.#smoke.filter(p => p.age < p.life);
    }

    draw(ctx, x, y, h) {
        const t     = this._t;
        const baseY = y + h / 2;

        ctx.save();

        // Smoke trail
        this.#smoke.forEach(p => {
            const alpha = ((1 - p.age / p.life) * 0.30).toFixed(3);
            ctx.fillStyle = `rgba(180,180,210,${alpha})`;
            ctx.beginPath(); ctx.arc(x + p.ox, baseY + p.oy, p.r, 0, Math.PI * 2); ctx.fill();
        });

        // Flame plumes
        ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 20;
        [-8, 8].forEach(ox => {
            const fh = 20 + Math.sin(t * 22 + ox) * 7;
            const grad = ctx.createLinearGradient(x + ox, baseY, x + ox, baseY + fh);
            grad.addColorStop(0,    '#ffff88');
            grad.addColorStop(0.30, '#ff8800');
            grad.addColorStop(0.80, '#ff3300');
            grad.addColorStop(1,    'rgba(255,50,0,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(x + ox, baseY + fh * 0.42, 5.5, fh, 0, 0, Math.PI * 2);
            ctx.fill();

            // White-hot inner core
            ctx.fillStyle = '#ffffff'; ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.ellipse(x + ox, baseY + 3, 2.2, 5.5, 0, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

// ── Rocket Pods ───────────────────────────────────────────────────────────────
// Mechanical jet pods with nozzle caps + reactive thrust flames
class RocketPodsOverlay extends PlayerOverlay {
    drawBehind(ctx, x, y, h, { anim }) {
        const t  = this._t;
        const pY = y - h * 0.06;

        ctx.save();
        ctx.shadowColor = '#3399ff';
        ctx.shadowBlur = 6;

        [-1, 1].forEach(side => {
            const px = x + side * 17;

            // Pod body
            ctx.fillStyle = '#2255dd';
            ctx.beginPath();
            ctx.roundRect(px - 4, pY - 7, 8, 14, 3);
            ctx.fill();

            // Nozzle cap (dome on top)
            ctx.fillStyle = '#3366cc';
            ctx.beginPath();
            ctx.arc(px, pY - 7, 4, Math.PI, 0);
            ctx.fill();

            // Thrust flame
            const isJump = anim === 'jump';
            const fh = isJump ? 10 + Math.sin(t * 22 + side) * 4 : 3 + Math.sin(t * 10 + side) * 1.5;
            ctx.globalAlpha = isJump ? 0.85 : 0.4;
            ctx.fillStyle = isJump ? '#78b4ff' : '#5090ff';
            ctx.shadowBlur = isJump ? 10 : 4;
            ctx.beginPath();
            ctx.ellipse(px, pY + 10 + fh * 0.5, 2.5, fh, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        });

        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

// ── Glide Wings ───────────────────────────────────────────────────────────────
// Organic dragonfly wings — 3-curve shape with central vein
class GlideWingsOverlay extends PlayerOverlay {
    drawBehind(ctx, x, y, h, { anim }) {
        const t       = this._t;
        const anchorY = y - h * 0.18;

        const spread = anim === 'fall' ? 1.0
                     : anim === 'jump' ? 0.18
                     : 0.40 + Math.sin(t * 2.0) * 0.07;

        ctx.save();
        ctx.shadowColor = '#22dd77';
        ctx.shadowBlur  = 8;

        [-1, 1].forEach(side => {
            const baseX = x + side * 7;
            const midX  = x + side * (10 + spread * 18);
            const tipX  = x + side * (22 + spread * 32);
            const tipY  = anchorY + spread * 20;

            // Wing membrane
            ctx.globalAlpha = 0.50 + spread * 0.32;
            ctx.fillStyle   = '#18b95a';
            ctx.strokeStyle = '#44ffaa';
            ctx.lineWidth   = 1.2;

            ctx.beginPath();
            ctx.moveTo(baseX, anchorY - 2);
            ctx.quadraticCurveTo(midX, anchorY - 6 + spread * 2, tipX, anchorY + spread * 6);
            ctx.quadraticCurveTo(tipX - side * 6, tipY, midX, anchorY + 18);
            ctx.quadraticCurveTo(x + side * 5, anchorY + 14, baseX, anchorY + 4);

            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Central vein
            ctx.strokeStyle = 'rgba(100,255,160,0.3)';
            ctx.lineWidth = 0.8;

            ctx.beginPath();
            ctx.moveTo(baseX, anchorY + 3);
            ctx.quadraticCurveTo(
                midX * 0.85 + x * 0.15,
                anchorY + spread * 10,
                tipX * 0.7 + x * 0.3,
                anchorY + spread * 16
            );
            ctx.stroke();
        });

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}


// ── Armor Plating ─────────────────────────────────────────────────────────────
// Hex shoulder plates with metallic edge highlight + center rivet
class ArmorPlatingOverlay extends PlayerOverlay {
    drawBehind(ctx, x, y, h) {
        const bY = y - h * 0.05;

        ctx.save();
        ctx.shadowColor = '#aabbcc';
        ctx.shadowBlur = 5;

        [-1, 1].forEach(side => {
            const px = x + side * 14;

            // Hex plate fill
            ctx.fillStyle = '#7799aa';
            ctx.beginPath();
            ctx.moveTo(px - 6, bY - 8); ctx.lineTo(px + 6, bY - 8);
            ctx.lineTo(px + 8, bY - 2); ctx.lineTo(px + 5, bY + 5);
            ctx.lineTo(px - 5, bY + 5); ctx.lineTo(px - 8, bY - 2);
            ctx.closePath();
            ctx.fill();

            // Top edge highlight (metallic sheen)
            ctx.strokeStyle = '#ccdde8';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.moveTo(px - 6, bY - 8);
            ctx.lineTo(px + 6, bY - 8);
            ctx.lineTo(px + 8, bY - 2);
            ctx.stroke();

            // Center rivet
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = '#bbccdd';
            ctx.beginPath();
            ctx.arc(px, bY - 1, 1.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = 1;
        });

        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

// ── Dash Chevrons ─────────────────────────────────────────────────────────────
// Cyan speed-chevrons on the forward side of the suit
class DashChevronOverlay extends PlayerOverlay {
    draw(ctx, x, y, h, { facing = 1 }) {
        const t   = this._t;
        const bY  = y - h * 0.08;
        const bX  = x + facing * 14;
        ctx.save();
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.shadowColor = '#00ddff'; ctx.shadowBlur = 5;
        for (let i = 0; i < 3; i++) {
            const cy    = bY + i * 5;
            const alpha = (0.48 + Math.sin(t * 5 + i * 1.2) * 0.28).toFixed(2);
            ctx.strokeStyle = `rgba(0,220,255,${alpha})`; ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(bX,                   cy - 2.5);
            ctx.lineTo(bX + facing * 4.5,    cy);
            ctx.lineTo(bX,                   cy + 2.5);
            ctx.stroke();
        }
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

// ── Stomp Boots ───────────────────────────────────────────────────────────────
// Red energy rings + downward impact chevron
class StompBootsOverlay extends PlayerOverlay {
    draw(ctx, x, y, h) {
        const t     = this._t;
        const bootY = y + h * 0.44;

        ctx.save();
        ctx.shadowColor = '#ff5500';
        ctx.shadowBlur = 6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Boot energy rings
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ff5000';
        [-8, 8].forEach(bx => {
            ctx.globalAlpha = 0.5 + Math.sin(t * 7 + bx) * 0.2;
            ctx.beginPath();
            ctx.ellipse(x + bx, bootY, 8, 4.5, 0, 0, Math.PI * 2);
            ctx.stroke();
        });

        // Downward impact chevron (▼)
        ctx.globalAlpha = 0.4 + Math.sin(t * 5) * 0.2;
        ctx.strokeStyle = '#ff6622';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(x - 5, bootY + 7);
        ctx.lineTo(x, bootY + 13);
        ctx.lineTo(x + 5, bootY + 7);
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

// ── Shockwave ─────────────────────────────────────────────────────────────────
// Expanding pulse rings + 4 radial burst lines
class ShockwaveOverlay extends PlayerOverlay {
    draw(ctx, x, y, h) {
        const t  = this._t;
        const cy = y + h * 0.10;

        ctx.save();
        ctx.shadowColor = '#ffdd00';
        ctx.shadowBlur = 5;
        ctx.lineCap = 'round';

        // 2 expanding pulse rings
        ctx.strokeStyle = '#ffdd44';
        for (let i = 0; i < 2; i++) {
            const phase = (t * 2.2 + i * 0.5) % 1;
            const r = 12 + phase * 28;
            ctx.globalAlpha = (1 - phase) * 0.55;
            ctx.lineWidth = 1.8 - phase;
            ctx.beginPath();
            ctx.ellipse(x, cy, r, r * 0.32, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

        // 4 radial burst lines (NSEW) — single batched path
        const burst = 16 + Math.sin(t * 3) * 4;
        ctx.globalAlpha = 0.35 + Math.sin(t * 4) * 0.15;
        ctx.strokeStyle = '#ffcc00';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + 8, cy);       ctx.lineTo(x + burst, cy);
        ctx.moveTo(x - 8, cy);       ctx.lineTo(x - burst, cy);
        ctx.moveTo(x, cy - 5);       ctx.lineTo(x, cy - burst * 0.6);
        ctx.moveTo(x, cy + 5);       ctx.lineTo(x, cy + burst * 0.6);
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

// ── Spike Head ────────────────────────────────────────────────────────────────
class SpikeHeadOverlay extends PlayerOverlay {
    #flashTimers = new Array(5).fill(0);

    draw(ctx, x, y, h, { spikeCount, spikeTimers, spikeCooldown, spike_haste }) {
        if (!spikeCount || spikeCount <= 0) return;

        const headTopY = y - 34;

        const chevH   = 5;
        const rowGap  = 4;
        const halfW   = 6;

        ctx.save();
        ctx.lineCap  = 'round';
        ctx.lineJoin = 'round';

        // 🔥 Calcolo quante cariche sono effettivamente attive
        // (timer = 0 → carica pronta)
        let activeSegments = 0;
        for (let i = 0; i < spikeCount; i++) {
            if (spikeTimers[i] === 0) activeSegments++;
        }

        // 🔥 La barra si accorcia dall’alto
        // Disegno solo i segmenti attivi
        for (let i = 0; i < activeSegments; i++) {

            // Il segmento più alto è quello con indice più alto
            const logicalIndex = spikeCount - 1 - i;

            const timer = spikeTimers?.[logicalIndex] ?? 0;
            const frac  = Math.max(0, 1 - timer / spikeCooldown);
            const ready = frac >= 1.0;

            // Flash
            if (ready && this.#flashTimers[logicalIndex] <= 0 && timer === 0) {
                this.#flashTimers[logicalIndex] = 1;
            }
            const flash = ready ? this.#flashTimers[logicalIndex] : 0;

            const baseY = headTopY - i * rowGap;
            const tipY  = baseY - chevH;

            const curHalfW = halfW;

            const readyColor = flash > 0.5 ? '#ffff88' : '#ff4400';

            ctx.shadowBlur  = ready ? 10 : 0;
            ctx.shadowColor = ready ? '#ff8800' : 'transparent';

            ctx.strokeStyle = readyColor;
            ctx.lineWidth   = 2.4;

            ctx.beginPath();
            ctx.moveTo(x - curHalfW, baseY);
            ctx.lineTo(x,            tipY);
            ctx.lineTo(x + curHalfW, baseY);
            ctx.stroke();

            // Riempimento leggero
            ctx.fillStyle = `rgba(255,120,0,0.25)`;
            ctx.beginPath();
            ctx.moveTo(x - curHalfW * 0.85, baseY - 1);
            ctx.lineTo(x, tipY + 1);
            ctx.lineTo(x + curHalfW * 0.85, baseY - 1);
            ctx.fill();
        }

        // Effetto haste
        if (spike_haste && activeSegments > 0) {
            const topBaseY = headTopY - (activeSegments - 1) * rowGap - chevH - 4;
            const shimmerAlpha = (0.4 + Math.sin(this._t * 8) * 0.25).toFixed(2);
            ctx.strokeStyle = `rgba(255,160,0,${shimmerAlpha})`;
            ctx.lineWidth   = 1.5;
            ctx.shadowColor = '#ff8800'; 
            ctx.shadowBlur  = 8;
            ctx.beginPath();
            ctx.moveTo(x - halfW - 4, topBaseY);
            ctx.lineTo(x + halfW + 4, topBaseY);
            ctx.stroke();
        }

        ctx.restore();
    }
}



// ── Ghost Repel ───────────────────────────────────────────────────────────────
// Ward aura — rotating arc + ward crosses (ready) / progress arc + % (charging)
class GhostRepelOverlay extends PlayerOverlay {
    draw(ctx, x, y, h, { ghostRepelCooldown, ghostRepelMaxCd }) {
        if (!ghostRepelMaxCd) return;

        const t     = this._t;
        const cd    = ghostRepelCooldown ?? 0;
        const pct   = cd <= 0 ? 1 : 1 - cd / ghostRepelMaxCd;
        const ready = cd <= 0;
        const r     = 24;

        ctx.save();
        ctx.lineCap = 'round';

        if (ready) {
            ctx.shadowColor = '#66ffee';
            ctx.shadowBlur = 6;

            // Rotating ward arc
            ctx.strokeStyle = 'rgba(80,255,210,0.5)';
            ctx.lineWidth = 2;
            const a = t * 1.4;
            ctx.beginPath();
            ctx.arc(x, y, r, a, a + Math.PI * 1.3);
            ctx.stroke();

            // 3 ward crosses — single batched path
            ctx.strokeStyle = 'rgba(100,255,220,0.4)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            for (let i = 0; i < 3; i++) {
                const wa = (i / 3) * Math.PI * 2 + t * 0.8;
                const wx = x + Math.cos(wa) * (r + 6);
                const wy = y + Math.sin(wa) * (r + 6);
                ctx.moveTo(wx - 3, wy); ctx.lineTo(wx + 3, wy);
                ctx.moveTo(wx, wy - 3); ctx.lineTo(wx, wy + 3);
            }
            ctx.stroke();
        } else {
            ctx.shadowColor = '#8844ff';
            ctx.shadowBlur = 6;

            // Progress arc
            ctx.strokeStyle = 'rgba(150,55,255,0.8)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
            ctx.stroke();

            // Percentage text
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = '#bb88ff';
            ctx.font = '9px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(Math.round(pct * 100) + '%', x, y);
        }

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}


// ── Manager ───────────────────────────────────────────────────────────────────
/**
 * Owns one overlay instance per perk.
 * drawBehind() is called BEFORE the sprite (wings, armour, rocket pods).
 * draw()       is called AFTER  the sprite (shields, auras, chevrons, flames).
 *
 * Adding a new perk overlay:
 *   1. Subclass PlayerOverlay, override drawBehind and/or draw.
 *   2. Add one entry to #overlays.
 *   3. Include the perk key in Player.#buildActivePerks().
 */
export class PlayerOverlayManager {
    /** @type {Map<string, PlayerOverlay>} */
    #overlays = new Map([
        // ── Permanent perks (behind-sprite) ───────────────────────────────
        ['double_jump',  new RocketPodsOverlay()],
        ['glide',        new GlideWingsOverlay()],
        ['armor',        new ArmorPlatingOverlay()],
        // ── Front overlays (after-sprite) ─────────────────────────────────
        ['double_coins', new DoubleCoinsOverlay()],
        ['slow_time',    new SlowTimeOverlay()],
        ['shield',       new ShieldOverlay()],
        ['magnet',       new MagnetOverlay()],
        ['spring_boots', new SpringBootsOverlay()],
        ['stomp',        new StompBootsOverlay()],
        ['shockwave',    new ShockwaveOverlay()],
        ['dash',         new DashChevronOverlay()],
        ['jetpack',      new JetpackOverlay()],   // flames on top
        ['spike_head',   new SpikeHeadOverlay()], // spikes drawn above sprite
        ['ghost_repel',  new GhostRepelOverlay()],
    ]);

    update(dt) {
        for (const ov of this.#overlays.values()) ov.update(dt);
    }

    /** Drawn BEFORE the sprite — receives full perks context object. */
    drawBehind(ctx, x, y, h, activePerks) {
        for (const [key, ov] of this.#overlays) {
            if (activePerks[key]) ov.drawBehind(ctx, x, y, h, activePerks);
        }
    }

    /** Drawn AFTER the sprite — receives full perks context object. */
    draw(ctx, x, y, h, activePerks) {
        for (const [key, ov] of this.#overlays) {
            if (activePerks[key]) ov.draw(ctx, x, y, h, activePerks);
        }
    }
}

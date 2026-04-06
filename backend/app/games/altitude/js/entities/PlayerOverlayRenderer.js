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
// Rotating hex-arc bubble + pulsing inner glow + orbiting sparkle dots
class ShieldOverlay extends PlayerOverlay {
    draw(ctx, x, y, h) {
        const t = this._t;
        const r = 36;
        ctx.save();
        ctx.translate(x, y);

        // Pulsing radial fill
        const pulse = 0.6 + Math.sin(t * 4) * 0.2;
        const radGrad = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r);
        radGrad.addColorStop(0, `rgba(0,220,255,${(0.08 * pulse).toFixed(3)})`);
        radGrad.addColorStop(1, 'rgba(0,100,255,0)');
        ctx.fillStyle = radGrad;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();

        // 6 rotating arc segments
        ctx.strokeStyle = `rgba(0,240,255,${(0.62 + Math.sin(t * 3) * 0.22).toFixed(3)})`;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#00eeff'; ctx.shadowBlur = 10;
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + t * 1.4;
            ctx.beginPath();
            ctx.arc(0, 0, r, a, a + Math.PI / 4.5);
            ctx.stroke();
        }

        // Counter-rotating outer sparkle dots
        ctx.shadowBlur = 5;
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2 - t * 0.9;
            const sr = r + 4 + Math.sin(t * 5 + i) * 3;
            const alpha = (0.4 + Math.sin(t * 6 + i * 0.7) * 0.3).toFixed(3);
            ctx.fillStyle = `rgba(180,255,255,${alpha})`;
            ctx.beginPath();
            ctx.arc(Math.cos(a) * sr, Math.sin(a) * sr, 1.8, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

// ── Magnet ────────────────────────────────────────────────────────────────────
// Elliptical field-arc lines + 3 gold coins orbiting in a coin halo
class MagnetOverlay extends PlayerOverlay {
    draw(ctx, x, y, h) {
        const t = this._t;
        const R = 34;
        ctx.save();
        ctx.translate(x, y);

        // Magnetic field arcs (3 concentric pairs)
        ctx.lineWidth = 1.2;
        for (let i = 1; i <= 3; i++) {
            const fr = R * 0.33 * i;
            const alpha = (0.12 + i * 0.06).toFixed(3);
            ctx.strokeStyle = `rgba(255,200,0,${alpha})`;
            ctx.beginPath(); ctx.arc(0, 0, fr, -Math.PI * 0.7, Math.PI * 0.7); ctx.stroke();
            ctx.beginPath(); ctx.arc(0, 0, fr,  Math.PI * 0.3, Math.PI * 1.7); ctx.stroke();
        }

        // 3 orbiting gold coins
        ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 8;
        for (let i = 0; i < 3; i++) {
            const a  = (i / 3) * Math.PI * 2 + t * 2.2;
            const cx = Math.cos(a) * R;
            const cy = Math.sin(a) * R * 0.5;
            // coin disc — shrinks to line when edge-on (simulate 3-D spin)
            const rx = 6;
            const ry = Math.max(1.5, 6 * Math.abs(Math.cos(a + t * 0.4)));
            ctx.fillStyle = '#ffcc00';
            ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
            // shine
            ctx.fillStyle = 'rgba(255,255,200,0.55)';
            ctx.beginPath(); ctx.ellipse(cx - 1.5, cy - 1.5, rx * 0.35, ry * 0.40, -0.4, 0, Math.PI * 2); ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

// ── SpringBoots ───────────────────────────────────────────────────────────────
// Animated coil springs under each foot + expanding bounce ring on the ground
class SpringBootsOverlay extends PlayerOverlay {
    draw(ctx, x, y, h) {
        const t   = this._t;
        const footY = y + h / 2;
        ctx.save();
        ctx.shadowColor = '#44ff88'; ctx.shadowBlur = 10;

        [-9, 9].forEach(bx => {
            const coils  = 4;
            const coilR  = 5;
            const coilH  = 14 + Math.sin(t * 8 + bx) * 2.5;
            const steps  = coils * 12;

            ctx.strokeStyle = '#22ff66'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
            ctx.beginPath();
            for (let s = 0; s <= steps; s++) {
                const frac = s / steps;
                const sx = x + bx + Math.sin(frac * Math.PI * 2 * coils) * coilR;
                const sy = footY + frac * coilH;
                s === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
            }
            ctx.stroke();

            // Bottom plate
            ctx.fillStyle = '#22ff66';
            ctx.beginPath(); ctx.ellipse(x + bx, footY + coilH, 7, 2.5, 0, 0, Math.PI * 2); ctx.fill();
        });

        // Expanding bounce ring below feet
        const ringPhase = (t * 4) % 1;
        const ringR  = 10 + ringPhase * 24;
        const ringAlpha = (1 - ringPhase) * 0.7;
        ctx.strokeStyle = `rgba(80,255,140,${ringAlpha.toFixed(3)})`;
        ctx.lineWidth = 1.5; ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.ellipse(x, footY + 7, ringR, ringR * 0.28, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

// ── Slow Time ─────────────────────────────────────────────────────────────────
// Blue frost aura + animated clock with rotating hands + drifting snowflakes
class SlowTimeOverlay extends PlayerOverlay {
    #flakes = Array.from({ length: 10 }, () => ({
        ox:    (Math.random() - 0.5) * 52,
        oy:    (Math.random() - 0.5) * 62,
        phase: Math.random() * Math.PI * 2,
        size:  1.5 + Math.random() * 2.0,
    }));

    draw(ctx, x, y, h) {
        const t = this._t;
        ctx.save();
        ctx.translate(x, y);

        // Blue aura
        const aura = ctx.createRadialGradient(0, 0, 10, 0, 0, 50);
        aura.addColorStop(0, 'rgba(80,160,255,0.14)');
        aura.addColorStop(1, 'rgba(40,80,255,0)');
        ctx.fillStyle = aura;
        ctx.beginPath(); ctx.arc(0, 0, 50, 0, Math.PI * 2); ctx.fill();

        // Clock ring
        const cr = 38;
        ctx.strokeStyle = 'rgba(140,200,255,0.55)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(0, 0, cr, 0, Math.PI * 2); ctx.stroke();

        // Tick marks
        for (let i = 0; i < 12; i++) {
            const ta = (i / 12) * Math.PI * 2;
            const r1 = cr - 3, r2 = cr;
            ctx.strokeStyle = 'rgba(140,200,255,0.4)'; ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(Math.cos(ta) * r1, Math.sin(ta) * r1);
            ctx.lineTo(Math.cos(ta) * r2, Math.sin(ta) * r2);
            ctx.stroke();
        }

        ctx.lineCap = 'round';
        ctx.shadowColor = '#aadaff'; ctx.shadowBlur = 5;

        // Hour hand (slow)
        const ha = t * 0.52 - Math.PI / 2;
        ctx.strokeStyle = 'rgba(180,220,255,0.85)'; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(ha) * cr * 0.52, Math.sin(ha) * cr * 0.52); ctx.stroke();

        // Minute hand (fast)
        const ma = t * 2.8 - Math.PI / 2;
        ctx.strokeStyle = 'rgba(200,235,255,0.75)'; ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(ma) * cr * 0.80, Math.sin(ma) * cr * 0.80); ctx.stroke();

        // Centre dot
        ctx.fillStyle = '#aadaff';
        ctx.shadowBlur = 4;
        ctx.beginPath(); ctx.arc(0, 0, 2.8, 0, Math.PI * 2); ctx.fill();

        // Drifting snowflakes
        ctx.shadowBlur = 4; ctx.shadowColor = '#aaddff';
        this.#flakes.forEach(sf => {
            const sx = sf.ox + Math.sin(t * 0.7 + sf.phase) * 8;
            const sy = sf.oy + Math.sin(t * 0.42 + sf.phase * 1.3) * 6;
            const alpha = (0.5 + Math.sin(t * 3 + sf.phase) * 0.3).toFixed(3);
            ctx.strokeStyle = `rgba(200,230,255,${alpha})`; ctx.lineWidth = sf.size * 0.55;
            for (let arm = 0; arm < 3; arm++) {
                const aa = (arm / 3) * Math.PI + sf.phase * 0.3;
                ctx.beginPath();
                ctx.moveTo(sx + Math.cos(aa) * sf.size * 2.5, sy + Math.sin(aa) * sf.size * 2.5);
                ctx.lineTo(sx - Math.cos(aa) * sf.size * 2.5, sy - Math.sin(aa) * sf.size * 2.5);
                ctx.stroke();
            }
        });

        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

// ── Double Coins ─────────────────────────────────────────────────────────────
// Golden glow + crown of 8 spinning coins orbiting the player's head
class DoubleCoinsOverlay extends PlayerOverlay {
    draw(ctx, x, y, h) {
        const t = this._t;
        ctx.save();
        ctx.translate(x, y - h * 0.10);

        // Golden player glow
        const glow = ctx.createRadialGradient(0, 0, 5, 0, 0, 42);
        glow.addColorStop(0, 'rgba(255,210,0,0.18)');
        glow.addColorStop(1, 'rgba(255,140,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(0, 0, 42, 0, Math.PI * 2); ctx.fill();

        // 8 coins in tilted halo orbiting the head
        const orbitCy = -h * 0.28;
        ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 8;
        for (let i = 0; i < 8; i++) {
            const a  = (i / 8) * Math.PI * 2 + t * 1.4;
            const cx = Math.cos(a) * 28;
            const cy = orbitCy + Math.sin(a) * 10;
            const depth = 0.55 + Math.sin(a) * 0.45; // z-depth illusion
            ctx.globalAlpha = 0.55 + Math.abs(Math.cos(a)) * 0.40;
            ctx.fillStyle = '#ffd700';
            ctx.beginPath(); ctx.arc(cx, cy, 4.5 * depth, 0, Math.PI * 2); ctx.fill();
            // shine
            ctx.fillStyle = 'rgba(255,255,210,0.65)';
            ctx.beginPath(); ctx.arc(cx - 1, cy - 1, 1.5 * depth, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Floating "×2" text
        const textAlpha = 0.55 + Math.sin(t * 2.5) * 0.30;
        ctx.globalAlpha = textAlpha;
        ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 6;
        ctx.fillStyle = '#ffe040';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('×2', 0, -h * 0.58);
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

// ── Rocket Pods (Double Jump) ─────────────────────────────────────────────────
// Blue thruster pods on the back — flames grow bigger during jump
class RocketPodsOverlay extends PlayerOverlay {
    drawBehind(ctx, x, y, h, { anim }) {
        const t  = this._t;
        const pY = y - h * 0.06;
        ctx.save();
        [-1, 1].forEach(side => {
            const px = x + side * 17;
            ctx.shadowColor = '#3399ff'; ctx.shadowBlur = 8;
            // Pod shell
            const g = ctx.createLinearGradient(px, pY - 7, px, pY + 7);
            g.addColorStop(0, '#1a44bb'); g.addColorStop(0.5, '#2255dd'); g.addColorStop(1, '#080e44');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.roundRect(px - 4, pY - 7, 8, 14, 3); ctx.fill();
            // Nozzle cap
            ctx.fillStyle = '#111133';
            ctx.beginPath(); ctx.ellipse(px, pY + 7, 4.5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
            // Intake ring
            ctx.strokeStyle = '#88aaff'; ctx.lineWidth = 1.0; ctx.globalAlpha = 0.65; ctx.shadowBlur = 4;
            ctx.beginPath(); ctx.ellipse(px, pY - 2.5, 3.5, 2, 0, 0, Math.PI * 2); ctx.stroke();
            ctx.globalAlpha = 1;
            // Flame plume
            const fh = anim === 'jump' ? 9 + Math.sin(t * 22 + side) * 4 : 3 + Math.sin(t * 10 + side) * 1.5;
            ctx.fillStyle = anim === 'jump' ? 'rgba(120,180,255,0.88)' : 'rgba(80,140,255,0.45)';
            ctx.shadowColor = '#99ccff'; ctx.shadowBlur = 10;
            ctx.beginPath(); ctx.ellipse(px, pY + 10 + fh * 0.5, 2.5, fh, 0, 0, Math.PI * 2); ctx.fill();
            // Glow intake dot
            ctx.fillStyle = '#4488ff'; ctx.shadowColor = '#4488ff'; ctx.shadowBlur = 6;
            ctx.beginPath(); ctx.arc(px, pY - 4.5, 1.8, 0, Math.PI * 2); ctx.fill();
        });
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

// ── Glide Wings ────────────────────────────────────────────────────────────────
// ── Glide Wings (improved organic shape) ───────────────────────────────────────
class GlideWingsOverlay extends PlayerOverlay {
    drawBehind(ctx, x, y, h, { anim }) {
        const t       = this._t;
        const anchorY = y - h * 0.18;

        // Spread più elegante e fluido
        const spread = anim === 'fall' ? 1.0
                     : anim === 'jump' ? 0.18
                     : 0.40 + Math.sin(t * 2.0) * 0.07;

        ctx.save();
        ctx.shadowColor = '#22dd77';
        ctx.shadowBlur  = 10;

        [-1, 1].forEach(side => {

            // Geometria migliorata
            const baseX   = x + side * 7;
            const baseY   = anchorY - 2;
            const midX    = x + side * (10 + spread * 18);
            const midY    = anchorY + spread * 4;
            const tipX    = x + side * (22 + spread * 32);
            const tipY    = anchorY + spread * 20;

            const alpha = (0.50 + spread * 0.32).toFixed(2);

            ctx.fillStyle   = `rgba(24,185,90,${alpha})`;
            ctx.strokeStyle = '#44ffaa';
            ctx.lineWidth   = 1.4;

            // Forma dell’ala: più organica, 3 curve
            ctx.beginPath();
            ctx.moveTo(baseX, baseY);

            // Curva superiore
            ctx.quadraticCurveTo(
                midX, anchorY - 6 + spread * 2,
                tipX, anchorY + spread * 6
            );

            // Curva esterna (bordo)
            ctx.quadraticCurveTo(
                tipX - side * 6,
                tipY,
                midX,
                anchorY + 18
            );

            // Curva inferiore verso la base
            ctx.quadraticCurveTo(
                x + side * 5,
                anchorY + 14,
                baseX,
                anchorY + 4
            );

            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Vene — più naturali e distribuite
            ctx.strokeStyle = 'rgba(100,255,160,0.35)';
            ctx.lineWidth   = 0.9;

            ctx.beginPath();
            ctx.moveTo(baseX, anchorY + 3);
            ctx.quadraticCurveTo(
                midX * 0.85 + x * 0.15,
                anchorY + spread * 10,
                tipX * 0.75 + x * 0.25,
                anchorY + spread * 18
            );
            ctx.stroke();
        });

        ctx.shadowBlur = 0;
        ctx.restore();
    }
}


// ── Armor Plating (Knockback Resist) ─────────────────────────────────────────
// Metallic hex shoulder plates visible on the sides of the body
class ArmorPlatingOverlay extends PlayerOverlay {
    drawBehind(ctx, x, y, h) {
        const t  = this._t;
        const bY = y - h * 0.05;
        ctx.save();
        ctx.shadowColor = '#aabbcc'; ctx.shadowBlur = 6;
        [-1, 1].forEach(side => {
            const px = x + side * 14;
            const g  = ctx.createLinearGradient(px, bY - 9, px, bY + 5);
            g.addColorStop(0, '#7799aa'); g.addColorStop(0.5, '#99bbcc'); g.addColorStop(1, '#334455');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.moveTo(px - 6, bY - 8); ctx.lineTo(px + 6, bY - 8);
            ctx.lineTo(px + 8, bY - 2); ctx.lineTo(px + 5, bY + 5);
            ctx.lineTo(px - 5, bY + 5); ctx.lineTo(px - 8, bY - 2);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#ccdde8'; ctx.lineWidth = 0.9; ctx.globalAlpha = 0.6; ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#667788'; ctx.shadowBlur = 2;
            [[-3, -4], [3, -4], [0, 2]].forEach(([rx, ry]) => {
                ctx.beginPath(); ctx.arc(px + rx, bY + ry, 1.3, 0, Math.PI * 2); ctx.fill();
            });
        });
        const pa = (0.12 + Math.sin(t * 1.8) * 0.06).toFixed(3);
        ctx.fillStyle = `rgba(180,200,220,${pa})`; ctx.shadowBlur = 8; ctx.shadowColor = '#aabbcc';
        ctx.beginPath(); ctx.arc(x, bY, 20, 0, Math.PI * 2); ctx.fill();
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

// ── Stomp Boots ────────────────────────────────────────────────────────────────
// Red energy halo around each boot + orange crackle sparks
class StompBootsOverlay extends PlayerOverlay {
    draw(ctx, x, y, h) {
        const t     = this._t;
        const bootY = y + h * 0.44;
        ctx.save();
        ctx.shadowColor = '#ff5500'; ctx.shadowBlur = 10;
        [-8, 8].forEach(bx => {
            const px    = x + bx;
            const alpha = (0.45 + Math.sin(t * 7 + bx) * 0.22).toFixed(2);
            ctx.strokeStyle = `rgba(255,80,0,${alpha})`; ctx.lineWidth = 2.0;
            ctx.beginPath(); ctx.ellipse(px, bootY, 8.5, 5, 0, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = 'rgba(255,60,0,0.12)';
            ctx.beginPath(); ctx.ellipse(px, bootY, 8.5, 5, 0, 0, Math.PI * 2); ctx.fill();
        });
        for (let i = 0; i < 6; i++) {
            const bx    = i < 3 ? -8 : 8;
            const sa    = t * 4.5 + i * 2.094;
            const sr    = 10 + Math.sin(t * 5 + i) * 3;
            const alpha = (0.38 + Math.sin(t * 8 + i * 0.8) * 0.28).toFixed(2);
            ctx.fillStyle = `rgba(255,140,0,${alpha})`; ctx.shadowBlur = 4;
            ctx.beginPath();
            ctx.arc(x + bx + Math.cos(sa) * sr * 0.75, bootY + Math.sin(sa) * sr * 0.45, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

// ── Shockwave ─────────────────────────────────────────────────────────────────
// Yellow-white elliptical pulse rings + crackle spokes radiating from body
class ShockwaveOverlay extends PlayerOverlay {
    draw(ctx, x, y, h) {
        const t = this._t;
        ctx.save();
        ctx.translate(x, y + h * 0.10);
        for (let p = 0; p < 2; p++) {
            const phase  = (t * 2.2 + p * 0.5) % 1;
            const r      = 14 + phase * 26;
            const alpha  = ((1 - phase) * 0.62).toFixed(2);
            ctx.strokeStyle = `rgba(255,220,0,${alpha})`;
            ctx.lineWidth   = 1.5 - phase * 0.8;
            ctx.shadowColor = '#ffdd00'; ctx.shadowBlur = 6;
            ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.35, 0, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.shadowBlur = 3;
        for (let i = 0; i < 6; i++) {
            const a   = (i / 6) * Math.PI * 2 + t * 1.5;
            const r1  = 14, r2 = 18 + Math.sin(t * 10 + i) * 4;
            const alpha = (0.35 + Math.sin(t * 8 + i) * 0.20).toFixed(2);
            ctx.strokeStyle = `rgba(255,240,0,${alpha})`; ctx.lineWidth = 0.9;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1 * 0.6);
            ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2 * 0.6);
            ctx.stroke();
        }
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

// ── Spike Head ────────────────────────────────────────────────────────────────
class SpikeHeadOverlay extends PlayerOverlay {
    #flashTimers = new Array(5).fill(0);

    update(dt) {
        super.update(dt);
        // Decadimento flash
       // this.#flashTimers = this.#flashTimers.map(f => Math.max(0, f - dt * 5));
    }

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



// ── Ghost Repel ──────────────────────────────────────────────────────────────
// Circular cooldown ring drawn around the player. Ready = pulsing magenta orb.
class GhostRepelOverlay extends PlayerOverlay {
    draw(ctx, x, y, h, { ghostRepelCooldown, ghostRepelMaxCd }) {
        if (!ghostRepelMaxCd) return;
        const t     = this._t;
        const cd    = ghostRepelCooldown ?? 0;
        const max   = ghostRepelMaxCd;
        const pct   = cd <= 0 ? 1 : 1 - (cd / max);
        const ready = cd <= 0;
        const pulse = 0.5 + Math.sin(t * 5) * 0.5;
        const r     = 28;

        ctx.save();
        ctx.translate(x, y);

        // ── Inner spectral aura (always present) ──
        const rg = ctx.createRadialGradient(0, 0, 4, 0, 0, r);
        if (ready) {
            rg.addColorStop(0, `rgba(160,255,230,${(0.10 + pulse * 0.07).toFixed(3)})`);
            rg.addColorStop(0.5, `rgba(60,160,200,${(0.04 + pulse * 0.04).toFixed(3)})`);
            rg.addColorStop(1, 'rgba(20,0,60,0)');
        } else {
            rg.addColorStop(0, `rgba(90,0,140,${(0.05 + pct * 0.07).toFixed(3)})`);
            rg.addColorStop(1, 'rgba(20,0,60,0)');
        }
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();

        if (ready) {
            // ── 6 rotating spectral arc segments (teal) ──
            ctx.lineWidth = 2.5;
            ctx.shadowColor = '#50ffd0';
            ctx.shadowBlur  = 12 + pulse * 10;
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2 + t * 1.8;
                const alpha = (0.5 + Math.sin(t * 4 + i) * 0.25).toFixed(3);
                ctx.strokeStyle = `rgba(80,255,210,${alpha})`;
                ctx.beginPath();
                ctx.arc(0, 0, r, a, a + Math.PI / 5);
                ctx.stroke();
            }

            // ── 4 counter-rotating outer segments (purple) ──
            ctx.lineWidth = 1.5;
            ctx.shadowBlur = 6;
            for (let i = 0; i < 4; i++) {
                const a = (i / 4) * Math.PI * 2 - t * 2.2;
                const alpha = (0.4 + Math.sin(t * 5 + i) * 0.25).toFixed(3);
                ctx.strokeStyle = `rgba(190,80,255,${alpha})`;
                ctx.beginPath();
                ctx.arc(0, 0, r + 5, a, a + Math.PI / 5);
                ctx.stroke();
            }

            // ── 4 rune diamonds slowly orbiting ──
            ctx.shadowColor = '#a050ff';
            ctx.shadowBlur = 9;
            for (let i = 0; i < 4; i++) {
                const a  = (i / 4) * Math.PI * 2 + t * 0.7;
                const dx = Math.cos(a) * (r + 9);
                const dy = Math.sin(a) * (r + 9);
                const s  = 3.5 + Math.sin(t * 3 + i) * 0.8;
                const alpha = (0.65 + Math.sin(t * 2.5 + i) * 0.25).toFixed(3);
                ctx.fillStyle = `rgba(200,110,255,${alpha})`;
                ctx.beginPath();
                ctx.moveTo(dx, dy - s);
                ctx.lineTo(dx + s, dy);
                ctx.lineTo(dx, dy + s);
                ctx.lineTo(dx - s, dy);
                ctx.closePath();
                ctx.fill();
            }

            // ── 8 outer sparkle wisp-dots ──
            ctx.shadowColor = '#88ffee';
            ctx.shadowBlur = 5;
            for (let i = 0; i < 8; i++) {
                const a  = (i / 8) * Math.PI * 2 - t * 1.9;
                const sr = r + 3 + Math.sin(t * 6 + i) * 2;
                const alpha = (0.3 + Math.sin(t * 5 + i * 0.8) * 0.28).toFixed(3);
                ctx.fillStyle = `rgba(200,255,240,${alpha})`;
                ctx.beginPath();
                ctx.arc(Math.cos(a) * sr, Math.sin(a) * sr, 1.8, 0, Math.PI * 2);
                ctx.fill();
            }

            // ── 👻 icon bobbing above head ──
            const bob = Math.sin(t * 3.5) * 3;
            ctx.shadowColor = '#80ffee';
            ctx.shadowBlur = 16 + pulse * 8;
            ctx.font = '14px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = `rgba(255,255,255,${(0.75 + pulse * 0.25).toFixed(3)})`;
            ctx.fillText('\uD83D\uDC7B', 0, -r - 13 + bob);

        } else {
            // ── CHARGING: 16-dot ring track ──
            ctx.shadowColor = '#9944ff';
            for (let i = 0; i < 16; i++) {
                const a      = (i / 16) * Math.PI * 2 - Math.PI / 2;
                const active = i < Math.round(pct * 16);
                ctx.shadowBlur  = active ? 4 : 0;
                ctx.fillStyle   = active ? 'rgba(160,70,255,0.80)' : 'rgba(70,0,100,0.35)';
                ctx.beginPath();
                ctx.arc(Math.cos(a) * r, Math.sin(a) * r, active ? 2.2 : 1.5, 0, Math.PI * 2);
                ctx.fill();
            }

            // ── Progress fill arc with glow ──
            ctx.strokeStyle = 'rgba(150,55,255,0.92)';
            ctx.lineWidth   = 3;
            ctx.lineCap     = 'round';
            ctx.shadowColor = '#9933ff';
            ctx.shadowBlur  = 12;
            ctx.beginPath();
            ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
            ctx.stroke();

            // ── Bright spark at arc tip ──
            if (pct > 0.02) {
                const tipA = -Math.PI / 2 + Math.PI * 2 * pct;
                ctx.shadowColor = '#dd99ff';
                ctx.shadowBlur  = 16;
                ctx.fillStyle   = '#ffffff';
                ctx.beginPath();
                ctx.arc(Math.cos(tipA) * r, Math.sin(tipA) * r, 3, 0, Math.PI * 2);
                ctx.fill();
            }

            // ── 3 floating ghost wisps drifting inside ring ──
            ctx.shadowColor = '#8844cc';
            for (let i = 0; i < 3; i++) {
                const wa = (i / 3) * Math.PI * 2 + t * 0.65 + Math.sin(t * 0.9 + i) * 0.35;
                const wr = r - 9 + Math.sin(t * 1.3 + i * 1.2) * 4;
                const alpha = (0.22 + Math.sin(t * 2 + i) * 0.12).toFixed(3);
                ctx.shadowBlur  = 7;
                ctx.fillStyle   = `rgba(175,110,255,${alpha})`;
                ctx.beginPath();
                ctx.arc(Math.cos(wa) * wr, Math.sin(wa) * wr, 3, 0, Math.PI * 2);
                ctx.fill();
            }

            // ── Countdown above head ──
            ctx.shadowColor = '#aa44ff';
            ctx.shadowBlur  = 9;
            ctx.font        = 'bold 11px monospace';
            ctx.textAlign   = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle   = 'rgba(200,140,255,0.95)';
            ctx.fillText(`${Math.ceil(cd)}s`, 0, -r - 11);
        }

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

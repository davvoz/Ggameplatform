/**
 * ParticleSystem — lightweight world-space particles (meters). Cosmetic only,
 * runs outside the deterministic physics step.
 *
 * Types: 'flame' (boost, two-layer glow) · 'dust' (wheels/landing) ·
 *        'spark' (tricks/pickups, tintable) · 'smoke' (brake skid) ·
 *        'confetti' (finish celebration, fluttering rects).
 */
export class ParticleSystem {
  constructor(max = 420) {
    this.max = max;
    this.list = [];
  }

  _add(p) {
    if (this.list.length >= this.max) this.list.shift();
    this.list.push(p);
  }

  /** Boost flames behind the car. dir = backward unit vector (dx,dy). */
  flame(x, y, dx, dy) {
    for (let i = 0; i < 2; i++) {
      this._add({
        type: 'flame', x, y,
        vx: dx * (7 + Math.random() * 5) + (Math.random() - 0.5) * 2,
        vy: dy * (7 + Math.random() * 5) + (Math.random() - 0.5) * 2 + 1.5,
        life: 0.32, maxLife: 0.32, size: 0.18 + Math.random() * 0.14,
      });
    }
  }

  /** Dust kicked up by a grounded wheel moving at speed. */
  dust(x, y, vx) {
    this._add({
      type: 'dust', x, y,
      vx: -vx * 0.15 + (Math.random() - 0.5) * 1.5,
      vy: 1 + Math.random() * 1.8,
      life: 0.55, maxLife: 0.55, size: 0.12 + Math.random() * 0.12,
    });
  }

  /** Gray smoke puffs for a brake skid. */
  smoke(x, y, vx) {
    this._add({
      type: 'smoke', x, y,
      vx: -vx * 0.1 + (Math.random() - 0.5) * 1.2,
      vy: 0.8 + Math.random() * 1.4,
      life: 0.7, maxLife: 0.7, size: 0.16 + Math.random() * 0.18,
    });
  }

  /** Burst of dust on landing / crash. intensity 0..1 */
  impact(x, y, intensity) {
    const n = Math.floor(6 + intensity * 16);
    for (let i = 0; i < n; i++) {
      const ang = Math.PI * (0.15 + Math.random() * 0.7); // upward-ish fan
      const spd = 2 + Math.random() * (4 + intensity * 6);
      this._add({
        type: 'dust', x, y,
        vx: Math.cos(ang) * spd * (Math.random() < 0.5 ? -1 : 1),
        vy: Math.sin(ang) * spd,
        life: 0.6, maxLife: 0.6, size: 0.14 + Math.random() * 0.16,
      });
    }
  }

  /** Bright sparks for a successful trick / pickup. Optional tint color. */
  spark(x, y, color = '#fff3b0') {
    for (let i = 0; i < 10; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 3 + Math.random() * 5;
      this._add({
        type: 'spark', x, y, color,
        vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd + 2,
        life: 0.45, maxLife: 0.45, size: 0.08 + Math.random() * 0.08,
      });
    }
  }

  /** Confetti celebration (finish line). Fluttering colored rectangles. */
  confetti(x, y, n = 70) {
    const colors = ['#ff5b3d', '#ffd24a', '#7CFC68', '#2db8e8', '#ff7ad9', '#fff'];
    for (let i = 0; i < n; i++) {
      const ang = Math.PI * (0.18 + Math.random() * 0.64); // upward fan
      const spd = 6 + Math.random() * 11;
      this._add({
        type: 'confetti', x, y,
        color: colors[(Math.random() * colors.length) | 0],
        vx: Math.cos(ang) * spd * (Math.random() < 0.5 ? -1 : 1),
        vy: Math.sin(ang) * spd,
        rot: Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 12,
        phase: Math.random() * Math.PI * 2,
        life: 1.6 + Math.random() * 0.9, maxLife: 2.5,
        size: 0.12 + Math.random() * 0.1,
      });
    }
  }

  update(dt) {
    const g = 16;
    for (const p of this.list) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.type === 'flame') { p.vy += 6 * dt; p.vx *= 0.92; }        // flames rise & slow
      else if (p.type === 'smoke') { p.vy += 2.5 * dt; p.vx *= 0.94; } // smoke drifts up
      else if (p.type === 'confetti') {                                // flutter & fall slowly
        p.vy -= g * 0.28 * dt;
        p.vx *= 0.985;
        p.x += Math.sin(p.life * 7 + p.phase) * 0.8 * dt;
        p.rot += p.rotV * dt;
      } else { p.vy -= g * dt; }                                       // dust/sparks fall
    }
    this.list = this.list.filter((p) => p.life > 0);
  }

  draw(ctx, w2s, pps) {
    for (const p of this.list) {
      const t = Math.max(0, p.life / p.maxLife);
      const s = w2s(p.x, p.y);
      const r = Math.max(1, p.size * pps * (p.type === 'flame' ? (0.6 + t) : 1));
      if (p.type === 'flame') {
        // outer glow + hot core
        ctx.globalAlpha = t * 0.35;
        ctx.fillStyle = '#ff9a30';
        ctx.beginPath(); ctx.arc(s.x, s.y, r * 1.9, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = t * 0.9;
        ctx.fillStyle = t > 0.5 ? '#ffd24a' : '#ff7a18';
      } else if (p.type === 'spark') {
        ctx.globalAlpha = t;
        ctx.fillStyle = p.color || '#fff3b0';
      } else if (p.type === 'smoke') {
        ctx.globalAlpha = t * 0.4;
        ctx.fillStyle = '#cfd2d8';
      } else if (p.type === 'confetti') {
        ctx.globalAlpha = Math.min(1, t * 2.2);
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-r, -r * 0.45, r * 2, r * 0.9);
        ctx.restore();
        continue;
      } else {
        ctx.globalAlpha = t * 0.6;
        ctx.fillStyle = '#caa46a';
      }
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

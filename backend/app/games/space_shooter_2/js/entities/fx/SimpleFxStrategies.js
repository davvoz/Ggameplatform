// ═══════════════════════════════════════════════
//  Simple (space) FX strategies
//  asteroids · spores · embers · ice · shimmer
//  sparks · mines · scanlines · vortex · lightning · fire · blackhole
// ═══════════════════════════════════════════════

import { BaseFxStrategy } from './BaseFxStrategy.js';

// ── Asteroids ──────────────────────────────────
export class AsteroidsFx extends BaseFxStrategy {
    _init(initial) {
        const W = this.canvasWidth, H = this.canvasHeight;
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : -30;
        this.size = 4 + Math.random() * 12;
        this.speed = 20 + Math.random() * 30;
        this.rot = Math.random() * Math.PI * 2;
        this.rotSpd = (Math.random() - 0.5) * 2;
        this.alpha = 0.15 + Math.random() * 0.15;
        this.vx = (Math.random() - 0.5) * 10;
    }

    _update(dt) {
        this.y += this.speed * dt;
        this.x += this.vx * dt;
        this.rot += this.rotSpd * dt;
        if (this.y > this.canvasHeight + 30) this.reset();
    }

    _render(ctx) {
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);
        ctx.fillStyle = '#665544';
        ctx.beginPath();
        const s = this.size;
        ctx.moveTo(0, -s); ctx.lineTo(s * 0.7, -s * 0.3);
        ctx.lineTo(s, s * 0.4); ctx.lineTo(s * 0.3, s);
        ctx.lineTo(-s * 0.5, s * 0.8); ctx.lineTo(-s, s * 0.1);
        ctx.lineTo(-s * 0.7, -s * 0.6);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#887766'; ctx.lineWidth = 1; ctx.stroke();
    }
}

// ── Spores ─────────────────────────────────────
export class SporesFx extends BaseFxStrategy {
    _init(initial) {
        const W = this.canvasWidth, H = this.canvasHeight;
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : -10;
        this.size = 2 + Math.random() * 4;
        this.speed = 10 + Math.random() * 20;
        this.phase = Math.random() * Math.PI * 2;
        this.alpha = 0.1 + Math.random() * 0.15;
    }

    _update(dt) {
        this.y += this.speed * dt;
        this.phase += dt * 2;
        this.x += Math.sin(this.phase) * 15 * dt;
        if (this.y > this.canvasHeight + 10) this.reset();
    }

    _render(ctx) {
        ctx.fillStyle = '#44dd44';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = this.alpha * 0.3;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 2.5, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ── Embers ─────────────────────────────────────
export class EmbersFx extends BaseFxStrategy {
    _init(initial) {
        const W = this.canvasWidth, H = this.canvasHeight;
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : H + 10;
        this.size = 1 + Math.random() * 3;
        this.speed = 30 + Math.random() * 40;
        this.alpha = 0.2 + Math.random() * 0.3;
        this.drift = (Math.random() - 0.5) * 30;
        this.life = 2 + Math.random() * 3;
        this.maxLife = this.life;
    }

    _update(dt) {
        this.y -= this.speed * dt;
        this.x += this.drift * dt;
        this.life -= dt;
        this.alpha = 0.3 * (this.life / this.maxLife);
        if (this.life <= 0 || this.y < -10) this.reset();
    }

    _render(ctx) {
        const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 2);
        g.addColorStop(0, '#ffaa33');
        g.addColorStop(0.5, '#ff4400');
        g.addColorStop(1, 'rgba(255,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(this.x - this.size * 2, this.y - this.size * 2, this.size * 4, this.size * 4);
    }
}

// ── Ice ────────────────────────────────────────
export class IceFx extends BaseFxStrategy {
    _init(initial) {
        const W = this.canvasWidth, H = this.canvasHeight;
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : -10;
        this.size = 2 + Math.random() * 5;
        this.speed = 15 + Math.random() * 20;
        this.rot = Math.random() * Math.PI * 2;
        this.rotSpd = (Math.random() - 0.5) * 3;
        this.alpha = 0.08 + Math.random() * 0.12;
    }

    _update(dt) {
        this.y += this.speed * dt;
        this.rot += this.rotSpd * dt;
        if (this.y > this.canvasHeight + 10) this.reset();
    }

    _render(ctx) {
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);
        ctx.strokeStyle = '#aaddff';
        ctx.lineWidth = 1;
        const hs = this.size;
        for (let i = 0; i < 6; i++) {
            const a = (Math.PI * 2 / 6) * i;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(a) * hs, Math.sin(a) * hs);
            ctx.stroke();
        }
    }
}

// ── Shimmer ────────────────────────────────────
export class ShimmerFx extends BaseFxStrategy {
    _init(_initial) {
        const W = this.canvasWidth, H = this.canvasHeight;
        this.x = Math.random() * W;
        this.y = Math.random() * H;
        this.size = 1 + Math.random() * 2;
        this.speed = 0;
        this.phase = Math.random() * Math.PI * 2;
        this.phaseSpd = 1 + Math.random() * 3;
        this.alpha = 0;
    }

    _update(dt) {
        this.phase += this.phaseSpd * dt;
        this.alpha = Math.max(0, Math.sin(this.phase) * 0.15);
    }

    _render(ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ── Sparks ─────────────────────────────────────
export class SparksFx extends BaseFxStrategy {
    _init(initial) {
        const W = this.canvasWidth, H = this.canvasHeight;
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : -5;
        this.size = 1 + Math.random() * 2;
        this.speed = 40 + Math.random() * 60;
        this.alpha = 0.2 + Math.random() * 0.3;
        this.vx = (Math.random() - 0.5) * 40;
    }

    _update(dt) {
        this.y += this.speed * dt;
        this.x += this.vx * dt;
        this.alpha *= 0.995;
        if (this.y > this.canvasHeight + 5 || this.alpha < 0.01) this.reset();
    }

    _render(ctx) {
        ctx.fillStyle = '#ffdd88';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ── Mines ──────────────────────────────────────
export class MinesFx extends BaseFxStrategy {
    _init(initial) {
        const W = this.canvasWidth, H = this.canvasHeight;
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : -20;
        this.size = 5 + Math.random() * 8;
        this.speed = 12 + Math.random() * 18;
        this.phase = Math.random() * Math.PI * 2;
        this.alpha = 0.12 + Math.random() * 0.1;
    }

    _update(dt) {
        this.y += this.speed * dt;
        this.phase += dt * 2;
        if (this.y > this.canvasHeight + 20) this.reset();
    }

    _render(ctx) {
        const pulse = 0.6 + 0.4 * Math.sin(this.phase);
        ctx.strokeStyle = '#aa8833';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = this.alpha * pulse;
        ctx.fillStyle = '#ff4400';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ── Scanlines ──────────────────────────────────
export class ScanlinesFx extends BaseFxStrategy {
    _init(initial) {
        const H = this.canvasHeight;
        this.x = 0;
        this.y = initial ? Math.random() * H : -2;
        this.size = 1 + Math.random();
        this.speed = 50 + Math.random() * 30;
        this.alpha = 0.03 + Math.random() * 0.04;
    }

    _update(dt) {
        this.y += this.speed * dt;
        if (this.y > this.canvasHeight) this.reset();
    }

    _render(ctx, W) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, this.y, W, this.size);
    }
}

// ── Vortex ─────────────────────────────────────
export class VortexFx extends BaseFxStrategy {
    _init(_initial) {
        this.angle = Math.random() * Math.PI * 2;
        this.radius = 50 + Math.random() * 200;
        this.speed = 0.3 + Math.random() * 0.5;
        this.size = 1 + Math.random() * 2;
        this.alpha = 0.06 + Math.random() * 0.08;
    }

    _update(dt, W, H) {
        this.angle += this.speed * dt;
        this.radius -= dt * 3;
        if (this.radius < 5) {
            this.radius = 50 + Math.random() * 200;
            this.angle = Math.random() * Math.PI * 2;
        }
        this.x = W / 2 + Math.cos(this.angle) * this.radius;
        this.y = H / 2 + Math.sin(this.angle) * this.radius;
    }

    _render(ctx) {
        ctx.fillStyle = '#8866cc';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ── Lightning ──────────────────────────────────
export class LightningFx extends BaseFxStrategy {
    _init(_initial) {
        this.x = Math.random() * this.canvasWidth;
        this.y = Math.random() * this.canvasHeight;
        this.life = 0;
        this.maxLife = 0.1 + Math.random() * 0.15;
        this.cooldown = 3 + Math.random() * 5;
        this.alpha = 0;
        this.branches = [];
    }

    _update(dt, W, H) {
        this.cooldown -= dt;
        if (this.cooldown <= 0 && this.life <= 0) {
            this.life = this.maxLife;
            this.x = Math.random() * W;
            this.y = Math.random() * H * 0.4;
            this.alpha = 0.3;
            this.branches = this._genBranches();
        }
        if (this.life > 0) {
            this.life -= dt;
            this.alpha = 0.3 * (this.life / this.maxLife);
            if (this.life <= 0) {
                this.cooldown = 3 + Math.random() * 5;
                this.alpha = 0;
            }
        }
    }

    _render(ctx) {
        if (!this.branches || this.branches.length === 0) return;
        ctx.strokeStyle = '#aaccff';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = '#88aaff';
        ctx.shadowBlur = 6;
        for (const branch of this.branches) {
            ctx.beginPath();
            ctx.moveTo(branch[0].x, branch[0].y);
            for (let i = 1; i < branch.length; i++) {
                ctx.lineTo(branch[i].x, branch[i].y);
            }
            ctx.stroke();
        }
        ctx.shadowBlur = 0;
    }

    _genBranches() {
        const branches = [];
        const main = [{ x: this.x, y: this.y }];
        let cx = this.x, cy = this.y;
        const segs = 5 + Math.floor(Math.random() * 6);
        for (let i = 0; i < segs; i++) {
            cx += (Math.random() - 0.5) * 30;
            cy += 10 + Math.random() * 20;
            main.push({ x: cx, y: cy });
        }
        branches.push(main);
        if (main.length > 3) {
            const si = 1 + Math.floor(Math.random() * (main.length - 2));
            const sub = [{ x: main[si].x, y: main[si].y }];
            let sx = main[si].x, sy = main[si].y;
            for (let i = 0; i < 3; i++) {
                sx += (Math.random() - 0.5) * 25;
                sy += 8 + Math.random() * 15;
                sub.push({ x: sx, y: sy });
            }
            branches.push(sub);
        }
        return branches;
    }
}

// ── Fire ───────────────────────────────────────
export class FireFx extends BaseFxStrategy {
    _init(initial) {
        const W = this.canvasWidth, H = this.canvasHeight;
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : H + 10;
        this.size = 3 + Math.random() * 6;
        this.speed = 40 + Math.random() * 50;
        this.alpha = 0.12 + Math.random() * 0.15;
        this.drift = (Math.random() - 0.5) * 20;
    }

    _update(dt) {
        this.y -= this.speed * dt;
        this.x += this.drift * dt;
        this.size *= 0.998;
        this.alpha *= 0.997;
        if (this.y < -10 || this.alpha < 0.01) this.reset();
    }

    _render(ctx) {
        const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 2);
        g.addColorStop(0, '#ffcc00');
        g.addColorStop(0.3, '#ff6600');
        g.addColorStop(1, 'rgba(200,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(this.x - this.size * 2, this.y - this.size * 2, this.size * 4, this.size * 4);
    }
}

// ── Blackhole ──────────────────────────────────
export class BlackholeFx extends BaseFxStrategy {
    _init(_initial) {
        this.angle = Math.random() * Math.PI * 2;
        this.radius = 30 + Math.random() * 250;
        this.speed = 0.4 + Math.random() * 0.8;
        this.size = 0.5 + Math.random() * 1.5;
        this.alpha = 0.04 + Math.random() * 0.06;
        this.spiralRate = 0.2 + Math.random() * 0.3;
    }

    _update(dt, W, H) {
        this.angle += this.speed * dt;
        this.radius -= this.spiralRate * dt * 10;
        if (this.radius < 5) {
            this.radius = 30 + Math.random() * 250;
            this.angle = Math.random() * Math.PI * 2;
        }
        this.x = W / 2 + Math.cos(this.angle) * this.radius;
        this.y = H / 2 + Math.sin(this.angle) * this.radius;
    }

    _render(ctx) {
        ctx.fillStyle = '#6644aa';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ── Default (fallback) ─────────────────────────
export class DefaultFx extends BaseFxStrategy {
    _init(_initial) {
        this.x = Math.random() * this.canvasWidth;
        this.y = Math.random() * this.canvasHeight;
        this.size = 1;
        this.speed = 10;
        this.alpha = 0.05;
    }

    _update() { /* static */ }

    _render(ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

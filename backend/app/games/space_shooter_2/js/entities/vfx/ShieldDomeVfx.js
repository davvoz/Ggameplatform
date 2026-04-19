import { C_GOLD } from '../LevelsThemes.js';

class ShieldDomeVfx {

    static shouldRender(player) {
        return player._invincibilityUlt && player.ultimateActive && player.ultimateId === 'shield_dome';
    }

    static render(ctx, { player, cx, cy }) {
        ctx.save();
        const now = Date.now();
        const pulse = 0.6 + 0.3 * Math.sin(now * 0.008);
        const auraPulse = 0.8 + 0.2 * Math.sin(now * 0.006);
        const auraR = 50 + 8 * auraPulse;

        ShieldDomeVfx._renderAura(ctx, cx, cy, auraR, pulse);
        ShieldDomeVfx._renderBorder(ctx, cx, cy, auraR, pulse, now);
        ShieldDomeVfx._renderRotatingArcs(ctx, cx, cy, auraR, pulse, now);
        ShieldDomeVfx._renderParticles(ctx, cx, cy, pulse, now);
        ShieldDomeVfx._renderExpiryWarning(ctx, player, cx, cy, auraR, now);

        ctx.restore();
    }

    static _renderAura(ctx, cx, cy, auraR, pulse) {
        const goldGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, auraR);
        goldGrad.addColorStop(0, 'rgba(255,215,0,0.25)');
        goldGrad.addColorStop(0.5, 'rgba(255,180,0,0.10)');
        goldGrad.addColorStop(1, 'rgba(255,150,0,0)');
        ctx.globalAlpha = pulse;
        ctx.fillStyle = goldGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, auraR, 0, Math.PI * 2);
        ctx.fill();
    }

    static _renderBorder(ctx, cx, cy, auraR, pulse) {
        ctx.globalAlpha = pulse * 0.9;
        ctx.strokeStyle = C_GOLD;
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ffaa00';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(cx, cy, auraR, 0, Math.PI * 2);
        ctx.stroke();
    }

    static _renderRotatingArcs(ctx, cx, cy, auraR, pulse, now) {
        ctx.shadowBlur = 10;
        ctx.lineWidth = 2.5;
        for (let i = 0; i < 4; i++) {
            const aStart = (i * Math.PI / 2) + now * 0.004;
            ctx.globalAlpha = pulse * 0.8;
            ctx.strokeStyle = '#ffe066';
            ctx.beginPath();
            ctx.arc(cx, cy, auraR - 4, aStart, aStart + Math.PI * 0.3);
            ctx.stroke();
        }
    }

    static _renderParticles(ctx, cx, cy, pulse, now) {
        ctx.shadowBlur = 0;
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + now * 0.002;
            const dist = 30 + 15 * Math.sin(now * 0.005 + i * 0.8);
            const px = cx + Math.cos(angle) * dist;
            const py = cy + Math.sin(angle) * dist - 5 * Math.sin(now * 0.003 + i);
            ctx.globalAlpha = pulse * 0.7;
            ctx.fillStyle = C_GOLD;
            ctx.beginPath();
            ctx.arc(px, py, 1.5 + Math.sin(now * 0.01 + i) * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    static _renderExpiryWarning(ctx, player, cx, cy, auraR, now) {
        if (player.ultimateTimer > 2) return;

        const blink = 0.5 + 0.5 * Math.sin(now * 0.02);
        ctx.globalAlpha = blink * 0.4;
        ctx.strokeStyle = '#ff4400';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, auraR + 5, 0, Math.PI * 2);
        ctx.stroke();
    }
}

export default ShieldDomeVfx;

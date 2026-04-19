class PowerUpVfx {

    static shouldRender() {
        return true;
    }

    static render(ctx, { player, cx, cy }) {
        PowerUpVfx._renderDrone(ctx, player, cx, cy);
        PowerUpVfx._renderGlitchClone(ctx, player, cx, cy);
        PowerUpVfx._renderDataDrain(ctx, player, cx, cy);
        PowerUpVfx._renderShield(ctx, player, cx, cy);
    }

    // ─── Drone ───────────────────────────────────

    static _renderDrone(ctx, player, cx, cy) {
        if (!player.droneActive) return;

        ctx.save();
        const drCx = cx + Math.cos(player.droneAngle) * 35;
        const drCy = cy + Math.sin(player.droneAngle) * 35;

        const droneGrad = ctx.createRadialGradient(drCx, drCy, 0, drCx, drCy, 8);
        droneGrad.addColorStop(0, '#aaeeff');
        droneGrad.addColorStop(0.5, '#44aadd');
        droneGrad.addColorStop(1, '#115577');
        ctx.fillStyle = droneGrad;
        ctx.beginPath();
        ctx.arc(drCx, drCy, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#66ffff';
        ctx.beginPath();
        ctx.arc(drCx, drCy, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = '#66ddff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const trailAngle = player.droneAngle - 0.4;
        ctx.moveTo(cx + Math.cos(trailAngle) * 35, cy + Math.sin(trailAngle) * 35);
        ctx.lineTo(drCx, drCy);
        ctx.stroke();
        ctx.restore();
    }

    // ─── Glitch Clone ────────────────────────────

    static _renderGlitchClone(ctx, player, cx, cy) {
        if (!player.glitchCloneActive) return;

        ctx.save();
        const now = Date.now();
        for (let i = 0; i < 2; i++) {
            const cloneAngle = player.glitchCloneAngle + i * Math.PI;
            const clX = cx + Math.cos(cloneAngle) * 40;
            const clY = cy + Math.sin(cloneAngle) * 40;
            const flicker = 0.35 + 0.15 * Math.sin(now * 0.008 + i * 3);
            ctx.globalAlpha = flicker;

            const cloneGrad = ctx.createRadialGradient(clX, clY, 0, clX, clY, 14);
            cloneGrad.addColorStop(0, 'rgba(0,220,200,0.6)');
            cloneGrad.addColorStop(1, 'rgba(0,220,200,0)');
            ctx.fillStyle = cloneGrad;
            ctx.beginPath(); ctx.arc(clX, clY, 14, 0, Math.PI * 2); ctx.fill();

            ctx.fillStyle = 'rgba(0,255,220,0.5)';
            ctx.strokeStyle = 'rgba(0,255,220,0.7)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(clX, clY - 10);
            ctx.lineTo(clX + 7, clY + 6);
            ctx.lineTo(clX - 7, clY + 6);
            ctx.closePath();
            ctx.fill(); ctx.stroke();

            ctx.strokeStyle = 'rgba(0,255,220,0.2)';
            ctx.lineWidth = 1;
            for (let s = -8; s <= 8; s += 4) {
                ctx.beginPath();
                ctx.moveTo(clX - 6, clY + s);
                ctx.lineTo(clX + 6, clY + s);
                ctx.stroke();
            }
        }
        ctx.restore();
    }

    // ─── Data Drain ──────────────────────────────

    static _renderDataDrain(ctx, player, cx, cy) {
        if (!player.dataDrainActive) return;

        ctx.save();
        const now = Date.now();
        const pulse = 0.4 + 0.2 * Math.sin(now * 0.006);
        const drainR = 100;

        ctx.globalAlpha = pulse * 0.6;
        ctx.strokeStyle = '#7832f0';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#9955ff';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(cx, cy, drainR, 0, Math.PI * 2);
        ctx.stroke();

        const dg = ctx.createRadialGradient(cx, cy, 10, cx, cy, drainR);
        dg.addColorStop(0, 'rgba(120,50,240,0.08)');
        dg.addColorStop(0.6, 'rgba(120,50,240,0.04)');
        dg.addColorStop(1, 'rgba(120,50,240,0)');
        ctx.globalAlpha = pulse;
        ctx.shadowBlur = 0;
        ctx.fillStyle = dg;
        ctx.beginPath(); ctx.arc(cx, cy, drainR, 0, Math.PI * 2); ctx.fill();

        ctx.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) {
            const a = (i * Math.PI / 2) + now * 0.003;
            ctx.globalAlpha = pulse * 0.5;
            ctx.strokeStyle = '#aa66ff';
            ctx.beginPath();
            ctx.arc(cx, cy, drainR * 0.7, a, a + Math.PI * 0.3);
            ctx.stroke();
        }

        ctx.shadowBlur = 0;
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + now * 0.004;
            const dist = drainR * (0.3 + 0.5 * ((now * 0.001 + i * 0.3) % 1));
            const px = cx + Math.cos(angle) * dist;
            const py = cy + Math.sin(angle) * dist;
            ctx.globalAlpha = pulse * 0.8;
            ctx.fillStyle = '#cc88ff';
            ctx.beginPath();
            ctx.arc(px, py, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    // ─── Shield ──────────────────────────────────

    static _renderShield(ctx, player, cx, cy) {
        if (!player.shieldActive) return;

        ctx.save();
        const now = Date.now();
        const shieldPulse = 0.45 + 0.2 * Math.sin(now * 0.005);
        const shieldColor = '#44aaff';
        const shieldColorInner = 'rgba(68,170,255,';
        const shieldR = 54;

        PowerUpVfx._renderShieldBorder(ctx, cx, cy, shieldR, shieldPulse, shieldColor);
        PowerUpVfx._renderShieldFill(ctx, cx, cy, shieldR, shieldPulse, shieldColorInner);
        PowerUpVfx._renderShieldArcs(ctx, cx, cy, shieldR, shieldPulse, now);
        PowerUpVfx._renderShieldHexGrid(ctx, cx, cy, shieldPulse, now);
        PowerUpVfx._renderShieldExpiry(ctx, player, cx, cy, shieldR, now);

        ctx.restore();
    }

    static _renderShieldBorder(ctx, cx, cy, r, pulse, color) {
        ctx.globalAlpha = pulse;
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.shadowColor = color;
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
    }

    static _renderShieldFill(ctx, cx, cy, r, pulse, colorBase) {
        const innerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        innerGrad.addColorStop(0, colorBase + '0.0)');
        innerGrad.addColorStop(0.6, colorBase + '0.04)');
        innerGrad.addColorStop(1, colorBase + '0.12)');
        ctx.globalAlpha = pulse;
        ctx.fillStyle = innerGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
    }

    static _renderShieldArcs(ctx, cx, cy, r, pulse, now) {
        ctx.shadowBlur = 8;
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            const aStart = (i * Math.PI * 2 / 3) + now * 0.003;
            ctx.globalAlpha = pulse * 0.7;
            ctx.beginPath();
            ctx.arc(cx, cy, r - 3, aStart, aStart + Math.PI * 0.4);
            ctx.stroke();
        }
    }

    static _renderShieldHexGrid(ctx, cx, cy, pulse, now) {
        ctx.shadowBlur = 0;
        ctx.globalAlpha = pulse * 0.4;
        ctx.lineWidth = 1;
        for (let i = 0; i < 6; i++) {
            const a = i * Math.PI / 3 + now * 0.001;
            const hx = cx + Math.cos(a) * 40;
            const hy = cy + Math.sin(a) * 40;
            ctx.beginPath();
            for (let j = 0; j < 6; j++) {
                const ha = j * Math.PI / 3;
                const px = hx + Math.cos(ha) * 7;
                const py = hy + Math.sin(ha) * 7;
                j === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
        }
    }

    static _renderShieldExpiry(ctx, player, cx, cy, r, now) {
        if (player.shieldTime > 2) return;

        const blinkRate = 0.5 + 0.5 * Math.sin(now * 0.02);
        ctx.globalAlpha = blinkRate * 0.3;
        ctx.strokeStyle = '#ff6644';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
        ctx.stroke();
    }
}

export default PowerUpVfx;

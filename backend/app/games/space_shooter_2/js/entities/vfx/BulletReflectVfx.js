class BulletReflectVfx {

    static shouldRender(player) {
        return player._bulletReflectActive && player.ultimateActive && player.ultimateId === 'quantum_shift';
    }

    static render(ctx, { player, cx, cy }) {
        ctx.save();

        const now = Date.now();
        const timer = player.ultimateTimer;
        const isExpiring = timer <= 2;
        const pulse = 0.5 + 0.3 * Math.sin(now * 0.007);
        const baseR = 50;

        const expiryScale = isExpiring ? 0.6 + 0.4 * (timer / 2) : 1;
        const reflectR = baseR * expiryScale + 4 * Math.sin(now * 0.005);
        const expiryAlpha = isExpiring ? 0.4 + 0.6 * (timer / 2) : 1;

        BulletReflectVfx._renderHexField(ctx, cx, cy, reflectR, pulse, expiryAlpha, now);
        BulletReflectVfx._renderHexBorder(ctx, cx, cy, reflectR, pulse, expiryAlpha, now);
        BulletReflectVfx._renderInwardArrows(ctx, cx, cy, reflectR, pulse, expiryAlpha, now);
        BulletReflectVfx._renderScanlines(ctx, cx, cy, reflectR, pulse, expiryAlpha, now);

        if (isExpiring) {
            BulletReflectVfx._renderExpiryWarning(ctx, cx, cy, reflectR, now, timer);
        }

        ctx.restore();
    }

    static _renderHexField(ctx, cx, cy, r, pulse, alpha, now) {
        ctx.globalAlpha = pulse * 0.15 * alpha;
        ctx.fillStyle = '#00ddff';
        BulletReflectVfx._drawHexagon(ctx, cx, cy, r, now * 0.001);
        ctx.fill();
    }

    static _renderHexBorder(ctx, cx, cy, r, pulse, alpha, now) {
        const rotation = now * 0.001;

        ctx.strokeStyle = '#00ddff';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#00ccff';
        ctx.shadowBlur = 10;
        ctx.globalAlpha = pulse * 0.9 * alpha;
        BulletReflectVfx._drawHexagon(ctx, cx, cy, r, rotation);
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#66eeff';
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = pulse * 0.5 * alpha;
        BulletReflectVfx._drawHexagon(ctx, cx, cy, r * 0.7, -rotation * 0.6);
        ctx.stroke();
    }

    static _renderInwardArrows(ctx, cx, cy, r, pulse, alpha, now) {
        ctx.shadowBlur = 0;
        const arrowCount = 6;
        for (let i = 0; i < arrowCount; i++) {
            const angle = (i / arrowCount) * Math.PI * 2 + now * 0.002;
            const outerR = r + 6;
            const tipR = r - 4;
            const ox = cx + Math.cos(angle) * outerR;
            const oy = cy + Math.sin(angle) * outerR;
            const tx = cx + Math.cos(angle) * tipR;
            const ty = cy + Math.sin(angle) * tipR;
            const perpAngle = angle + Math.PI / 2;
            const spread = 4;

            ctx.globalAlpha = pulse * 0.7 * alpha;
            ctx.fillStyle = '#00ffff';
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(ox + Math.cos(perpAngle) * spread, oy + Math.sin(perpAngle) * spread);
            ctx.lineTo(ox - Math.cos(perpAngle) * spread, oy - Math.sin(perpAngle) * spread);
            ctx.closePath();
            ctx.fill();
        }
    }

    static _renderScanlines(ctx, cx, cy, r, pulse, alpha, now) {
        ctx.globalAlpha = pulse * 0.12 * alpha;
        ctx.strokeStyle = '#00ddff';
        ctx.lineWidth = 1;
        const lineCount = 5;
        const spacing = (r * 2) / (lineCount + 1);
        for (let i = 1; i <= lineCount; i++) {
            const ly = cy - r + spacing * i;
            const halfW = Math.sqrt(Math.max(0, r * r - (ly - cy) * (ly - cy)));
            ctx.setLineDash([4, 6]);
            ctx.beginPath();
            ctx.moveTo(cx - halfW, ly);
            ctx.lineTo(cx + halfW, ly);
            ctx.stroke();
        }
        ctx.setLineDash([]);
    }

    static _renderExpiryWarning(ctx, cx, cy, r, now, timer) {
        const blinkSpeed = 0.015 + (1 - timer / 2) * 0.025;
        const blink = 0.5 + 0.5 * Math.sin(now * blinkSpeed);

        ctx.globalAlpha = blink * 0.6;
        ctx.strokeStyle = '#ff4400';
        ctx.lineWidth = 2.5;
        BulletReflectVfx._drawHexagon(ctx, cx, cy, r + 6, now * 0.001);
        ctx.stroke();

        ctx.globalAlpha = blink * 0.08;
        ctx.fillStyle = '#ff2200';
        BulletReflectVfx._drawHexagon(ctx, cx, cy, r, now * 0.001);
        ctx.fill();
    }

    static _drawHexagon(ctx, cx, cy, r, rotation) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + rotation;
            const method = i === 0 ? 'moveTo' : 'lineTo';
            ctx[method](cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
        }
        ctx.closePath();
    }
}

export default BulletReflectVfx;

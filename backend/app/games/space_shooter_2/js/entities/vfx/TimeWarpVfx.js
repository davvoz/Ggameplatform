class TimeWarpVfx {

    static shouldRender(player) {
        return player.ultimateActive && player.ultimateId === 'time_warp';
    }

    static render(ctx, { player, cx, cy }) {
        ctx.save();

        const now = Date.now();
        const t = player._timeWarpTime || 0;
        const duration = 6;
        const progress = Math.min(t / duration, 1);

        TimeWarpVfx._renderField(ctx, cx, cy, now, progress);
        TimeWarpVfx._renderRings(ctx, cx, cy, now, progress);
        TimeWarpVfx._renderClockHands(ctx, cx, cy, now);
        TimeWarpVfx._renderExpiryWarning(ctx, player, cx, cy, now);

        ctx.restore();
    }

    static _renderField(ctx, cx, cy, now, progress) {
        const pulse = 0.5 + 0.3 * Math.sin(now * 0.004);
        const fieldR = 55 + 5 * Math.sin(now * 0.003);
        const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, fieldR);
        grad.addColorStop(0, 'rgba(170,68,255,0.06)');
        grad.addColorStop(0.5, 'rgba(120,40,200,0.10)');
        grad.addColorStop(1, 'rgba(80,20,160,0.15)');
        ctx.globalAlpha = pulse * (1 - progress * 0.3);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, fieldR, 0, Math.PI * 2);
        ctx.fill();
    }

    static _renderRings(ctx, cx, cy, now, progress) {
        ctx.globalCompositeOperation = 'lighter';
        const ringCount = 3;
        for (let i = 0; i < ringCount; i++) {
            const rPhase = ((now * 0.001) + i * 0.4) % 1.2;
            const rAlpha = Math.max(0, 1 - rPhase) * 0.35 * (1 - progress * 0.4);
            const rRadius = 25 + rPhase * 40;
            ctx.globalAlpha = rAlpha;
            ctx.strokeStyle = i % 2 === 0 ? '#cc77ff' : '#8844cc';
            ctx.lineWidth = 2 - i * 0.3;
            ctx.beginPath();
            ctx.arc(cx, cy, rRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
    }

    static _renderClockHands(ctx, cx, cy, now) {
        const handR = 18;
        const slowAngle = now * 0.001;
        const fastAngle = now * 0.008;

        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = '#ddaaff';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#aa44ff';
        ctx.shadowBlur = 8;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(slowAngle) * handR, cy + Math.sin(slowAngle) * handR);
        ctx.stroke();

        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(fastAngle) * handR * 0.7, cy + Math.sin(fastAngle) * handR * 0.7);
        ctx.stroke();

        ctx.shadowBlur = 0;
    }

    static _renderExpiryWarning(ctx, player, cx, cy, now) {
        if (player.ultimateTimer > 1.5) return;

        const blink = 0.5 + 0.5 * Math.sin(now * 0.02);
        ctx.globalAlpha = blink * 0.4;
        ctx.strokeStyle = '#ff4400';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 60, 0, Math.PI * 2);
        ctx.stroke();
    }
}

export default TimeWarpVfx;

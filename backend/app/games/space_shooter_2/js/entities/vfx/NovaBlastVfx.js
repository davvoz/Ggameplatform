class NovaBlastVfx {

    static shouldRender(player) {
        return player.ultimateActive && player.ultimateId === 'nova_blast' && player._novaTime;
    }

    static render(ctx, { player, cx, cy }) {
        ctx.save();

        const t = player._novaTime;
        const duration = 1.2;
        const progress = Math.min(t / duration, 1);

        NovaBlastVfx._renderEnergyRings(ctx, t, duration, cx, cy);
        NovaBlastVfx._renderFlashEffect(ctx, progress, cx, cy);

        ctx.restore();
    }

    static _renderFlashEffect(ctx, progress, cx, cy) {
        if (progress >= 0.3) return;

        const flashAlpha = (1 - progress / 0.3) * 0.8;
        const flashR = 30 + progress * 200;
        const flashGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, flashR);
        flashGrad.addColorStop(0, `rgba(255,255,255,${flashAlpha})`);
        flashGrad.addColorStop(0.4, `rgba(255,200,50,${flashAlpha * 0.5})`);
        flashGrad.addColorStop(1, 'rgba(255,100,0,0)');
        ctx.globalAlpha = 1;
        ctx.fillStyle = flashGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, flashR, 0, Math.PI * 2);
        ctx.fill();
    }

    static _renderEnergyRings(ctx, t, duration, cx, cy) {
        for (let ring = 0; ring < 3; ring++) {
            const ringDelay = ring * 0.15;
            const ringProgress = Math.max(0, Math.min((t - ringDelay) / (duration - ringDelay), 1));
            if (ringProgress <= 0) continue;

            const maxRadius = 400 + ring * 80;
            const radius = ringProgress * maxRadius;
            const alpha = (1 - ringProgress) * (0.7 - ring * 0.15);

            ctx.globalAlpha = alpha;
            const a = ring === 1 ? '#ff8800' : '#ffaa00';
            ctx.strokeStyle = ring === 0 ? '#ff6600' : a;
            ctx.lineWidth = (8 - ring * 2) * (1 - ringProgress * 0.5);
            ctx.shadowColor = '#ff8800';
            ctx.shadowBlur = 20 - ring * 5;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.stroke();

            if (ring === 0 && ringProgress < 0.5) {
                NovaBlastVfx._renderRingFill(ctx, cx, cy, radius, alpha);
            }
        }
    }

    static _renderRingFill(ctx, cx, cy, radius, alpha) {
        const fillGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        fillGrad.addColorStop(0, 'rgba(255,200,50,0.3)');
        fillGrad.addColorStop(0.7, 'rgba(255,100,0,0.1)');
        fillGrad.addColorStop(1, 'rgba(255,60,0,0)');
        ctx.globalAlpha = alpha * 0.5;
        ctx.fillStyle = fillGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

export default NovaBlastVfx;

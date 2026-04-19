import { VFX_LAYERS } from './vfx/index.js';

class PlayerRenderer {

    static render(ctx, player, assets, perkSystem) {
        if (!player.active) return;

        ctx.save();
        ctx.globalAlpha = player.alpha;

        const cx = player.position.x + player.width / 2;
        const cy = player.position.y + player.height / 2;
        const by = player.position.y + player.height;
        const flicker = 0.7 + 0.3 * Math.sin(player.thrusterFlicker);

        //  Ship core 
        const flameCount = 2 + Math.min(2, Math.floor(player.bonusStats.speed / 2));
        const flameSize = 16 + player.bonusStats.speed * 2;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        PlayerRenderer._renderEngineFlames(ctx, { flameCount, cx, by, flameSize, flicker, shipColor: player.shipData.color });
        PlayerRenderer._renderShipSprite(ctx, player, assets);
        PlayerRenderer._renderWeaponLevelIndicators(ctx, player, cx);

        // VFX layers (extensible pipeline) 
        //when you add a new Perk VFX, 
        //just add it to the VFX_LAYERS 
        //array and it will automatically be included in the rendering pipeline
        const vfxCtx = { player, cx, cy, perkSystem, assets };
        for (const layer of VFX_LAYERS) {
            if (layer.shouldRender(player, perkSystem)) {
                layer.render(ctx, vfxCtx);
            }
        }

        // Tunnel Shift warp-in ring
        if (player.tunnelShiftAnimTimer > 0) {
            PlayerRenderer._renderTunnelWarpRing(ctx, cx, cy, player.tunnelShiftAnimTimer);
        }

        //  HUD 
        PlayerRenderer._renderHeatBar(ctx, player, cx);

        ctx.restore();
    }

    static _renderShipSprite(ctx, player, assets) {
        const bankFrames = assets.getSprite(`ship_${player.shipId}_bank`);
        let sprite;
        if (bankFrames) {
            const idx = Math.round(player.bankLevel) + 2;
            sprite = bankFrames[Math.max(0, Math.min(4, idx))];
        } else {
            sprite = assets.getSprite(`ship_${player.shipId}`);
        }
        const spriteSize = player.width + 24;
        const spriteX = player.position.x - 12;
        const spriteY = player.position.y - 12;
        if (sprite) {
            ctx.drawImage(sprite, spriteX, spriteY, spriteSize, spriteSize);
        }
    }

    static _renderEngineFlames(ctx, { flameCount, cx, by, flameSize, flicker, shipColor }) {
        for (let i = 0; i < flameCount; i++) {
            const a = (i === 0 ? -12 : 12);
            const b = (i - (flameCount - 1) / 2) * 16;
            const offsetX = flameCount <= 2 ? a : b;
            const fx = cx + offsetX;
            const fy = by + 2;
            const fh = flameSize * flicker;
            const fw = 6 + i % 2 * 2;

            // Outer flame
            ctx.globalAlpha = 0.4 * flicker;
            const outerGrad = ctx.createLinearGradient(fx, fy, fx, fy + fh);
            outerGrad.addColorStop(0, shipColor);
            outerGrad.addColorStop(0.5, 'rgba(255,200,50,0.6)');
            outerGrad.addColorStop(1, 'rgba(255,100,0,0)');
            ctx.fillStyle = outerGrad;
            ctx.beginPath();
            ctx.moveTo(fx - fw, fy);
            ctx.bezierCurveTo(fx - fw * 0.8, fy + fh * 0.4, fx - 1, fy + fh * 0.7, fx, fy + fh);
            ctx.bezierCurveTo(fx + 1, fy + fh * 0.7, fx + fw * 0.8, fy + fh * 0.4, fx + fw, fy);
            ctx.closePath();
            ctx.fill();

            // Inner white core
            ctx.globalAlpha = 0.6 * flicker;
            const coreGrad = ctx.createLinearGradient(fx, fy, fx, fy + fh * 0.6);
            coreGrad.addColorStop(0, '#fff');
            coreGrad.addColorStop(1, 'rgba(255,255,200,0)');
            ctx.fillStyle = coreGrad;
            ctx.beginPath();
            ctx.moveTo(fx - fw * 0.4, fy);
            ctx.quadraticCurveTo(fx, fy + fh * 0.5, fx + fw * 0.4, fy);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }

    static _renderHeatBar(ctx, player, cx) {
        if (player.heat > 40) {
            const barW = 40;
            const barH = 4;
            const barX = cx - barW / 2;
            const barY = player.position.y - 12;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(barX, barY, barW, barH, 2);
            ctx.fill();
            ctx.stroke();
            const heatPct = player.heat / player.maxHeat;
            const heatGrad = ctx.createLinearGradient(barX, barY, barX + barW * heatPct, barY);
            heatGrad.addColorStop(0, player.overheated ? '#ff2222' : '#ffaa00');
            heatGrad.addColorStop(1, player.overheated ? '#ff4444' : '#ff6600');
            ctx.fillStyle = heatGrad;
            ctx.beginPath();
            ctx.roundRect(barX, barY, barW * heatPct, barH, 2);
            ctx.fill();
        }
    }

    static _renderWeaponLevelIndicators(ctx, player, cx) {
        if (player.weaponLevel > 1) {
            ctx.save();
            ctx.globalAlpha = 0.8;
            const dotCount = player.weaponLevel - 1;
            const dotSpacing = 6;
            const startX = cx - (dotCount - 1) * dotSpacing / 2;
            const dotY = player.position.y - 4;
            for (let i = 0; i < dotCount; i++) {
                ctx.fillStyle = '#ffdd44';
                ctx.shadowColor = '#ffdd44';
                ctx.shadowBlur = 4;
                ctx.beginPath();
                ctx.arc(startX + i * dotSpacing, dotY, 2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    }

    static _renderTunnelWarpRing(ctx, cx, cy, timer) {
        const maxT = 0.45;
        const progress = 1 - timer / maxT;           // 0→1
        const ringRadius = 10 + progress * 50;       // expand outward
        const ringAlpha = (1 - progress) * 0.7;      // fade out

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Outer expanding ring
        ctx.globalAlpha = ringAlpha;
        ctx.strokeStyle = '#00ddff';
        ctx.lineWidth = 3 - progress * 2;
        ctx.shadowColor = '#00ddff';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Inner contracting ring (arrival convergence)
        const innerRadius = Math.max(2, 35 * (1 - progress));
        ctx.globalAlpha = ringAlpha * 0.5;
        ctx.strokeStyle = '#8844ff';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#8844ff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Radial glow burst
        if (progress < 0.3) {
            const burstAlpha = (1 - progress / 0.3) * 0.3;
            ctx.globalAlpha = burstAlpha;
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 45);
            grad.addColorStop(0, '#00ffee');
            grad.addColorStop(0.5, 'rgba(0,180,255,0.3)');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.fillRect(cx - 45, cy - 45, 90, 90);
        }

        ctx.restore();
    }

}

export default PlayerRenderer;

import { C_WHITE } from '../LevelsThemes.js';
import { mono } from '../../FontConfig.js';

const PART_RENDER_ORDER = ['arm', 'shield', 'turret', 'weakpoint', 'core'];
const ENERGY_LINE_COUNT = 8;
const ENERGY_OUTER_RADIUS = 150;
const ENERGY_INNER_RADIUS = 20;

class MultiBossRenderer {
    static render(ctx, boss, assets) {
        if (!boss.active && boss.health > 0) return;
        if (boss.enterPhase === 0) return;

        ctx.save();

        if (boss.entering) {
            MultiBossRenderer.renderEntranceEffects(ctx, boss);
        }

        MultiBossRenderer.renderGenericBody(ctx, boss, assets);
        const barY = MultiBossRenderer.renderHealthBar(ctx, boss);
        MultiBossRenderer.renderAbilityIndicators(ctx, boss, barY);

        ctx.restore();
    }

    static renderEntranceEffects(ctx, boss) {
        MultiBossRenderer._renderEntranceAura(ctx, boss);
        if (boss.enterPhase === 2) {
            MultiBossRenderer._renderEnergyLines(ctx, boss);
        }
    }

    static _renderEntranceAura(ctx, boss) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const pulse = 0.5 + 0.5 * Math.sin(boss.enterTime * 8);
        const auraSize = boss.width * (0.6 + boss.enterPartsSpread * 0.4);
        ctx.globalAlpha = (0.12 + pulse * 0.08) * (boss.enterPhase === 2 ? 1.5 : 1);
        const entryAura = ctx.createRadialGradient(
            boss.centerX, boss.centerY, 10,
            boss.centerX, boss.centerY, auraSize
        );
        entryAura.addColorStop(0, C_WHITE);
        entryAura.addColorStop(0.3, boss.def.color);
        entryAura.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = entryAura;
        ctx.beginPath();
        ctx.arc(boss.centerX, boss.centerY, auraSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    static _renderEnergyLines(ctx, boss) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.3 * (1 - boss.enterPartsSpread);
        ctx.strokeStyle = boss.def.color;
        ctx.lineWidth = 2;
        for (let i = 0; i < ENERGY_LINE_COUNT; i++) {
            const angle = (Math.PI * 2 / ENERGY_LINE_COUNT) * i + boss.enterTime * 2;
            ctx.beginPath();
            ctx.moveTo(
                boss.centerX + Math.cos(angle) * ENERGY_OUTER_RADIUS,
                boss.centerY + Math.sin(angle) * ENERGY_OUTER_RADIUS
            );
            ctx.lineTo(
                boss.centerX + Math.cos(angle) * ENERGY_INNER_RADIUS,
                boss.centerY + Math.sin(angle) * ENERGY_INNER_RADIUS
            );
            ctx.stroke();
        }
        ctx.restore();
    }

    static renderGenericBody(ctx, boss, assets) {
        MultiBossRenderer._renderAura(ctx, boss);
        MultiBossRenderer._renderParts(ctx, boss, assets);
        MultiBossRenderer._renderConnectionLines(ctx, boss);
    }

    static _renderAura(ctx, boss) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.06 + 0.03 * Math.sin(boss.moveTimer * 3);
        const auraGrad = ctx.createRadialGradient(
            boss.centerX, boss.centerY, 20,
            boss.centerX, boss.centerY, boss.width * 0.5
        );
        auraGrad.addColorStop(0, boss.def.color);
        auraGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(boss.centerX, boss.centerY, boss.width * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    static _renderParts(ctx, boss, assets) {
        for (const role of PART_RENDER_ORDER) {
            for (const part of boss.parts) {
                if (part.role === role) part.render(ctx, assets);
            }
        }
    }

    static _renderConnectionLines(ctx, boss) {
        const core0 = boss.coreParts[0];
        if (!core0?.active) return;
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.strokeStyle = boss.def.color;
        ctx.lineWidth = 1;
        for (const part of boss.parts) {
            if (!part.active || part.isCore || part.orbitRadius <= 0) continue;
            ctx.beginPath();
            ctx.moveTo(boss.centerX, boss.centerY);
            ctx.lineTo(part.worldX + part.width / 2, part.worldY + part.height / 2);
            ctx.stroke();
        }
        ctx.restore();
    }

    static renderHealthBar(ctx, boss) {
        const barW = boss.isMiniBoss ? boss.width + 10 : boss.width + 30;
        const barH = boss.isMiniBoss ? 7 : 10;
        const barX = boss.centerX - barW / 2;
        const barY = boss.centerY - boss.height / 2 - (boss.isMiniBoss ? 18 : 24);

        MultiBossRenderer._renderBarBackground(ctx, barX, barY, barW, barH);
        MultiBossRenderer._renderBarFill(ctx, boss, barX, barY, barW, barH);
        MultiBossRenderer._renderBarBorder(ctx, barX, barY, barW, barH);
        MultiBossRenderer._renderBossLabel(ctx, boss, barY);

        return barY;
    }

    static _renderBarBackground(ctx, barX, barY, barW, barH) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, barH, 4);
        ctx.fill();
    }

    static _renderBarFill(ctx, boss, barX, barY, barW, barH) {
        const hpRatio = boss.health / boss.maxHealth;
        if (hpRatio <= 0) return;
        const barColor = MultiBossRenderer._getBarColor(hpRatio);
        const hpGrad = ctx.createLinearGradient(barX, barY, barX + barW * hpRatio, barY);
        hpGrad.addColorStop(0, barColor);
        hpGrad.addColorStop(1, '#ffffff66');
        ctx.fillStyle = hpGrad;
        ctx.beginPath();
        ctx.roundRect(barX + 1, barY + 1, (barW - 2) * hpRatio, barH - 2, 3);
        ctx.fill();
    }

    static _getBarColor(hpRatio) {
        if (hpRatio > 0.5) return '#44ff44';
        if (hpRatio > 0.25) return '#ffaa00';
        return '#ff4444';
    }

    static _renderBarBorder(ctx, barX, barY, barW, barH) {
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, barH, 4);
        ctx.stroke();
    }

    static _getLabelColor(boss) {
        if (boss.enraged) return '#ff4444';
        return boss.isMiniBoss ? 'rgba(255,220,100,0.7)' : 'rgba(255,255,255,0.6)';
    }

    static _renderBossLabel(ctx, boss, barY) {
        const activeParts = boss.parts.filter(p => p.active && !p.isCore).length;
        const totalParts = boss.parts.filter(p => !p.isCore).length;
        const labelPrefix = boss.isMiniBoss ? '★ ' : '';
        ctx.fillStyle = MultiBossRenderer._getLabelColor(boss);
        ctx.font = boss.isMiniBoss ? mono(9) : mono(10);
        ctx.textAlign = 'center';
        ctx.fillText(
            `${labelPrefix}${boss.name.toUpperCase()} [${activeParts}/${totalParts}]`,
            boss.centerX, barY - 4
        );
        if (boss.enraged) {
            ctx.font = mono(9);
            ctx.fillStyle = '#ff2222';
            ctx.fillText('⚠ ENRAGED', boss.centerX, barY - 14);
        }
    }

    static renderAbilityIndicators(ctx, boss, barY) {
        if (boss.ability) boss.ability.render(ctx, boss, barY);
    }
}

export default MultiBossRenderer;

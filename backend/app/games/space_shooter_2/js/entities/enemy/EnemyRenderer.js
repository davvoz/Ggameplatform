import { C_WHITE, C_MEDIUM_BLUE, C_VIVID_PURPLE } from '../../entities/LevelsThemes.js';
import { drawW4Sprite } from './types/QuantumSprites.js';

let _perfMode = 'high';

const SPRITE_PAD = 8;
const HP_BAR_HEIGHT = 4;
const HP_BAR_Y_OFFSET = 8;
const HP_THRESHOLD_HIGH = 0.5;
const HP_THRESHOLD_LOW = 0.25;

const DEFAULT_W4_SPRITE_STATE = {
    flavorIdx: 0,
    fieldRadius: 0,
    annihilateTimer: 0,
    reformTimer: 0,
    isEndpoint: true,
    forceBoosted: false,
};

/**
 * EnemyRenderer — Handles ALL rendering for Enemy instances.
 *
 * Delegates behavior-specific effects to each behavior's render() method,
 * and draws common visuals (glow, sprite, health bar, status effects).
 */
class EnemyRenderer {
    static setPerformanceMode(mode) { _perfMode = mode; }

    static render(ctx, enemy, assets) {
        if (!enemy.active) return;

        ctx.save();
        ctx.globalAlpha = enemy.alpha;

        const cx = enemy.position.x + enemy.width / 2;
        const cy = enemy.position.y + enemy.height / 2;

        EnemyRenderer._renderEmergence(ctx, enemy, cx, cy);
        EnemyRenderer._renderGlow(ctx, enemy, cx, cy);
        EnemyRenderer._renderSprite(ctx, enemy, assets, cx, cy);
        EnemyRenderer._renderHitFlash(ctx, enemy, cx, cy);
        EnemyRenderer._renderHealthBar(ctx, enemy);

        // Behavior-specific visual effects
        for (const behavior of enemy.behaviors) {
            behavior.render(ctx, enemy, cx, cy);
        }

        // W4 movement effects (tunneling, wave-function, ghost)
        if (enemy.config.w4behaviour) {
            EnemyRenderer._renderTunnelingEffect(ctx, enemy, cx, cy);
            EnemyRenderer._renderWaveFunctionEffect(ctx, enemy, cx, cy);
            EnemyRenderer._renderGhostEffect(ctx, enemy, assets, cx, cy);
        }

        EnemyRenderer._renderForceBoostAura(ctx, enemy, cx, cy);
        EnemyRenderer._renderVirusEffects(ctx, enemy);
        EnemyRenderer._renderAfterimages(ctx, enemy, assets);
        EnemyRenderer._renderQuantumEffects(ctx, enemy, cx, cy);

        ctx.restore();
    }

    // ── Emergence ──────────────────────────

    static _renderEmergence(ctx, enemy, cx, cy) {
        if (!enemy._emergence || enemy._emergence.complete) return;
        enemy._emergence.render(ctx, enemy, cx, cy);
    }

    // ── Glow Aura ──────────────────────────

    static _renderGlow(ctx, enemy, cx, cy) {
        if (_perfMode === 'high') {
            EnemyRenderer._renderHighGlow(ctx, enemy, cx, cy);
        } else {
            EnemyRenderer._renderLowGlow(ctx, enemy, cx, cy);
        }
    }

    static _renderHighGlow(ctx, enemy, cx, cy) {
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.shadowColor = enemy.config.color;
        ctx.shadowBlur = 12;
        ctx.fillStyle = enemy.config.color;
        ctx.beginPath();
        ctx.arc(cx, cy, enemy.width * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    static _renderLowGlow(ctx, enemy, cx, cy) {
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = enemy.config.color;
        ctx.beginPath();
        ctx.arc(cx, cy, enemy.width * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = enemy.alpha;
    }

    // ── Sprite ─────────────────────────────

    static _renderSprite(ctx, enemy, assets, cx, cy) {
        const frames = assets.getSprite(`enemy_${enemy.type}_frames`);
        if (frames) {
            const frame = frames[enemy._animIdx % frames.length];
            ctx.drawImage(frame,
                enemy.position.x - SPRITE_PAD, enemy.position.y - SPRITE_PAD,
                enemy.width + SPRITE_PAD * 2, enemy.height + SPRITE_PAD * 2
            );
            return;
        }

        const sprite = assets.getSprite(`enemy_${enemy.type}`);
        if (sprite) {
            ctx.drawImage(sprite,
                enemy.position.x - SPRITE_PAD, enemy.position.y - SPRITE_PAD,
                enemy.width + SPRITE_PAD * 2, enemy.height + SPRITE_PAD * 2
            );
            return;
        }

        if (enemy.config.w4behaviour) {
            EnemyRenderer._renderW4ProceduralSprite(ctx, enemy, cx, cy);
            return;
        }

        // Fallback rectangle
        ctx.fillStyle = enemy.config.color;
        ctx.fillRect(enemy.position.x, enemy.position.y, enemy.width, enemy.height);
    }

    static _renderW4ProceduralSprite(ctx, enemy, cx, cy) {
        const t = Date.now() * 0.001;
        const w4b = enemy.behaviors.find(b => b.isW4);
        const behaviorState = w4b ? w4b.getSpriteState(enemy) : {};
        const state = {
            ...DEFAULT_W4_SPRITE_STATE,
            ...behaviorState,
            forceBoosted: !!enemy._forceBoostedVisual,
        };
        drawW4Sprite(ctx, {
            type: enemy.type, cx, cy,
            w: enemy.width, h: enemy.height, t, state,
        });
    }

    // ── Hit Flash ──────────────────────────

    static _renderHitFlash(ctx, enemy, cx, cy) {
        if (enemy.hitFlash <= 0) return;
        ctx.save();
        ctx.globalAlpha = enemy.hitFlash * 0.6;
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = C_WHITE;
        ctx.beginPath();
        ctx.arc(cx, cy, enemy.width * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // ── Health Bar ─────────────────────────

    static _renderHealthBar(ctx, enemy) {
        if (enemy.maxHealth <= 1 || enemy.health >= enemy.maxHealth) return;

        const barW = enemy.width + 4;
        const barX = enemy.position.x - 2;
        const barY = enemy.position.y - HP_BAR_Y_OFFSET;
        const hpRatio = enemy.health / enemy.maxHealth;

        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, HP_BAR_HEIGHT, 2);
        ctx.fill();

        // Fill
        ctx.fillStyle = EnemyRenderer._hpColor(hpRatio);
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW * hpRatio, HP_BAR_HEIGHT, 2);
        ctx.fill();

        // Border
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, HP_BAR_HEIGHT, 2);
        ctx.stroke();
    }

    static _hpColor(ratio) {
        if (ratio > HP_THRESHOLD_HIGH) return '#44ff44';
        if (ratio > HP_THRESHOLD_LOW) return '#ffaa00';
        return '#ff4444';
    }

    // ── W4 Movement Effects ────────────────

    static _renderTunnelingEffect(ctx, enemy, cx, cy) {
        if (!enemy._justTunneled || enemy._justTunneled <= 0) return;
        ctx.save();
        ctx.globalAlpha = enemy._justTunneled / 10;
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = C_MEDIUM_BLUE;
        ctx.beginPath();
        ctx.arc(cx, cy, enemy.width * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    static _renderWaveFunctionEffect(ctx, enemy, cx, cy) {
        if (!enemy._wfCollapse || enemy._wfCollapse <= 0) return;
        ctx.save();
        ctx.globalAlpha = enemy._wfCollapse / 8;
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = '#aa88ff';
        ctx.beginPath();
        ctx.arc(cx, cy, enemy.width * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    static _renderGhostEffect(ctx, enemy, assets, cx, cy) {
        if (enemy._ghostX === undefined) return;
        ctx.save();
        ctx.globalAlpha = 0.2;

        const sprite = assets.getSprite(`enemy_${enemy.type}`);
        if (sprite) {
            ctx.drawImage(sprite,
                enemy._ghostX - enemy.width / 2 - SPRITE_PAD,
                enemy._ghostY - enemy.height / 2 - SPRITE_PAD,
                enemy.width + SPRITE_PAD * 2, enemy.height + SPRITE_PAD * 2
            );
        } else {
            ctx.fillStyle = enemy.config.color;
            ctx.fillRect(
                enemy._ghostX - enemy.width / 2,
                enemy._ghostY - enemy.height / 2,
                enemy.width, enemy.height
            );
        }

        // Dashed connection line
        ctx.globalAlpha = 0.1;
        ctx.strokeStyle = C_WHITE;
        ctx.lineWidth = 0.5;
        ctx.setLineDash([3, 5]);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(enemy._ghostX, enemy._ghostY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    // ── Status Effects ─────────────────────

    static _renderForceBoostAura(ctx, enemy, cx, cy) {
        if (!enemy._forceBoostedVisual) return;
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.strokeStyle = '#ffee33';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(cx, cy, enemy.width * 0.55, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    static _renderVirusEffects(ctx, enemy) {
        if (!enemy._virusInfected) return;

        const vCx = enemy.position.x + enemy.width / 2;
        const vCy = enemy.position.y + enemy.height / 2;
        const vR = Math.max(enemy.width, enemy.height) * 0.7;
        const vPulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.008);

        ctx.save();
        ctx.globalAlpha = 0.25 + vPulse * 0.2;
        ctx.fillStyle = '#b400ff';
        ctx.beginPath();
        ctx.arc(vCx, vCy, vR, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.6 + vPulse * 0.3;
        ctx.strokeStyle = '#d060ff';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(vCx, vCy, vR * 0.8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    static _renderAfterimages(ctx, enemy, assets) {
        if (!enemy._afterimages || enemy._afterimages.length === 0) return;

        ctx.save();
        const sprite = assets.getSprite(`enemy_${enemy.type}`);
        for (const ai of enemy._afterimages) {
            ctx.globalAlpha = ai.a * 0.3;
            if (sprite) {
                ctx.drawImage(sprite,
                    ai.x - SPRITE_PAD, ai.y - SPRITE_PAD,
                    enemy.width + SPRITE_PAD * 2, enemy.height + SPRITE_PAD * 2
                );
            } else {
                ctx.fillStyle = enemy.config.color;
                ctx.fillRect(ai.x, ai.y, enemy.width, enemy.height);
            }
        }
        ctx.restore();
    }

    // ── Quantum Field Effects ──────────────

    static _renderQuantumEffects(ctx, enemy, cx, cy) {
        if (enemy._quantumWeak) EnemyRenderer._renderQuantumWeak(ctx, cx, cy, enemy.width);
        if (enemy._quantumBoosted) EnemyRenderer._renderQuantumBoosted(ctx, cx, cy, enemy.width);
        if (enemy._quantumFrozen) EnemyRenderer._renderQuantumFrozen(ctx, cx, cy, enemy.width);
    }

    static _renderQuantumWeak(ctx, cx, cy, w) {
        const qp = 0.3 + 0.2 * Math.sin(Date.now() * 0.008);
        ctx.save();
        ctx.globalAlpha = qp;
        ctx.strokeStyle = '#66aaff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, w * 0.55, 0, Math.PI * 2);
        ctx.stroke();

        // Fracture lines
        ctx.globalAlpha = qp * 0.6;
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            const a = Math.PI / 2 * i + Date.now() * 0.002;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a) * w * 0.3, cy + Math.sin(a) * w * 0.3);
            ctx.lineTo(cx + Math.cos(a) * w * 0.6, cy + Math.sin(a) * w * 0.6);
            ctx.stroke();
        }
        ctx.restore();
    }

    static _renderQuantumBoosted(ctx, cx, cy, w) {
        const rp = 0.2 + 0.15 * Math.sin(Date.now() * 0.01);
        ctx.save();
        ctx.globalAlpha = rp;
        ctx.fillStyle = '#ff3333';
        ctx.beginPath();
        ctx.arc(cx, cy, w * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    static _renderQuantumFrozen(ctx, cx, cy, w) {
        const fp = 0.35 + 0.2 * Math.sin(Date.now() * 0.012);
        ctx.save();
        ctx.globalAlpha = fp;
        ctx.strokeStyle = C_VIVID_PURPLE;
        ctx.lineWidth = 2;

        // Distorted ring
        ctx.beginPath();
        for (let a = 0; a < Math.PI * 2; a += 0.15) {
            const warp = 1 + 0.15 * Math.sin(a * 5 + Date.now() * 0.006);
            const r = w * 0.55 * warp;
            const px = cx + Math.cos(a) * r;
            const py = cy + Math.sin(a) * r;
            a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();

        // Glitch lines
        ctx.globalAlpha = fp * 0.5;
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            const offset = Math.sin(Date.now() * 0.003 + i * 2) * 4;
            ctx.beginPath();
            ctx.moveTo(cx - w * 0.5, cy + offset + (i - 1) * 6);
            ctx.lineTo(cx + w * 0.5, cy + offset + (i - 1) * 6);
            ctx.stroke();
        }
        ctx.restore();
    }
}

export default EnemyRenderer;

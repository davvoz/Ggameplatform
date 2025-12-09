/**
 * PlayerRenderer - Handles player entity rendering with all visual effects
 * Single Responsibility: Player visualization coordination
 * 
 * Architettura OOP:
 * - ParticleRenderer: gestione particelle (trail, boost, turbo, flight)
 * - EffectRenderer: effetti visivi (shield, magnet, powerups)
 * - BodyRenderer: rendering corpo, ali, flight progress
 * - FaceRenderer: espressioni facciali (occhi, bocca)
 */
import { IEntityRenderer } from './IEntityRenderer.js';
import { ParticleRenderer } from './player/ParticleRenderer.js';
import { EffectRenderer } from './player/EffectRenderer.js';
import { BodyRenderer } from './player/BodyRenderer.js';
import { FaceRenderer } from './player/FaceRenderer.js';
import { EffectLabelsRenderer } from './player/EffectLabelsRenderer.js';

export class PlayerRenderer extends IEntityRenderer {
    constructor(renderer, textCtx) {
        super(renderer);
        this.labelRenderer = null; // Will be set by RenderingSystem
        this.textCtx = textCtx;
        
        // Composizione: delegazione a renderer specializzati
        this.particleRenderer = new ParticleRenderer(renderer);
        this.effectRenderer = new EffectRenderer(renderer);
        this.bodyRenderer = new BodyRenderer(renderer);
        this.faceRenderer = new FaceRenderer(renderer);
        this.effectLabelsRenderer = textCtx ? new EffectLabelsRenderer(renderer, textCtx) : null;
    }

    setLabelRenderer(labelRenderer) {
        this.labelRenderer = labelRenderer;
    }
    
    setPowerupTimers(timers) {
        if (this.effectLabelsRenderer) {
            this.effectLabelsRenderer.setPowerupTimers(timers);
        }
    }
    
    update(deltaTime) {
        if (this.effectLabelsRenderer) {
            this.effectLabelsRenderer.update(deltaTime);
        }
    }

    render(player, context) {
        if (!player.alive) {
            this._renderDeadPlayer(player, context);
            return;
        }

        const renderState = this._buildRenderState(player, context);
        
        this._renderPlayerLabel(player, renderState);
        this._renderParticles(player, renderState);
        this._renderBonusEffects(player, renderState, context.time);
        this._renderPowerupEffects(player, renderState, context.time);
        this._renderDamageEffects(player, renderState);
        this._renderWings(player, renderState, context.time);
        this._renderPlayerBody(player, renderState);
        this._renderFace(player, renderState);
        this._renderUIOverlays(player, renderState);
        this._renderEffectLabels(player, renderState);
    }

    _buildRenderState(player, context) {
        const isVictoryMode = player.animatedX !== undefined && player.animatedY !== undefined;
        const idleOffset = player.getIdleOffset?.() ?? 0;
        const squashStretch = player.getSquashStretch?.() ?? { squash: 0, stretch: 0 };
        const cameraShake = player.getCameraShake?.() ?? { x: 0, y: 0 };

        const centerX = isVictoryMode ? player.animatedX : player.x + player.width / 2;
        const centerY = isVictoryMode ? player.animatedY : player.y + player.height / 2 + idleOffset;
        const animScale = player.animatedScale ?? 1.0;

        const baseRadius = (player.width / 2) * animScale;
        const radiusX = baseRadius * (1 + squashStretch.squash * 0.1 - squashStretch.stretch * 0.05);
        const radiusY = baseRadius * (1 - squashStretch.squash * 0.1 + squashStretch.stretch * 0.05);

        return {
            centerX,
            centerY,
            animScale,
            radiusX,
            radiusY,
            avgRadius: (radiusX + radiusY) / 2,
            shakenX: centerX + cameraShake.x,
            shakenY: centerY + cameraShake.y,
            cameraShake
        };
    }

    _renderPlayerLabel(player, renderState) {
        this.labelRenderer?.renderPlayerLabel(
            player,
            renderState.centerX,
            renderState.centerY - player.height / 2
        );
    }

    _renderParticles(player, renderState) {
        const particleBatch = this.particleRenderer.collectBatch(player, renderState.cameraShake);
        this.particleRenderer.renderBatch(particleBatch);
    }

    _renderDamageEffects(player, renderState) {
        if (player.damageFlash > 0) {
            this.effectRenderer.renderDamageFlash(
                renderState.centerX,
                renderState.centerY,
                renderState.avgRadius * renderState.animScale,
                player.damageFlash
            );
        }
    }

    _renderDeadPlayer(player, context) {
        const renderState = this._buildRenderState(player, context);
        this.effectRenderer.renderDeadState(
            renderState.centerX,
            renderState.centerY,
            renderState.avgRadius * renderState.animScale,
            player.color
        );
    }

    _renderBonusEffects(player, renderState, time) {
        const { centerX, centerY, avgRadius, animScale } = renderState;
        const scaledRadius = avgRadius * animScale;

        if (player.shieldActive) {
            this.effectRenderer.renderShield(player, time, centerX, centerY, scaledRadius);
        }
        if (player.hasShield) {
            this.effectRenderer.renderShieldBonus(player, time, centerX, centerY, scaledRadius);
        }
        if (player.hasMagnet) {
            this.effectRenderer.renderMagnetBonus(player, time, centerX, centerY, animScale);
        }
    }

    _renderPowerupEffects(player, renderState, time) {
        const { shakenX, shakenY, avgRadius, animScale } = renderState;
        const scaledRadius = avgRadius * animScale;

        this.effectRenderer.renderTurboEffects(player, time, shakenX, shakenY, scaledRadius);
        this.effectRenderer.renderPowerupEffects(player, time, shakenX, shakenY, scaledRadius);
        this.effectRenderer.renderBoostEffect(player, time, shakenX, shakenY, scaledRadius);
    }

    _renderPlayerBody(player, renderState) {
        this.bodyRenderer.renderBody(
            player,
            renderState.shakenX,
            renderState.shakenY,
            renderState.avgRadius,
            renderState.animScale
        );
    }

    _renderFace(player, renderState) {
        const { shakenX, shakenY, radiusY, animScale } = renderState;
        
        // Get animation state for face offset (turbo mode)
        const squashStretch = this.bodyRenderer.animationController.getSquashStretch();
        const faceOffsetX = squashStretch.faceOffsetX || 0;
        
        this.faceRenderer.renderEyes(player, shakenX + faceOffsetX, shakenY, radiusY, animScale);
        this.faceRenderer.renderMouth(player, shakenX + faceOffsetX, shakenY, radiusY, animScale);
    }

    _renderWings(player, renderState, time) {
        if (player.isFlightActive || player.instantFlightActive) {
            this.bodyRenderer.renderWings(player, time, renderState.centerX, renderState.centerY);
        }
    }

    _renderUIOverlays(player, renderState) {
        if (player.instantFlightActive && player.instantFlightDuration > 0) {
            this.bodyRenderer.renderInstantFlightProgress(
                player,
                renderState.centerX,
                renderState.centerY,
                renderState.avgRadius * renderState.animScale
            );
        }
    }
    
    _renderEffectLabels(player, renderState) {
        if (this.effectLabelsRenderer) {
            // Le coordinate del player in screen space (già trasformate da WebGL)
            // Ma il textCanvas non ha la trasformazione, quindi usiamo le coordinate originali
            this.effectLabelsRenderer.render(player, renderState.centerX, renderState.centerY);
        }
    }
}

/**
 * PlatformRenderer - Handles platform rendering with type-specific effects
 * Single Responsibility: Platform visualization
 * Uses Strategy Pattern for extensible effect rendering
 */
import { IEntityRenderer } from './IEntityRenderer.js';
import { RenderingUtils } from './RenderingUtils.js';
import {
    FastEffectRenderer,
    SlowEffectRenderer,
    BouncyEffectRenderer,
    CrumblingEffectRenderer,
    SpringEffectRenderer,
    DissolvingEffectRenderer,
    BouncingEffectRenderer,
    RotatingEffectRenderer,
    RescueEffectRenderer
} from './platform-effects/index.js';

export const PlatformTypes = {
    NORMAL: 'normal',
    FAST: 'fast',
    SLOW: 'slow',
    BOUNCY: 'bouncy',
    CRUMBLING: 'crumbling',
    SPRING: 'spring',
    ICY: 'icy',
    DISSOLVING: 'dissolving',
    BOUNCING: 'bouncing',
    ROTATING: 'rotating',
    RESCUE: 'RESCUE'
};

export const BonusTypes = {
    BOOST: 'boost',
    MAGNET: 'magnet'
};

/**
 * Main PlatformRenderer - orchestrates rendering using Strategy Pattern
 */
export class PlatformRenderer extends IEntityRenderer {
    constructor(renderer) {
        super(renderer);
        this.labelRenderer = null;
        this.effectRenderers = this.initializeEffectRenderers();
    }

    initializeEffectRenderers() {
        return {
            [PlatformTypes.FAST]: new FastEffectRenderer(this.renderer),
            [PlatformTypes.SLOW]: new SlowEffectRenderer(this.renderer),
            [PlatformTypes.BOUNCY]: new BouncyEffectRenderer(this.renderer),
            [PlatformTypes.CRUMBLING]: new CrumblingEffectRenderer(this.renderer),
            [PlatformTypes.SPRING]: new SpringEffectRenderer(this.renderer),
            [PlatformTypes.DISSOLVING]: new DissolvingEffectRenderer(this.renderer),
            [PlatformTypes.BOUNCING]: new BouncingEffectRenderer(this.renderer),
            [PlatformTypes.ROTATING]: new RotatingEffectRenderer(this.renderer),
            [PlatformTypes.RESCUE]: new RescueEffectRenderer(this.renderer)
        };
    }
    
    setLabelRenderer(labelRenderer) {
        this.labelRenderer = labelRenderer;
    }

    render(platform, context) {
        const { time, currentCombo = 0 } = context;
        const renderState = this.prepareRenderState(platform, currentCombo);
        
        this.renderLabel(platform, renderState.baseX, renderState.baseY);
        this.renderPlatformWithEffects(platform, renderState, time);
    }

    prepareRenderState(platform, currentCombo) {
        let renderColor = this.calculateRenderColor(platform, currentCombo);
        let baseX = platform.x;
        let baseY = platform.y;
        
        if (platform.isCrumbling && platform.crumbleTimer) {
            const state = this.applyCrumblingTransform(platform, renderColor, baseX, baseY);
            renderColor = state.color;
            baseX = state.x;
            baseY = state.y;
        }
        
        if (platform.isDissolving && platform.dissolveAlpha !== undefined) {
            renderColor = this.applyDissolveAlpha(renderColor, platform.dissolveAlpha);
        }
        
        return { renderColor, baseX, baseY };
    }

    calculateRenderColor(platform, currentCombo) {
        const comboBoost = Math.min(currentCombo / 50, 1.0);
        if (comboBoost === 0) {
            return platform.color;
        }
        
        const boostedColor = [...platform.color];
        const multiplier = 1.0 + comboBoost * 0.5;
        boostedColor[0] = Math.min(boostedColor[0] * multiplier, 1.0);
        boostedColor[1] = Math.min(boostedColor[1] * multiplier, 1.0);
        boostedColor[2] = Math.min(boostedColor[2] * multiplier, 1.0);
        return boostedColor;
    }

    applyCrumblingTransform(platform, renderColor, baseX, baseY) {
        const crumbleProgress = platform.crumbleTimer / platform.crumbleDuration;
        const color = [...renderColor];
        color[3] = 1.0 - crumbleProgress * 0.7;
        
        const shake = crumbleProgress * 8;
        return {
            color,
            x: baseX + (Math.random() - 0.5) * shake,
            y: baseY + (Math.random() - 0.5) * shake
        };
    }

    applyDissolveAlpha(renderColor, dissolveAlpha) {
        const color = [...renderColor];
        color[3] = dissolveAlpha;
        return color;
    }

    renderLabel(platform, x, y) {
        if (this.labelRenderer) {
            this.labelRenderer.renderPlatformLabel(platform, x + platform.width / 2, y);
        }
    }

    renderPlatformWithEffects(platform, renderState, time) {
        const { renderColor, baseX, baseY } = renderState;
        
        RenderingUtils.drawShadow(this.renderer, baseX, baseY, platform.width, platform.height);
        
        this.renderPlatformBody(baseX, baseY, platform.width, platform.height, renderColor);
        this.renderHighlights(baseX, baseY, platform.width, platform.height, renderColor, time);
        
        if (platform.isCrumbling && platform.crumbleTimer) {
            this.renderCrumblingParticles(platform, baseX, baseY);
        }
        
        this.renderTypeSpecificEffect(platform, baseX, baseY, time);
    }

    renderCrumblingParticles(platform, baseX, baseY) {
        const crumbleProgress = platform.crumbleTimer / platform.crumbleDuration;
        const particleCount = 6;
        
        for (let i = 0; i < particleCount; i++) {
            const px = baseX + Math.random() * platform.width;
            const py = baseY + platform.height + Math.random() * 15 * crumbleProgress;
            const pSize = 1 + Math.random() * 2;
            this.renderer.drawCircle(px, py, pSize, [0.6, 0.5, 0.4, (1 - crumbleProgress) * 0.6]);
        }
    }

    renderPlatformBody(x, y, width, height, color) {
        const topColor = [...color];
        const bottomColor = [...color];
        const darkening = 0.7;
        bottomColor[0] *= darkening;
        bottomColor[1] *= darkening;
        bottomColor[2] *= darkening;
        
        this.renderer.drawRect(x, y, width, height * 0.5, topColor);
        this.renderer.drawRect(x, y + height * 0.5, width, height * 0.5, bottomColor);
    }

    renderHighlights(x, y, width, height, color, time) {
        const comboBoost = color[0] > 1.0 ? 0.3 : 0;
        const highlightPulse = Math.sin(time * 3) * 0.1 + 0.5 + comboBoost;
        this.renderer.drawRect(x + 3, y + 1, width - 6, 2, [1.0, 1.0, 1.0, highlightPulse]);
        
        this.renderBorderGlow(x, y, width, height, color, time);
    }

    renderBorderGlow(x, y, width, height, color, time) {
        const borderGlow = 0.4 + Math.sin(time * 4) * 0.2;
        const borderColor = [...color];
        borderColor[3] = borderGlow;
        
        this.renderer.drawRect(x, y, width, 1, borderColor);
        this.renderer.drawRect(x, y + height - 1, width, 1, borderColor);
        this.renderer.drawRect(x, y, 1, height, borderColor);
        this.renderer.drawRect(x + width - 1, y, 1, height, borderColor);
    }

    renderTypeSpecificEffect(platform, x, y, time) {
        const platformType = platform.platformType || PlatformTypes.NORMAL;
        const effectRenderer = this.effectRenderers[platformType];
        
        if (effectRenderer) {
            effectRenderer.render(platform, x, y, time);
        }
    }
}


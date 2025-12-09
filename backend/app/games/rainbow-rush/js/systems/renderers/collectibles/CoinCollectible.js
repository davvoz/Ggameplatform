/**
 * CoinCollectible - Renders coin collectibles with 3D flip effect
 */
import { BaseCollectible } from './BaseCollectible.js';

export class CoinCollectible extends BaseCollectible {
    constructor(renderer, textCtx = null) {
        super(renderer, textCtx);
        this.coinImages = this.loadCoinImages();
    }

    loadCoinImages() {
        const bitcoin = new Image();
        bitcoin.src = './assets/bitcoin.png';
        const steem = new Image();
        steem.src = './assets/steem.png';
        return { bitcoin, steem };
    }

    renderVisual(entity, context) {
        const { time } = context;
        
        // 3D rotation for flip effect
        const rotation = (time * 3 + (entity.pulsePhase || 0)) % (Math.PI * 2);
        const scaleX = Math.abs(Math.cos(rotation));
        
        // Vertical bounce
        const bounce = Math.sin(time * 4 + (entity.pulsePhase || 0)) * 2;
        const y = entity.y + bounce;

        // Try rendering with images first
        if (this.renderWithImages(entity, y, scaleX)) {
            return;
        }

        // Fallback to geometric rendering
        this.renderGeometric(entity, y);
    }

    renderWithImages(entity, y, scaleX) {
        if (!this.textCtx || !this.coinImages) {
            return false;
        }

        // Initialize coinType once per collectible
        if (entity.coinType === undefined) {
            entity.coinType = (entity.id || Math.floor(entity.x / 100)) % 2;
        }
        
        const img = entity.coinType === 0 ? this.coinImages.bitcoin : this.coinImages.steem;

        if (img.complete && img.naturalWidth > 0) {
            const ctx = this.textCtx;
            const size = entity.radius * 2;

            ctx.save();
            ctx.globalAlpha = 1.0;
            ctx.translate(entity.x, y);
            ctx.scale(Math.max(0.2, scaleX), 1);
            ctx.drawImage(img, -size / 2, -size / 2, size, size);
            ctx.restore();
            return true;
        }

        return false;
    }

    renderGeometric(entity, y) {
        const radiusX = entity.radius;
        const radiusY = entity.radius;

        // Outer gold ring
        this.renderEllipse(entity.x, y, radiusX, radiusY, [0.8, 0.6, 0.0, 1.0]);

        // Inner golden circle
        const innerRadiusX = radiusX * 0.85;
        const innerRadiusY = radiusY * 0.85;
        this.renderEllipse(entity.x, y, innerRadiusX, innerRadiusY, [1.0, 0.84, 0.0, 1.0]);

        // Highlight
        const highlightRadiusX = radiusX * 0.4;
        const highlightRadiusY = radiusY * 0.35;
        this.renderEllipse(
            entity.x - radiusX * 0.15,
            y - radiusY * 0.25,
            highlightRadiusX,
            highlightRadiusY,
            [1.0, 1.0, 0.9, 0.5]
        );

        // Symbol
        const symbolRadiusX = radiusX * 0.5;
        const symbolRadiusY = radiusY * 0.5;
        this.renderEllipse(entity.x, y, symbolRadiusX, symbolRadiusY, [1.0, 0.95, 0.4, 1.0]);
        this.renderEllipse(entity.x, y, symbolRadiusX * 0.3, symbolRadiusY * 0.3, [1.0, 1.0, 1.0, 0.9]);
    }
}

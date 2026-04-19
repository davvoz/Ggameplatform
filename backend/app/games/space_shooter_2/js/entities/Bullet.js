import { C_WHITE, C_CREAM_YELLOW } from './LevelsThemes.js';
import GameObject from '../../../shared/GameObject.js';

/**
 * Bullet - Energy bolt projectile
 *
 * Performance modes:
 *   HIGH   → sprite bolt (drawImage) + outer glow + sparkle tip + 8-point tapered trail
 *   MEDIUM → sprite bolt (drawImage) + 5-point tapered trail (no glow, no sparkle)
 *   LOW    → simple rectangle bolt (2 fills, no bezier) + single-line trail (1 stroke)
 *
 * Bolt body is pre-rendered as a sprite for performance.
 * Falls back to procedural bezier if sprites fail to load.
 * No shadowBlur is used in any mode.
 */

// Shared performance state
let _perfMode = 'high';

const TRAIL_LENGTH = {
    player: { low: 3, medium: 5, high: 8 },
    enemy:  { low: 3, medium: 4, high: 5 }
};

const BULLET_STYLE = {
    player: {
        color: { r: 80, g: 200, b: 255 },
        coreColor: C_WHITE, midColor: '#66ccff', outerColor: '#2288dd',
        boltLength: 14, boltWidth: 5
    },
    enemy: {
        color: { r: 255, g: 70, b: 70 },
        coreColor: C_WHITE, midColor: '#ff6644', outerColor: '#cc2200',
        boltLength: 10, boltWidth: 4
    }
};

// ── Pre-rendered bolt sprites (loaded once) ──
const _boltSprites = { player: null, enemy: null, quantum: null };
let _spritesLoaded = false;

class Bullet extends GameObject {
    constructor(x, y, vx, vy, owner = 'player', damage = 1) {
        super(x, y, 12, 20);
        this.velocity.x = vx;
        this.velocity.y = vy;
        this.owner = owner;
        this.damage = damage;
        this.tag = 'bullet';
        this.age = 0;

        // Bouncing bullets (set externally after spawn)
        this.bounces = 0;
        this.maxBounces = 0;

        // Trail — always present, just shorter on lower modes
        this.trail = [];
        this.maxTrailLength = TRAIL_LENGTH[owner]?.[_perfMode] ?? 3;

        this._quantumBoosted = false;

        const style = BULLET_STYLE[owner] || BULLET_STYLE.enemy;
        this.color = { ...style.color };
        this.coreColor = style.coreColor;
        this.midColor = style.midColor;
        this.outerColor = style.outerColor;
        this.boltLength = style.boltLength;
        this.boltWidth = style.boltWidth;

        // Pre-compute direction angle
        const speed = Math.hypot(vx, vy);
        this._dirAngle = speed > 0 ? Math.atan2(vy / speed, vx / speed) - Math.PI / 2 : 0;
        this._speed = speed;
    }

    static setPerformanceMode(mode) {
        _perfMode = mode;
    }

    update(deltaTime, game) {
        this.age += deltaTime;
        this.updateTrail();

        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;

        const W = game.logicalWidth;
        const H = game.logicalHeight;
        if (this.maxBounces > 0 && this.bounces < this.maxBounces) {
            this.handleBouncing(W, H);
        } else if (this.isOffScreen(W, H)) {
            this.destroy();
        }
    }

    updateTrail() {
        this.trail.push(
            this.position.x + this.width / 2,
            this.position.y + this.height / 2
        );
        const maxLen = this.maxTrailLength * 2;
        while (this.trail.length > maxLen) {
            this.trail.shift();
            this.trail.shift();
        }
    }

    handleBouncing(W, H) {
        let bounced = false;
        if (this.position.x < 0) {
            this.position.x = 0;
            this.velocity.x = Math.abs(this.velocity.x);
            bounced = true;
        } else if (this.position.x + this.width > W) {
            this.position.x = W - this.width;
            this.velocity.x = -Math.abs(this.velocity.x);
            bounced = true;
        }
        if (this.position.y < 0) {
            this.position.y = 0;
            this.velocity.y = Math.abs(this.velocity.y);
            bounced = true;
        } else if (this.position.y + this.height > H) {
            this.position.y = H - this.height;
            this.velocity.y = -Math.abs(this.velocity.y);
            bounced = true;
        }
        if (bounced) {
            this.bounces++;
            if (this._bounceDmgMul) {
                this.damage = Math.max(1, Math.ceil(this.damage * this._bounceDmgMul));
            }
            const spd = Math.hypot(this.velocity.x, this.velocity.y);
            this._dirAngle = spd > 0 ? Math.atan2(this.velocity.y / spd, this.velocity.x / spd) - Math.PI / 2 : 0;
        }
    }

    render(ctx) {
        const cx = this.position.x + this.width / 2;
        const cy = this.position.y + this.height / 2;

        ctx.save();
        this.applyQuantumPalette();

        if (_perfMode === 'low') {
            this.renderLowMode(ctx, cx, cy);
            ctx.restore();
            return;
        }

        this.renderTaperedTrail(ctx);
        this.renderBoltBody(ctx, cx, cy);

        if (_perfMode === 'high') {
            this.renderSparkle(ctx, cx, cy);
        }

        ctx.restore();
    }

    applyQuantumPalette() {
        if (!this._quantumBoosted || this.owner !== 'player') return;
        this.coreColor = C_CREAM_YELLOW;
        this.midColor = '#ffdd44';
        this.outerColor = '#cc8800';
        this.color = { r: 255, g: 200, b: 60 };
        this.boltLength = 17;
        this.boltWidth = 6.5;
    }

    renderLowMode(ctx, cx, cy) {
        const bW = this.boltWidth;
        const bL = this.boltLength;
        if (this.trail.length >= 4) {
            const ti = this.trail.length - 4;
            ctx.globalAlpha = 0.4;
            ctx.strokeStyle = this.midColor;
            ctx.lineWidth = bW * 0.8;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(this.trail[ti], this.trail[ti + 1]);
            ctx.lineTo(cx, cy);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this._dirAngle);
        ctx.fillStyle = this.outerColor;
        ctx.fillRect(-bW * 0.5, -bL, bW, bL * 1.4);
        ctx.fillStyle = this.coreColor;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(-bW * 0.25, -bL * 0.6, bW * 0.5, bL * 0.9);
        ctx.restore();
    }

    renderTaperedTrail(ctx) {
        if (this.trail.length < 4) return;
        const bW = this.boltWidth;
        const segs = this.trail.length / 2;
        for (let i = 0; i < this.trail.length - 2; i += 2) {
            const t = (i / 2 + 1) / segs;
            const width = bW * t * 1.5;
            ctx.globalAlpha = t * 0.5;
            ctx.strokeStyle = this.midColor;
            ctx.lineWidth = width + 2;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(this.trail[i], this.trail[i + 1]);
            ctx.lineTo(this.trail[i + 2], this.trail[i + 3]);
            ctx.stroke();
            ctx.globalAlpha = t * 0.7;
            ctx.strokeStyle = this.coreColor;
            ctx.lineWidth = width * 0.5;
            ctx.stroke();
        }
    }

    renderBoltBody(ctx, cx, cy) {
        const spriteKey = (this._quantumBoosted && this.owner === 'player') ? 'quantum' : this.owner;
        const boltSprite = _boltSprites[spriteKey];
        const bW = this.boltWidth;
        const bL = this.boltLength;

        ctx.globalAlpha = 1;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this._dirAngle);

        if (boltSprite) {
            ctx.drawImage(boltSprite, -boltSprite.width / 2, -boltSprite.height / 2);
        } else {
            ctx.fillStyle = this.outerColor;
            ctx.fillRect(-bW * 0.5, -bL, bW, bL * 1.4);
            ctx.fillStyle = this.coreColor;
            ctx.globalAlpha = 0.85;
            ctx.fillRect(-bW * 0.25, -bL * 0.6, bW * 0.5, bL * 0.9);
        }
        ctx.restore();
    }

    renderSparkle(ctx, cx, cy) {
        const bL = this.boltLength;
        const dirX = this._speed > 0 ? this.velocity.x / this._speed : 0;
        const dirY = this._speed > 0 ? this.velocity.y / this._speed : -1;
        const pulse = 0.8 + Math.sin(this.age * 20) * 0.2;
        ctx.globalAlpha = 0.7 * pulse;
        ctx.fillStyle = '#fff';
        const sparkSize = 3 * pulse;
        const tipX = cx + dirX * bL * 0.8;
        const tipY = cy + dirY * bL * 0.8;
        ctx.beginPath();
        ctx.moveTo(tipX, tipY - sparkSize);
        ctx.lineTo(tipX + 1, tipY);
        ctx.lineTo(tipX, tipY + sparkSize);
        ctx.lineTo(tipX - 1, tipY);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(tipX - sparkSize, tipY);
        ctx.lineTo(tipX, tipY + 1);
        ctx.lineTo(tipX + sparkSize, tipY);
        ctx.lineTo(tipX, tipY - 1);
        ctx.closePath();
        ctx.fill();
    }
}

/**
 * Load bolt body sprites. Called once from AssetManager.
 * Non-blocking — falls back to procedural if load fails.
 */
Bullet.loadSprites = async function () {
    const urls = {
        player: 'assets/spritesheets/bullet_player.png',
        enemy: 'assets/spritesheets/bullet_enemy.png',
        quantum: 'assets/spritesheets/bullet_quantum.png'
    };
    const promises = Object.entries(urls).map(([key, url]) => {
        return new Promise(resolve => {
            const img = new Image();
            img.onload = () => {
                const cv = document.createElement('canvas');
                cv.width = img.width; cv.height = img.height;
                cv.getContext('2d').drawImage(img, 0, 0);
                _boltSprites[key] = cv;
                resolve();
            };
            img.onerror = () => {
                console.warn(`Bullet sprite not found: ${url}`);
                resolve();
            };
            img.src = url;
        });
    });
    await Promise.all(promises);
    _spritesLoaded = true;
};

export default Bullet;

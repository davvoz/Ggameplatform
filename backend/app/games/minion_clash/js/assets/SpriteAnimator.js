import { GameConfig } from '../config/GameConfig.js';

/**
 * Per-entity animation state. Each entity that has a sprite owns one Animator.
 *
 * Resolves animation clips by `prefix_name` convention via AssetManager:
 *   prefix='hero_warrior' + play('attack') -> looks up 'hero_warrior_attack'
 *
 * Provides a transient "hurt flash" tint (decoupled from clip switching).
 */
export class SpriteAnimator {
    constructor({ assets, prefix, scale, defaultClip }) {
        if (!assets) throw new Error('SpriteAnimator: assets required');
        if (!prefix || typeof prefix !== 'string') throw new Error('SpriteAnimator: prefix required');
        this._assets = assets;
        this._prefix = prefix;
        this._scale = scale ?? 1;
        this._currentName = null;
        this._currentDef = null;
        this._time = 0;
        this._frameIdx = 0;
        this._completed = false;
        this._hurtTimer = 0;
        this._lockUntil = 0; // remaining seconds during which we hold a non-loop clip before reverting to idle
        this.play(defaultClip ?? 'idle', { force: true });
    }

    /**
     * Switch to clip `${prefix}_${name}`. If the clip does not exist this is a no-op
     * (so callers like AttackController can safely fire 'attack' even on entities
     * that only ship an idle anim).
     *
     * @param {string} name short clip name ('idle','attack','death','cast', ...)
     * @param {{force?:boolean}} opts force=true restarts even if same clip is playing
     */
    play(name, opts) {
        const force = opts?.force === true;
        if (!force && this._currentName === name) return;
        if (!force && this._lockUntil > 0) return; // a non-loop clip is still holding the foreground
        const fullId = `${this._prefix}_${name}`;
        const def = this._assets.peekAnim(fullId);
        if (!def) return;
        this._currentName = name;
        this._currentDef = def;
        this._time = 0;
        this._frameIdx = 0;
        this._completed = false;
        this._lockUntil = def.loop ? 0 : def.duration;
    }

    update(dt) {
        if (this._hurtTimer > 0) this._hurtTimer = Math.max(0, this._hurtTimer - dt);
        if (this._lockUntil > 0) {
            this._lockUntil = Math.max(0, this._lockUntil - dt);
            if (this._lockUntil === 0 && !this._currentDef?.loop) {
                // Auto-revert to idle once a one-shot clip finishes.
                this.play('idle', { force: true });
                return;
            }
        }
        if (!this._currentDef) return;
        this._time += dt;
        const def = this._currentDef;
        const total = def.count;
        const advance = Math.floor(this._time * def.fps);
        if (def.loop) {
            this._frameIdx = advance % total;
        } else if (advance >= total) {
            this._frameIdx = total - 1;
            this._completed = true;
        } else {
            this._frameIdx = advance;
        }
    }

    flashHurt() {
        this._hurtTimer = GameConfig.ANIMATION.HURT_FLASH_DURATION;
    }

    isCompleted() { return this._completed; }
    get currentClip() { return this._currentName; }

    /**
     * Half the rendered frame height (in pixels), used by the renderer to anchor
     * overlays (e.g. HP bar) above the sprite's actual top edge instead of above
     * the entity's collision radius (which is much smaller than the sprite).
     * Returns 0 if the sheet has not loaded yet.
     */
    halfHeight() {
        const def = this._currentDef;
        if (!def) return 0;
        const sheet = this._assets.peekSheet(def.sheetId);
        if (!sheet) return 0;
        return (sheet.frameH * this._scale) / 2;
    }

    /** Draw the current frame centered at (x,y), respecting facingX (-1 flips horizontally) and optional rotation (radians). */
    draw(ctx, x, y, facingX, rotation) {
        const def = this._currentDef;
        if (!def) return;
        const sheet = this._assets.peekSheet(def.sheetId);
        if (!sheet) return;
        const r = sheet.rect(def.start + this._frameIdx);
        const scale = this._scale;
        const dw = r.sw * scale;
        const dh = r.sh * scale;
        const flipped = facingX < 0;
        ctx.save();
        ctx.translate(x, y);
        if (rotation) ctx.rotate(rotation);
        if (flipped) ctx.scale(-1, 1);
        if (this._hurtTimer > 0) {
            // Draw white-tint pulse on hit. We composite a colored copy via globalCompositeOperation.
            ctx.drawImage(sheet.image, r.sx, r.sy, r.sw, r.sh, -dw / 2, -dh / 2, dw, dh);
            ctx.globalCompositeOperation = 'source-atop';
            const a = this._hurtTimer / GameConfig.ANIMATION.HURT_FLASH_DURATION;
            ctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
            ctx.fillRect(-dw / 2, -dh / 2, dw, dh);
        } else {
            ctx.drawImage(sheet.image, r.sx, r.sy, r.sw, r.sh, -dw / 2, -dh / 2, dw, dh);
        }
        ctx.restore();
    }
}

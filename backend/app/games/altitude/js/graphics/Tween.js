/**
 * Altitude-specific TweenManager extension.
 * - Positional-args API: to(target, props, duration, easing, onComplete, delay)
 * - Lazy start-value capture (after delay)
 * - Uses ArrayUtils for zero-allocation update loop
 */

import { Easing, TweenManager as BaseTweenManager } from '../../../shared/Tween.js';
import { updateAndCompact, compactInPlace } from '../core/ArrayUtils.js';

export { Easing };

class LazyTween {
    constructor(target, properties, duration, easing, onComplete, delay) {
        this.target = target;
        this.properties = properties;
        this.duration = duration;
        this.easing = easing;
        this.onComplete = onComplete;
        this.delay = delay;
        this.elapsed = 0;
        this.startValues = {};
        this.started = false;
        this.completed = false;
    }

    start() {
        for (const key in this.properties) {
            this.startValues[key] = this.target[key];
        }
        this.started = true;
    }

    update(dt) {
        if (this.completed) return false;

        if (this.delay > 0) {
            this.delay -= dt;
            return true;
        }

        if (!this.started) this.start();

        this.elapsed += dt;
        const progress = Math.min(this.elapsed / this.duration, 1);
        const easedProgress = this.easing(progress);

        for (const key in this.properties) {
            const start = this.startValues[key];
            const end = this.properties[key];
            this.target[key] = start + (end - start) * easedProgress;
        }

        if (progress >= 1) {
            this.completed = true;
            this.onComplete?.();
            return false;
        }

        return true;
    }
}

export class TweenManager extends BaseTweenManager {
    to(target, properties, duration = 0.5, easing = Easing.easeOutQuad, onComplete = null, delay = 0) {
        const tween = new LazyTween(target, properties, duration, easing, onComplete, delay);
        this._tweens.push(tween);
        return tween;
    }

    killTweensOf(target) {
        compactInPlace(this._tweens, t => t.target !== target);
    }

    update(dt) {
        updateAndCompact(this._tweens, t => t.update(dt));
    }

    get count() { return this._tweens.length; }
}

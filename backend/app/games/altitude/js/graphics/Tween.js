/**
 * TweenManager - Animation interpolation system
 * Single Responsibility: Manage property tweening over time.
 */

import { updateAndCompact, compactInPlace } from '../core/ArrayUtils.js';

// Easing functions
export const Easing = {
    linear: t => t,
    
    easeInQuad: t => t * t,
    easeOutQuad: t => t * (2 - t),
    easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    
    easeInCubic: t => t * t * t,
    easeOutCubic: t => (--t) * t * t + 1,
    easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
    
    easeInElastic: t => {
        if (t === 0 || t === 1) return t;
        return -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI);
    },
    easeOutElastic: t => {
        if (t === 0 || t === 1) return t;
        return Math.pow(2, -10 * t) * Math.sin((t - 0.1) * 5 * Math.PI) + 1;
    },
    
    easeOutBounce: t => {
        const n1 = 7.5625;
        const d1 = 2.75;
        if (t < 1 / d1) return n1 * t * t;
        if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
        if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
        return n1 * (t -= 2.625 / d1) * t + 0.984375;
    },
    
    easeOutBack: t => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
};

class Tween {
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
        // Capture starting values
        for (const key in this.properties) {
            this.startValues[key] = this.target[key];
        }
        this.started = true;
    }

    update(dt) {
        if (this.completed) return false;
        
        // Handle delay
        if (this.delay > 0) {
            this.delay -= dt;
            return true;
        }
        
        // Initialize on first update after delay
        if (!this.started) {
            this.start();
        }
        
        this.elapsed += dt;
        const progress = Math.min(this.elapsed / this.duration, 1);
        const easedProgress = this.easing(progress);
        
        // Interpolate properties
        for (const key in this.properties) {
            const start = this.startValues[key];
            const end = this.properties[key];
            this.target[key] = start + (end - start) * easedProgress;
        }
        
        // Check completion
        if (progress >= 1) {
            this.completed = true;
            this.onComplete?.();
            return false;
        }
        
        return true;
    }
}

export class TweenManager {
    #tweens = [];

    /**
     * Create a new tween
     * @param {Object} target - Object to animate
     * @param {Object} properties - End values for properties
     * @param {number} duration - Duration in seconds
     * @param {Function} easing - Easing function
     * @param {Function} onComplete - Callback when complete
     * @param {number} delay - Delay in seconds before starting
     */
    to(target, properties, duration = 0.5, easing = Easing.easeOutQuad, onComplete = null, delay = 0) {
        const tween = new Tween(target, properties, duration, easing, onComplete, delay);
        this.#tweens.push(tween);
        return tween;
    }

    /**
     * Remove all tweens for a target
     */
    killTweensOf(target) {
        compactInPlace(this.#tweens, t => t.target !== target);
    }

    update(dt) {
        updateAndCompact(this.#tweens, t => t.update(dt));
    }

    clear() {
        this.#tweens.length = 0;
    }

    get count() {
        return this.#tweens.length;
    }
}

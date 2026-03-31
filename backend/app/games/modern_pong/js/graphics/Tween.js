/**
 * Tween engine for smooth property animations.
 * Supports various easing functions.
 */
const Easing = {
    linear: t => t,
    easeInQuad: t => t * t,
    easeOutQuad: t => t * (2 - t),
    easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    easeOutCubic: t => (--t) * t * t + 1,
    easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
    easeOutBack: t => { const s = 1.70158; return (t -= 1) * t * ((s + 1) * t + s) + 1; },
    easeOutElastic: t => {
        if (t === 0 || t === 1) return t;
        return Math.pow(2, -10 * t) * Math.sin((t - 0.1) * 5 * Math.PI) + 1;
    },
    easeOutBounce: t => {
        if (t < 1 / 2.75) return 7.5625 * t * t;
        if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
        if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
        return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    }
};

export { Easing };

export class Tween {
    #target;
    #props;
    #from = {};
    #duration;
    #elapsed = 0;
    #easing;
    #onComplete;
    #finished = false;
    #delay;
    #delayElapsed = 0;

    constructor(target, props, {
        duration = 500,
        easing = 'easeOutCubic',
        onComplete = null,
        delay = 0,
    } = {}) {
        this.#target = target;
        this.#props = props;
        this.#duration = duration;
        this.#easing = typeof easing === 'function' ? easing : (Easing[easing] ?? Easing.linear);
        this.#onComplete = onComplete;
        this.#delay = delay;

        for (const key in props) {
            this.#from[key] = target[key] ?? 0;
        }
    }

    get finished() { return this.#finished; }

    update(deltaTime) {
        if (this.#finished) return;

        if (this.#delayElapsed < this.#delay) {
            this.#delayElapsed += deltaTime;
            return;
        }

        this.#elapsed += deltaTime;
        const t = Math.min(this.#elapsed / this.#duration, 1);
        const easedT = this.#easing(t);

        for (const key in this.#props) {
            this.#target[key] = this.#from[key] + (this.#props[key] - this.#from[key]) * easedT;
        }

        if (t >= 1) {
            this.#finished = true;
            this.#onComplete?.(this.#target);
        }
    }
}

export class TweenManager {
    #tweens = [];

    to(target, props, opts) {
        const tw = new Tween(target, props, opts);
        this.#tweens.push(tw);
        return tw;
    }

    update(deltaTime) {
        for (let i = this.#tweens.length - 1; i >= 0; i--) {
            this.#tweens[i].update(deltaTime);
            if (this.#tweens[i].finished) {
                this.#tweens.splice(i, 1);
            }
        }
    }

    get active() { return this.#tweens.length; }

    clear() { this.#tweens.length = 0; }
}

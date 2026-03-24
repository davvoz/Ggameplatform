/**
 * The Croupier entity — animated dealer character.
 * Uses Animator to switch between idle and deal spritesheets.
 */
import { Animator } from '../graphics/Animator.js';
import { Animation } from '../graphics/Animation.js';
import { SpriteSheet } from '../graphics/SpriteSheet.js';

export class Croupier {
    #animator = new Animator();
    #width;
    #height;
    #loaded = false;
    #onDealFinished = null;

    /**
     * @param {object} config
     * @param {string}  config.idlePath   - spritesheet for idle
     * @param {string}  config.dealPath   - spritesheet for dealing
     * @param {object}  config.idleGrid   - { cols, rows, frameCount? }
     * @param {object}  config.dealGrid   - { cols, rows, frameCount? }
     * @param {number}  config.width  - canvas width (fullscreen)
     * @param {number}  config.height - canvas height (fullscreen)
     */
    #onReactionFinished = null;
    #sheets = null;

    constructor(config) {
        this.#width = config.width;
        this.#height = config.height;

        const ig = config.idleGrid ?? {};
        const dg = config.dealGrid ?? {};
        const sg = config.sadGrid ?? {};
        const hg = config.happyGrid ?? {};

        const idleSheet = new SpriteSheet(config.idlePath, {
            cols: ig.cols ?? null,
            rows: ig.rows ?? 1,
            frameCount: ig.frameCount ?? null,
        });
        const dealSheet = new SpriteSheet(config.dealPath, {
            cols: dg.cols ?? null,
            rows: dg.rows ?? 1,
            frameCount: dg.frameCount ?? null,
        });

        const sheets = [idleSheet, dealSheet];

        const idleAnim = new Animation(idleSheet, { frameDuration: 150, loop: true });
        const dealAnim = new Animation(dealSheet, { frameDuration: 80, loop: false });

        this.#animator.register('idle', idleAnim);
        this.#animator.register('deal', dealAnim);

        if (config.sadPath) {
            const sadSheet = new SpriteSheet(config.sadPath, {
                cols: sg.cols ?? null,
                rows: sg.rows ?? 1,
                frameCount: sg.frameCount ?? null,
            });
            sheets.push(sadSheet);
            this.#animator.register('sad', new Animation(sadSheet, { frameDuration: 120, loop: true }));
        }
        if (config.happyPath) {
            const happySheet = new SpriteSheet(config.happyPath, {
                cols: hg.cols ?? null,
                rows: hg.rows ?? 1,
                frameCount: hg.frameCount ?? null,
            });
            sheets.push(happySheet);
            this.#animator.register('happy', new Animation(happySheet, { frameDuration: 120, loop: true }));
        }

        this.#sheets = sheets;
    }

    async load() {
        await Promise.all(this.#sheets.map(s => s.load()));
        this.#loaded = true;
        this.#animator.play('idle');
        this.#sheets = null;
    }

    get loaded() { return this.#loaded; }
    get dealFinished() {
        const c = this.#animator.current;
        return this.#animator.currentKey === 'deal' && c?.finished;
    }

    /** Register a one-time callback for when the deal animation ends. */
    set onDealFinished(fn) { this.#onDealFinished = fn; }

    play(key) {
        this.#animator.play(key);
    }

    /** Play a one-shot reaction animation (happy/sad), then return to idle. */
    playReaction(key) {
        this.#animator.play(key);
    }

    update(dt) {
        this.#animator.update(dt);

        const key = this.#animator.currentKey;
        const current = this.#animator.current;

        // If deal animation finished, fire callback and return to idle
        if (key === 'deal' && current?.finished) {
            const cb = this.#onDealFinished;
            this.#onDealFinished = null;
            this.#animator.play('idle');
            cb?.();
        }
    }

    /** Draws fullscreen as background, preserving aspect ratio (cover). */
    draw(ctx) {
        if (!this.#loaded) return;
        this.#animator.drawCover(ctx, 0, 0, this.#width, this.#height);
    }
}

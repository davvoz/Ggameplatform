import { BaseSpriteDrawer } from './BaseSpriteDrawer.js';
import { ENEMY_TYPES } from '../../config/Constants.js';
import { FloaterRenderer } from './FloaterRenderer.js';
import { ChaserRenderer } from './ChaserRenderer.js';
import { ShooterRenderer } from './ShooterRenderer.js';
import { BatRenderer } from './BatRenderer.js';
import { GhostRenderer } from './GhostRenderer.js';

const SIZE = 48;
const FRAMES_PER_ENEMY = 4;

/**
 * EnemySpriteDrawer - Generates enemy sprite sheets using a renderer registry.
 * Open/Closed: add new enemies via registerRenderer() without modifying this class.
 */
export class EnemySpriteDrawer extends BaseSpriteDrawer {
    #renderers = new Map();

    constructor() {
        super();
        this.#registerDefaults();
    }

    registerRenderer(type, renderer) {
        this.#renderers.set(type.toLowerCase(), renderer);
    }

    generate() {
        const enemyTypes = Object.keys(ENEMY_TYPES);
        const canvas = this.createCanvas(SIZE * FRAMES_PER_ENEMY, SIZE * enemyTypes.length);
        const ctx = canvas.getContext('2d');

        enemyTypes.forEach((type, row) => {
            for (let frame = 0; frame < FRAMES_PER_ENEMY; frame++) {
                this.#drawEnemyFrame(ctx, frame * SIZE, row * SIZE, type, frame);
            }
        });

        return {
            canvas,
            frameSize: SIZE,
            framesPerEnemy: FRAMES_PER_ENEMY,
            types: enemyTypes,
        };
    }

    #drawEnemyFrame(ctx, ox, oy, type, frame) {
        const phase = (frame / FRAMES_PER_ENEMY) * Math.PI * 2;
        ctx.save();
        ctx.translate(ox + SIZE / 2, oy + SIZE / 2);

        const renderer = this.#renderers.get(type.toLowerCase());
        if (renderer) {
            renderer.draw(ctx, phase);
        }

        ctx.restore();
    }

    #registerDefaults() {
        this.registerRenderer('floater', new FloaterRenderer());
        this.registerRenderer('chaser', new ChaserRenderer());
        this.registerRenderer('shooter', new ShooterRenderer());
        this.registerRenderer('bat', new BatRenderer());
        this.registerRenderer('ghost', new GhostRenderer());
    }
}

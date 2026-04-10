/**
 * Re-exports shared Renderer configured for Modern Pong.
 * @see ../../../shared/Renderer.js
 */
import { Renderer as SharedRenderer } from '../../../shared/Renderer.js';

export class Renderer extends SharedRenderer {
    constructor(canvas, designWidth, designHeight) {
        super(canvas, { designWidth, designHeight });
    }
}

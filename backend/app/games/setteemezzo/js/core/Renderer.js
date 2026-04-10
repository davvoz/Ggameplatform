/**
 * Re-exports shared Renderer configured for Sette e Mezzo.
 * @see ../../../shared/Renderer.js
 */
import { Renderer as SharedRenderer } from '../../../shared/Renderer.js';

export class Renderer extends SharedRenderer {
    constructor(canvas, designWidth = 400, designHeight = 700) {
        super(canvas, {
            designWidth,
            designHeight,
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high',
        });
    }
}

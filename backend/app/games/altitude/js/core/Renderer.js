/**
 * Re-exports shared Renderer configured for Altitude.
 * @see ../../../shared/Renderer.js
 */
import { Renderer as SharedRenderer } from '../../../shared/Renderer.js';
import { DESIGN_WIDTH, DESIGN_HEIGHT } from '../config/Constants.js';

export class Renderer extends SharedRenderer {
    constructor(canvas) {
        super(canvas, {
            designWidth: DESIGN_WIDTH,
            designHeight: DESIGN_HEIGHT,
            alpha: false,
            disableMobileShadows: true,
            autoResize: true,
        });
    }
}

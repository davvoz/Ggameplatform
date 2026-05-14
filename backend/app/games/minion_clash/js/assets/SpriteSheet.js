/**
 * SpriteSheet — wraps a loaded HTMLImageElement and the strip metadata.
 * Frames are laid out horizontally: frame i is at (i * frameW, 0).
 *
 * Throws on out-of-range frame access. No silent clamps.
 */
export class SpriteSheet {
    constructor({ id, image, frameW, frameH, frameCount }) {
        if (!image || !image.width || !image.height) {
            throw new Error(`SpriteSheet "${id}": image not loaded`);
        }
        if (!Number.isFinite(frameW) || frameW <= 0) throw new Error(`SpriteSheet "${id}": frameW must be > 0`);
        if (!Number.isFinite(frameH) || frameH <= 0) throw new Error(`SpriteSheet "${id}": frameH must be > 0`);
        if (!Number.isFinite(frameCount) || frameCount <= 0) throw new Error(`SpriteSheet "${id}": frameCount must be > 0`);
        if (image.width < frameW * frameCount) {
            throw new Error(`SpriteSheet "${id}": image width ${image.width} < ${frameW}*${frameCount}`);
        }
        this.id = id;
        this.image = image;
        this.frameW = frameW;
        this.frameH = frameH;
        this.frameCount = frameCount;
    }

    /** @returns {{sx:number, sy:number, sw:number, sh:number}} */
    rect(frameIdx) {
        if (frameIdx < 0 || frameIdx >= this.frameCount) {
            throw new Error(`SpriteSheet "${this.id}": frame ${frameIdx} out of range [0..${this.frameCount - 1}]`);
        }
        return { sx: frameIdx * this.frameW, sy: 0, sw: this.frameW, sh: this.frameH };
    }
}

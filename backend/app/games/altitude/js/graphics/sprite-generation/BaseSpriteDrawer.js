/**
 * BaseSpriteDrawer - Abstract base for all sprite drawer classes.
 * Enforces the generate() contract and provides shared canvas creation.
 */
export class BaseSpriteDrawer {
    createCanvas(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return canvas;
    }

    generate() {
        throw new Error(`${this.constructor.name}.generate() must be implemented`);
    }
}

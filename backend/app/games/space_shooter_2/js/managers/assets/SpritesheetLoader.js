import { _mkCanvas } from './Helper.js';

const LOAD_TIMEOUT_MS = 5000;

class SpritesheetLoader {

    static loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const timer = setTimeout(() => {
                reject(new Error(`Spritesheet timeout: ${url}`));
            }, LOAD_TIMEOUT_MS);

            img.onload = () => {
                clearTimeout(timer);
                resolve(img);
            };
            img.onerror = () => {
                clearTimeout(timer);
                reject(new Error(`Spritesheet not found: ${url}`));
            };
            img.src = url;
        });
    }

    static extractFrame(image, frameDef) {
        const canvas = _mkCanvas(frameDef.w, frameDef.h);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(
            image,
            frameDef.x, frameDef.y, frameDef.w, frameDef.h,
            0, 0, frameDef.w, frameDef.h
        );
        return canvas;
    }

    static async loadFrames(url, frameDefs) {
        const image = await SpritesheetLoader.loadImage(url);
        const frames = {};
        for (const [key, def] of Object.entries(frameDefs)) {
            frames[key] = SpritesheetLoader.extractFrame(image, def);
        }
        return frames;
    }

}

export default SpritesheetLoader;

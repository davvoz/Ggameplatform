const RETRY_DELAY_MS = 600;

function once(src) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`Cannot load ${src}`));
        image.src = src;
    });
}

/**
 * Loads an image, trying a second time after a short wait: on a first visit,
 * with nothing cached and a slow network, a single failed file would stop the
 * whole game from starting.
 */
export async function loadImage(src) {
    try {
        return await once(src);
    } catch {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        return once(`${src}${src.includes('?') ? '&' : '?'}retry=1`);
    }
}

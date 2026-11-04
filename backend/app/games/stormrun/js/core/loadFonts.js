/**
 * Text baked into sprites stays as it was drawn, so fonts must arrive first. A
 * slow connection must not hold the game back: after a while it starts anyway,
 * with the fallback font.
 */

const PATIENCE_MS = 2500;

/** @param {readonly string[]} faces canvas font strings */
export async function loadFonts(faces) {
    const loading = Promise.all(faces.map((face) => document.fonts.load(face)));
    const patience = new Promise((resolve) => setTimeout(resolve, PATIENCE_MS));
    await Promise.race([loading, patience]).catch(() => {});
}

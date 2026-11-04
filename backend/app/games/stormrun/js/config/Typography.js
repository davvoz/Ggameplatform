/** The one typeface of the game, also declared in css/style.css. */

const FAMILY = 'DynaPuff';
const FALLBACK = '"Trebuchet MS", sans-serif';

export const Weight = Object.freeze({ REGULAR: 400, BOLD: 700 });

/** @returns {string} a canvas font string */
export function font(weight, size) {
    return `${weight} ${size}px ${FAMILY}, ${FALLBACK}`;
}

/** What must be ready before any text is baked into a sprite. */
export const FONT_FACES = Object.freeze(Object.values(Weight).map((weight) => font(weight, 16)));

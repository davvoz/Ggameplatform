/**
 * ColorUtils - Color manipulation utilities for sprite generation.
 * Single Responsibility: parse, lighten, and darken hex colors.
 */
export class ColorUtils {
    static lighten(color, amount) {
        const { r, g, b } = ColorUtils.#parseHex(color);
        return ColorUtils.#toRgb(
            Math.min(255, r + 255 * amount),
            Math.min(255, g + 255 * amount),
            Math.min(255, b + 255 * amount)
        );
    }

    static darken(color, amount) {
        const { r, g, b } = ColorUtils.#parseHex(color);
        return ColorUtils.#toRgb(
            Math.max(0, r * (1 - amount)),
            Math.max(0, g * (1 - amount)),
            Math.max(0, b * (1 - amount))
        );
    }

    static #parseHex(color) {
        const hex = color.replace('#', '');
        return {
            r: Number.parseInt(hex.substr(0, 2), 16),
            g: Number.parseInt(hex.substr(2, 2), 16),
            b: Number.parseInt(hex.substr(4, 2), 16),
        };
    }

    static #toRgb(r, g, b) {
        return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
    }
}

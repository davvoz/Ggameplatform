/**
 * RenderingUtils - Utility functions for rendering operations
 * Provides reusable helper methods to reduce code duplication
 */
export class RenderingUtils {
    /**
     * Convert HSL color to RGB
     * @param {number} h - Hue (0-1)
     * @param {number} s - Saturation (0-1)
     * @param {number} l - Lightness (0-1)
     * @returns {number[]} RGB array [r, g, b]
     */
    static hslToRgb(h, s, l) {
        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        return [r, g, b];
    }

    /**
     * Draw a line using circles (WebGL approximation)
     */
    static drawLine(renderer, x1, y1, x2, y2, color, width) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.ceil(length / 5);
        
        for (let i = 0; i < steps; i++) {
            const t = i / steps;
            const x = x1 + dx * t;
            const y = y1 + dy * t;
            renderer.drawRect(x, y, width, width, color);
        }
    }

    /**
     * Draw a star shape
     */
    static drawStar(renderer, x, y, size, color) {
        renderer.drawCircle(x, y, size, color);
        renderer.drawRect(x - size * 1.5, y - 1, size * 3, 2, color);
        renderer.drawRect(x - 1, y - size * 1.5, 2, size * 3, color);
    }

    /**
     * Draw multi-layer glow effect
     */
    static drawGlow(renderer, x, y, baseRadius, color, layers = 4, alphaBase = 0.3, alphaStep = 0.08) {
        for (let i = 0; i < layers; i++) {
            const glowSize = baseRadius + i * 10;
            const glowColor = [...color];
            glowColor[3] = (alphaBase - i * alphaStep);
            renderer.drawCircle(x, y, glowSize, glowColor);
        }
    }

    /**
     * Draw multi-layer shadow
     */
    static drawShadow(renderer, x, y, width, height, layers = 3, baseAlpha = 0.2) {
        for (let i = 0; i < layers; i++) {
            renderer.drawRect(
                x + 2 + i,
                y + height + i,
                width,
                2,
                [0.0, 0.0, 0.0, baseAlpha / (i + 1)]
            );
        }
    }

    /**
     * Calculate pulse value based on time
     */
    static getPulse(time, speed = 5, min = 0.6, max = 1.0) {
        return Math.abs(Math.sin(time * speed)) * (max - min) + min;
    }

    /**
     * Get 7-segment display configuration for a digit
     */
    static getDigitSegments(digit) {
        const segments = {
            '0': [true, true, true, false, true, true, true],
            '1': [false, false, true, false, false, true, false],
            '2': [true, false, true, true, true, false, true],
            '3': [true, false, true, true, false, true, true],
            '4': [false, true, true, true, false, true, false],
            '5': [true, true, false, true, false, true, true],
            '6': [true, true, false, true, true, true, true],
            '7': [true, false, true, false, false, true, false],
            '8': [true, true, true, true, true, true, true],
            '9': [true, true, true, true, false, true, true]
        };
        return segments[digit] || segments['0'];
    }

    /**
     * Easing function for smooth animations
     */
    static easeInOut(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }
}

/**
 * Mathematical Utility Functions
 * Single Responsibility: Math operations
 */

export class MathUtils {
  static clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  static randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static formatSigned(value) {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value}`;
  }
}

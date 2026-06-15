/** Rotate the vector (x,y) by angle a (radians). */
export function rot(x, y, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: x * c - y * s, y: x * s + y * c };
}

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

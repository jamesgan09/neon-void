// Seeded RNG (mulberry32) so screenshot mode can reproduce an exact
// scene, and so wave composition is stable for a given seed.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Small helpers that take the rng explicitly, so callers stay deterministic.
export function rand(rng, min, max) {
  return min + rng() * (max - min);
}
export function randInt(rng, min, max) {
  return Math.floor(rand(rng, min, max + 1));
}
export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}
export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}
export function lerp(a, b, t) {
  return a + (b - a) * t;
}
export function dist2(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
}

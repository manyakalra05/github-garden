/**
 * Assigns every new garden tree a world-space plot using a sunflower /
 * phyllotaxis spiral (the same packing pattern real seed heads and garden
 * beds use). This gives an organic, evenly-dense field instead of a grid,
 * scales to tens of thousands of plants, and is deterministic — the Nth
 * user planted always gets the same plot, so we never need to store or
 * recompute a collision map.
 */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // ~137.5°
const PLOT_SPACING = 2.35; // world units between adjacent plants

export function plotForIndex(index: number): { x: number; z: number } {
  const radius = PLOT_SPACING * Math.sqrt(index + 1);
  const angle = index * GOLDEN_ANGLE;
  return {
    x: radius * Math.cos(angle),
    z: radius * Math.sin(angle),
  };
}

/** Simple deterministic hash used to seed per-tree procedural variation. */
export function seedFromString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Mask to 31 bits (0 to 2,147,483,647) so this always fits Postgres's
  // signed INT4 column — the unmasked >>> 0 result can reach ~4.29 billion,
  // which overflows INT4 for roughly half of all usernames.
  return (h >>> 0) & 0x7fffffff;
}

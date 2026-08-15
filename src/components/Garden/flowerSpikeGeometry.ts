import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * A tall spike flower (lupine/delphinium style) built entirely from cubes:
 * a central green stalk, with individual purple "floret" cubes spiraling
 * outward around it in a cone that's wide at the base and tapers to a
 * single cube at the tip — matching the reference photo's structure
 * directly, rather than a single blob standing in for "a flower."
 */

const STEM_COLORS = [new THREE.Color("#6b4a2e"), new THREE.Color("#54381f")];
const LEAF_COLORS = [new THREE.Color("#3a5c2e"), new THREE.Color("#4a6b3a")];
// Baked bright (values pushed above 1.0) so these read as a soft glow via
// the bloom pass on their own — a material-level emissive would apply to
// every block in the mesh uniformly, including the stem, which is exactly
// what was muddying the stem's brown into gray/purple before.
const PURPLE_PALETTE = [
  new THREE.Color(1.25, 0.85, 1.7),
  new THREE.Color(1.1, 0.65, 1.55),
  new THREE.Color(0.95, 0.5, 1.4),
  new THREE.Color(1.55, 1.3, 1.9),
];
const HIGHLIGHT_COLOR = new THREE.Color(2.0, 1.85, 2.2);

interface Block {
  x: number;
  y: number;
  z: number;
  color: THREE.Color;
  size: number;
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
// Built in the same "block index" space as the trees, then uniformly
// scaled down at the end — keeps the placement math in easy integers.
const STEM_BLOCK_SIZE = 0.85;
// Deliberately a different size than the stem, not just "close by". Blocks
// are meant to overlap/attach here (that's the intended look — florets
// visually growing out of the stem), but when an overlapping face lands
// EXACTLY coplanar with another block's face, the GPU can't decide which
// to draw on top and flickers between them (z-fighting). Two different
// sizes mean overlapping faces essentially never land on the same plane,
// so the flicker can't happen regardless of how much they overlap.
const FLORET_BLOCK_SIZE = 0.68;
const FINAL_SCALE = 0.12;

export function buildFlowerSpikeArchetype(seed: number): THREE.BufferGeometry {
  const rand = mulberry32(seed);
  const blocks: Block[] = [];

  const stemBlocks = 9 + Math.floor(rand() * 6); // 9–14

  for (let y = 0; y < stemBlocks; y++) {
    blocks.push({
      x: 0,
      y: y + 0.5,
      z: 0,
      color: STEM_COLORS[y % 3 === 0 ? 1 : 0],
      size: STEM_BLOCK_SIZE,
    });
  }

  // Florets start a third of the way up and spiral outward, widest near
  // the base of the floret zone and tapering to a point at the tip.
  const floretStart = Math.floor(stemBlocks * 0.32);
  const floretSpan = Math.max(1, stemBlocks - 1 - floretStart);
  for (let y = floretStart; y < stemBlocks; y++) {
    const t = (y - floretStart) / floretSpan;
    const maxOffset = lerp(2.0, 0.35, t);
    const count = t < 0.8 ? 2 + Math.floor(rand() * 2) : 1;
    for (let i = 0; i < count; i++) {
      const angle = y * GOLDEN_ANGLE + (i * Math.PI * 2) / count + (rand() - 0.5) * 0.5;
      const dist = Math.max(0.4, maxOffset * (0.55 + rand() * 0.45));
      const fx = Math.cos(angle) * dist;
      const fz = Math.sin(angle) * dist;
      const fy = y + 0.5 + (rand() - 0.5) * 0.4;
      const color =
        rand() < 0.07
          ? HIGHLIGHT_COLOR
          : PURPLE_PALETTE[Math.floor(rand() * PURPLE_PALETTE.length)];
      blocks.push({ x: fx, y: fy, z: fz, color, size: FLORET_BLOCK_SIZE });
      // A second, slightly offset cube on some florets for a clustered,
      // less uniform look, like the photo's ragged little clumps.
      if (rand() < 0.4) {
        blocks.push({
          x: fx + (rand() - 0.5) * 0.5,
          y: fy + (rand() - 0.5) * 0.4,
          z: fz + (rand() - 0.5) * 0.5,
          color: PURPLE_PALETTE[Math.floor(rand() * PURPLE_PALETTE.length)],
          size: FLORET_BLOCK_SIZE,
        });
      }
    }
  }
  // Single cube capping the very tip, on-axis.
  blocks.push({
    x: 0,
    y: stemBlocks - 0.1,
    z: 0,
    color: PURPLE_PALETTE[Math.floor(rand() * PURPLE_PALETTE.length)],
    size: FLORET_BLOCK_SIZE,
  });

  // A few base leaves jutting outward near the ground.
  const leafCount = 3 + Math.floor(rand() * 3);
  for (let i = 0; i < leafCount; i++) {
    const angle = rand() * Math.PI * 2;
    const dist = 0.8 + rand() * 0.6;
    blocks.push({
      x: Math.cos(angle) * dist,
      y: 0.3 + rand() * 0.6,
      z: Math.sin(angle) * dist,
      color: LEAF_COLORS[Math.floor(rand() * LEAF_COLORS.length)],
      size: FLORET_BLOCK_SIZE,
    });
  }

  const parts = blocks.map((b) => {
    const geo = new THREE.BoxGeometry(b.size, b.size, b.size);
    geo.translate(b.x, b.y, b.z);
    paintVertexColors(geo, b.color);
    return normalizeForMerge(geo);
  });

  const merged = mergeGeometries(parts, false);
  if (!merged) {
    throw new Error(
      "buildFlowerSpikeArchetype: mergeGeometries returned null — every part is a BoxGeometry so this should be unreachable."
    );
  }
  merged.scale(FINAL_SCALE, FINAL_SCALE, FINAL_SCALE);
  merged.computeBoundingSphere();
  return merged;
}

function normalizeForMerge(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  return geo.index ? geo.toNonIndexed() : geo;
}

function paintVertexColors(geo: THREE.BufferGeometry, color: THREE.Color) {
  const count = geo.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ARCHETYPE_CACHE = new Map<number, THREE.BufferGeometry>();
export function getFlowerSpikeArchetype(seed: number): THREE.BufferGeometry {
  if (!ARCHETYPE_CACHE.has(seed)) {
    ARCHETYPE_CACHE.set(seed, buildFlowerSpikeArchetype(seed));
  }
  return ARCHETYPE_CACHE.get(seed)!;
}

export const NUM_FLOWER_ARCHETYPES = 5;
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Wisteria / magical pixel tree.
 *
 * Structure:
 *   - Tall chunky trunk
 *   - Multiple spreading branches
 *   - Wide, relatively flat crown
 *   - Dense small voxel foliage
 *   - Long irregular hanging foliage curtains
 *   - Occasional glowing lanterns
 *
 * Everything is still baked into one BufferGeometry per archetype,
 * so Trees.tsx does not need to change.
 */

const BARK_COLORS = [
  new THREE.Color("#5b3b32"),
  new THREE.Color("#70473a"),
  new THREE.Color("#825343"),
  new THREE.Color("#4c332d"),
];

const CANOPY_COLORS = [
  new THREE.Color("#6d467d"),
  new THREE.Color("#81548f"),
  new THREE.Color("#95639e"),
  new THREE.Color("#a875b0"),
  new THREE.Color("#bd8abc"),
  new THREE.Color("#d19ac7"),
];

const CASCADE_COLORS = [
  new THREE.Color("#754b84"),
  new THREE.Color("#875892"),
  new THREE.Color("#9c69a2"),
  new THREE.Color("#b77bb0"),
  new THREE.Color("#cc91bd"),
  new THREE.Color("#dba0c6"),
];

// Over 1.0 intentionally so bloom can pick these up.
const LANTERN_GLOW = new THREE.Color(3.6, 2.4, 0.9);

interface Block {
  x: number;
  y: number;
  z: number;
  color: THREE.Color;

  // Allows foliage blocks to be slightly different sizes.
  sx?: number;
  sy?: number;
  sz?: number;
}

export function buildTreeArchetype(seed: number): THREE.BufferGeometry {
  const rand = mulberry32(seed);

  const blocks: Block[] = [];

  /*
   * ---------------------------------------------------------
   * TRUNK
   * ---------------------------------------------------------
   *
   * Taller than the previous version.
   * The reference has a substantial trunk before the canopy
   * starts.
   */

  const trunkHeight = 6 + Math.floor(rand() * 3); // 6–8

  // Main trunk — slightly irregular 2x2 voxel trunk.
  for (let y = 0; y < trunkHeight; y++) {
    const width = y < 2 ? 1.25 : 1.05;

    blocks.push({
      x: 0,
      y: y + 0.5,
      z: 0,
      sx: width,
      sy: 1,
      sz: width,
      color: BARK_COLORS[Math.floor(rand() * BARK_COLORS.length)],
    });
  }

  /*
   * ---------------------------------------------------------
   * MAIN BRANCHES
   * ---------------------------------------------------------
   *
   * The reference tree has branches spreading outward under
   * the canopy instead of having a simple vertical trunk.
   */

  const branchDirections = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [0.7, 0.7],
    [-0.7, 0.7],
    [0.7, -0.7],
    [-0.7, -0.7],
  ];

  const branchCount = 5 + Math.floor(rand() * 3);

  for (let i = 0; i < branchCount; i++) {
    const dir =
      branchDirections[
        Math.floor(rand() * branchDirections.length)
      ];

    const dx = dir[0];
    const dz = dir[1];

    const startY = trunkHeight - 1 - Math.floor(rand() * 2);
    const length = 2 + Math.floor(rand() * 3);

    for (let step = 1; step <= length; step++) {
      blocks.push({
        x: dx * step,
        y: startY + 0.35 + step * 0.05,
        z: dz * step,
        sx: 0.8,
        sy: 0.8,
        sz: 0.8,
        color:
          BARK_COLORS[
            Math.floor(rand() * BARK_COLORS.length)
          ],
      });
    }
  }

  /*
   * ---------------------------------------------------------
   * SECONDARY BRANCHES
   * ---------------------------------------------------------
   *
   * These are shorter branches extending from the main
   * branches and help prevent the canopy from looking like
   * one solid cube.
   */

  const secondaryCount = 7 + Math.floor(rand() * 5);

  for (let i = 0; i < secondaryCount; i++) {
    const angle = rand() * Math.PI * 2;

    const distance = 1.5 + rand() * 3;

    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;

    const y =
      trunkHeight -
      0.5 +
      rand() * 1.5;

    blocks.push({
      x,
      y,
      z,
      sx: 0.65,
      sy: 0.65,
      sz: 0.65,
      color:
        BARK_COLORS[
          Math.floor(rand() * BARK_COLORS.length)
        ],
    });
  }

  /*
   * ---------------------------------------------------------
   * TOP CANOPY
   * ---------------------------------------------------------
   *
   * IMPORTANT:
   *
   * This is NOT a sphere anymore.
   *
   * It is a wide, flattened, irregular canopy — much closer
   * to the reference image.
   */

  const canopyWidth = 8 + rand() * 3; // 8–11
  const canopyDepth = 5.5 + rand() * 2;
  const canopyHeight = 3.2 + rand() * 1.2;

  const minX = -Math.ceil(canopyWidth / 2);
  const maxX = Math.ceil(canopyWidth / 2);

  const minZ = -Math.ceil(canopyDepth / 2);
  const maxZ = Math.ceil(canopyDepth / 2);

  const canopyBaseY = trunkHeight - 0.3;

  for (let x = minX; x <= maxX; x++) {
    for (let z = minZ; z <= maxZ; z++) {
      for (
        let y = 0;
        y <= Math.ceil(canopyHeight);
        y++
      ) {
        /*
         * Flattened elliptical canopy.
         */
        const normalizedX =
          x / (canopyWidth / 2);

        const normalizedZ =
          z / (canopyDepth / 2);

        const normalizedY =
          y / canopyHeight;

        const horizontal =
          normalizedX * normalizedX +
          normalizedZ * normalizedZ;

        /*
         * Slightly irregular edges.
         */
        const noise =
          (rand() - 0.5) * 0.32;

        if (
          horizontal +
            normalizedY * normalizedY * 0.7 <
          1.15 + noise
        ) {
          /*
           * Don't fill every single voxel.
           *
           * Small gaps make the foliage look like thousands
           * of individual leaves rather than one solid cube.
           */
          if (rand() > 0.17) {
            const size =
              0.55 + rand() * 0.38;

            blocks.push({
              x:
                x +
                (rand() - 0.5) * 0.25,

              y:
                canopyBaseY +
                y * 0.72 +
                (rand() - 0.5) * 0.2,

              z:
                z +
                (rand() - 0.5) * 0.25,

              sx: size,
              sy: size,
              sz: size,

              color:
                CANOPY_COLORS[
                  Math.floor(
                    rand() *
                      CANOPY_COLORS.length
                  )
                ],
            });
          }
        }
      }
    }
  }

  /*
   * ---------------------------------------------------------
   * HANGING WISTERIA / WEEPING FOLIAGE
   * ---------------------------------------------------------
   *
   * This is the most important visual difference.
   *
   * Instead of only a few short cascades, we create many
   * vertical foliage curtains hanging from the underside.
   */

  const cascadeCount =
    18 + Math.floor(rand() * 10);

  for (let i = 0; i < cascadeCount; i++) {
    const x =
      -canopyWidth / 2 +
      rand() * canopyWidth;

    const z =
      -canopyDepth / 2 +
      rand() * canopyDepth;

    /*
     * Keep most hanging foliage toward the outer/lower
     * portion of the canopy.
     */
    const startY =
      canopyBaseY +
      0.3 +
      rand() * 2;

    /*
     * Longer than the old 2–5 block cascades.
     */
    const length =
      3 + Math.floor(rand() * 7);

    /*
     * Occasionally make a very long hanging strand.
     */
    const extraLong =
      rand() < 0.22;

    const finalLength =
      extraLong
        ? length + 3
        : length;

    /*
     * Slightly angled strand.
     */
    const driftX =
      (rand() - 0.5) * 0.8;

    const driftZ =
      (rand() - 0.5) * 0.8;

    for (let step = 0; step < finalLength; step++) {
      /*
       * Strands taper toward their bottom.
       */
      const taper =
        0.75 -
        (step / finalLength) * 0.25;

      const size =
        (0.5 + rand() * 0.32) *
        taper;

      /*
       * Small sideways movement makes the hanging foliage
       * organic rather than perfectly straight.
       */
      const wave =
        Math.sin(step * 0.8) * 0.22;

      const px =
        x +
        driftX * (step / finalLength) +
        wave;

      const pz =
        z +
        driftZ * (step / finalLength);

      const py =
        startY -
        step * 0.7;

      blocks.push({
        x: px,
        y: py,
        z: pz,

        sx: size,
        sy: size,
        sz: size,

        color:
          CASCADE_COLORS[
            Math.floor(
              rand() *
                CASCADE_COLORS.length
            )
          ],
      });

      /*
       * Add occasional side leaves to make the cascade
       * look like a hanging mass rather than a straight vine.
       */
      if (rand() < 0.4) {
        const side = rand() < 0.5 ? -1 : 1;

        blocks.push({
          x:
            px +
            side *
              (0.35 + rand() * 0.35),

          y:
            py +
            (rand() - 0.5) * 0.3,

          z:
            pz +
            (rand() - 0.5) * 0.3,

          sx: 0.45 + rand() * 0.25,
          sy: 0.45 + rand() * 0.25,
          sz: 0.45 + rand() * 0.25,

          color:
            CASCADE_COLORS[
              Math.floor(
                rand() *
                  CASCADE_COLORS.length
              )
            ],
        });
      }
    }

    /*
     * Lanterns are relatively rare.
     *
     * They hang near the lower portion of a few curtains,
     * like the reference image.
     */
    if (rand() < 0.3) {
      const lanternStep =
        Math.max(
          2,
          finalLength - 1
        );

      blocks.push({
        x:
          x +
          driftX *
            (lanternStep / finalLength),

        y:
          startY -
          lanternStep * 0.7 -
          0.15,

        z:
          z +
          driftZ *
            (lanternStep / finalLength),

        sx: 0.7,
        sy: 0.7,
        sz: 0.7,

        color: LANTERN_GLOW,
      });
    }
  }

  /*
   * ---------------------------------------------------------
   * OUTER DROOPING FOLIAGE
   * ---------------------------------------------------------
   *
   * Add a few larger masses around the sides of the crown.
   * This produces the hanging silhouette visible in your
   * reference instead of a clean rectangular edge.
   */

  const outerClusters =
    8 + Math.floor(rand() * 5);

  for (let i = 0; i < outerClusters; i++) {
    const angle =
      rand() * Math.PI * 2;

    const radius =
      3.5 + rand() * 2.5;

    const centerX =
      Math.cos(angle) * radius;

    const centerZ =
      Math.sin(angle) * radius;

    const centerY =
      canopyBaseY -
      rand() * 0.8;

    const clusterSize =
      2 + Math.floor(rand() * 3);

    for (let j = 0; j < clusterSize; j++) {
      blocks.push({
        x:
          centerX +
          (rand() - 0.5) * 1.2,

        y:
          centerY -
          j * 0.7,

        z:
          centerZ +
          (rand() - 0.5) * 1.2,

        sx: 0.5 + rand() * 0.35,
        sy: 0.5 + rand() * 0.35,
        sz: 0.5 + rand() * 0.35,

        color:
          CASCADE_COLORS[
            Math.floor(
              rand() *
                CASCADE_COLORS.length
            )
          ],
      });
    }
  }

  /*
   * ---------------------------------------------------------
   * BAKE EVERYTHING INTO ONE GEOMETRY
   * ---------------------------------------------------------
   */

  const parts = blocks.map((b) => {
    const geo = new THREE.BoxGeometry(
      b.sx ?? 0.92,
      b.sy ?? 0.92,
      b.sz ?? 0.92
    );

    geo.translate(
      b.x,
      b.y,
      b.z
    );

    paintVertexColors(
      geo,
      b.color
    );

    return normalizeForMerge(geo);
  });

  const merged =
    mergeGeometries(parts, false);

  if (!merged) {
    throw new Error(
      "buildTreeArchetype: mergeGeometries returned null."
    );
  }

  merged.computeBoundingSphere();

  return merged;
}

function normalizeForMerge(
  geo: THREE.BufferGeometry
): THREE.BufferGeometry {
  return geo.index
    ? geo.toNonIndexed()
    : geo;
}

function paintVertexColors(
  geo: THREE.BufferGeometry,
  color: THREE.Color
) {
  const count =
    geo.attributes.position.count;

  const colors =
    new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  geo.setAttribute(
    "color",
    new THREE.BufferAttribute(
      colors,
      3
    )
  );
}

function mulberry32(a: number) {
  return function () {
    a |= 0;

    a =
      (a + 0x6d2b79f5) |
      0;

    let t =
      Math.imul(
        a ^ (a >>> 15),
        1 | a
      );

    t =
      (t +
        Math.imul(
          t ^ (t >>> 7),
          61 | t
        )) ^
      t;

    return (
      ((t ^ (t >>> 14)) >>> 0) /
      4294967296
    );
  };
}

const ARCHETYPE_CACHE =
  new Map<
    number,
    THREE.BufferGeometry
  >();

export function getTreeArchetype(
  archetypeSeed: number
): THREE.BufferGeometry {
  if (
    !ARCHETYPE_CACHE.has(
      archetypeSeed
    )
  ) {
    ARCHETYPE_CACHE.set(
      archetypeSeed,
      buildTreeArchetype(
        archetypeSeed
      )
    );
  }

  return ARCHETYPE_CACHE.get(
    archetypeSeed
  )!;
}

export const NUM_ARCHETYPES = 7;
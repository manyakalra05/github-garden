/**
 * Approximate world-space Y of a tree's canopy center, derived from its
 * treeHeight metric. Both Flowers.tsx (where to scatter blossoms) and
 * CameraRig.tsx (where to aim the camera when focusing a tree) need this —
 * keeping it in one place means a click always flies to the same point the
 * flowers actually cluster around, instead of the trunk base.
 */
export function canopyCenterY(treeHeight: number): number {
  return 1.1 + treeHeight * 0.75;
}

/**
 * The uniform scale applied to a tree's archetype geometry (see Trees.tsx).
 * CameraRig.tsx needs this too, to keep the fly-to camera far enough away
 * that it doesn't end up inside a large tree's canopy — using the same
 * formula here guarantees the two never drift out of sync.
 */
export function treeVisualScale(treeHeight: number): number {
  return 0.55 + treeHeight * 0.32;
}

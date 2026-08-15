import { TreeData } from "./store";

export const MAX_RENDERED_TREES = 150;

/**
 * The garden can contain many more trees than we want to render
 * simultaneously.
 *
 * The important rule is:
 *
 * - keep the normal deterministic 150-tree sample
 * - always keep claimed trees
 * - always keep the currently focused tree
 * - always keep a pinned searched tree
 *
 * The pinned tree is used for a searched username that was not
 * already part of the normal 150-tree sample.
 */
export function pickVisibleTrees(
  trees: TreeData[],
  focusedUsername?: string | null,
  pinnedUsername?: string | null
): TreeData[] {

  if (
    trees.length <=
    MAX_RENDERED_TREES
  ) {
    return trees;
  }


  // ----------------------------------------------------------
  // Trees that MUST remain visible
  // ----------------------------------------------------------

  const forced =
    new Map<string, TreeData>();


  for (
    const tree of trees
  ) {

    /*
     * Claimed trees are always retained.
     */
    if (
      tree.isClaimed
    ) {

      forced.set(
        tree.username,
        tree
      );
    }


    /*
     * Currently focused tree is always retained.
     */
    if (
      tree.username ===
      focusedUsername
    ) {

      forced.set(
        tree.username,
        tree
      );
    }


    /*
     * Pinned searched tree is always retained.
     *
     * This survives closing the statistics card.
     */
    if (
      tree.username ===
      pinnedUsername
    ) {

      forced.set(
        tree.username,
        tree
      );
    }
  }


  // ----------------------------------------------------------
  // Remaining trees
  // ----------------------------------------------------------

  const remaining =
    trees.filter(
      (tree) =>
        !forced.has(
          tree.username
        )
    );


  const slots =
    Math.max(
      0,
      MAX_RENDERED_TREES -
        forced.size
    );


  const sampled: TreeData[] =
    [];


  if (
    slots > 0 &&
    remaining.length > 0
  ) {

    const step =
      remaining.length /
      slots;


    for (
      let i = 0;
      i < slots;
      i++
    ) {

      const index =
        Math.min(
          remaining.length - 1,
          Math.floor(
            i * step
          )
        );


      const candidate =
        remaining[index];


      /*
       * Avoid accidental duplicates if the sampling
       * interval happens to point at the same record.
       */
      if (
        candidate &&
        !sampled.some(
          (tree) =>
            tree.username ===
            candidate.username
        )
      ) {

        sampled.push(
          candidate
        );
      }
    }
  }


  return [
    ...forced.values(),
    ...sampled,
  ];
}
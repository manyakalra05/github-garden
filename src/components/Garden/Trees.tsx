"use client";

import {
  useMemo,
  useRef,
  useLayoutEffect,
  useEffect,
} from "react";

import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";

import {
  useGardenStore,
  TreeData,
} from "@/lib/store";

import {
  getTreeArchetype,
  NUM_ARCHETYPES,
} from "./treeGeometry";

import {
  treeVisualScale,
} from "@/lib/treeVisual";


// ============================================================
// DISTRIBUTION SETTINGS
// ============================================================

const MAX_TREES = 150;

const TREE_AREA_RADIUS = 130;

const EDGE_MARGIN = 14;

const MIN_TREE_DISTANCE = 8.5;

const POSITION_JITTER = 2.0;


// ============================================================
// TREE COLORS
// ============================================================

const NEUTRAL = new THREE.Color(
  1,
  1,
  1
);

const HOVER_GLOW = new THREE.Color(
  2.1,
  1.8,
  3.0
);

const SELECTED_GLOW = new THREE.Color(
  6.0,
  3.8,
  8.0
);


// ============================================================
// DETERMINISTIC RANDOM
// ============================================================

function mulberry32(seed: number) {
  return function () {
    let t =
      (seed += 0x6d2b79f5);

    t =
      Math.imul(
        t ^ (t >>> 15),
        1 | t
      );

    t ^=
      t +
      Math.imul(
        t ^ (t >>> 7),
        61 | t
      );

    return (
      ((t ^ (t >>> 14)) >>> 0) /
      4294967296
    );
  };
}


// ============================================================
// POSITION TYPE
// ============================================================

interface TreePosition {
  x: number;
  z: number;
}


// ============================================================
// GENERATE TREE POSITIONS
// ============================================================

function generateTreePositions(
  count: number
): TreePosition[] {

  const positions: TreePosition[] = [];

  const rand =
    mulberry32(749);

  const usableRadius =
    TREE_AREA_RADIUS -
    EDGE_MARGIN;

  const minDistanceSquared =
    MIN_TREE_DISTANCE *
    MIN_TREE_DISTANCE;

  const maxAttempts =
    count * 1500;

  let attempts = 0;

  while (
    positions.length < count &&
    attempts < maxAttempts
  ) {

    attempts++;

    const radius =
      Math.sqrt(rand()) *
      usableRadius;

    const angle =
      rand() *
      Math.PI *
      2;

    let x =
      Math.cos(angle) *
      radius;

    let z =
      Math.sin(angle) *
      radius;

    x +=
      (rand() - 0.5) *
      POSITION_JITTER;

    z +=
      (rand() - 0.5) *
      POSITION_JITTER;

    if (
      x * x +
        z * z >
      usableRadius *
        usableRadius
    ) {
      continue;
    }

    let tooClose = false;

    for (
      const existing of positions
    ) {

      const dx =
        x -
        existing.x;

      const dz =
        z -
        existing.z;

      const distanceSquared =
        dx * dx +
        dz * dz;

      if (
        distanceSquared <
        minDistanceSquared
      ) {

        tooClose = true;

        break;
      }
    }

    if (tooClose) {
      continue;
    }

    positions.push({
      x,
      z,
    });
  }

  return positions;
}


// ============================================================
// SELECT WHICH TREES TO SHOW
// ============================================================

function prepareTrees(
  trees: TreeData[]
): TreeData[] {

  if (
    trees.length <=
    MAX_TREES
  ) {
    return trees;
  }

  const rand =
    mulberry32(12345);

  const shuffled =
    [...trees];

  for (
    let i =
      shuffled.length - 1;
    i > 0;
    i--
  ) {

    const j =
      Math.floor(
        rand() *
          (i + 1)
      );

    [
      shuffled[i],
      shuffled[j],
    ] = [
      shuffled[j],
      shuffled[i],
    ];
  }

  return shuffled.slice(
    0,
    MAX_TREES
  );
}


// ============================================================
// MAIN TREES COMPONENT
// ============================================================

export default function Trees() {

  const trees =
    useGardenStore(
      (s) => s.trees
    );

  const focusedUsername =
    useGardenStore(
      (s) =>
        s.focusedUsername
    );

  const pinnedUsername =
    useGardenStore(
      (s) =>
        s.pinnedUsername
    );

  const pinTree =
    useGardenStore(
      (s) =>
        s.pinTree
    );

  const syncFocusPosition =
    useGardenStore(
      (s) =>
        s.syncFocusPosition
    );


  // ==========================================================
  // BASE 150 TREES
  // ==========================================================

  /*
   * IMPORTANT:
   *
   * This is deliberately independent of focusedUsername.
   *
   * Therefore searching/clicking does NOT reshuffle the
   * garden.
   */
  const visibleTrees =
    useMemo(
      () =>
        prepareTrees(trees),
      [trees]
    );


  // ==========================================================
  // GENERATE POSITIONS ONCE FOR THE BASE GARDEN
  // ==========================================================

  const positionedTrees =
    useMemo(() => {

      const positions =
        generateTreePositions(
          visibleTrees.length
        );

      return visibleTrees.map(
        (tree, index) => ({
          tree,

          x:
            positions[index]?.x ??
            tree.plotX,

          z:
            positions[index]?.z ??
            tree.plotZ,
        })
      );

    }, [visibleTrees]);


  // ==========================================================
  // ADD SEARCHED / PINNED TREE
  // ==========================================================

  const finalTrees =
    useMemo(() => {

      /*
       * Nothing extra to add.
       */
      if (
        !pinnedUsername
      ) {
        return positionedTrees;
      }


      /*
       * If the pinned tree is already part of the normal
       * 150, don't add another copy.
       */
      const alreadyVisible =
        positionedTrees.find(
          (item) =>
            item.tree.username ===
            pinnedUsername
        );


      if (alreadyVisible) {
        return positionedTrees;
      }


      /*
       * Look for the actual TreeData in the store.
       */
      const pinnedTree =
        trees.find(
          (tree) =>
            tree.username ===
            pinnedUsername
        );


      if (!pinnedTree) {
        return positionedTrees;
      }


      /*
       * Generate one deterministic position for the
       * additional pinned tree.
       *
       * IMPORTANT:
       *
       * We do NOT regenerate the existing positions.
       *
       * The first `positionedTrees.length` positions are
       * identical to the base garden.
       */
      const extraPositions =
        generateTreePositions(
          positionedTrees.length + 1
        );

      const extraPosition =
        extraPositions[
          extraPositions.length - 1
        ];


      if (!extraPosition) {
        return positionedTrees;
      }


      return [
        ...positionedTrees,

        {
          tree:
            pinnedTree,

          x:
            extraPosition.x,

          z:
            extraPosition.z,
        },
      ];

    }, [
      positionedTrees,
      pinnedUsername,
      trees,
    ]);


  // ==========================================================
  // PIN SEARCHED TREE
  // ==========================================================

  useEffect(() => {

    if (
      !focusedUsername
    ) {
      return;
    }


    /*
     * If the focused tree is not already in the normal
     * 150-tree sample, make it persistent.
     *
     * This is what prevents:
     *
     * search → open stats → close stats → tree disappears
     */
    const existsInBaseGarden =
      positionedTrees.some(
        (item) =>
          item.tree.username ===
          focusedUsername
      );


    if (
      !existsInBaseGarden
    ) {

      const existsInDatabase =
        trees.some(
          (tree) =>
            tree.username ===
            focusedUsername
        );


      if (
        existsInDatabase &&
        pinnedUsername !==
          focusedUsername
      ) {

        pinTree(
          focusedUsername
        );
      }
    }

  }, [
    focusedUsername,
    positionedTrees,
    trees,
    pinnedUsername,
    pinTree,
  ]);


  // ==========================================================
  // SYNCHRONIZE CAMERA WITH ACTUAL TREE POSITION
  // ==========================================================

  useEffect(() => {

    if (
      !focusedUsername
    ) {
      return;
    }


    const focusedTree =
      finalTrees.find(
        (item) =>
          item.tree.username ===
          focusedUsername
      );


    if (!focusedTree) {
      return;
    }


    /*
     * THIS IS THE IMPORTANT FIX.
     *
     * The camera must target the position where the tree
     * is ACTUALLY rendered.
     *
     * It must NOT use:
     *
     *     tree.plotX
     *     tree.plotZ
     *
     * because Trees.tsx deliberately uses generated x/z
     * positions for the visual garden.
     */
    syncFocusPosition(
      focusedTree.x,
      focusedTree.z,
      focusedTree.tree.treeHeight
    );

  }, [
    focusedUsername,
    finalTrees,
    syncFocusPosition,
  ]);


  // ==========================================================
  // BUCKET BY ARCHETYPE
  // ==========================================================

  const buckets =
    useMemo(() => {

      const result:
        Array<
          Array<{
            tree: TreeData;
            x: number;
            z: number;
          }>
        > =
        Array.from(
          {
            length:
              NUM_ARCHETYPES,
          },
          () => []
        );


      for (
        const item of finalTrees
      ) {

        const index =
          Math.abs(
            item.tree.plotSeed
          ) %
          NUM_ARCHETYPES;

        result[index].push(
          item
        );
      }


      return result;

    }, [finalTrees]);


  return (
    <group>

      {buckets.map(
        (
          bucket,
          index
        ) =>
          bucket.length >
          0 ? (
            <ArchetypeInstances
              key={index}
              archetypeIndex={
                index
              }
              trees={
                bucket
              }
            />
          ) : null
      )}

    </group>
  );
}


// ============================================================
// ARCHETYPE INSTANCES
// ============================================================

function ArchetypeInstances({
  archetypeIndex,
  trees,
}: {
  archetypeIndex: number;

  trees: Array<{
    tree: TreeData;
    x: number;
    z: number;
  }>;
}) {

  const meshRef =
    useRef<
      THREE.InstancedMesh
    >(null);


  const geometry =
    useMemo(
      () =>
        getTreeArchetype(
          archetypeIndex *
            977 +
            13
        ),
      [archetypeIndex]
    );


  const focusUser =
    useGardenStore(
      (s) =>
        s.focusUser
    );


  const focusedUsername =
    useGardenStore(
      (s) =>
        s.focusedUsername
    );


  const hoveredIndexRef =
    useRef(-1);


  const selectedIndexRef =
    useRef(-1);


  // ==========================================================
  // WRITE TREE MATRICES
  // ==========================================================

  useLayoutEffect(() => {

    const mesh =
      meshRef.current;

    if (!mesh) {
      return;
    }


    const dummy =
      new THREE.Object3D();

    const color =
      new THREE.Color();


    trees.forEach(
      (
        item,
        index
      ) => {

        const tree =
          item.tree;


        const scale =
          treeVisualScale(
            tree.treeHeight
          );


        /*
         * IMPORTANT:
         *
         * Only use the already-calculated x/z.
         *
         * Do NOT regenerate positions here.
         */
        dummy.position.set(
          item.x,
          0,
          item.z
        );


        dummy.rotation.y =
          (
            tree.plotSeed %
            360
          ) *
          (
            Math.PI /
            180
          );


        dummy.scale.setScalar(
          scale
        );


        dummy.updateMatrix();


        mesh.setMatrixAt(
          index,
          dummy.matrix
        );


        color.set(
          tree.accentColor ||
            "#c4b5fd"
        );


        const brightness =
          0.55 +
          tree.glowIntensity *
            0.7;


        color.multiplyScalar(
          brightness
        );


        mesh.setColorAt(
          index,
          color
        );
      }
    );


    mesh.instanceMatrix.needsUpdate =
      true;


    if (
      mesh.instanceColor
    ) {

      mesh.instanceColor
        .needsUpdate =
        true;
    }


    mesh.computeBoundingSphere();


    hoveredIndexRef.current =
      -1;

    selectedIndexRef.current =
      -1;

  }, [trees]);


  // ==========================================================
  // SELECTED TREE
  // ==========================================================

  useEffect(() => {

    const mesh =
      meshRef.current;

    if (!mesh) {
      return;
    }


    const newSelected =
      focusedUsername
        ? trees.findIndex(
            (item) =>
              item.tree.username ===
              focusedUsername
          )
        : -1;


    if (
      selectedIndexRef.current >=
      0
    ) {

      const previous =
        trees[
          selectedIndexRef.current
        ]?.tree;


      if (previous) {

        const color =
          new THREE.Color(
            previous.accentColor ||
              "#c4b5fd"
          );


        const brightness =
          0.55 +
          previous.glowIntensity *
            0.7;


        color.multiplyScalar(
          brightness
        );


        mesh.setColorAt(
          selectedIndexRef.current,
          color
        );
      }
    }


    if (
      newSelected >=
      0
    ) {

      mesh.setColorAt(
        newSelected,
        SELECTED_GLOW
      );
    }


    selectedIndexRef.current =
      newSelected;


    if (
      mesh.instanceColor
    ) {

      mesh.instanceColor
        .needsUpdate =
        true;
    }

  }, [
    trees,
    focusedUsername,
  ]);


  // ==========================================================
  // CLICK
  // ==========================================================

  function handleClick(
    event: ThreeEvent<MouseEvent>
  ) {

    event.stopPropagation();


    const id =
      event.instanceId;


    if (id == null) {
      return;
    }


    const item =
      trees[id];


    if (!item) {
      return;
    }


    const tree =
      item.tree;


    /*
     * Clicked trees already have their exact rendered
     * position available here.
     */
    focusUser(
      tree.username,
      item.x,
      item.z,
      tree.treeHeight
    );
  }


  // ==========================================================
  // HOVER
  // ==========================================================

  function setHover(
    index: number
  ) {

    const mesh =
      meshRef.current;


    if (
      !mesh ||
      index ===
        hoveredIndexRef.current
    ) {
      return;
    }


    if (
      hoveredIndexRef.current >=
      0
    ) {

      const previousIndex =
        hoveredIndexRef.current;


      const previous =
        trees[
          previousIndex
        ]?.tree;


      if (previous) {

        if (
          previousIndex ===
          selectedIndexRef.current
        ) {

          mesh.setColorAt(
            previousIndex,
            SELECTED_GLOW
          );

        } else {

          const color =
            new THREE.Color(
              previous.accentColor ||
                "#c4b5fd"
            );


          const brightness =
            0.55 +
            previous.glowIntensity *
              0.7;


          color.multiplyScalar(
            brightness
          );


          mesh.setColorAt(
            previousIndex,
            color
          );
        }
      }
    }


    if (
      index >= 0 &&
      index !==
        selectedIndexRef.current
    ) {

      mesh.setColorAt(
        index,
        HOVER_GLOW
      );
    }


    hoveredIndexRef.current =
      index;


    if (
      mesh.instanceColor
    ) {

      mesh.instanceColor
        .needsUpdate =
        true;
    }
  }


  // ==========================================================
  // POINTER MOVE
  // ==========================================================

  function handlePointerMove(
    event: ThreeEvent<PointerEvent>
  ) {

    event.stopPropagation();


    if (
      event.instanceId != null
    ) {

      setHover(
        event.instanceId
      );
    }


    document.body.style.cursor =
      "pointer";
  }


  // ==========================================================
  // POINTER OUT
  // ==========================================================

  function handlePointerOut() {

    setHover(-1);

    document.body.style.cursor =
      "auto";
  }


  // ==========================================================
  // INSTANCE MESH
  // ==========================================================

  return (
    <instancedMesh
      ref={meshRef}
      args={[
        geometry,
        undefined,
        trees.length,
      ]}
      castShadow
      receiveShadow
      onClick={
        handleClick
      }
      onPointerMove={
        handlePointerMove
      }
      onPointerOut={
        handlePointerOut
      }
    >

      <meshStandardMaterial
        vertexColors
        roughness={0.75}
        metalness={0.05}
      />

    </instancedMesh>
  );
}
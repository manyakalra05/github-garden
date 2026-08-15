"use client";

import {
  useMemo,
  useRef,
  useLayoutEffect,
} from "react";

import * as THREE from "three";

import {
  useGardenStore,
} from "@/lib/store";

import {
  canopyCenterY,
} from "@/lib/treeVisual";

import {
  pickVisibleTrees,
} from "@/lib/renderTrees";


const MAX_FLOWERS_PER_TREE =
  10;


const petalGeometry =
  new THREE.BoxGeometry(
    0.22,
    0.22,
    0.22
  );


export default function Flowers() {

  const trees =
    useGardenStore(
      (s) => s.trees
    );

  const focusedUsername =
    useGardenStore(
      (s) =>
        s.focusedUsername
    );


  const visibleTrees =
    useMemo(
      () =>
        pickVisibleTrees(
          trees,
          focusedUsername
        ),
      [
        trees,
        focusedUsername,
      ]
    );


  const meshRef =
    useRef<THREE.InstancedMesh>(
      null
    );


  const count =
    visibleTrees.length *
    MAX_FLOWERS_PER_TREE;


  const seededRandoms =
    useMemo(
      () =>
        visibleTrees.map(
          (tree) =>
            Array.from(
              {
                length:
                  MAX_FLOWERS_PER_TREE,
              },
              (_, i) =>
                mulberry32(
                  tree.plotSeed +
                    i * 97
                )()
            )
        ),
      [visibleTrees]
    );


  useLayoutEffect(() => {

    const mesh =
      meshRef.current;

    if (
      !mesh ||
      !count
    ) {
      return;
    }


    const dummy =
      new THREE.Object3D();

    const color =
      new THREE.Color();


    let index = 0;


    visibleTrees.forEach(
      (
        tree,
        treeIndex
      ) => {

        const activeCount =
          Math.round(
            tree.flowerDensity *
              MAX_FLOWERS_PER_TREE
          );


        const canopyY =
          canopyCenterY(
            tree.treeHeight
          );


        const canopyR =
          0.6 +
          tree.canopySpread *
            0.5;


        for (
          let i = 0;
          i <
          MAX_FLOWERS_PER_TREE;
          i++
        ) {

          const random =
            seededRandoms[
              treeIndex
            ][i];


          if (
            i <
            activeCount
          ) {

            const angle =
              random *
              Math.PI *
              2;


            const radial =
              canopyR *
              (
                0.35 +
                0.65 *
                  ((random *
                    7) %
                    1)
              );


            const height =
              canopyY +
              ((random *
                13) %
                1) *
                1.1 -
              0.3;


            dummy.position.set(

              tree.plotX +
                Math.cos(angle) *
                  radial,

              height,

              tree.plotZ +
                Math.sin(angle) *
                  radial
            );


            dummy.rotation.set(
              random * 6,
              random * 4,
              random * 2
            );


            dummy.scale.setScalar(
              0.7 +
                random * 0.6
            );

          } else {

            dummy.scale.setScalar(
              0
            );

          }


          dummy.updateMatrix();


          mesh.setMatrixAt(
            index,
            dummy.matrix
          );


          color.set(
            tree.accentColor
          );


          mesh.setColorAt(
            index,
            color
          );


          index++;
        }

      }
    );


    mesh.instanceMatrix
      .needsUpdate = true;


    if (mesh.instanceColor) {
      mesh.instanceColor
        .needsUpdate = true;
    }

  }, [
    visibleTrees,
    count,
    seededRandoms,
  ]);


  if (!count) {
    return null;
  }


  return (

    <instancedMesh
      ref={meshRef}
      args={[
        petalGeometry,
        undefined,
        count,
      ]}
    >

      <meshStandardMaterial
        roughness={0.4}
        metalness={0.1}
        emissiveIntensity={0.4}
        emissive={
          new THREE.Color(
            "#c4b5fd"
          )
        }
        vertexColors
      />

    </instancedMesh>

  );
}


function mulberry32(
  a: number
) {

  return function () {

    a |= 0;

    a =
      (a +
        0x6d2b79f5) |
      0;


    let t =
      Math.imul(
        a ^
          (a >>> 15),
        1 | a
      );


    t =
      (t +
        Math.imul(
          t ^
            (t >>> 7),
          61 | t
        )) ^
      t;


    return (
      ((t ^
        (t >>> 14)) >>>
        0) /
      4294967296
    );
  };
}
"use client";

import {
  useRef,
  useMemo,
} from "react";

import {
  useFrame,
} from "@react-three/fiber";

import * as THREE from "three";

import {
  useGardenStore,
} from "@/lib/store";


const WING_COLOR =
  new THREE.Color(
    1.8,
    0.9,
    2.6
  );

const WING_HIGHLIGHT =
  new THREE.Color(
    2.8,
    1.4,
    3.8
  );

const BODY_COLOR =
  new THREE.Color(
    0.12,
    0.06,
    0.16
  );


// ============================================================
// WING GEOMETRY
// ============================================================

function createUpperWing() {

  const shape =
    new THREE.Shape();


  shape.moveTo(0, 0);

  shape.bezierCurveTo(
    0.12,
    0.10,
    0.18,
    0.32,
    0.20,
    0.48
  );

  shape.bezierCurveTo(
    0.38,
    0.72,
    0.78,
    0.82,
    1.00,
    0.58
  );

  shape.bezierCurveTo(
    1.08,
    0.42,
    0.96,
    0.20,
    0.72,
    0.10
  );

  shape.bezierCurveTo(
    0.48,
    -0.02,
    0.20,
    -0.04,
    0,
    0
  );


  const geometry =
    new THREE.ShapeGeometry(
      shape
    );


  geometry.rotateX(
    Math.PI / 2
  );


  return geometry;
}


function createLowerWing() {

  const shape =
    new THREE.Shape();


  shape.moveTo(0, 0);

  shape.bezierCurveTo(
    0.10,
    -0.06,
    0.18,
    -0.18,
    0.20,
    -0.30
  );

  shape.bezierCurveTo(
    0.36,
    -0.50,
    0.72,
    -0.58,
    0.82,
    -0.34
  );

  shape.bezierCurveTo(
    0.88,
    -0.18,
    0.70,
    -0.02,
    0.46,
    0.02
  );

  shape.bezierCurveTo(
    0.26,
    0.04,
    0.10,
    0.03,
    0,
    0
  );


  const geometry =
    new THREE.ShapeGeometry(
      shape
    );


  geometry.rotateX(
    Math.PI / 2
  );


  return geometry;
}


const upperWingGeometry =
  createUpperWing();

const lowerWingGeometry =
  createLowerWing();


const upperMaterial =
  new THREE.MeshBasicMaterial({
    color: WING_HIGHLIGHT,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  });


const lowerMaterial =
  new THREE.MeshBasicMaterial({
    color: WING_COLOR,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.68,
    depthWrite: false,
  });


// ============================================================
// INDIVIDUAL BUTTERFLY
// ============================================================

function Butterfly({
  basePosition,
  seed,
}: {
  basePosition: [
    number,
    number,
    number
  ];
  seed: number;
}) {

  const groupRef =
    useRef<THREE.Group>(null);

  const leftUpper =
    useRef<THREE.Mesh>(null);

  const rightUpper =
    useRef<THREE.Mesh>(null);

  const leftLower =
    useRef<THREE.Mesh>(null);

  const rightLower =
    useRef<THREE.Mesh>(null);


  const phase =
    useMemo(
      () =>
        seed *
        Math.PI *
        2,
      [seed]
    );


  const focusedUsername =
    useGardenStore(
      (s) =>
        s.focusedUsername
    );


  const trees =
    useGardenStore(
      (s) => s.trees
    );


  const body =
    useMemo(
      () =>
        new THREE.CapsuleGeometry(
          0.055,
          0.42,
          4,
          8
        ),
      []
    );


  const head =
    useMemo(
      () =>
        new THREE.SphereGeometry(
          0.075,
          8,
          8
        ),
      []
    );


  // ==========================================================
  // ANIMATION
  // ==========================================================

  useFrame(
    ({ clock }) => {

      const elapsed =
        clock.getElapsedTime();

      const t =
        elapsed + phase;


      const group =
        groupRef.current;

      if (!group) return;


      // ------------------------------------------------------
      // IMPORTANT:
      //
      // The old version rendered the group at [0,0,0]
      // and then immediately moved it toward basePosition.
      //
      // That caused every butterfly to appear to shoot
      // outward from the center when the scene started.
      //
      // We now calculate ALL movement relative to the
      // butterfly's own starting position.
      // ------------------------------------------------------

      const selected =
        focusedUsername
          ? trees.find(
              (tree) =>
                tree.username ===
                focusedUsername
            )
          : null;


      // ------------------------------------------------------
      // Gentle organic horizontal movement.
      //
      // This is deliberately small relative to the garden.
      // Butterflies wander around their own area instead of
      // being pulled outward.
      // ------------------------------------------------------

      let offsetX =
        Math.sin(t * 0.42) *
          3.2 +
        Math.sin(t * 0.83) *
          1.1;


      let offsetZ =
        Math.cos(t * 0.36) *
          3.0 +
        Math.sin(t * 0.71) *
          1.3;


      let targetX =
        basePosition[0] +
        offsetX;


      let targetZ =
        basePosition[2] +
        offsetZ;


      // ------------------------------------------------------
      // Selected-tree attraction.
      //
      // Butterflies within the attraction radius gently
      // drift toward the selected tree.
      // ------------------------------------------------------

      if (selected) {

        const dx =
          selected.plotX -
          targetX;

        const dz =
          selected.plotZ -
          targetZ;

        const distance =
          Math.sqrt(
            dx * dx +
            dz * dz
          );


        if (
          distance < 32 &&
          distance > 5
        ) {

          const attraction =
            0.012;


          targetX +=
            dx * attraction;

          targetZ +=
            dz * attraction;
        }
      }


      // ------------------------------------------------------
      // Vertical floating.
      // ------------------------------------------------------

      const targetY =
        basePosition[1] +
        Math.sin(t * 0.75) *
          0.55;


      // ------------------------------------------------------
      // Smooth startup.
      //
      // Even though the butterfly is already placed at its
      // correct base position, we gradually introduce the
      // wandering motion during the first 2 seconds.
      //
      // This prevents the "exploding outward" feeling.
      // ------------------------------------------------------

      const startup =
        THREE.MathUtils.clamp(
          elapsed / 2.0,
          0,
          1
        );

      const startupBlend =
        startup * startup *
        (3 - 2 * startup);


      const finalX =
        THREE.MathUtils.lerp(
          basePosition[0],
          targetX,
          startupBlend
        );


      const finalY =
        THREE.MathUtils.lerp(
          basePosition[1],
          targetY,
          startupBlend
        );


      const finalZ =
        THREE.MathUtils.lerp(
          basePosition[2],
          targetZ,
          startupBlend
        );


      group.position.set(
        finalX,
        finalY,
        finalZ
      );


      // ------------------------------------------------------
      // Direction of travel.
      //
      // Calculate from the movement equations rather than
      // using the absolute world position.
      // ------------------------------------------------------

      const vx =
        Math.cos(t * 0.42) *
          3.2 +
        Math.cos(t * 0.83) *
          0.9;


      const vz =
        -Math.sin(t * 0.36) *
          3.0 +
        Math.cos(t * 0.71);


      group.rotation.y =
        THREE.MathUtils.lerp(
          group.rotation.y,
          Math.atan2(vx, vz),
          0.05
        );


      // Gentle body banking.
      group.rotation.z =
        Math.sin(t * 0.8) *
        0.1;


      // ------------------------------------------------------
      // Wing flapping.
      // ------------------------------------------------------

      const flap =
        0.35 +
        (
          Math.sin(
            t * 11.5
          ) +
          1
        ) *
          0.42;


      if (leftUpper.current) {
        leftUpper.current.rotation.y =
          flap;
      }


      if (rightUpper.current) {
        rightUpper.current.rotation.y =
          -flap;
      }


      if (leftLower.current) {
        leftLower.current.rotation.y =
          flap * 0.82;
      }


      if (rightLower.current) {
        rightLower.current.rotation.y =
          -flap * 0.82;
      }

    }
  );


  return (
    <group
      ref={groupRef}
      position={basePosition}
    >

      <mesh geometry={body}>

        <meshBasicMaterial
          color={BODY_COLOR}
        />

      </mesh>


      <mesh
        geometry={head}
        position={[
          0,
          0.27,
          0,
        ]}
      >

        <meshBasicMaterial
          color={BODY_COLOR}
        />

      </mesh>


      <mesh
        ref={leftUpper}
        geometry={
          upperWingGeometry
        }
        material={
          upperMaterial
        }
        position={[
          -0.035,
          0.1,
          0,
        ]}
        scale={[
          -0.72,
          0.72,
          0.72,
        ]}
      />


      <mesh
        ref={rightUpper}
        geometry={
          upperWingGeometry
        }
        material={
          upperMaterial
        }
        position={[
          0.035,
          0.1,
          0,
        ]}
        scale={[
          0.72,
          0.72,
          0.72,
        ]}
      />


      <mesh
        ref={leftLower}
        geometry={
          lowerWingGeometry
        }
        material={
          lowerMaterial
        }
        position={[
          -0.035,
          -0.02,
          0,
        ]}
        scale={[
          -0.62,
          0.62,
          0.62,
        ]}
      />


      <mesh
        ref={rightLower}
        geometry={
          lowerWingGeometry
        }
        material={
          lowerMaterial
        }
        position={[
          0.035,
          -0.02,
          0,
        ]}
        scale={[
          0.62,
          0.62,
          0.62,
        ]}
      />

    </group>
  );
}


// ============================================================
// DETERMINISTIC RANDOM
// ============================================================

function seeded(seed: number) {

  let value =
    seed | 0;


  return () => {

    value =
      Math.imul(
        value +
          0x6d2b79f5,
        1
      ) | 0;


    let t =
      Math.imul(
        value ^
          (value >>> 15),
        1 | value
      );


    t =
      (
        t +
        Math.imul(
          t ^
            (t >>> 7),
          61 | t
        )
      ) ^
      t;


    return (
      (
        t ^
        (t >>> 14)
      ) >>> 0
    ) / 4294967296;
  };
}


// ============================================================
// BUTTERFLY FLOCK
// ============================================================

export default function Butterflies({
  count = 48,
  radius = 72,
}: {
  count?: number;
  radius?: number;
}) {

  const positions =
    useMemo(() => {

      const random =
        seeded(8247);


      const result: [
        number,
        number,
        number
      ][] = [];


      for (
        let i = 0;
        i < count;
        i++
      ) {

        const angle =
          random() *
          Math.PI *
          2;


        const radiusValue =
          Math.sqrt(
            random()
          ) *
          radius *
          0.85;


        result.push([
          Math.cos(angle) *
            radiusValue,

          3.2 +
            random() *
              4,

          Math.sin(angle) *
            radiusValue,
        ]);
      }


      return result;

    }, [
      count,
      radius,
    ]);


  return (
    <group>

      {positions.map(
        (
          position,
          index
        ) => (

          <Butterfly
            key={index}
            basePosition={
              position
            }
            seed={
              index /
              Math.max(
                1,
                count
              )
            }
          />

        )
      )}

    </group>
  );
}
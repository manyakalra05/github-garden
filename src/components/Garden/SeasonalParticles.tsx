"use client";

import {
  useEffect,
  useMemo,
  useRef,
} from "react";

import {
  useFrame,
} from "@react-three/fiber";

import * as THREE from "three";

import {
  useGardenStore,
  GardenSeason,
} from "@/lib/store";


// ============================================================
// SETTINGS
// ============================================================

const AREA_RADIUS = 100;

const MIN_Y = 1.5;
const MAX_Y = 32;


// ============================================================
// PARTICLE COUNTS
// ============================================================

const SPRING_COUNT = 220;
const SUMMER_COUNT = 150;
const AUTUMN_COUNT = 190;
const WINTER_COUNT = 280;


// ============================================================
// DETERMINISTIC RANDOM
// ============================================================

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);

    t = Math.imul(
      t ^ (t >>> 15),
      1 | t
    );

    t ^= t + Math.imul(
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
// PARTICLE GEOMETRY
// ============================================================

function createParticleGeometry(
  count: number,
  seed: number
) {

  const rand =
    mulberry32(seed);

  const positions =
    new Float32Array(
      count * 3
    );

  for (
    let i = 0;
    i < count;
    i++
  ) {

    const angle =
      rand() *
      Math.PI *
      2;

    /*
     * sqrt(random) gives a genuinely
     * area-filled distribution instead
     * of a central concentration.
     */

    const radius =
      Math.sqrt(rand()) *
      AREA_RADIUS;

    const x =
      Math.cos(angle) *
      radius;

    const z =
      Math.sin(angle) *
      radius;

    const y =
      MIN_Y +
      rand() *
        (MAX_Y - MIN_Y);

    const index =
      i * 3;

    positions[index] =
      x;

    positions[index + 1] =
      y;

    positions[index + 2] =
      z;
  }

  const geometry =
    new THREE.BufferGeometry();

  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(
      positions,
      3
    )
  );

  geometry.computeBoundingSphere();

  return geometry;
}


// ============================================================
// CREATE A PARTICLE TEXTURE
// ============================================================
//
// Instead of rendering tiny square points, each particle gets
// an actual little shape.
//
// This makes the seasonal effect visible from normal camera
// distances.
//
// ============================================================

function createParticleTexture(
  season: GardenSeason
) {

  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width = 64;
  canvas.height = 64;

  const ctx =
    canvas.getContext("2d");

  if (!ctx) {
    return null;
  }

  ctx.clearRect(
    0,
    0,
    64,
    64
  );

  ctx.translate(
    32,
    32
  );


  // ==========================================================
  // SPRING — FLOWER PETAL
  // ==========================================================

  if (season === "spring") {

    ctx.fillStyle =
      "#f3a9cf";

    ctx.beginPath();

    ctx.ellipse(
      -8,
      -7,
      8,
      14,
      -0.55,
      0,
      Math.PI * 2
    );

    ctx.fill();


    ctx.beginPath();

    ctx.ellipse(
      8,
      -7,
      8,
      14,
      0.55,
      0,
      Math.PI * 2
    );

    ctx.fill();


    ctx.beginPath();

    ctx.ellipse(
      -8,
      8,
      8,
      14,
      0.55,
      0,
      Math.PI * 2
    );

    ctx.fill();


    ctx.beginPath();

    ctx.ellipse(
      8,
      8,
      8,
      14,
      -0.55,
      0,
      Math.PI * 2
    );

    ctx.fill();


    ctx.fillStyle =
      "#ffe9a8";

    ctx.beginPath();

    ctx.arc(
      0,
      0,
      5,
      0,
      Math.PI * 2
    );

    ctx.fill();
  }


  // ==========================================================
  // SUMMER — GLOWING POLLEN
  // ==========================================================

  else if (season === "summer") {

    const gradient =
      ctx.createRadialGradient(
        0,
        0,
        0,
        0,
        0,
        24
      );

    gradient.addColorStop(
      0,
      "rgba(255,245,190,1)"
    );

    gradient.addColorStop(
      0.25,
      "rgba(255,221,145,0.95)"
    );

    gradient.addColorStop(
      0.55,
      "rgba(255,191,120,0.45)"
    );

    gradient.addColorStop(
      1,
      "rgba(255,180,110,0)"
    );

    ctx.fillStyle =
      gradient;

    ctx.beginPath();

    ctx.arc(
      0,
      0,
      24,
      0,
      Math.PI * 2
    );

    ctx.fill();
  }


  // ==========================================================
  // AUTUMN — LEAF
  // ==========================================================

  else if (season === "autumn") {

    ctx.fillStyle =
      "#d88d9c";

    ctx.beginPath();

    ctx.moveTo(
      0,
      -22
    );

    ctx.bezierCurveTo(
      17,
      -12,
      17,
      10,
      0,
      23
    );

    ctx.bezierCurveTo(
      -17,
      10,
      -17,
      -12,
      0,
      -22
    );

    ctx.closePath();

    ctx.fill();


    ctx.strokeStyle =
      "#a7657c";

    ctx.lineWidth = 2;

    ctx.beginPath();

    ctx.moveTo(
      0,
      -18
    );

    ctx.lineTo(
      0,
      19
    );

    ctx.stroke();
  }


  // ==========================================================
  // WINTER — SNOWFLAKE
  // ==========================================================

  else {

    ctx.strokeStyle =
      "#f4eaff";

    ctx.lineWidth = 3;

    ctx.lineCap =
      "round";


    for (
      let i = 0;
      i < 3;
      i++
    ) {

      const angle =
        (i / 3) *
        Math.PI;

      const dx =
        Math.cos(angle) *
        22;

      const dy =
        Math.sin(angle) *
        22;


      ctx.beginPath();

      ctx.moveTo(
        -dx,
        -dy
      );

      ctx.lineTo(
        dx,
        dy
      );

      ctx.stroke();


      /*
       * Small branches.
       */

      for (
        const direction of [-1, 1]
      ) {

        const bx =
          Math.cos(angle) *
          12 *
          direction;

        const by =
          Math.sin(angle) *
          12 *
          direction;

        ctx.beginPath();

        ctx.moveTo(
          bx,
          by
        );

        ctx.lineTo(
          bx +
            Math.cos(
              angle +
                Math.PI /
                  3
            ) *
              7,

          by +
            Math.sin(
              angle +
                Math.PI /
                  3
            ) *
              7
        );

        ctx.stroke();


        ctx.beginPath();

        ctx.moveTo(
          bx,
          by
        );

        ctx.lineTo(
          bx +
            Math.cos(
              angle -
                Math.PI /
                  3
            ) *
              7,

          by +
            Math.sin(
              angle -
                Math.PI /
                  3
            ) *
              7
        );

        ctx.stroke();
      }
    }
  }


  const texture =
    new THREE.CanvasTexture(
      canvas
    );

  texture.needsUpdate =
    true;

  texture.colorSpace =
    THREE.SRGBColorSpace;

  return texture;
}


// ============================================================
// SINGLE SEASON SYSTEM
// ============================================================

function SeasonalParticleSystem({
  season,
  count,
  seed,
  size,
  opacity,
}: {
  season: GardenSeason;
  count: number;
  seed: number;
  size: number;
  opacity: number;
}) {

  const pointsRef =
    useRef<THREE.Points>(
      null
    );


  const geometry =
    useMemo(
      () =>
        createParticleGeometry(
          count,
          seed
        ),
      [
        count,
        seed,
      ]
    );


  const texture =
    useMemo(
      () =>
        createParticleTexture(
          season
        ),
      [season]
    );


  /*
   * Store per-particle motion
   * without changing the geometry.
   */

  const motion =
    useMemo(() => {

      const rand =
        mulberry32(
          seed + 777
        );

      return Array.from(
        {
          length: count,
        },
        () => ({
          speed:
            0.45 +
            rand() *
              0.9,

          sway:
            0.4 +
            rand() *
              1.2,

          phase:
            rand() *
            Math.PI *
            2,

          rotation:
            rand() *
            Math.PI *
            2,

          rotationSpeed:
            -1 +
            rand() *
              2,

          size:
            0.65 +
            rand() *
              0.7,
        })
      );

    }, [
      count,
      seed,
    ]);


  useEffect(() => {

    return () => {

      geometry.dispose();

      if (texture) {
        texture.dispose();
      }

    };

  }, [
    geometry,
    texture,
  ]);


  useFrame(
    ({ clock }) => {

      const points =
        pointsRef.current;

      if (!points) {
        return;
      }


      const position =
        points.geometry.getAttribute(
          "position"
        ) as THREE.BufferAttribute;


      const array =
        position.array as
          Float32Array;


      const time =
        clock.getElapsedTime();


      for (
        let i = 0;
        i < count;
        i++
      ) {

        const index =
          i * 3;

        const data =
          motion[i];


        let x =
          array[index];

        let y =
          array[index + 1];

        let z =
          array[index + 2];


        // ====================================================
        // SPRING
        // ====================================================

        if (
          season ===
          "spring"
        ) {

          y -=
            data.speed *
            0.018;

          x +=
            Math.sin(
              time *
                0.7 +
                data.phase
            ) *
            0.018;

          z +=
            Math.cos(
              time *
                0.55 +
                data.phase
            ) *
            0.015;

        }


        // ====================================================
        // SUMMER
        // ====================================================

        else if (
          season ===
          "summer"
        ) {

          y +=
            data.speed *
            0.009;

          x +=
            Math.sin(
              time *
                0.8 +
                data.phase
            ) *
            0.012;

          z +=
            Math.cos(
              time *
                0.6 +
                data.phase
            ) *
            0.012;

        }


        // ====================================================
        // AUTUMN
        // ====================================================

        else if (
          season ===
          "autumn"
        ) {

          y -=
            data.speed *
            0.021;

          x +=
            Math.sin(
              time *
                1.1 +
                data.phase
            ) *
            0.028;

          z +=
            Math.cos(
              time *
                0.85 +
                data.phase
            ) *
            0.025;

        }


        // ====================================================
        // WINTER
        // ====================================================

        else {

          y -=
            data.speed *
            0.014;

          x +=
            Math.sin(
              time *
                0.45 +
                data.phase
            ) *
            0.01;

          z +=
            Math.cos(
              time *
                0.35 +
                data.phase
            ) *
            0.01;

        }


        // ====================================================
        // WRAP VERTICALLY
        // ====================================================

        if (
          y <
          MIN_Y
        ) {

          y =
            MAX_Y +
            2 +
            (i % 8);

        }


        if (
          y >
          MAX_Y
        ) {

          y =
            MIN_Y -
            1 -
            (i % 5) *
              0.2;

        }


        // ====================================================
        // KEEP INSIDE GARDEN
        // ====================================================

        const distance =
          Math.sqrt(
            x * x +
            z * z
          );


        if (
          distance >
          AREA_RADIUS
        ) {

          const factor =
            (AREA_RADIUS -
              3) /
            distance;

          x *=
            factor;

          z *=
            factor;
        }


        array[index] =
          x;

        array[index + 1] =
          y;

        array[index + 2] =
          z;
      }


      position.needsUpdate =
        true;


      /*
       * Slowly rotate the entire
       * particle field so the motion
       * feels organic.
       */

      points.rotation.y =
        Math.sin(
          time * 0.03
        ) *
        0.025;
    }
  );


  return (
    <points
      ref={pointsRef}
      frustumCulled={false}
    >

      <primitive
        object={geometry}
        attach="geometry"
      />


      <pointsMaterial
        map={texture}
        transparent
        opacity={opacity}
        size={size}
        sizeAttenuation
        depthWrite={false}
        depthTest
        alphaTest={0.02}
        blending={
          THREE.NormalBlending
        }
      />

    </points>
  );
}


// ============================================================
// MAIN COMPONENT
// ============================================================

export default function SeasonalParticles() {

  const season =
    useGardenStore(
      (state) =>
        state.season
    );


  return (
    <group>

      {/* =====================================================
          SPRING
          ===================================================== */}

      <group
        visible={
          season ===
          "spring"
        }
      >

        <SeasonalParticleSystem
          season="spring"
          count={SPRING_COUNT}
          seed={1001}
          size={1.7}
          opacity={0.9}
        />

      </group>


      {/* =====================================================
          SUMMER
          ===================================================== */}

      <group
        visible={
          season ===
          "summer"
        }
      >

        <SeasonalParticleSystem
          season="summer"
          count={SUMMER_COUNT}
          seed={2002}
          size={2.2}
          opacity={0.75}
        />

      </group>


      {/* =====================================================
          AUTUMN
          ===================================================== */}

      <group
        visible={
          season ===
          "autumn"
        }
      >

        <SeasonalParticleSystem
          season="autumn"
          count={AUTUMN_COUNT}
          seed={3003}
          size={1.8}
          opacity={0.92}
        />

      </group>


      {/* =====================================================
          WINTER
          ===================================================== */}

      <group
        visible={
          season ===
          "winter"
        }
      >

        <SeasonalParticleSystem
          season="winter"
          count={WINTER_COUNT}
          seed={4004}
          size={1.5}
          opacity={0.9}
        />

      </group>

    </group>
  );
}
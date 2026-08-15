"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { useGardenStore } from "@/lib/store";


// ============================================================
// SKY SHADER
// ============================================================

const skyVertexShader = `
varying vec3 vSkyDirection;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);

  vSkyDirection = worldPosition.xyz - cameraPosition;

  gl_Position =
    projectionMatrix *
    modelViewMatrix *
    vec4(position, 1.0);
}
`;


const skyFragmentShader = `
varying vec3 vSkyDirection;

uniform vec3 topColor;
uniform vec3 midColor;
uniform vec3 horizonColor;

void main() {

  // Vertical direction of the sky.
  float h = normalize(vSkyDirection).y;


  // ----------------------------------------------------------
  // HORIZON -> MID
  //
  // The warm horizon occupies the lower part of the sky,
  // but is deliberately softened so it never becomes
  // a huge white/yellow band.
  // ----------------------------------------------------------

  float horizonBlend =
    smoothstep(
      -0.20,
       0.30,
       h
    );


  // ----------------------------------------------------------
  // MID -> TOP
  //
  // Purple takes over gradually toward the upper sky.
  // ----------------------------------------------------------

  float topBlend =
    smoothstep(
       0.18,
       0.78,
       h
    );


  vec3 horizonToMid =
    mix(
      horizonColor,
      midColor,
      horizonBlend
    );


  vec3 finalColor =
    mix(
      horizonToMid,
      topColor,
      topBlend
    );


  gl_FragColor =
    vec4(
      finalColor,
      1.0
    );
}
`;


// ============================================================
// DETERMINISTIC RANDOM
// ============================================================

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
      (
        t +
        Math.imul(
          t ^ (t >>> 7),
          61 | t
        )
      ) ^ t;

    return (
      (t ^ (t >>> 14)) >>> 0
    ) / 4294967296;
  };
}


// ============================================================
// CLOUD CLUSTER
// ============================================================

function buildCloudCluster(
  rand: () => number,
  cx: number,
  cy: number,
  cz: number
): THREE.BufferGeometry[] {

  const blockCount =
    4 +
    Math.floor(
      rand() * 6
    );

  const parts:
    THREE.BufferGeometry[] = [];

  let x = 0;
  let z = 0;


  for (
    let i = 0;
    i < blockCount;
    i++
  ) {

    const w =
      6 +
      rand() * 8;

    const d =
      6 +
      rand() * 8;

    const h =
      3 +
      rand() * 2.5;


    const geo =
      new THREE.BoxGeometry(
        w,
        h,
        d
      );


    geo.translate(
      cx + x,
      cy +
        (rand() - 0.5) *
          1.5,
      cz + z
    );


    parts.push(
      geo.index
        ? geo.toNonIndexed()
        : geo
    );


    x +=
      (rand() - 0.5) *
      10;

    z +=
      (rand() - 0.5) *
      10;
  }


  return parts;
}


// ============================================================
// SKY COMPONENT
// ============================================================

export default function Sky() {

  const skyRef =
    useRef<THREE.Mesh>(null);

  const { camera } =
    useThree();


  // ----------------------------------------------------------
  // Current garden time.
  //
  // This is the ONLY thing that changes the sky gradient.
  // ----------------------------------------------------------

  const gardenTime =
    useGardenStore(
      (s) => s.gardenTime
    );

  const isNight =
    gardenTime === "night";


  // ==========================================================
  // SKY COLORS
  // ==========================================================

  const uniforms =
    useMemo(
      () => ({

        // ----------------------------------------------------
        // SUNSET
        //
        // Purple at the top
        // Pink in the middle
        // Soft warm white/yellow near horizon
        //
        // These are intentionally NOT pure white.
        // ----------------------------------------------------

        topColor: {
          value:
            new THREE.Color(
              "#6751a8"
            ),
        },

        midColor: {
          value:
            new THREE.Color(
              "#c77fae"
            ),
        },

        horizonColor: {
          value:
            new THREE.Color(
              "#ead9bd"
            ),
        },

      }),
      []
    );


  // ==========================================================
  // UPDATE SKY COLORS
  // ==========================================================
  //
  // We reuse the same shader and simply change its uniforms.
  //
  // Clouds are NOT affected by this.
  //
  // ==========================================================

  useMemo(() => {

    if (!isNight) {

      // ------------------------------------------------------
      // SUNSET
      //
      // Deep purple
      //      ↓
      // Pink
      //      ↓
      // Soft warm horizon
      // ------------------------------------------------------

      uniforms.topColor.value.set(
        "#6751a8"
      );

      uniforms.midColor.value.set(
        "#c77fae"
      );

      uniforms.horizonColor.value.set(
        "#f0d09c"
      );

    } else {

      // ------------------------------------------------------
      // NIGHT
      //
      // Dark purple/indigo sky.
      //
      // Notice that the horizon is NOT black.
      // This keeps the garden readable and preserves depth.
      // ------------------------------------------------------

      uniforms.topColor.value.set(
        "#17132f"
      );

      uniforms.midColor.value.set(
        "#342653"
      );

      uniforms.horizonColor.value.set(
        "#62506f"
      );
    }

  }, [isNight, uniforms]);


  // ==========================================================
  // FOLLOW CAMERA
  // ==========================================================
  //
  // The sky sphere follows the camera so that it always
  // surrounds the garden.
  //
  // IMPORTANT:
  // We do NOT modify the camera itself.
  //
  // ==========================================================

  useFrame(() => {

    if (skyRef.current) {

      skyRef.current.position.copy(
        camera.position
      );

    }

  });


  // ==========================================================
  // CLOUD GEOMETRY
  // ==========================================================

  const cloudGeometry =
    useMemo(() => {

      const rand =
        mulberry32(4242);

      const allParts:
        THREE.BufferGeometry[] = [];

      const clusterCount = 11;


      for (
        let i = 0;
        i < clusterCount;
        i++
      ) {

        const angle =
          (i / clusterCount) *
            Math.PI *
            2 +
          rand() * 0.4;


        const dist =
          120 +
          rand() * 90;


        const cx =
          Math.cos(angle) *
          dist;

        const cz =
          Math.sin(angle) *
          dist;

        const cy =
          55 +
          rand() * 35;


        allParts.push(
          ...buildCloudCluster(
            rand,
            cx,
            cy,
            cz
          )
        );

      }


      const merged =
        mergeGeometries(
          allParts,
          false
        );


      merged?.computeBoundingSphere();

      return merged;

    }, []);


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <group>

      {/* =====================================================
          SKY
          ===================================================== */}

      <mesh
        ref={skyRef}
        renderOrder={-1}
      >

        <sphereGeometry
          args={[
            300,
            64,
            64,
          ]}
        />

        <shaderMaterial
          side={THREE.BackSide}
          vertexShader={
            skyVertexShader
          }
          fragmentShader={
            skyFragmentShader
          }
          uniforms={uniforms}
          depthWrite={false}
          depthTest={false}
        />

      </mesh>


      {/* =====================================================
          SUN
          ===================================================== */}

      {!isNight && (
        <sprite
          position={[
            186,
            55,
            157,
          ]}
          scale={[
            55,
            55,
            1,
          ]}
        >

          <spriteMaterial
            color={
              new THREE.Color(
                3.2,
                2.6,
                1.4
              )
            }
            depthWrite={false}
          />

        </sprite>
      )}


      {/* =====================================================
          CLOUDS
          
          IMPORTANT:
          This color is IDENTICAL for sunset and night.
          
          The cloud color does NOT depend on gardenTime.
          ===================================================== */}

      {cloudGeometry && (

        <mesh
          geometry={
            cloudGeometry
          }
        >

          <meshBasicMaterial
            color="#fdf2f8"
          />

        </mesh>

      )}

    </group>
  );
}
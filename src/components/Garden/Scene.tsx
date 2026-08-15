"use client";

import {
  Suspense,
  useEffect,
} from "react";

import {
  Canvas,
} from "@react-three/fiber";

import {
  Sparkles,
} from "@react-three/drei";

import {
  EffectComposer,
  Bloom,
} from "@react-three/postprocessing";

import Sky from "./Sky";
import Ground from "./Ground";
import Trees from "./Trees";
import Flowers from "./Flowers";
import Butterflies from "./Butterflies";
import SeasonalParticles from "./SeasonalParticles";
import ExploreController from "./ExploreController";
import CameraRig from "./CameraRig";

import {
  useGardenStore,
} from "@/lib/store";


export default function Scene() {

  const setTrees =
    useGardenStore(
      (s) => s.setTrees
    );

  const gardenTime =
    useGardenStore(
      (s) => s.gardenTime
    );


  useEffect(() => {

    fetch("/api/garden")
      .then((response) =>
        response.json()
      )
      .then((data) =>
        setTrees(
          data.trees ?? []
        )
      )
      .catch((error) =>
        console.error(
          "Failed to load garden",
          error
        )
      );

  }, [setTrees]);


  const night =
    gardenTime === "night";


  return (

    <Canvas
      shadows
      camera={{
        position: [
          10,
          6,
          10,
        ],
        fov: 55,
        near: 0.1,
        far: 400,
      }}
      gl={{
        antialias: true,
      }}
    >

      <color
        attach="background"
        args={[
          night
            ? "#76577f"
            : "#caa7c9",
        ]}
      />


      <hemisphereLight
        args={[
          night
            ? "#b7a0dc"
            : "#ffe3c2",

          night
            ? "#241c3d"
            : "#5c4a72",

          night
            ? 0.55
            : 0.9,
        ]}
      />


      {!night && (

        <directionalLight
          position={[
            186,
            55,
            157,
          ]}
          intensity={1.6}
          color="#ffdca8"
          castShadow
          shadow-mapSize={[
            2048,
            2048,
          ]}
          shadow-camera-left={-60}
          shadow-camera-right={60}
          shadow-camera-top={60}
          shadow-camera-bottom={-60}
        />

      )}


      <pointLight
        position={[
          0,
          8,
          0,
        ]}
        intensity={
          night
            ? 0.65
            : 0.4
        }
        color="#c9a3e8"
      />


      <Suspense fallback={null}>

        <Sky />

        <Ground />

        <Trees />

        <Flowers />


        {/* 
          Larger, denser butterfly population.
          The Butterflies component also handles
          the smooth startup so they don't shoot
          outward from the origin.
        */}
        <Butterflies
          count={200}
          radius={130}
        />



        <SeasonalParticles />



        <Sparkles
          count={
            night
              ? 180
              : 120
          }
          scale={[
            100,
            20,
            100,
          ]}
          size={2.2}
          speed={0.2}
          opacity={
            night
              ? 0.65
              : 0.35
          }
          color="#f1dfff"
        />

      </Suspense>


      <ExploreController />

      <CameraRig />


      <EffectComposer>

        <Bloom
          intensity={
            night
              ? 0.75
              : 0.6
          }
          luminanceThreshold={0.4}
          luminanceSmoothing={0.85}
          mipmapBlur
        />

      </EffectComposer>

    </Canvas>
  );
}
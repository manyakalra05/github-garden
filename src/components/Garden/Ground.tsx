"use client";

import { useMemo, useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import {
  getFlowerSpikeArchetype,
  NUM_FLOWER_ARCHETYPES,
} from "./flowerSpikeGeometry";

const GROUND_PLANE_RADIUS = 146;
// Was 85 — far smaller than both the actual planted-tree area (furthest
// tree sits ~120 units out) and the ground plane itself, which is why
// decoration only ever covered a small circle in the middle. This now
// reaches out to the fog's effective range, so coverage never visibly
// stops short — it just fades into fog like everything else does.
const FIELD_RADIUS = 145;

const GRASS_CELL = 0.45;
const GRASS_SKIP = 0.1;
const grassGeometry = new THREE.BoxGeometry(0.08, 0.4, 0.08);
const GRASS_COLORS = ["#4a6b3a", "#587a45", "#3f5c32"];

const SPIKE_CELL = 2.2;
const SPIKE_SKIP = 0.1;

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function scatterGrid(
  rand: () => number,
  cell: number,
  skipProbability: number
) {
  const pts: { x: number; z: number; scale: number; rot: number; hash: number }[] = [];
  for (let x = -FIELD_RADIUS; x <= FIELD_RADIUS; x += cell) {
    for (let z = -FIELD_RADIUS; z <= FIELD_RADIUS; z += cell) {
      if (x * x + z * z > FIELD_RADIUS * FIELD_RADIUS) continue;
      if (rand() < skipProbability) continue;
      const jitterX = (rand() - 0.5) * cell * 0.7;
      const jitterZ = (rand() - 0.5) * cell * 0.7;
      pts.push({
        x: x + jitterX,
        z: z + jitterZ,
        scale: 0.8 + rand() * 0.5,
        rot: rand() * Math.PI * 2,
        hash: Math.floor(rand() * 1e9),
      });
    }
  }
  return pts;
}

const groundVertexShader = `
varying vec2 vWorldXZ;
void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldXZ = worldPosition.xz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const groundFragmentShader = `
varying vec2 vWorldXZ;
uniform vec3 baseColor;
uniform vec3 highlightColor;
uniform vec3 fogColor;
uniform float fieldRadius;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
  float broad = noise(vWorldXZ * 0.035);
  vec3 shaded = mix(baseColor, highlightColor, smoothstep(0.35, 0.75, broad));

  float dist = length(vWorldXZ);
  float edgeFade = smoothstep(fieldRadius * 0.8, fieldRadius * 1.7, dist);
  vec3 finalColor = mix(shaded, fogColor, edgeFade);

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

export default function Ground() {
  const grassRef = useRef<THREE.InstancedMesh>(null);
  const rand = useMemo(() => mulberry32(1337), []);

  const grassPositions = useMemo(
    () => scatterGrid(rand, GRASS_CELL, GRASS_SKIP),
    [rand]
  );
  const spikeRand = useMemo(() => mulberry32(9001), []);
  const spikePositions = useMemo(
    () => scatterGrid(spikeRand, SPIKE_CELL, SPIKE_SKIP),
    [spikeRand]
  );
  const spikeBuckets = useMemo(() => {
    const b: typeof spikePositions[] = Array.from(
      { length: NUM_FLOWER_ARCHETYPES },
      () => []
    );
    for (const p of spikePositions) {
      b[p.hash % NUM_FLOWER_ARCHETYPES].push(p);
    }
    return b;
  }, [spikePositions]);

  const groundUniforms = useMemo(
    () => ({
      baseColor: { value: new THREE.Color("#5c4a72") },
      highlightColor: { value: new THREE.Color("#78608f") },
      fogColor: { value: new THREE.Color("#caa7c9") },
      fieldRadius: { value: FIELD_RADIUS },
    }),
    []
  );

  useLayoutEffect(() => {
    const grass = grassRef.current;
    if (!grass) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    grassPositions.forEach((p, i) => {
      dummy.position.set(p.x, 0.2 * p.scale, p.z);
      dummy.rotation.y = p.rot;
      dummy.rotation.z = (p.hash % 100) / 100 - 0.5;
      dummy.scale.set(p.scale, p.scale, p.scale);
      dummy.updateMatrix();
      grass.setMatrixAt(i, dummy.matrix);
      color.set(GRASS_COLORS[p.hash % GRASS_COLORS.length]);
      grass.setColorAt(i, color);
    });
    grass.instanceMatrix.needsUpdate = true;
    if (grass.instanceColor) grass.instanceColor.needsUpdate = true;
  }, [grassPositions]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[GROUND_PLANE_RADIUS, 64]} />
        <shaderMaterial
          vertexShader={groundVertexShader}
          fragmentShader={groundFragmentShader}
          uniforms={groundUniforms}
        />
      </mesh>

      <instancedMesh
        ref={grassRef}
        args={[grassGeometry, undefined, grassPositions.length]}
        castShadow
      >
        <meshStandardMaterial
          vertexColors
          roughness={0.6}
          emissive={new THREE.Color("#4a6b3a")}
          emissiveIntensity={0.2}
        />
      </instancedMesh>

      {spikeBuckets.map((bucket, i) =>
        bucket.length ? (
          <SpikeFlowerInstances key={i} archetypeIndex={i} points={bucket} />
        ) : null
      )}
    </group>
  );
}

function SpikeFlowerInstances({
  archetypeIndex,
  points,
}: {
  archetypeIndex: number;
  points: ReturnType<typeof scatterGrid>;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(
    () => getFlowerSpikeArchetype(archetypeIndex * 613 + 41),
    [archetypeIndex]
  );

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    points.forEach((p, i) => {
      dummy.position.set(p.x, 0, p.z);
      dummy.rotation.y = p.rot;
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [points]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, undefined, points.length]}
      castShadow
    >
      <meshStandardMaterial vertexColors roughness={0.45} metalness={0.05} />
    </instancedMesh>
  );
}
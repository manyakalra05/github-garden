"use client";

import {
  useEffect,
  useRef,
} from "react";

import {
  useThree,
  useFrame,
} from "@react-three/fiber";

import {
  OrbitControls,
  RoundedBox,
} from "@react-three/drei";

import * as THREE from "three";
import gsap from "gsap";

import {
  useGardenStore,
} from "@/lib/store";

import {
  treeVisualScale,
} from "@/lib/treeVisual";


// ============================================================
// NORMAL TREE FOCUS
// ============================================================

const DIR = {
  x: 1 / 1.5,
  y: 0.5 / 1.5,
  z: 1 / 1.5,
};


// ============================================================
// CINEMATIC FLIGHT SETTINGS
// ============================================================

const FLIGHT_RADIUS_X = 72;
const FLIGHT_RADIUS_Z = 62;

const FLIGHT_HEIGHT = 27;

const CAMERA_BEHIND = 13;
const CAMERA_SIDE = 2.5;
const CAMERA_HEIGHT = 5.0;

const FLIGHT_SPEED = 0.045;


// ============================================================
// CAMERA VISIBILITY SETTINGS
// ============================================================

/*
 * We use a dense angular search around the selected tree.
 *
 * This is NOT the old "sum obstruction penalties" approach.
 *
 * Every neighboring tree creates an angular blocked interval.
 * We then look for the direction with the greatest actual
 * angular clearance from those intervals.
 */
const VISIBILITY_CANDIDATES = 72;


/*
 * Base visual radius used when converting a tree into an
 * angular obstacle.
 */
const VISIBILITY_RADIUS = 1.8;


/*
 * Additional corridor around the selected tree.
 */
const VISIBILITY_CORRIDOR = 2.8;


/*
 * Trees beyond this distance have very little influence on
 * the camera viewpoint.
 */
const VISIBILITY_DEPTH = 48;


/*
 * Nearby trees receive more importance.
 */
const CLOSE_TREE_DISTANCE = 18;


// ============================================================
// TYPES
// ============================================================

type TreeLike = {
  username: string;
  plotX: number;
  plotZ: number;
  treeHeight: number;
};


type TreeFocusTarget = {
  x: number;
  y: number;
  z: number;
  treeHeight: number;
};


// ============================================================
// HELPERS
// ============================================================

function lerp(
  current: number,
  target: number,
  amount: number
) {
  return (
    current +
    (target - current) *
      Math.min(
        1,
        Math.max(0, amount)
      )
  );
}


/*
 * Return the smallest absolute difference between two angles.
 *
 * Result is always in [0, PI].
 */
function angularDistance(
  a: number,
  b: number
) {
  let difference =
    Math.abs(
      a - b
    );

  if (
    difference >
    Math.PI
  ) {
    difference =
      Math.PI * 2 -
      difference;
  }

  return difference;
}


/*
 * Normalize an angle to [-PI, PI].
 */
function normalizeAngle(
  angle: number
) {
  while (
    angle > Math.PI
  ) {
    angle -=
      Math.PI * 2;
  }

  while (
    angle < -Math.PI
  ) {
    angle +=
      Math.PI * 2;
  }

  return angle;
}


// ============================================================
// CAMERA DIRECTION SEARCH
// ============================================================

/*
 * Find a camera direction with maximum spatial clearance.
 *
 * IMPORTANT:
 *
 * This intentionally does NOT use Raycaster.
 *
 * Instead, every neighboring tree is represented by an angular
 * obstacle as seen from the selected tree.
 *
 * Example:
 *
 *                 tree
 *                  |
 *             \    |    /
 *              \   |   /
 *               \  |  /
 *                \ | /
 *                 🌳
 *
 * A large tree close to the target occupies a much larger
 * angular interval than a small tree far away.
 *
 * The algorithm therefore searches for the largest genuinely
 * open angular corridor rather than simply adding arbitrary
 * obstruction scores.
 */
function findBestCameraDirection(
  targetX: number,
  targetZ: number,
  trees: TreeLike[],
  currentDirectionX: number,
  currentDirectionZ: number
) {

  // ----------------------------------------------------------
  // CURRENT CAMERA DIRECTION
  // ----------------------------------------------------------

  const currentLength =
    Math.sqrt(
      currentDirectionX *
        currentDirectionX +
      currentDirectionZ *
        currentDirectionZ
    );

  let currentX =
    currentDirectionX;

  let currentZ =
    currentDirectionZ;

  if (
    currentLength >
    0.001
  ) {

    currentX /=
      currentLength;

    currentZ /=
      currentLength;

  } else {

    const defaultLength =
      Math.sqrt(
        DIR.x * DIR.x +
        DIR.z * DIR.z
      );

    currentX =
      DIR.x /
      defaultLength;

    currentZ =
      DIR.z /
      defaultLength;
  }


  const currentAngle =
    Math.atan2(
      currentZ,
      currentX
    );


  // ----------------------------------------------------------
  // GARDEN-OUTWARD DIRECTION
  // ----------------------------------------------------------

  /*
   * Trees in this project are distributed around the garden.
   *
   * Looking outward from the garden center toward the selected
   * tree gives us another useful fallback direction.
   *
   * It is only a preference, never a hard requirement.
   */
  const outwardLength =
    Math.sqrt(
      targetX * targetX +
      targetZ * targetZ
    );

  let outwardAngle =
    currentAngle;

  if (
    outwardLength >
    0.001
  ) {

    outwardAngle =
      Math.atan2(
        targetZ,
        targetX
      );
  }


  // ----------------------------------------------------------
  // BUILD OBSTACLE DATA
  // ----------------------------------------------------------

  const obstacles: {
    angle: number;
    angularRadius: number;
    weight: number;
    distance: number;
  }[] = [];


  for (
    const tree of trees
  ) {

    const dx =
      tree.plotX -
      targetX;

    const dz =
      tree.plotZ -
      targetZ;

    const distance =
      Math.sqrt(
        dx * dx +
        dz * dz
      );


    /*
     * Ignore the selected tree and trees that are too far away.
     */
    if (
      distance <
      0.001 ||
      distance >
      VISIBILITY_DEPTH
    ) {
      continue;
    }


    /*
     * Convert the tree into a visual obstacle radius.
     *
     * treeVisualScale() is the same scale already used by the
     * actual tree rendering.
     */
    const scale =
      Math.max(
        0.5,
        treeVisualScale(
          tree.treeHeight
        )
      );


    /*
     * Larger trees occupy more angular space.
     */
    const visualRadius =
      Math.max(
        VISIBILITY_RADIUS,
        scale * 1.55 +
          VISIBILITY_CORRIDOR
      );


    /*
     * Angular radius occupied by this tree.
     *
     * asin(r / d) gives the half-angle subtended by the
     * obstacle.
     */
    const ratio =
      THREE.MathUtils.clamp(
        visualRadius /
          distance,
        0,
        0.92
      );

    const angularRadius =
      Math.asin(
        ratio
      );


    const angle =
      Math.atan2(
        dz,
        dx
      );


    /*
     * Nearby trees are more important.
     */
    const proximity =
      1 -
      Math.min(
        1,
        distance /
          CLOSE_TREE_DISTANCE
      );


    /*
     * Larger trees are more important.
     */
    const sizeWeight =
      Math.min(
        3,
        0.8 +
          scale * 0.55
      );


    const weight =
      1 +
      proximity * 2.5 +
      sizeWeight * 0.5;


    obstacles.push({
      angle,
      angularRadius,
      weight,
      distance,
    });
  }


  // ----------------------------------------------------------
  // CANDIDATE DIRECTIONS
  // ----------------------------------------------------------

  const candidates: {
    x: number;
    z: number;
    angle: number;
  }[] = [];


  /*
   * Uniform angular sampling.
   *
   * This is simply candidate generation.
   *
   * The important difference from the previous algorithm is
   * that candidates are evaluated by their angular clearance
   * from actual neighboring-tree obstacle intervals.
   */
  for (
    let i = 0;
    i <
    VISIBILITY_CANDIDATES;
    i++
  ) {

    const angle =
      (
        i /
        VISIBILITY_CANDIDATES
      ) *
      Math.PI *
      2;

    candidates.push({
      x:
        Math.cos(angle),
      z:
        Math.sin(angle),
      angle,
    });
  }


  /*
   * Explicitly test the current direction.
   */
  candidates.push({
    x: currentX,
    z: currentZ,
    angle: currentAngle,
  });


  /*
   * Explicitly test the outward garden direction.
   */
  candidates.push({
    x:
      Math.cos(
        outwardAngle
      ),
    z:
      Math.sin(
        outwardAngle
      ),
    angle:
      outwardAngle,
  });


  // ----------------------------------------------------------
  // SCORE CANDIDATES
  // ----------------------------------------------------------

  let bestX =
    currentX;

  let bestZ =
    currentZ;

  let bestScore =
    -Infinity;


  for (
    const candidate of candidates
  ) {

    let minimumClearance =
      Math.PI;


    let weightedClearance =
      0;

    let blockedPenalty =
      0;


    for (
      const obstacle of obstacles
    ) {

      const difference =
        angularDistance(
          candidate.angle,
          obstacle.angle
        );


      /*
       * Positive clearance means the candidate lies outside
       * the visual obstacle.
       *
       * Negative clearance means the candidate lies inside
       * the obstacle's angular interval.
       */
      const clearance =
        difference -
        obstacle.angularRadius;


      minimumClearance =
        Math.min(
          minimumClearance,
          clearance
        );


      /*
       * Strong penalty when the camera lies inside the
       * projected obstacle.
       */
      if (
        clearance <
        0
      ) {

        const penetration =
          -clearance;

        blockedPenalty +=
          penetration *
          obstacle.weight *
          8;

      } else {

        /*
         * Reward actual angular separation.
         *
         * Nearby obstacles contribute more.
         */
        weightedClearance +=
          Math.min(
            clearance,
            0.8
          ) *
          obstacle.weight;
      }
    }


    // --------------------------------------------------------
    // SCORE COMPONENTS
    // --------------------------------------------------------

    /*
     * The minimum clearance is the most important component.
     *
     * We want the camera to have breathing room from its
     * closest projected tree.
     */
    const clearanceScore =
      minimumClearance *
      18;


    /*
     * Reward having multiple trees away from the camera
     * direction.
     */
    const openSpaceScore =
      weightedClearance *
      1.5;


    /*
     * Strongly reject directions that actually pass through
     * projected tree space.
     */
    const obstructionScore =
      -blockedPenalty;


    /*
     * Current camera direction is only a tie-breaker.
     *
     * We deliberately keep this small so a genuinely open
     * direction wins instead of preserving a bad viewpoint.
     */
    const currentDifference =
      angularDistance(
        candidate.angle,
        currentAngle
      );

    const currentPreference =
      (
        1 -
        currentDifference /
          Math.PI
      ) *
      1.2;


    /*
     * Slight preference for looking outward from the garden.
     */
    const outwardDifference =
      angularDistance(
        candidate.angle,
        outwardAngle
      );

    const outwardPreference =
      (
        1 -
        outwardDifference /
          Math.PI
      ) *
      0.8;


    const score =
      clearanceScore +
      openSpaceScore +
      obstructionScore +
      currentPreference +
      outwardPreference;


    if (
      score >
      bestScore
    ) {

      bestScore =
        score;

      bestX =
        candidate.x;

      bestZ =
        candidate.z;
    }
  }


  return {
    x: bestX,
    z: bestZ,
  };
}


// ============================================================
// CUTE PINK FLYING CREATURE
// ============================================================

function FlyingCreature({
  groupRef,
}: {
  groupRef: (
    node: THREE.Group | null
  ) => void;
}) {

  return (
    <group
      ref={groupRef}
      scale={0.9}
    >

      {/* BODY */}

      <RoundedBox
        args={[
          2.8,
          1.7,
          3.8,
        ]}
        radius={0.35}
        smoothness={4}
        castShadow
      >
        <meshStandardMaterial
          color="#ff4f9a"
          roughness={0.58}
          metalness={0}
        />
      </RoundedBox>


      {/* BELLY */}

      <RoundedBox
        position={[
          0,
          -0.25,
          -1.78,
        ]}
        args={[
          2.05,
          1.0,
          0.35,
        ]}
        radius={0.18}
        smoothness={3}
      >
        <meshStandardMaterial
          color="#ffb3d5"
          roughness={0.65}
        />
      </RoundedBox>


      {/* LEFT WING */}

      <RoundedBox
        position={[
          -2.0,
          0.15,
          0.1,
        ]}
        rotation={[
          0,
          0,
          -0.16,
        ]}
        args={[
          2.2,
          0.28,
          2.5,
        ]}
        radius={0.18}
        smoothness={3}
        castShadow
      >
        <meshStandardMaterial
          color="#ff70ad"
          roughness={0.55}
        />
      </RoundedBox>


      {/* RIGHT WING */}

      <RoundedBox
        position={[
          2.0,
          0.15,
          0.1,
        ]}
        rotation={[
          0,
          0,
          0.16,
        ]}
        args={[
          2.2,
          0.28,
          2.5,
        ]}
        radius={0.18}
        smoothness={3}
        castShadow
      >
        <meshStandardMaterial
          color="#ff70ad"
          roughness={0.55}
        />
      </RoundedBox>


      {/* TAIL */}

      <RoundedBox
        position={[
          0,
          0.35,
          2.0,
        ]}
        rotation={[
          -0.35,
          0,
          0,
        ]}
        args={[
          1.25,
          1.25,
          1.35,
        ]}
        radius={0.25}
        smoothness={3}
        castShadow
      >
        <meshStandardMaterial
          color="#ff3d8d"
          roughness={0.65}
        />
      </RoundedBox>


      {/* TAIL POM-POM */}

      <mesh
        position={[
          0,
          0.45,
          2.7,
        ]}
        castShadow
      >
        <sphereGeometry
          args={[
            0.55,
            16,
            16,
          ]}
        />

        <meshStandardMaterial
          color="#ff8fbd"
          roughness={0.6}
        />
      </mesh>


      {/* EYES */}

      <mesh
        position={[
          -0.65,
          0.28,
          -1.94,
        ]}
      >
        <sphereGeometry
          args={[
            0.23,
            16,
            16,
          ]}
        />

        <meshStandardMaterial
          color="#38172d"
          roughness={0.35}
        />
      </mesh>


      <mesh
        position={[
          0.65,
          0.28,
          -1.94,
        ]}
      >
        <sphereGeometry
          args={[
            0.23,
            16,
            16,
          ]}
        />

        <meshStandardMaterial
          color="#38172d"
          roughness={0.35}
        />
      </mesh>


      {/* EYE HIGHLIGHTS */}

      <mesh
        position={[
          -0.71,
          0.36,
          -2.13,
        ]}
      >
        <sphereGeometry
          args={[
            0.07,
            10,
            10,
          ]}
        />

        <meshBasicMaterial
          color="#ffffff"
        />
      </mesh>


      <mesh
        position={[
          0.59,
          0.36,
          -2.13,
        ]}
      >
        <sphereGeometry
          args={[
            0.07,
            10,
            10,
          ]}
        />

        <meshBasicMaterial
          color="#ffffff"
        />
      </mesh>


      {/* ANTENNAS */}

      <mesh
        position={[
          -0.7,
          1.05,
          -0.9,
        ]}
        rotation={[
          0,
          0,
          -0.25,
        ]}
      >
        <cylinderGeometry
          args={[
            0.045,
            0.045,
            0.8,
            8,
          ]}
        />

        <meshStandardMaterial
          color="#ff3d8d"
        />
      </mesh>


      <mesh
        position={[
          0.7,
          1.05,
          -0.9,
        ]}
        rotation={[
          0,
          0,
          0.25,
        ]}
      >
        <cylinderGeometry
          args={[
            0.045,
            0.045,
            0.8,
            8,
          ]}
        />

        <meshStandardMaterial
          color="#ff3d8d"
        />
      </mesh>


      {/* ANTENNA BALLS */}

      <mesh
        position={[
          -0.8,
          1.42,
          -0.9,
        ]}
      >
        <sphereGeometry
          args={[
            0.13,
            12,
            12,
          ]}
        />

        <meshStandardMaterial
          color="#ffb8d6"
          emissive="#ff4f9a"
          emissiveIntensity={0.35}
        />
      </mesh>


      <mesh
        position={[
          0.8,
          1.42,
          -0.9,
        ]}
      >
        <sphereGeometry
          args={[
            0.13,
            12,
            12,
          ]}
        />

        <meshStandardMaterial
          color="#ffb8d6"
          emissive="#ff4f9a"
          emissiveIntensity={0.35}
        />
      </mesh>

    </group>
  );
}


// ============================================================
// CAMERA RIG
// ============================================================

export default function CameraRig() {

  const controlsRef =
    useRef<any>(null);

  const creatureRef =
    useRef<THREE.Group | null>(
      null
    );


  const { camera } =
    useThree();


  const flyToTarget =
    useGardenStore(
      (s) => s.flyToTarget
    );


  const exploreMode =
    useGardenStore(
      (s) => s.exploreMode
    );


  const trees =
    useGardenStore(
      (s) => s.trees
    );


  const setCameraPosition =
    useGardenStore(
      (s) => s.setCameraPosition
    );


  const autoRotate =
    useRef(true);


  const lastCameraUpdate =
    useRef(0);


  const flightAngle =
    useRef(0);


  const cinematicBlend =
    useRef({
      current: 0,
    });


  const cinematicStarted =
    useRef(false);


  // ==========================================================
  // NORMAL TREE FOCUS
  // ==========================================================

  useEffect(() => {

    if (
      exploreMode ||
      !flyToTarget ||
      !controlsRef.current
    ) {
      return;
    }


    autoRotate.current =
      false;


    const controls =
      controlsRef.current;


    // --------------------------------------------------------
    // CAMERA DISTANCE
    // --------------------------------------------------------

    /*
     * THIS IS THE ESTABLISHED DISTANCE FORMULA.
     *
     * Do not change this.
     */
    const scale =
      treeVisualScale(
        flyToTarget.treeHeight
      );


    const treeHeight =
      flyToTarget.treeHeight;


    const distance =
      THREE.MathUtils.clamp(
        16 +
          scale * 18 +
          treeHeight * 0.45,
        16,
        48
      );


    // --------------------------------------------------------
    // CURRENT CAMERA DIRECTION
    // --------------------------------------------------------

    let currentDirectionX =
      camera.position.x -
      flyToTarget.x;


    let currentDirectionZ =
      camera.position.z -
      flyToTarget.z;


    const currentDirectionLength =
      Math.sqrt(
        currentDirectionX *
          currentDirectionX +
        currentDirectionZ *
          currentDirectionZ
      );


    if (
      currentDirectionLength >
      0.001
    ) {

      currentDirectionX /=
        currentDirectionLength;

      currentDirectionZ /=
        currentDirectionLength;

    } else {

      const defaultLength =
        Math.sqrt(
          DIR.x * DIR.x +
          DIR.z * DIR.z
        );


      currentDirectionX =
        DIR.x /
        defaultLength;


      currentDirectionZ =
        DIR.z /
        defaultLength;
    }


    // --------------------------------------------------------
    // FIND ACTUALLY OPEN DIRECTION
    // --------------------------------------------------------

    const bestDirection =
      findBestCameraDirection(
        flyToTarget.x,
        flyToTarget.z,
        trees,
        currentDirectionX,
        currentDirectionZ
      );


    // --------------------------------------------------------
    // CAMERA POSITION
    // --------------------------------------------------------

    const camPos = {

      x:
        flyToTarget.x +
        bestDirection.x *
          distance,

      y:
        flyToTarget.y +
        DIR.y *
          distance,

      z:
        flyToTarget.z +
        bestDirection.z *
          distance,
    };


    // --------------------------------------------------------
    // CAMERA ANIMATION
    // --------------------------------------------------------

    gsap.killTweensOf(
      controls.target
    );

    gsap.killTweensOf(
      camera.position
    );


    /*
     * Faster than the old 2.2 second movement while still
     * keeping the camera movement smooth.
     */
    gsap.to(
      controls.target,
      {
        x: flyToTarget.x,
        y: flyToTarget.y,
        z: flyToTarget.z,
        duration: 2,
        ease: "power2.out",
        overwrite: true,
      }
    );


    gsap.to(
      camera.position,
      {
        x: camPos.x,
        y: camPos.y,
        z: camPos.z,
        duration: 2,
        ease: "power2.out",
        overwrite: true,
      }
    );

  }, [
    flyToTarget,
    camera,
    exploreMode,
    trees,
  ]);


  // ==========================================================
  // ENTER / EXIT EXPLORE
  // ==========================================================

  useEffect(() => {

    if (exploreMode) {

      autoRotate.current =
        false;


      cinematicStarted.current =
        true;


      flightAngle.current =
        Math.atan2(
          camera.position.z,
          camera.position.x
        );


      if (
        creatureRef.current
      ) {

        const angle =
          flightAngle.current;


        const x =
          Math.cos(angle) *
          FLIGHT_RADIUS_X;


        const z =
          Math.sin(angle) *
          FLIGHT_RADIUS_Z;


        creatureRef.current.position.set(
          x,
          FLIGHT_HEIGHT,
          z
        );


        creatureRef.current.rotation.set(
          0,
          angle + Math.PI / 2,
          0
        );
      }


      gsap.to(
        cinematicBlend.current,
        {
          current: 1,
          duration: 1.2,
          ease: "power2.inOut",
        }
      );

    } else {

      cinematicStarted.current =
        false;


      gsap.to(
        cinematicBlend.current,
        {
          current: 0,
          duration: 0.8,
          ease: "power2.inOut",

          onComplete: () => {

            autoRotate.current =
              true;


            if (
              controlsRef.current
            ) {

              controlsRef.current.autoRotate =
                true;


              controlsRef.current.autoRotateSpeed =
                0.35;
            }
          },
        }
      );
    }

  }, [
    exploreMode,
    camera,
  ]);


  // ==========================================================
  // CINEMATIC FLIGHT
  // ==========================================================

  useFrame(
    (
      state,
      delta
    ) => {

      if (
        exploreMode &&
        cinematicStarted.current
      ) {

        flightAngle.current +=
          delta *
          FLIGHT_SPEED;


        const angle =
          flightAngle.current;


        const radiusX =
          FLIGHT_RADIUS_X +
          Math.sin(
            angle * 0.7
          ) *
          6;


        const radiusZ =
          FLIGHT_RADIUS_Z +
          Math.cos(
            angle * 0.55
          ) *
          5;


        const creatureX =
          Math.cos(angle) *
          radiusX;


        const creatureZ =
          Math.sin(angle) *
          radiusZ;


        const creatureY =
          FLIGHT_HEIGHT +
          Math.sin(
            angle * 1.15
          ) *
          2.0;


        const nextAngle =
          angle + 0.015;


        const nextRadiusX =
          FLIGHT_RADIUS_X +
          Math.sin(
            nextAngle * 0.7
          ) *
          6;


        const nextRadiusZ =
          FLIGHT_RADIUS_Z +
          Math.cos(
            nextAngle * 0.55
          ) *
          5;


        const nextX =
          Math.cos(nextAngle) *
          nextRadiusX;


        const nextZ =
          Math.sin(nextAngle) *
          nextRadiusZ;


        const direction =
          new THREE.Vector3(
            nextX - creatureX,
            0,
            nextZ - creatureZ
          ).normalize();


        // ======================================================
        // CREATURE
        // ======================================================

        if (
          creatureRef.current
        ) {

          creatureRef.current.position.set(
            creatureX,
            creatureY,
            creatureZ
          );


          const targetRotation =
            Math.atan2(
              -direction.x,
              -direction.z
            );


          creatureRef.current.rotation.y =
            lerp(
              creatureRef.current.rotation.y,
              targetRotation,
              0.14
            );


          const bank =
            Math.sin(
              angle * 1.3
            ) *
            0.08;


          creatureRef.current.rotation.z =
            lerp(
              creatureRef.current.rotation.z,
              bank,
              0.08
            );
        }


        // ======================================================
        // THIRD-PERSON CAMERA
        // ======================================================

        const behindX =
          creatureX -
          direction.x *
            CAMERA_BEHIND;


        const behindZ =
          creatureZ -
          direction.z *
            CAMERA_BEHIND;


        const sideX =
          -direction.z *
          CAMERA_SIDE;


        const sideZ =
          direction.x *
          CAMERA_SIDE;


        const desiredCameraX =
          behindX +
          sideX;


        const desiredCameraY =
          creatureY +
          CAMERA_HEIGHT;


        const desiredCameraZ =
          behindZ +
          sideZ;


        const blend =
          cinematicBlend.current.current;


        camera.position.x =
          lerp(
            camera.position.x,
            desiredCameraX,
            0.065 * blend
          );


        camera.position.y =
          lerp(
            camera.position.y,
            desiredCameraY,
            0.065 * blend
          );


        camera.position.z =
          lerp(
            camera.position.z,
            desiredCameraZ,
            0.065 * blend
          );


        // ------------------------------------------------------
        // LOOK AHEAD
        // ------------------------------------------------------

        const lookAhead =
          11;


        const targetX =
          creatureX +
          direction.x *
            lookAhead;


        const targetY =
          creatureY -
          1.8;


        const targetZ =
          creatureZ +
          direction.z *
            lookAhead;


        if (
          controlsRef.current
        ) {

          const target =
            controlsRef.current.target;


          target.x =
            lerp(
              target.x,
              targetX,
              0.065 * blend
            );


          target.y =
            lerp(
              target.y,
              targetY,
              0.065 * blend
            );


          target.z =
            lerp(
              target.z,
              targetZ,
              0.065 * blend
            );


          controlsRef.current.autoRotate =
            false;


          controlsRef.current.update();
        }

      } else if (
        autoRotate.current &&
        controlsRef.current
      ) {

        controlsRef.current.autoRotate =
          true;


        controlsRef.current.autoRotateSpeed =
          0.35;
      }


      // ========================================================
      // CAMERA POSITION STORE
      // ========================================================

      if (
        state.clock.elapsedTime -
          lastCameraUpdate.current >
        0.1
      ) {

        lastCameraUpdate.current =
          state.clock.elapsedTime;


        setCameraPosition({
          x: camera.position.x,
          y: camera.position.y,
          z: camera.position.z,
        });
      }

    }
  );


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <>
      {exploreMode && (
        <FlyingCreature
          groupRef={(node) => {
            creatureRef.current =
              node;
          }}
        />
      )}

      <OrbitControls
        ref={controlsRef}

        enableDamping
        dampingFactor={0.06}

        minDistance={4}
        maxDistance={200}

        maxPolarAngle={
          Math.PI / 2.05
        }

        enablePan
        panSpeed={0.65}
      />
    </>
  );
}
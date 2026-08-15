import { create } from "zustand";
import { canopyCenterY } from "./treeVisual";

export type GardenSeason =
  | "spring"
  | "summer"
  | "autumn"
  | "winter";

export type GardenTime =
  | "sunset"
  | "night";

export interface TreeData {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  primaryLanguage: string | null;
  accentColor: string;

  treeHeight: number;
  canopySpread: number;
  flowerDensity: number;
  glowIntensity: number;

  plotX: number;
  plotZ: number;
  plotSeed: number;

  isClaimed: boolean;
  waterCount: number;

  contributions: number;
  followers: number;

  pullRequests?: number;
  publicRepos?: number;
  bio?: string | null;
}

interface GardenState {
  trees: TreeData[];

  loaded: boolean;

  focusedUsername: string | null;

  /*
   * A searched tree that isn't part of the normal 150-tree
   * sample is pinned here so it remains visible after the
   * statistics dialog is closed.
   */
  pinnedUsername: string | null;

  flyToTarget: {
    x: number;
    y: number;
    z: number;
    treeHeight: number;
  } | null;

  gardenTime: GardenTime;

  season: GardenSeason;

  exploreMode: boolean;

  cameraPosition: {
    x: number;
    y: number;
    z: number;
  };

  currentUsername: string | null;


  setTrees: (
    trees: TreeData[]
  ) => void;


  upsertTree: (
    tree: TreeData
  ) => void;


  focusUser: (
    username: string,
    x: number,
    z: number,
    treeHeight: number
  ) => void;


  /*
   * Used by Trees.tsx to correct the camera target to the
   * actual generated/rendered tree position.
   */
  syncFocusPosition: (
    x: number,
    z: number,
    treeHeight: number
  ) => void;


  /*
   * Keep a searched tree visible even after its statistics
   * card is closed.
   */
  pinTree: (
    username: string
  ) => void;


  clearFocus: () => void;


  setGardenTime: (
    time: GardenTime
  ) => void;


  setSeason: (
    season: GardenSeason
  ) => void;


  setExploreMode: (
    enabled: boolean
  ) => void;


  setCameraPosition: (
    position: {
      x: number;
      y: number;
      z: number;
    }
  ) => void;


  setCurrentUsername: (
    username: string | null
  ) => void;
}


export const useGardenStore =
  create<GardenState>((set) => ({

    trees: [],

    loaded: false,


    focusedUsername:
      null,


    pinnedUsername:
      null,


    flyToTarget:
      null,


    gardenTime:
      "sunset",


    season:
      "spring",


    exploreMode:
      false,


    cameraPosition: {
      x: 10,
      y: 6,
      z: 10,
    },


    currentUsername:
      null,


    // ========================================================
    // TREE DATA
    // ========================================================

    setTrees: (
      trees
    ) =>
      set({
        trees,
        loaded: true,
      }),


    upsertTree: (
      tree
    ) =>
      set((state) => ({

        trees: [
          ...state.trees.filter(
            (t) =>
              t.username !==
              tree.username
          ),

          tree,
        ],

      })),


    // ========================================================
    // FOCUS TREE
    // ========================================================

    focusUser: (
      username,
      x,
      z,
      treeHeight
    ) =>
      set((state) => {

        const nextY =
          canopyCenterY(
            treeHeight
          );


        /*
         * Avoid creating a new target object when nothing
         * actually changed.
         *
         * This is important because Trees.tsx synchronizes
         * the generated tree position back into the store.
         */
        const previous =
          state.flyToTarget;


        const unchanged =
          state.focusedUsername ===
            username &&
          previous !== null &&
          previous.x === x &&
          previous.y === nextY &&
          previous.z === z &&
          previous.treeHeight ===
            treeHeight;


        if (
          unchanged
        ) {

          return state;
        }


        return {

          focusedUsername:
            username,

          flyToTarget: {

            x,

            y: nextY,

            z,

            treeHeight,

          },

        };

      }),


    // ========================================================
    // SYNCHRONIZE ACTUAL RENDERED POSITION
    // ========================================================

    syncFocusPosition: (
      x,
      z,
      treeHeight
    ) =>
      set((state) => {

        /*
         * Do nothing if there isn't a focused tree.
         */
        if (
          !state.focusedUsername
        ) {

          return state;
        }


        const y =
          canopyCenterY(
            treeHeight
          );


        const previous =
          state.flyToTarget;


        /*
         * Prevent a render/update loop.
         */
        if (
          previous !== null &&
          previous.x === x &&
          previous.y === y &&
          previous.z === z &&
          previous.treeHeight ===
            treeHeight
        ) {

          return state;
        }


        return {

          flyToTarget: {

            x,

            y,

            z,

            treeHeight,

          },

        };

      }),


    // ========================================================
    // PIN SEARCHED TREE
    // ========================================================

    pinTree: (
      username
    ) =>
      set({
        pinnedUsername:
          username,
      }),


    // ========================================================
    // CLEAR FOCUS
    // ========================================================

    clearFocus: () =>
      set({

        /*
         * Closing the statistics card removes the
         * highlight/focus.
         */
        focusedUsername:
          null,

        flyToTarget:
          null,

        /*
         * IMPORTANT:
         *
         * We deliberately DO NOT clear pinnedUsername.
         *
         * This is what makes a searched tree remain planted
         * after the statistics card closes.
         */
      }),


    // ========================================================
    // ATMOSPHERE
    // ========================================================

    setGardenTime: (
      gardenTime
    ) =>
      set({
        gardenTime,
      }),


    setSeason: (
      season
    ) =>
      set({
        season,
      }),


    // ========================================================
    // EXPLORE MODE
    // ========================================================

    setExploreMode: (
      exploreMode
    ) =>
      set({
        exploreMode,
      }),


    // ========================================================
    // CAMERA POSITION
    // ========================================================

    setCameraPosition: (
      cameraPosition
    ) =>
      set({
        cameraPosition,
      }),


    // ========================================================
    // CURRENT USER
    // ========================================================

    setCurrentUsername: (
      currentUsername
    ) =>
      set({
        currentUsername,
      }),

  }));
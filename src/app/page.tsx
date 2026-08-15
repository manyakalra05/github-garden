"use client";

import dynamic from "next/dynamic";

import SearchBar from "@/components/UI/SearchBar";
import SignInButton from "@/components/UI/SignInButton";
import UserPanel from "@/components/UI/UserPanel";
import GardenHUD from "@/components/UI/GardenHUD";
import MeSync from "@/components/UI/MeSync";

import {
  useGardenStore,
} from "@/lib/store";

import {
  MAX_RENDERED_TREES,
} from "@/lib/renderTrees";


const Scene =
  dynamic(
    () =>
      import(
        "@/components/Garden/Scene"
      ),
    {
      ssr: false,
    }
  );


export default function Home() {

  const loaded =
    useGardenStore(
      (s) => s.loaded
    );

  const count =
    useGardenStore(
      (s) => s.trees.length
    );

  const exploreMode =
    useGardenStore(
      (s) => s.exploreMode
    );


  return (

    <main className="relative h-screen w-screen overflow-hidden bg-[#caa7c9]">

      <Scene />

      <MeSync />


      {/* ========================================================
          NORMAL TOP UI

          Hidden during cinematic Explore Mode so that:
          - title does not sit behind cinematic bars
          - search bar disappears
          - sign-in button disappears
          ======================================================== */}

      {!exploreMode && (

        <div className="pointer-events-none absolute inset-0 flex flex-col">

          <div className="pointer-events-auto flex items-start justify-between p-6">

            <div>

              <h1 className="text-xl font-semibold text-white drop-shadow">
                🌸 GitHub Garden
              </h1>

              <p className="text-xs text-white/60">

                {loaded
                  ? `${MAX_RENDERED_TREES} developers planted`
                  : "Growing the garden..."}

              </p>

            </div>


            <SignInButton />

          </div>


          <div className="pointer-events-auto flex justify-center px-6">

            <SearchBar />

          </div>

        </div>

      )}


      <GardenHUD />


      <div className="pointer-events-none absolute inset-0">

        <UserPanel />

      </div>

    </main>
  );
}
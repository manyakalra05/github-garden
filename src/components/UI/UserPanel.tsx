"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useUser,
} from "@clerk/nextjs";

import {
  useGardenStore,
} from "@/lib/store";


export default function UserPanel() {

  const focusedUsername =
    useGardenStore(
      (s) =>
        s.focusedUsername
    );

  const clearFocus =
    useGardenStore(
      (s) =>
        s.clearFocus
    );


  const {
    isSignedIn,
  } = useUser();


  const [
    detail,
    setDetail,
  ] = useState<any>(null);


  const [
    watering,
    setWatering,
  ] = useState(false);


  const [
    waterError,
    setWaterError,
  ] = useState("");


  useEffect(() => {

    if (!focusedUsername) {

      setDetail(null);

      return;
    }


    setWaterError("");


    fetch(
      `/api/user/${focusedUsername}`
    )
      .then((response) =>
        response.json()
      )
      .then(setDetail)
      .catch(() =>
        setDetail(null)
      );

  }, [focusedUsername]);


  if (
    !focusedUsername ||
    !detail
  ) {
    return null;
  }


  async function water() {

    setWatering(true);

    setWaterError("");


    try {

      const response =
        await fetch(
          "/api/water",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              username:
                focusedUsername,
            }),
          }
        );


      const data =
        await response.json();


      if (response.ok) {

        setDetail(
          (current: any) => ({
            ...current,
            waterCount:
              data.waterCount,
          })
        );

      } else {

        setWaterError(
          data.error ||
            "Could not water this tree"
        );

      }

    } finally {

      setWatering(false);

    }
  }


  return (

    <div className="pointer-events-auto absolute bottom-6 left-1/2 z-30 w-[92%] max-w-md -translate-x-1/2 rounded-2xl border border-white/10 bg-[#2e2244]/95 p-5 text-white shadow-2xl backdrop-blur-md">

      <button
        onClick={
          clearFocus
        }
        className="absolute right-3 top-3 text-white/50 hover:text-white"
        aria-label="Close"
      >
        ✕
      </button>


      <div className="flex items-center gap-3">

        {detail.avatarUrl && (

          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={
              detail.avatarUrl
            }
            alt=""
            className="h-14 w-14 rounded-full border-2"
            style={{
              borderColor:
                detail.accentColor,
            }}
          />

        )}


        <div className="min-w-0">

          <div className="truncate font-semibold">
            {
              detail.displayName ||
              detail.username
            }
          </div>

          <div className="text-sm text-white/50">
            @{detail.username}
          </div>

        </div>

      </div>


      {detail.bio && (

        <p className="mt-3 text-sm text-white/80">
          {detail.bio}
        </p>

      )}


      <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">

        <Stat
          label="Contributions"
          value={
            detail.contributions
          }
        />

        <Stat
          label="Followers"
          value={
            detail.followers
          }
        />

        <Stat
          label="PRs"
          value={
            detail.pullRequests
          }
        />

        <Stat
          label="Repos"
          value={
            detail.publicRepos
          }
        />

      </div>


      {detail.primaryLanguage && (

        <div className="mt-3 text-xs text-white/60">

          Primary language:{" "}

          <span
            style={{
              color:
                detail.accentColor,
            }}
          >
            {
              detail.primaryLanguage
            }
          </span>

        </div>

      )}


      <div className="mt-4 grid grid-cols-2 gap-2">

        <a
          href={`https://github.com/${encodeURIComponent(
            detail.username
          )}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-fuchsia-300/90 px-4 py-2 text-center text-sm font-medium text-[#2e1f47] transition-colors hover:bg-fuchsia-200"
        >
          ↗ View GitHub
        </a>


        <button
          onClick={water}
          disabled={
            !isSignedIn ||
            watering
          }
          title={
            !isSignedIn
              ? "Sign in with GitHub to water this tree"
              : undefined
          }
          className="rounded-full bg-white/10 px-4 py-2 text-sm transition-colors hover:bg-white/20 disabled:opacity-40"
        >
          💧 Water (
          {
            detail.waterCount
          }
          )
        </button>

      </div>


      {waterError && (

        <div className="mt-2 text-center text-xs text-pink-200">
          {waterError}
        </div>

      )}

    </div>
  );
}


function Stat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {

  return (

    <div className="rounded-xl bg-white/5 py-2">

      <div className="font-semibold">
        {
          value?.toLocaleString?.() ??
          value
        }
      </div>

      <div className="text-white/40">
        {label}
      </div>

    </div>
  );
}
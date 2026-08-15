"use client";

import {
  useState,
  useRef,
  useEffect,
} from "react";

import {
  useGardenStore,
} from "@/lib/store";


interface Result {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  plotX: number | null;
  plotZ: number | null;
  treeHeight: number | null;
  unplanted?: boolean;
}


export default function SearchBar() {
  const [query, setQuery] =
    useState("");

  const [results, setResults] =
    useState<Result[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [planting, setPlanting] =
    useState<string | null>(null);

  const debounceRef =
    useRef<
      ReturnType<typeof setTimeout>
    >();


  const focusUser =
    useGardenStore(
      (s) => s.focusUser
    );

  const upsertTree =
    useGardenStore(
      (s) => s.upsertTree
    );


  // ==========================================================
  // SEARCH
  // ==========================================================

  useEffect(() => {
    clearTimeout(
      debounceRef.current
    );

    if (
      query.trim().length < 2
    ) {
      setResults([]);
      return;
    }

    debounceRef.current =
      setTimeout(
        async () => {
          setLoading(true);

          try {
            const res =
              await fetch(
                `/api/search?q=${encodeURIComponent(
                  query
                )}`
              );

            const data =
              await res.json();

            setResults(
              data.results ?? []
            );
          } catch (error) {
            console.error(
              "Search failed:",
              error
            );

            setResults([]);
          } finally {
            setLoading(false);
          }
        },
        300
      );

    return () =>
      clearTimeout(
        debounceRef.current
      );
  }, [query]);


  // ==========================================================
  // SELECT SEARCH RESULT
  // ==========================================================

  async function selectUser(
    result: Result
  ) {

    // --------------------------------------------------------
    // CASE 1:
    // User is already planted.
    //
    // Search now uses exactly the same focusUser() call
    // that a tree click uses.
    // --------------------------------------------------------

    if (
      result.plotX != null &&
      result.plotZ != null &&
      result.treeHeight != null
    ) {

      focusUser(
        result.username,
        result.plotX,
        result.plotZ,
        result.treeHeight
      );

      setResults([]);
      setQuery("");

      return;
    }


    // --------------------------------------------------------
    // CASE 2:
    // User isn't planted.
    //
    // Fetch their GitHub information, insert the tree into
    // the garden, THEN focus it.
    // --------------------------------------------------------

    setPlanting(
      result.username
    );

    try {
      const res =
        await fetch(
          `/api/user/${result.username}`
        );

      if (!res.ok) {
        throw new Error(
          "GitHub user could not be planted"
        );
      }

      const tree =
        await res.json();


      // Add the tree to the local garden.
      upsertTree(tree);


      // Immediately use the same persistent
      // focusedUsername mechanism as clicking.
      //
      // Trees.tsx watches focusedUsername and applies
      // SELECTED_GLOW to this exact username.
      focusUser(
        tree.username,
        tree.plotX,
        tree.plotZ,
        tree.treeHeight
      );

    } catch (error) {
      console.error(
        "Failed to plant searched user:",
        error
      );
    } finally {
      setPlanting(null);
      setResults([]);
      setQuery("");
    }
  }


  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="relative w-full max-w-sm">

      <input
        value={query}
        onChange={(event) =>
          setQuery(
            event.target.value
          )
        }
        placeholder="Find a GitHub username..."
        className="
          w-full
          rounded-full
          bg-white/10
          backdrop-blur-md
          border
          border-white/20
          px-5
          py-3
          text-white
          placeholder-white/50
          outline-none
          focus:border-fuchsia-300/60
          transition-colors
        "
      />


      {(results.length > 0 ||
        loading) && (

        <div
          className="
            absolute
            mt-2
            w-full
            rounded-2xl
            bg-[#2e2244]/95
            backdrop-blur-md
            border
            border-white/10
            overflow-hidden
            shadow-xl
          "
        >

          {loading && (
            <div
              className="
                px-4
                py-3
                text-sm
                text-white/50
              "
            >
              Searching...
            </div>
          )}


          {results.map(
            (result) => (

              <button
                key={
                  result.username
                }
                onClick={() =>
                  selectUser(
                    result
                  )
                }
                disabled={
                  planting ===
                  result.username
                }
                className="
                  flex
                  w-full
                  items-center
                  gap-3
                  px-4
                  py-2.5
                  text-left
                  hover:bg-white/10
                  transition-colors
                  disabled:opacity-50
                "
              >

                {result.avatarUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={
                      result.avatarUrl
                    }
                    alt=""
                    className="
                      h-8
                      w-8
                      rounded-full
                    "
                  />
                )}


                <div
                  className="
                    flex-1
                    min-w-0
                  "
                >

                  <div
                    className="
                      text-sm
                      text-white
                      truncate
                    "
                  >
                    {
                      result.displayName ||
                      result.username
                    }
                  </div>


                  <div
                    className="
                      text-xs
                      text-white/50
                      truncate
                    "
                  >

                    @
                    {
                      result.username
                    }

                    {result.unplanted &&
                      planting !==
                        result.username &&
                      " · not yet planted"}

                    {planting ===
                      result.username &&
                      " · planting..."}

                  </div>

                </div>

              </button>

            )
          )}

        </div>

      )}

    </div>
  );
}
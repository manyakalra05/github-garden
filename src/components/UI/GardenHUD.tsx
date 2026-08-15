"use client";

import {
  useMemo,
  useState,
} from "react";

import type {
  ReactNode,
} from "react";

import {
  useGardenStore,
  GardenSeason,
  GardenTime,
} from "@/lib/store";


const format =
  (n: number) =>
    n.toLocaleString();


type ActivePanel =
  | "stats"
  | "top"
  | "legend"
  | "atmosphere"
  | null;


export default function GardenHUD() {

  // ============================================================
  // STORE
  // ============================================================

  const trees =
    useGardenStore(
      (s) => s.trees
    );

  const focused =
    useGardenStore(
      (s) => s.focusedUsername
    );

  const focusUser =
    useGardenStore(
      (s) => s.focusUser
    );

  const gardenTime =
    useGardenStore(
      (s) => s.gardenTime
    );

  const season =
    useGardenStore(
      (s) => s.season
    );

  const exploreMode =
    useGardenStore(
      (s) => s.exploreMode
    );

  const setGardenTime =
    useGardenStore(
      (s) => s.setGardenTime
    );

  const setSeason =
    useGardenStore(
      (s) => s.setSeason
    );

  const setExploreMode =
    useGardenStore(
      (s) => s.setExploreMode
    );

  const camera =
    useGardenStore(
      (s) => s.cameraPosition
    );


  // ============================================================
  // UI STATE
  // ============================================================

  const [
    menuOpen,
    setMenuOpen,
  ] = useState(false);

  /*
   * Only ONE information panel can exist at a time.
   *
   * This is important:
   *
   * Stats -> Top
   *
   * closes Stats automatically.
   *
   * Atmosphere -> Legend
   *
   * closes Atmosphere automatically.
   */
  const [
    activePanel,
    setActivePanel,
  ] = useState<ActivePanel>(null);


  /*
   * Map is intentionally independent.
   *
   * The original map was visible by default and remains so.
   */
  const [
    showMap,
    setShowMap,
  ] = useState(true);


  // ============================================================
  // STATISTICS
  // ============================================================

  const totals =
    useMemo(
      () => ({
        contributions:
          trees.reduce(
            (sum, tree) =>
              sum +
              tree.contributions,
            0
          ),

        followers:
          trees.reduce(
            (sum, tree) =>
              sum +
              tree.followers,
            0
          ),

        repos:
          trees.reduce(
            (sum, tree) =>
              sum +
              (tree.publicRepos ??
                0),
            0
          ),

        languages:
          new Set(
            trees
              .map(
                (tree) =>
                  tree.primaryLanguage
              )
              .filter(Boolean)
          ).size,

        waterings:
          trees.reduce(
            (sum, tree) =>
              sum +
              tree.waterCount,
            0
          ),
      }),
      [trees]
    );


  // ============================================================
  // LEADERBOARD
  // ============================================================

  const leaderboard =
    useMemo(
      () =>
        [...trees]
          .sort(
            (a, b) =>
              b.contributions -
              a.contributions
          )
          .slice(0, 5),
      [trees]
    );


  // ============================================================
  // MENU HELPERS
  // ============================================================

  function openPanel(
    panel: Exclude<ActivePanel, null>
  ) {

    /*
     * Close the dropdown first.
     *
     * This prevents the menu from sitting on top of
     * the panel that it just opened.
     */
    setMenuOpen(false);

    /*
     * Clicking the currently open item closes it.
     *
     * Clicking another item replaces the previous panel.
     */
    setActivePanel(
      (current) =>
        current === panel
          ? null
          : panel
    );
  }


  function toggleMenu() {

    setMenuOpen(
      (current) => !current
    );

    /*
     * If the menu is being opened,
     * close any information panel.
     *
     * This guarantees that the menu itself
     * never overlaps another HUD panel.
     */
    if (!menuOpen) {
      setActivePanel(null);
    }
  }


  function handleExplore() {

    setMenuOpen(false);

    setActivePanel(null);

    setExploreMode(
      !exploreMode
    );
  }


  function handleMap() {

    setMenuOpen(false);

    setActivePanel(null);

    setShowMap(
      (current) => !current
    );
  }


  // ============================================================
  // RENDER
  // ============================================================

  return (
    <>

      {/* ========================================================
          SMALL COLLAPSED GARDEN MENU
          ======================================================== */}

      <div
        className={`
          pointer-events-auto
          absolute
          right-6
          z-20
          transition-all
          duration-500
          ${
            exploreMode
              ? "top-[14vh]"
              : "top-24"
          }
        `}
      >

        {/* ------------------------------------------------------
            MAIN MENU BUTTON
            ------------------------------------------------------ */}

        <button
          type="button"
          onClick={toggleMenu}
          aria-expanded={menuOpen}
          aria-label="Garden menu"
          className={`
            garden-menu-button
            ${menuOpen
              ? "garden-menu-button-open"
              : ""}
          `}
        >

          <span className="text-base">
            🌿
          </span>

          <span>
            Garden
          </span>

          <span
            className={`
              text-xs
              transition-transform
              duration-200
              ${
                menuOpen
                  ? "rotate-180"
                  : ""
              }
            `}
          >
            ▲
          </span>

        </button>


        {/* ------------------------------------------------------
            COMPACT DROPDOWN
            ------------------------------------------------------ */}

        {menuOpen && (

          <div
            className="
              garden-menu-dropdown
              absolute
              right-0
              top-[calc(100%+10px)]
              w-52
            "
          >

            {/* STATS */}

            <MenuButton
              icon="📊"
              label="Stats"
              onClick={() =>
                openPanel("stats")
              }
            />


            {/* TOP */}

            <MenuButton
              icon="🏆"
              label="Top"
              onClick={() =>
                openPanel("top")
              }
            />


            {/* LEGEND */}

            <MenuButton
              icon="📖"
              label="Legend"
              onClick={() =>
                openPanel("legend")
              }
            />


            {/* MAP */}

            <MenuButton
              icon="🗺️"
              label="Map"
              active={showMap}
              onClick={
                handleMap
              }
            />


            {/* EXPLORE */}

            <MenuButton
              icon="🎬"
              label={
                exploreMode
                  ? "Stop Explore"
                  : "Explore"
              }
              active={
                exploreMode
              }
              onClick={
                handleExplore
              }
            />


            {/* ATMOSPHERE */}

            <MenuButton
              icon="🌅"
              label="Atmosphere"
              active={
                activePanel ===
                "atmosphere"
              }
              onClick={() =>
                openPanel(
                  "atmosphere"
                )
              }
            />

          </div>

        )}

      </div>


      {/* ========================================================
          STATS PANEL
          ======================================================== */}

      {activePanel ===
        "stats" && (

        <Panel
          title="Garden Statistics"
          className="
            right-6
            top-44
            w-80
          "
        >

          <div
            className="
              grid
              grid-cols-2
              gap-2
            "
          >

            <Stat
              label="Developers"
              value={format(
                trees.length
              )}
            />

            <Stat
              label="Contributions"
              value={format(
                totals.contributions
              )}
            />

            <Stat
              label="Followers"
              value={format(
                totals.followers
              )}
            />

            <Stat
              label="Repositories"
              value={format(
                totals.repos
              )}
            />

            <Stat
              label="Languages"
              value={format(
                totals.languages
              )}
            />

            <Stat
              label="Waterings"
              value={format(
                totals.waterings
              )}
            />

          </div>

        </Panel>

      )}


      {/* ========================================================
          LEADERBOARD
          ======================================================== */}

      {activePanel ===
        "top" && (

        <Panel
          title="Top Contributors"
          className="
            left-6
            top-28
            w-80
          "
        >

          <div
            className="
              space-y-1
            "
          >

            {leaderboard.map(
              (
                tree,
                index
              ) => (

                <button
                  key={
                    tree.username
                  }
                  type="button"
                  onClick={() => {

                    focusUser(
                      tree.username,
                      tree.plotX,
                      tree.plotZ,
                      tree.treeHeight
                    );

                    setActivePanel(
                      null
                    );

                  }}
                  className="
                    flex
                    w-full
                    items-center
                    gap-2
                    rounded-xl
                    px-2
                    py-2
                    text-left
                    transition
                    hover:bg-white/10
                  "
                >

                  <span
                    className="
                      w-5
                      text-center
                    "
                  >
                    {
                      [
                        "🥇",
                        "🥈",
                        "🥉",
                        "4",
                        "5",
                      ][index]
                    }
                  </span>


                  {tree.avatarUrl && (

                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={
                        tree.avatarUrl
                      }
                      alt=""
                      className="
                        h-7
                        w-7
                        rounded-full
                      "
                    />

                  )}


                  <span
                    className="
                      min-w-0
                      flex-1
                      truncate
                      text-xs
                      text-white
                    "
                  >
                    @{tree.username}
                  </span>


                  <span
                    className="
                      text-[10px]
                      text-fuchsia-200
                    "
                  >
                    {format(
                      tree.contributions
                    )}
                  </span>

                </button>

              )
            )}

          </div>

        </Panel>

      )}


      {/* ========================================================
          LEGEND
          ======================================================== */}

      {activePanel ===
        "legend" && (

        <Panel
          title="How the garden grows"
          className="
            left-6
            bottom-6
            w-80
          "
        >

          <div
            className="
              space-y-2
              text-xs
              text-white/70
            "
          >

            <p>
              🌳{" "}
              <b className="text-white">
                Height
              </b>{" "}
              → contribution activity
            </p>

            <p>
              🌿{" "}
              <b className="text-white">
                Canopy width
              </b>{" "}
              → followers
            </p>

            <p>
              🌸{" "}
              <b className="text-white">
                Blossoms
              </b>{" "}
              → pull requests
            </p>

            <p>
              🎨{" "}
              <b className="text-white">
                Accent
              </b>{" "}
              → primary language
            </p>

            <p>
              ✨{" "}
              <b className="text-white">
                Glow
              </b>{" "}
              → recent activity
            </p>

            <p>
              🏮{" "}
              <b className="text-white">
                Lantern glow
              </b>{" "}
              → higher-activity trees
            </p>

            <p>
              👑{" "}
              <b className="text-white">
                Your tree
              </b>{" "}
              → ring marker when signed in
            </p>

          </div>

        </Panel>

      )}


      {/* ========================================================
          ATMOSPHERE
          ======================================================== */}

      {activePanel ===
        "atmosphere" && (

        <Panel
          title="Atmosphere"
          className="
            right-6
            top-44
            w-64
          "
        >

          {/* TIME */}

          <div className="mb-4">

            <div
              className="
                mb-2
                text-[10px]
                uppercase
                tracking-widest
                text-white/40
              "
            >
              Time
            </div>


            <div
              className="
                flex
                gap-2
              "
            >

              {(
                [
                  "sunset",
                  "night",
                ] as GardenTime[]
              ).map(
                (value) => (

                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setGardenTime(
                        value
                      )
                    }
                    className={`
                      garden-atmosphere-button
                      ${
                        gardenTime ===
                        value
                          ? "garden-atmosphere-button-active"
                          : ""
                      }
                    `}
                  >

                    <span>
                      {
                        value ===
                        "sunset"
                          ? "🌅"
                          : "🌙"
                      }
                    </span>

                    <span>
                      {
                        value ===
                        "sunset"
                          ? "Sunset"
                          : "Night"
                      }
                    </span>

                  </button>

                )
              )}

            </div>

          </div>


          {/* SEASON */}

          <div>

            <div
              className="
                mb-2
                text-[10px]
                uppercase
                tracking-widest
                text-white/40
              "
            >
              Season
            </div>


            <div
              className="
                grid
                grid-cols-4
                gap-2
              "
            >

              {(
                [
                  "spring",
                  "summer",
                  "autumn",
                  "winter",
                ] as GardenSeason[]
              ).map(
                (value) => (

                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setSeason(
                        value
                      )
                    }
                    title={
                      value
                        .charAt(0)
                        .toUpperCase() +
                      value.slice(1)
                    }
                    className={`
                      garden-season-button
                      ${
                        season ===
                        value
                          ? "garden-season-button-active"
                          : ""
                      }
                    `}
                  >

                    {
                      value ===
                      "spring"
                        ? "🌸"
                        : value ===
                          "summer"
                        ? "☀️"
                        : value ===
                          "autumn"
                        ? "🍂"
                        : "❄️"
                    }

                  </button>

                )
              )}

            </div>

          </div>

        </Panel>

      )}


      {/* ========================================================
          MINIMAP
          
          During Explore Mode the map moves upward so it
          remains completely above the bottom cinematic bar.
          ======================================================== */}

      {showMap && (

        <div
          className={`
            pointer-events-auto
            absolute
            right-6
            z-20
            h-36
            w-36
            rounded-full
            border
            border-white/15
            bg-[#2e2244]/75
            p-2
            shadow-xl
            backdrop-blur-md
            transition-all
            duration-500
            ${
              exploreMode
                ? "bottom-[14vh]"
                : "bottom-6"
            }
          `}
        >

          <div
            className="
              relative
              h-full
              w-full
              overflow-hidden
              rounded-full
              bg-[#5c4a72]/60
            "
          >

            {trees
              .slice(0, 400)
              .map(
                (tree) => {

                  const x =
                    50 +
                    (tree.plotX /
                      145) *
                      48;

                  const y =
                    50 +
                    (tree.plotZ /
                      145) *
                      48;


                  return (

                    <button
                      key={
                        tree.username
                      }
                      type="button"
                      title={
                        tree.username
                      }
                      onClick={() =>
                        focusUser(
                          tree.username,
                          tree.plotX,
                          tree.plotZ,
                          tree.treeHeight
                        )
                      }
                      className={`
                        absolute
                        h-1.5
                        w-1.5
                        -translate-x-1/2
                        -translate-y-1/2
                        rounded-full
                        ${
                          tree.username ===
                          focused
                            ? "scale-150 bg-white"
                            : "bg-fuchsia-200/70"
                        }
                      `}
                      style={{
                        left: `${x}%`,
                        top: `${y}%`,
                      }}
                    />

                  );

                }
              )}


            {/* CAMERA MARKER */}

            <span
              className="
                absolute
                h-2
                w-2
                -translate-x-1/2
                -translate-y-1/2
                rounded-full
                bg-white
                shadow-[0_0_8px_rgba(255,255,255,.9)]
              "
              style={{
                left: `${
                  50 +
                  (camera.x /
                    145) *
                    48
                }%`,
                top: `${
                  50 +
                  (camera.z /
                    145) *
                    48
                }%`,
              }}
            />

          </div>


          <div
            className="
              pointer-events-none
              absolute
              bottom-2
              left-0
              right-0
              text-center
              text-[8px]
              uppercase
              tracking-widest
              text-white/40
            "
          >
            Garden map
          </div>

        </div>

      )}

    </>
  );
}


// ============================================================
// MENU BUTTON
// ============================================================

function MenuButton({
  icon,
  label,
  onClick,
  active = false,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {

  return (

    <button
      type="button"
      onClick={onClick}
      className={`
        garden-menu-item
        ${
          active
            ? "garden-menu-item-active"
            : ""
        }
      `}
    >

      <span
        className="
          w-7
          text-center
          text-base
        "
      >
        {icon}
      </span>

      <span
        className="
          flex-1
          text-left
        "
      >
        {label}
      </span>

      {active && (

        <span
          className="
            h-1.5
            w-1.5
            rounded-full
            bg-fuchsia-200
            shadow-[0_0_8px_rgba(245,208,254,.9)]
          "
        />

      )}

    </button>

  );
}


// ============================================================
// PANEL
// ============================================================

function Panel({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className: string;
}) {

  return (

    <div
      className={`
        pointer-events-auto
        absolute
        z-20
        rounded-2xl
        border
        border-white/10
        bg-[#2e2244]/90
        p-4
        text-white
        shadow-2xl
        backdrop-blur-md
        ${className}
      `}
    >

      <div
        className="
          mb-3
          text-sm
          font-semibold
        "
      >
        {title}
      </div>

      {children}

    </div>

  );
}


// ============================================================
// STAT
// ============================================================

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {

  return (

    <div
      className="
        rounded-xl
        bg-white/5
        p-2
      "
    >

      <div
        className="
          font-semibold
          text-white
        "
      >
        {value}
      </div>

      <div
        className="
          text-[10px]
          text-white/40
        "
      >
        {label}

      </div>

    </div>

  );
}
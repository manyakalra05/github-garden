"use client";

import {
  useEffect,
} from "react";

import {
  useGardenStore,
} from "@/lib/store";


export default function ExploreController() {

  const exploreMode =
    useGardenStore(
      (s) => s.exploreMode
    );


  useEffect(() => {

    /*
     * Nothing should exist outside Explore mode.
     */
    if (!exploreMode) {
      return;
    }


    /*
     * Create the cinematic overlay directly in the
     * browser DOM.
     *
     * This is intentionally NOT JSX and NOT an R3F
     * <div>, so Three.js can never try to interpret
     * the bars as THREE objects.
     */
    const overlay =
      document.createElement(
        "div"
      );


    overlay.setAttribute(
      "data-cinematic-overlay",
      "true"
    );


    Object.assign(
      overlay.style,
      {
        position: "fixed",

        top: "0",
        left: "0",

        width: "100vw",
        height: "100vh",

        margin: "0",
        padding: "0",

        overflow: "hidden",

        pointerEvents: "none",

        zIndex: "999999",

        transform: "none",

        opacity: "1",

        boxSizing: "border-box",
      }
    );


    // ========================================================
    // TOP BAR
    // ========================================================

    const topBar =
      document.createElement(
        "div"
      );


    Object.assign(
      topBar.style,
      {
        position: "absolute",

        top: "0",
        left: "0",

        width: "100%",
        height: "12vh",

        margin: "0",
        padding: "0",

        background: "#000",

        transform: "none",

        boxSizing: "border-box",

        pointerEvents: "none",
      }
    );


    // ========================================================
    // BOTTOM BAR
    // ========================================================

    const bottomBar =
      document.createElement(
        "div"
      );


    Object.assign(
      bottomBar.style,
      {
        position: "absolute",

        bottom: "0",
        left: "0",

        width: "100%",
        height: "12vh",

        margin: "0",
        padding: "0",

        background: "#000",

        transform: "none",

        boxSizing: "border-box",

        pointerEvents: "none",
      }
    );


    overlay.appendChild(
      topBar
    );

    overlay.appendChild(
      bottomBar
    );


    document.body.appendChild(
      overlay
    );


    /*
     * Cleanup happens whenever Explore Mode becomes
     * false or this component unmounts.
     */
    return () => {

      if (
        overlay.parentNode
      ) {

        overlay.parentNode.removeChild(
          overlay
        );
      }
    };

  }, [
    exploreMode,
  ]);


  /*
   * This component itself renders NOTHING into
   * React Three Fiber.
   *
   * The overlay is created directly in document.body.
   */
  return null;
}
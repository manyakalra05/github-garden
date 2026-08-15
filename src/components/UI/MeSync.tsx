"use client";

import {
  useEffect,
} from "react";

import {
  useUser,
} from "@clerk/nextjs";

import {
  useGardenStore,
} from "@/lib/store";


export default function MeSync() {

  const {
    isSignedIn,
    user,
  } = useUser();


  const setCurrentUsername =
    useGardenStore(
      (s) =>
        s.setCurrentUsername
    );


  useEffect(() => {

    if (
      !isSignedIn ||
      !user
    ) {

      setCurrentUsername(
        null
      );

      return;
    }


    const github =
      user.externalAccounts.find(
        (account) =>
          account.provider ===
          "github"
      );


    setCurrentUsername(
      github?.username ??
        null
    );

  }, [
    isSignedIn,
    user,
    setCurrentUsername,
  ]);


  return null;
}
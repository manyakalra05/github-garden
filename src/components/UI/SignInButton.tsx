"use client";

import {
  SignedIn,
  SignedOut,
  SignInButton as ClerkSignInButton,
  UserButton,
} from "@clerk/nextjs";

export default function SignInButton() {
  return (
    <>
      <SignedOut>
        <ClerkSignInButton mode="modal">
          <button className="rounded-full bg-fuchsia-300/90 px-4 py-2 text-sm font-medium text-[#2e1f47] hover:bg-fuchsia-200 transition-colors">
            Sign in with GitHub
          </button>
        </ClerkSignInButton>
      </SignedOut>
      <SignedIn>
        <div className="flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-2 py-1">
          <UserButton afterSignOutUrl="/" />
        </div>
      </SignedIn>
    </>
  );
}

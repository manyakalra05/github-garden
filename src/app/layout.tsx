import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
// @ts-ignore
import "./globals.css";

export const metadata: Metadata = {
  title: "GitHub Garden",
  description:
    "A living 3D garden where every tree is a real GitHub developer, grown from their contributions.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
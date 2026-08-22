import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import localFont from "next/font/local";
import { MedievalSharp } from "next/font/google";
// @ts-expect-error CSS is handled by Next.js at build time.
import "./globals.css";

const gardenFont = localFont({
  src: "./fonts/YourGardenFont.ttf",
  variable: "--font-garden",
});

const bodyFont = MedievalSharp({
  subsets: ["latin"],
  variable: "--font-body",
  weight: "400",
});

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
        <body className={`${bodyFont.variable} ${gardenFont.variable}`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
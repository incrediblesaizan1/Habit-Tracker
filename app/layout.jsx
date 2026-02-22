import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  SignInButton,
} from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "./globals.css";
import fs from "fs";
import path from "path";

import TransitionProvider from "./components/TransitionProvider";
import DynamicBackground from "./components/DynamicBackground";

export const metadata = {
  title: "Habit Tracker",
  description: "Track your daily habits and build consistency",
  icons: {
    icon: "/logo.svg",
  },
};

async function getWallpaperImages() {
  try {
    const wallpaperDir = path.join(process.cwd(), "public", "walpaper");
    const files = await fs.promises.readdir(wallpaperDir);
    return files.filter((file) => /\.(jpg|jpeg|png|webp|avif)$/i.test(file));
  } catch (error) {
    console.error("Error reading wallpaper directory:", error);
    return [];
  }
}

export default async function RootLayout({ children }) {
  const wallpaperImages = await getWallpaperImages();

  return (
    <ClerkProvider appearance={{ baseTheme: dark }}>
      <html lang="en" className="custom-scrollbar2">
        <body>
          <DynamicBackground images={wallpaperImages} />
          <SignedIn>
            <TransitionProvider>{children}</TransitionProvider>
          </SignedIn>
          <SignedOut>
            <div className="auth-gate">
              <div className="auth-card">
                <h1 className="auth-title">
                  <span className="accent">SK&apos;</span> HABIT{" "}
                  <strong>TRACKER</strong>
                </h1>
                <p className="auth-subtitle">
                  Track your daily habits &amp; build consistency
                </p>
                <SignInButton mode="modal">
                  <button className="btn-signin">Sign In to Continue</button>
                </SignInButton>
              </div>
            </div>
          </SignedOut>
        </body>
      </html>
    </ClerkProvider>
  );
}

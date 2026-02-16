import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  SignInButton,
} from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "./globals.css";

export const metadata = {
  title: "Habit Tracker",
  description:
    "Track your daily habits and build streaks with a beautiful calendar grid.",
  icons: {
    icon: "/logo.svg?v=2",
    apple: "/logo.svg?v=2",
  },
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider appearance={{ baseTheme: dark }}>
      <html lang="en">
        <body>
          <SignedIn>{children}</SignedIn>
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

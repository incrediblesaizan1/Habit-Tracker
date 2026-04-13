import { SignedIn, SignedOut, SignInButton } from "@clerk/clerk-react";
import TransitionProvider from "./TransitionProvider";
import DynamicBackground from "./DynamicBackground";

export default function Layout({ children }) {
  return (
    <>
      <DynamicBackground />
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
    </>
  );
}

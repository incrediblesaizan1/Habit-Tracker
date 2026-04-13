import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";
import "./index.css";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env");
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} appearance={{
      variables: { colorPrimary: '#14b8a6', colorBackground: '#0e1426', colorText: '#e2e8f0', colorInputBackground: '#0a0e1a', colorInputText: '#e2e8f0' },
      elements: { card: { backgroundColor: '#0e1426', border: '1px solid rgba(255,255,255,0.08)' }, formButtonPrimary: { backgroundColor: '#14b8a6' } }
    }}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ClerkProvider>
  </React.StrictMode>
);

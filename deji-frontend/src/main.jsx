import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/index.css";
import api, { login } from "./services/api";
import { TenantProvider } from "./context/TenantContext"; // ✅ NEW

// ✅ Attach api to window for console testing if needed
window.api = api;

// ✅ Render App
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <TenantProvider>   {/* ✅ Wrap app here */}
        <App />
      </TenantProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// ✅ Register service worker (Phase 3)
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/serviceworker.js")
      .then((reg) => console.log("✅ Service Worker registered:", reg.scope))
      .catch((err) =>
        console.error("❌ Service Worker registration failed:", err)
      );
  });
}

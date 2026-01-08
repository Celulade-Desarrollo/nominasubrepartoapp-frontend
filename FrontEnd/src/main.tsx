import React from "react";
import { createRoot } from "react-dom/client";
import { PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import msalConfig from "./auth/msalConfig";
import App from "./App";
import "./index.css";

// Creamos la instancia de MSAL una sola vez
const msalInstance = new PublicClientApplication(msalConfig);

// Todo va DENTRO del render()
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MsalProvider instance={msalInstance}>
      <App />
    </MsalProvider>
  </React.StrictMode>
);

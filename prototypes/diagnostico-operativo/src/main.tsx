import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { initializePwaRegistration } from "./pwaDiagnostics";
import "./styles.css";

initializePwaRegistration();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

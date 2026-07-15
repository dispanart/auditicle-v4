import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Auditicle root element was not found.");
}

hydrateRoot(
  rootElement,
  <StrictMode>
    <App />
  </StrictMode>
);

import React from "react";
import ReactDOM from "react-dom/client";
import "katex/dist/katex.min.css";
import App from "./App";
import { FlashCapsule } from "./components/FlashCapsule";
import "./styles.css";

const isFlashMode = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("mode") === "flash";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {isFlashMode ? <FlashCapsule /> : <App />}
  </React.StrictMode>,
);

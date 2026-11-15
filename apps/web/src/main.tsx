import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./style.css";
import SharedProject from "./features/share/SharedProject";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {location.pathname.startsWith("/s/") ? <SharedProject /> : <App />}
  </React.StrictMode>,
);

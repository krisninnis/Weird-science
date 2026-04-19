import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import App from "@app/App";
import { seedInitialData } from "@/lib/db/seed";
import "@styles/globals.css";

function Bootstrap(): JSX.Element {
  useEffect(() => {
    void seedInitialData();
  }, []);

  return <App />;
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <Bootstrap />
  </StrictMode>
);

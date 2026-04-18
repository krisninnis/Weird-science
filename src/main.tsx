import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { seedInitialData } from "@/lib/db/seed";

function Root() {
  useEffect(() => {
    void seedInitialData();
  }, []);

  return (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<Root />);
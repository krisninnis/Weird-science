import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@features": path.resolve(__dirname, "./src/features"),
      "@lib": path.resolve(__dirname, "./src/lib"),
      "@styles": path.resolve(__dirname, "./src/styles"),
    },
  },
  server: {
    port: 1420,
    strictPort: true,
  },
});

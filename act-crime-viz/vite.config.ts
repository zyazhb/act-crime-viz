import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  /** Emit relative URLs in `dist` (subpath deploy, static hosts, `file://`). */
  base: "./",
  plugins: [react()],
  publicDir: "public",
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("victory-vendor")) return "vendor-victory";
          if (id.includes("/d3-") || id.includes("\\d3-")) return "vendor-d3";
          if (id.includes("internmap")) return "vendor-d3";
          if (id.includes("@reduxjs/toolkit")) return "vendor-redux-toolkit";
          if (id.includes("react-redux")) return "vendor-react-redux";
          if (id.includes("reselect")) return "vendor-reselect";
          if (id.includes("immer")) return "vendor-immer";
          if (id.includes("decimal.js")) return "vendor-decimal";
          if (id.includes("recharts")) return "vendor-recharts";
        },
      },
    },
  },
});

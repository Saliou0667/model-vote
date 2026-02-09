import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("firebase")) return "vendor-firebase";
          if (id.includes("@mui")) return "vendor-mui";
          if (id.includes("react-router")) return "vendor-router";
          if (id.includes("react-dom") || id.includes("react")) return "vendor-react";
          return undefined;
        },
      },
    },
  },
});

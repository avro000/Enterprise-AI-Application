import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "convex/react": path.resolve(__dirname, "src/convex/react.tsx"),
      "@convex-dev/auth/react": path.resolve(__dirname, "src/convex/react.tsx"),
    },
    extensions: [".mjs", ".js", ".ts", ".jsx", ".tsx", ".json"],
    dedupe: ["react", "react/jsx-runtime", "react-dom", "react-dom/client"],
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
    hmr: {
      overlay: false,
    },
  },
});

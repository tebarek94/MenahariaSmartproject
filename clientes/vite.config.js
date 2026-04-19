import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5173,
    // Dev: same-origin `/api` + `/socket.io` so Bearer tokens and websockets match the app origin (avoids CORS issues).
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://localhost:5000",
        changeOrigin: true,
        ws: true,
        /** HMR / tab close often aborts the websocket; avoid noisy ECONNABORTED logs */
        configure: (proxy) => {
          proxy.on("error", (err) => {
            if (err?.code === "ECONNABORTED" || err?.code === "ECONNRESET") return;
            console.error("[vite proxy]", err);
          });
        },
      },
    },
  },
});

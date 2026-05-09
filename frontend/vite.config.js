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
    // Dev: same-origin `/api` to keep browser requests simple while backend runs on :5000.
    proxy: {
      "/api": {
        // 127.0.0.1 avoids Windows resolving `localhost` to IPv6 ::1 when the API only listens on IPv4.
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },
    },
  },
});

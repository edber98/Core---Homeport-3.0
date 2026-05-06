import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Import the Remotion composition directly from the MotionDesign project
      // so live pitch is pixel-perfect identical to the rendered video.
      "@motion": path.resolve(__dirname, "../MotionDesign/src"),
    },
  },
  server: {
    port: 5173,
    host: true,
    fs: {
      // Allow Vite to read files outside of KinnPitchLive (needed for @motion)
      allow: [
        path.resolve(__dirname, ".."),
      ],
    },
  },
  optimizeDeps: {
    // Force Vite to pre-bundle these so HMR works smoothly across project boundary
    include: ["remotion", "@remotion/player"],
  },
});

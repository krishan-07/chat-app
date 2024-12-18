import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist", // Output folder for Vercel
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
  },
  base: "/", // Ensures correct base path
});

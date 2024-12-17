import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/// Dynamically set port from Railway's environment variable
const PORT = parseInt(process.env.PORT) || 4173;

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0", // Allow external access
    port: PORT, // Dynamically use Railway's PORT
  },
});

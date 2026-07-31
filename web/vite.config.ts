import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const webEnv = loadEnv(mode, __dirname, "");

  return {
    base: process.env.VITE_BASE_PATH ?? webEnv.VITE_BASE_PATH ?? "/",
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      fs: {
        allow: [path.resolve(__dirname, "..")],
      },
    },
  };
});

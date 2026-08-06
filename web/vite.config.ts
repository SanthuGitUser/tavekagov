import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";

function geojsonPlugin(): Plugin {
  return {
    name: "geojson-loader",
    transform(code, id) {
      if (id.endsWith(".geojson")) {
        return {
          code: `export default ${code}`,
          map: null,
        };
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const webEnv = loadEnv(mode, __dirname, "");

  return {
    base: process.env.VITE_BASE_PATH ?? webEnv.VITE_BASE_PATH ?? "/",
    plugins: [react(), tailwindcss(), geojsonPlugin()],
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

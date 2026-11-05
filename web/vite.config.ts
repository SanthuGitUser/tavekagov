import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { VitePWA } from "vite-plugin-pwa";
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
  const base = process.env.VITE_BASE_PATH ?? webEnv.VITE_BASE_PATH ?? "/";
  const analyze = mode === "analyze";

  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      geojsonPlugin(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.ico"],
        manifest: {
          name: "TavekaGov",
          short_name: "TavekaGov",
          description: "Tamil Nadu government open data dashboard",
          theme_color: "#0f172a",
          background_color: "#ffffff",
          display: "standalone",
          start_url: base,
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
          navigateFallback: "/index.html",
          maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
        },
      }),
      analyze
        ? visualizer({
            filename: "dist/stats.html",
            gzipSize: true,
            open: false,
          })
        : undefined,
    ].filter(Boolean),
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

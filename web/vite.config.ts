import { readFileSync } from "node:fs";
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

const JSON_ASSET_QUERY = "?json-asset";

/**
 * `import url from "./big.json?json-asset"` emits the file as a minified, hashed
 * .json asset and returns its URL, so large datasets are fetched on demand
 * instead of being compiled into (and parsed as) JavaScript.
 */
function jsonAssetPlugin(): Plugin {
  let isBuild = false;
  return {
    name: "json-asset",
    configResolved(config) {
      isBuild = config.command === "build";
    },
    load(id) {
      if (!id.endsWith(JSON_ASSET_QUERY)) return null;
      const file = id.slice(0, -JSON_ASSET_QUERY.length);
      if (!isBuild) {
        // Dev server serves files outside web/ via /@fs/ (see server.fs.allow).
        return `export default ${JSON.stringify(`/@fs/${file.split(path.sep).join("/").replace(/^\//, "")}`)};`;
      }
      const minified = JSON.stringify(JSON.parse(readFileSync(file, "utf-8")));
      const referenceId = this.emitFile({
        type: "asset",
        name: path.basename(file),
        source: minified,
      });
      return `export default import.meta.ROLLUP_FILE_URL_${referenceId};`;
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
      jsonAssetPlugin(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.svg"],
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
          // Precache the app shell only. Data chunks and JSON are cached at runtime
          // when a page first needs them, so a first visit doesn't download every dataset.
          globPatterns: ["**/*.{js,css,html,svg,woff2}"],
          globIgnores: [
            // Per-constituency Form 20 chunks (001-*.js ... 234-*.js).
            "**/assets/[0-9][0-9][0-9]-*.js",
          ],
          // Relative to the service worker scope, so it works under /tavekagov/.
          navigateFallback: "index.html",
          maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: ({ url, sameOrigin }) =>
                sameOrigin && /\/assets\/.+\.(?:js|json)$/.test(url.pathname),
              handler: "CacheFirst",
              options: {
                cacheName: "tavekagov-data",
                expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
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

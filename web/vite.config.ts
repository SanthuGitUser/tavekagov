import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

function parseEnvFile(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) return {};

  const values: Record<string, string> = {};
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    values[key] = value;
  }
  return values;
}

function resolveSupabaseEnv(mode: string) {
  const webEnv = loadEnv(mode, __dirname, "");
  const sharedEnv = parseEnvFile(path.resolve(__dirname, "../Public DB/.env"));

  const supabaseUrl =
    webEnv.VITE_SUPABASE_URL ||
    sharedEnv.VITE_SUPABASE_URL ||
    sharedEnv.SUPABASE_URL ||
    "";

  const supabaseAnonKey =
    webEnv.VITE_SUPABASE_ANON_KEY ||
    sharedEnv.VITE_SUPABASE_ANON_KEY ||
    sharedEnv.SUPABASE_ANON_KEY ||
    "";

  return { supabaseUrl, supabaseAnonKey };
}

export default defineConfig(({ mode }) => {
  const { supabaseUrl, supabaseAnonKey } = resolveSupabaseEnv(mode);

  return {
    base: process.env.VITE_BASE_PATH ?? webEnvBase(mode),
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
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
      "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(supabaseAnonKey),
    },
  };
});

function webEnvBase(mode: string): string {
  const webEnv = loadEnv(mode, __dirname, "");
  return webEnv.VITE_BASE_PATH || "/";
}

/// <reference types="vite/client" />

declare module "*.geojson" {
  const value: {
    type: "FeatureCollection";
    features: Array<{
      type: "Feature";
      properties: Record<string, unknown>;
      geometry: {
        type: string;
        coordinates: unknown;
      };
    }>;
  };
  export default value;
}

// Large JSON emitted as a separate asset; the import is its URL (see vite.config.ts).
declare module "*.json?json-asset" {
  const url: string;
  export default url;
}

interface ImportMetaEnv {
  readonly VITE_BASE_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

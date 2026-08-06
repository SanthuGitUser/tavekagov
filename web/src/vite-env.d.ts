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

interface ImportMetaEnv {
  readonly VITE_BASE_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

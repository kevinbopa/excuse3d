import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const rootDir = path.resolve(__dirname, "..");
export const srcDir = path.join(rootDir, "src");
export const clientDir = path.join(srcDir, "client");
export const publicDir = path.join(rootDir, "public");
export const distDir = path.join(rootDir, "dist");

export const publicAssetsDir = path.join(publicDir, "assets");
export const publicImagesDir = path.join(publicAssetsDir, "images");
export const publicModelsDir = path.join(publicAssetsDir, "models");
export const publicVendorDir = path.join(publicDir, "vendor", "three");

export const defaultDevPort = Number(process.env.PORT || 5173);
export const defaultPreviewPort = Number(process.env.PORT || 4173);

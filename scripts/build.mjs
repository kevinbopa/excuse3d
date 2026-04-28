import { cp, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const clientDir = path.join(rootDir, "src", "client");

const assetsToCopy = [
  "bigar.jpg",
  "sonnyangel.jpg",
  "images.jpg",
  "images (1).jpg",
  "téléchargement.jpg",
  "téléchargement (1).jpg"
];

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });
await cp(clientDir, distDir, { recursive: true });
await mkdir(path.join(distDir, "node_modules", "three", "build"), { recursive: true });
await mkdir(path.join(distDir, "node_modules", "three", "examples", "jsm", "loaders"), { recursive: true });
await cp(
  path.join(rootDir, "node_modules", "three", "build", "three.module.js"),
  path.join(distDir, "node_modules", "three", "build", "three.module.js")
);
await cp(
  path.join(rootDir, "node_modules", "three", "examples", "jsm", "loaders", "GLTFLoader.js"),
  path.join(distDir, "node_modules", "three", "examples", "jsm", "loaders", "GLTFLoader.js")
);

for (const asset of assetsToCopy) {
  const assetPath = path.join(rootDir, asset);
  try {
    await stat(assetPath);
    await cp(assetPath, path.join(distDir, asset));
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.warn(`Asset not found, skipping: ${asset}`);
    } else {
      throw err;
    }
  }
}

console.log(`Build complete in ${distDir}`);

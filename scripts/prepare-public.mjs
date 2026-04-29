import { cp, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import {
  publicImagesDir,
  publicVendorDir,
  rootDir
} from "./config.mjs";

const imageCopies = [
  ["bigar.jpg", "bigar.jpg"],
  ["sonnyangel.jpg", "sonnyangel.jpg"],
  ["images.jpg", "japanese-apology-1.jpg"],
  ["images (1).jpg", "japanese-apology-2.jpg"],
  ["téléchargement.jpg", "japanese-apology-3.jpg"],
  ["téléchargement (1).jpg", "japanese-apology-4.jpg"]
];

await mkdir(publicImagesDir, { recursive: true });
await mkdir(publicVendorDir, { recursive: true });

await cp(
  path.join(rootDir, "node_modules", "three", "build"),
  path.join(publicVendorDir, "build"),
  { recursive: true }
);

await cp(
  path.join(rootDir, "node_modules", "three", "examples", "jsm"),
  path.join(publicVendorDir, "examples", "jsm"),
  { recursive: true }
);

for (const [sourceName, targetName] of imageCopies) {
  const sourcePath = path.join(rootDir, sourceName);
  try {
    await stat(sourcePath);
    await cp(sourcePath, path.join(publicImagesDir, targetName));
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

console.log(`Public assets prepared in ${path.relative(rootDir, publicImagesDir)}`);

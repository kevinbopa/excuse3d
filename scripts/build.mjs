import { cp, mkdir, rm } from "node:fs/promises";
import { clientDir, distDir, publicDir } from "./config.mjs";

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });
await cp(publicDir, distDir, { recursive: true });
await cp(clientDir, distDir, { recursive: true });

console.log(`Build complete in ${distDir}`);

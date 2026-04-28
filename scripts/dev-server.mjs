import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const clientDir = path.join(rootDir, "src", "client");
const port = Number(process.env.PORT || 5173);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".gltf": "application/json; charset=utf-8",
  ".glb": "model/gltf-binary",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml"
};

function safeResolve(baseDir, requestPath) {
  const resolved = path.resolve(baseDir, requestPath.replace(/^\/+/, ""));
  if (!resolved.startsWith(baseDir)) {
    return null;
  }
  return resolved;
}

async function serveFile(filePath, response) {
  const extension = path.extname(filePath).toLowerCase();
  response.writeHead(200, { "Content-Type": mimeTypes[extension] || "application/octet-stream" });
  createReadStream(filePath).pipe(response);
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host}`);
    const pathname = decodeURIComponent(url.pathname);

    if (pathname === "/" || pathname === "/index.html") {
      await serveFile(path.join(clientDir, "index.html"), response);
      return;
    }

    if (pathname.startsWith("/src/")) {
      const localPath = safeResolve(rootDir, pathname.slice(1));
      if (!localPath) {
        response.writeHead(403).end("Forbidden");
        return;
      }
      await stat(localPath);
      await serveFile(localPath, response);
      return;
    }

    const rootAsset = safeResolve(rootDir, pathname.slice(1));
    if (rootAsset) {
      await stat(rootAsset);
      await serveFile(rootAsset, response);
      return;
    }

    response.writeHead(404).end("Not found");
  } catch (error) {
    response.writeHead(404).end("Not found");
  }
});

server.listen(port, () => {
  console.log(`Alae Journey dev server running on http://localhost:${port}`);
});

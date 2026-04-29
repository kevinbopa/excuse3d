import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import net from "node:net";
import path from "node:path";

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
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function safeResolve(baseDir, requestPath) {
  const resolved = path.resolve(baseDir, requestPath.replace(/^\/+/, ""));
  if (!resolved.startsWith(baseDir)) {
    return null;
  }
  return resolved;
}

async function findExistingFile(roots, pathname) {
  for (const root of roots) {
    const resolved = safeResolve(root, pathname);
    if (!resolved) {
      continue;
    }
    try {
      await access(resolved);
      return resolved;
    } catch {
      // Ignore and continue on the next root.
    }
  }
  return null;
}

async function serveFile(filePath, response) {
  const extension = path.extname(filePath).toLowerCase();
  response.writeHead(200, {
    "Content-Type": mimeTypes[extension] || "application/octet-stream",
    "Cache-Control": extension === ".html" ? "no-cache" : "public, max-age=300"
  });
  createReadStream(filePath).pipe(response);
}

async function portAvailable(port) {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once("error", () => resolve(false))
      .once("listening", () => tester.close(() => resolve(true)))
      .listen(port);
  });
}

async function findOpenPort(startPort, attempts = 20) {
  for (let offset = 0; offset < attempts; offset += 1) {
    const candidate = startPort + offset;
    if (await portAvailable(candidate)) {
      return candidate;
    }
  }
  throw new Error(`No open port found from ${startPort} to ${startPort + attempts - 1}`);
}

export async function startStaticServer({
  roots,
  preferredPort,
  name,
  spaFallback = true
}) {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", `http://${request.headers.host}`);
      const pathname = decodeURIComponent(url.pathname);
      const hasExtension = path.extname(pathname) !== "";

      const directMatch = await findExistingFile(
        roots,
        pathname === "/" ? "/index.html" : pathname
      );

      if (directMatch) {
        await serveFile(directMatch, response);
        return;
      }

      if (spaFallback && !hasExtension) {
        const indexFile = await findExistingFile(roots, "/index.html");
        if (indexFile) {
          await serveFile(indexFile, response);
          return;
        }
      }

      response.writeHead(404).end("Not found");
    } catch {
      response.writeHead(500).end("Server error");
    }
  });

  const port = await findOpenPort(preferredPort);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, resolve);
  });

  console.log(`${name} running on http://localhost:${port}`);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} etait deja pris, bascule automatique sur ${port}.`);
  }

  return { server, port, url: `http://localhost:${port}` };
}

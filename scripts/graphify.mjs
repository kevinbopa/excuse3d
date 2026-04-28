import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const outputDir = path.join(rootDir, ".graphify");
const targets = [
  path.join(rootDir, "src"),
  path.join(rootDir, "scripts")
];

const sourceExtensions = new Set([".js", ".mjs", ".css", ".html", ".json", ".gltf"]);

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function relativePath(filePath) {
  return toPosix(path.relative(rootDir, filePath));
}

function labelFor(filePath) {
  const name = path.basename(filePath);
  const parent = path.basename(path.dirname(filePath));
  return parent && parent !== "." ? `${parent}/${name}` : name;
}

function classify(filePath) {
  const rel = relativePath(filePath);
  if (rel.startsWith("src/client/game/core/")) return "core";
  if (rel.startsWith("src/client/game/data/")) return "data";
  if (rel.startsWith("src/client/game/")) return "game";
  if (rel.startsWith("src/client/styles/")) return "style";
  if (rel.startsWith("src/client/assets/models/")) return "model";
  if (rel.startsWith("src/client/assets/")) return "asset";
  if (rel.startsWith("src/client/")) return "client";
  if (rel.startsWith("scripts/")) return "tooling";
  return "other";
}

async function walk(dirPath, found = []) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath, found);
      continue;
    }
    if (sourceExtensions.has(path.extname(entry.name).toLowerCase())) {
      found.push(fullPath);
    }
  }
  return found;
}

function parseImports(content) {
  const imports = [];
  const importRegex = /import\s+(?:[^"'`]+?\s+from\s+)?["']([^"']+)["']/g;
  for (const match of content.matchAll(importRegex)) {
    imports.push(match[1]);
  }
  return imports;
}

function parseExportNames(content) {
  const exports = [];
  const exportRegex = /export\s+(?:const|class|function)\s+([A-Za-z0-9_]+)/g;
  for (const match of content.matchAll(exportRegex)) {
    exports.push(match[1]);
  }
  return exports;
}

function resolveImport(fromFile, specifier) {
  if (specifier.startsWith(".")) {
    const resolved = path.resolve(path.dirname(fromFile), specifier);
    const withExt = path.extname(resolved) ? resolved : `${resolved}.js`;
    return relativePath(withExt);
  }
  if (specifier.startsWith("/")) {
    return toPosix(specifier.replace(/^\//, ""));
  }
  return null;
}

function summaryForNode(node) {
  if (node.path.endsWith("GameApp.js")) return "Orchestration principale du jeu et des modales.";
  if (node.path.endsWith("renderer.js")) return "Renderer 3D du monde principal.";
  if (node.path.endsWith("KissSceneRenderer.js")) return "Renderer 3D de la cinematique du bisou.";
  if (node.path.endsWith("avatar.js")) return "Habillage, style et animation des avatars 3D.";
  if (node.path.endsWith("assets.js")) return "Chargement et cache des images/modeles.";
  if (node.path.endsWith("input.js")) return "Gestion clavier et tactile.";
  if (node.path.endsWith("save.js")) return "Etat local et persistence.";
  if (node.path.endsWith("worlds.js")) return "Contenu narratif, mondes et donnees de jeu.";
  if (node.path.endsWith("main.js")) return "Point d'entree du client.";
  if (node.path.endsWith("index.html")) return "Shell HTML de l'application.";
  if (node.path.endsWith("main.css")) return "Styles globaux, HUD et modales.";
  if (node.path.endsWith("dev-server.mjs")) return "Serveur de developpement local.";
  if (node.path.endsWith("build.mjs")) return "Build local vers dist.";
  if (node.path.endsWith("generate-models.mjs")) return "Generation locale des modeles glTF.";
  if (node.path.endsWith("graphify.mjs")) return "Generation de la carte du projet.";
  if (node.path.endsWith(".gltf")) return "Modele 3D consomme par le jeu.";
  return "Module du projet.";
}

function makeMermaid(nodes) {
  const relevant = nodes.filter((node) => node.path.endsWith(".js") || node.path.endsWith(".mjs"));
  const lines = ["graph TD"];
  for (const node of relevant) {
    lines.push(`  ${node.id}["${labelFor(node.path)}"]`);
  }
  for (const node of relevant) {
    for (const dep of node.internalImports) {
      const target = relevant.find((candidate) => candidate.path === dep);
      if (target) {
        lines.push(`  ${node.id} --> ${target.id}`);
      }
    }
  }
  return lines.join("\n");
}

const absoluteFiles = (await Promise.all(targets.map((target) => walk(target)))).flat().sort();
const rawNodes = [];

for (const filePath of absoluteFiles) {
  const fileStat = await stat(filePath);
  const rel = relativePath(filePath);
  const content = await readFile(filePath, "utf8");
  const imports = parseImports(content);
  const internalImports = imports
    .map((specifier) => resolveImport(filePath, specifier))
    .filter(Boolean);

  rawNodes.push({
    id: `n${rawNodes.length + 1}`,
    path: rel,
    kind: classify(filePath),
    size: fileStat.size,
    imports,
    internalImports,
    exports: parseExportNames(content),
    summary: summaryForNode({ path: rel })
  });
}

const nodeByPath = new Map(rawNodes.map((node) => [node.path, node]));
for (const node of rawNodes) {
  node.importedBy = rawNodes
    .filter((candidate) => candidate.internalImports.includes(node.path))
    .map((candidate) => candidate.path);
}

const graph = {
  generatedAt: new Date().toISOString(),
  root: path.basename(rootDir),
  stats: {
    files: rawNodes.length,
    jsModules: rawNodes.filter((node) => node.path.endsWith(".js") || node.path.endsWith(".mjs")).length,
    models: rawNodes.filter((node) => node.kind === "model").length
  },
  entrypoints: rawNodes
    .filter((node) => ["src/client/main.js", "scripts/dev-server.mjs", "scripts/build.mjs", "scripts/preview-server.mjs", "scripts/generate-models.mjs"].includes(node.path))
    .map((node) => ({
      path: node.path,
      summary: node.summary
    })),
  hotspots: rawNodes
    .filter((node) => node.importedBy.length > 0)
    .sort((a, b) => b.importedBy.length - a.importedBy.length)
    .slice(0, 6)
    .map((node) => ({
      path: node.path,
      importedByCount: node.importedBy.length,
      importedBy: node.importedBy
    })),
  nodes: rawNodes
};

const markdown = [
  "# Project Map",
  "",
  `Generated: ${graph.generatedAt}`,
  "",
  "## Overview",
  "",
  `- Files mapped: ${graph.stats.files}`,
  `- JS modules: ${graph.stats.jsModules}`,
  `- 3D models: ${graph.stats.models}`,
  "",
  "## Entrypoints",
  "",
  ...graph.entrypoints.map((entry) => `- \`${entry.path}\`: ${entry.summary}`),
  "",
  "## Hotspots",
  "",
  ...graph.hotspots.map((node) => `- \`${node.path}\`: importe par ${node.importedByCount} module(s)`),
  "",
  "## Mermaid",
  "",
  "```mermaid",
  makeMermaid(rawNodes),
  "```",
  "",
  "## Modules",
  "",
  ...rawNodes.map((node) => {
    const internal = node.internalImports.length ? node.internalImports.join(", ") : "aucun";
    const importedBy = node.importedBy.length ? node.importedBy.join(", ") : "aucun";
    return `- \`${node.path}\` [${node.kind}] - ${node.summary} Imports internes: ${internal}. Importe par: ${importedBy}.`;
  })
].join("\n");

await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, "project-map.json"), JSON.stringify(graph, null, 2), "utf8");
await writeFile(path.join(outputDir, "project-map.md"), markdown, "utf8");

console.log(`Graphify map generated in ${outputDir}`);

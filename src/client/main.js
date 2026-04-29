import { GameApp } from "./game/GameApp.js";

const root = document.getElementById("app");

try {
  const app = new GameApp(root);
  app.mount();
} catch (error) {
  console.error("Alae Journey failed to boot.", error);
  if (root) {
    root.innerHTML = `
      <section style="min-height:100vh;display:grid;place-items:center;padding:24px;background:#0d152b;color:#fff7fb;font-family:Segoe UI,sans-serif;">
        <div style="max-width:720px;padding:24px 28px;border-radius:24px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);box-shadow:0 24px 80px rgba(0,0,0,0.32);">
          <p style="margin:0 0 10px;font-size:12px;letter-spacing:.18em;text-transform:uppercase;opacity:.75;">Erreur de lancement</p>
          <h1 style="margin:0 0 12px;font-size:28px;">Le jeu n'a pas pu demarrer</h1>
          <p style="margin:0 0 16px;line-height:1.6;opacity:.92;">Une erreur a bloque l'initialisation locale. Le detail est affiche ci-dessous pour faciliter le debug.</p>
          <pre style="margin:0;padding:16px;border-radius:16px;background:rgba(8,11,22,0.72);overflow:auto;white-space:pre-wrap;">${String(error?.stack || error?.message || error)}</pre>
        </div>
      </section>
    `;
  }
}

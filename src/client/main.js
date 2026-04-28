import { GameApp } from "./game/GameApp.js";

const root = document.getElementById("app");
const app = new GameApp(root);
app.mount();

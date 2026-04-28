import { AssetStore } from "./core/assets.js";
import { InputController } from "./core/input.js";
import { KissSceneRenderer } from "./core/KissSceneRenderer.js";
import { WorldRenderer } from "./core/renderer.js";
import { createDefaultState, loadState, resetState, saveState } from "./core/save.js";
import { AUTH, CHARACTERS, FINAL_LETTER, LUXURY_ITEMS, WORLDS } from "./data/worlds.js";

const WORLD_LIMIT = 760;
const PLAYER_RADIUS = 44;
const INTERACTION_DISTANCE = 170;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalize(value) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export class GameApp {
  constructor(root) {
    this.root = root;
    this.state = loadState();
    this.assets = new AssetStore();
    this.input = new InputController();
    this.pendingHouse = null;
    this.pendingReward = null;
    this.pendingKissHouse = null;
    this.toastTimer = 0;
    this.currentInteraction = null;
    this.modalLock = true;
    this.mobileUi = false;
    this.hudCollapsed = false;
    this.userToggledHud = false;
    this.lastTime = performance.now();
    this.time = 0;
    this.camera = {
      x: this.state.player.x,
      y: this.state.player.y
    };
    this.player = {
      x: this.state.player.x,
      y: this.state.player.y,
      bob: 0,
      facing: 0
    };
  }

  mount() {
    this.root.innerHTML = this.template();
    this.bindElements();
    this.renderer = new WorldRenderer(this.canvas, this.minimapCanvas, this.assets);
    this.kissRenderer = new KissSceneRenderer(this.kissCanvas, this.assets);
    this.renderer.resize();
    this.kissRenderer.resize();
    this.input.mount();
    this.input.bindTouchButtons(this.touchControls, () => this.tryInteract());
    this.bindEvents();
    this.ensureWorldState(this.state.worldIndex);
    this.letterContent.innerHTML = FINAL_LETTER;
    this.renderCharacterCards();
    this.syncFlow();
    this.updateHud();
    this.tick = (time) => this.loop(time);
    requestAnimationFrame(this.tick);
  }

  template() {
    return `
      <div class="game-shell">
        <canvas class="game-canvas" aria-label="Monde de jeu"></canvas>
        <canvas class="minimap-canvas" aria-hidden="true"></canvas>

        <header class="topbar">
          <div class="brand">
            <p class="eyebrow">Aventure mmorpg sentimentale</p>
            <h1>Alae Journey</h1>
          </div>
          <div class="topbar-actions">
            <button class="secondary-button mobile-only" data-ui="toggle-hud">Infos</button>
            <button class="secondary-button" data-ui="reset">Recommencer</button>
          </div>
        </header>

        <aside class="hud">
          <section class="panel">
            <p class="eyebrow">Monde actuel</p>
            <strong data-ui="world-name"></strong>
            <p class="muted" data-ui="world-subtitle"></p>
          </section>
          <section class="panel">
            <p class="eyebrow">Quete</p>
            <p data-ui="objective-text"></p>
            <div class="stat-line"><span>Maisons</span><strong data-ui="houses-count"></strong></div>
            <div class="stat-line"><span>Cle</span><strong data-ui="key-status"></strong></div>
            <div class="stat-line"><span>Porte</span><strong data-ui="portal-status"></strong></div>
          </section>
          <section class="panel">
            <p class="eyebrow">Personnage</p>
            <div class="avatar-row">
              <div class="avatar-swatch" data-ui="avatar-swatch"></div>
              <div>
                <strong data-ui="character-name"></strong>
                <p class="muted" data-ui="character-role"></p>
              </div>
            </div>
          </section>
          <section class="panel">
            <p class="eyebrow">Inventaire</p>
            <div class="inventory-list" data-ui="inventory-list"></div>
          </section>
          <section class="panel">
            <p class="eyebrow">Indice</p>
            <p class="muted" data-ui="hint-text"></p>
          </section>
        </aside>

        <div class="prompt hidden" data-ui="prompt"></div>
        <div class="toast hidden" data-ui="toast"></div>

        <div class="touch-controls hidden" data-ui="touch-controls">
          <div class="touch-stick-wrap">
            <div class="touch-stick" data-ui="touch-stick">
              <div class="touch-stick-ring"></div>
              <div class="touch-stick-thumb" data-ui="touch-thumb"></div>
            </div>
            <p class="touch-caption">Deplacement</p>
          </div>
          <div class="touch-actions">
            <button class="touch-button touch-button-large center" data-action="interact">Interagir</button>
            <button class="touch-button touch-button-secondary" data-ui="toggle-hud-secondary">Infos</button>
          </div>
        </div>

        <section class="modal-screen" data-modal="auth">
          <div class="modal-card auth-card">
            <div data-ui="auth-step-name">
              <p class="eyebrow">Etape 1</p>
              <h2>Entre ton nom</h2>
              <p class="lead">Ce portail n'attend qu'une seule personne.</p>
              <label class="field-label" for="auth-name">Nom</label>
              <input id="auth-name" data-ui="auth-name" autocomplete="off" placeholder="Alae">
              <p class="feedback" data-ui="name-feedback"></p>
              <div class="modal-actions">
                <button class="primary-button" data-ui="name-next">Continuer</button>
              </div>
            </div>
            <div class="hidden" data-ui="auth-step-password">
              <p class="eyebrow">Etape 2</p>
              <h2>Entre le mot de passe</h2>
              <p class="lead">S'il est faux deux fois, le portail donnera l'indice.</p>
              <label class="field-label" for="auth-password">Mot de passe</label>
              <input id="auth-password" data-ui="auth-password" type="password" autocomplete="off" placeholder="Mot de passe">
              <p class="feedback" data-ui="password-feedback"></p>
              <div class="modal-actions split-actions">
                <button class="secondary-button" data-ui="back-name">Retour</button>
                <button class="primary-button" data-ui="password-next">Deverrouiller</button>
              </div>
            </div>
          </div>
        </section>

        <section class="modal-screen hidden" data-modal="hint">
          <div class="modal-card">
            <p class="eyebrow">Indice</p>
            <h2>La reponse est pardon</h2>
            <p>Apres deux erreurs, le portail te souffle la bonne reponse : <strong>pardon</strong>.</p>
            <div class="modal-actions">
              <button class="primary-button" data-ui="close-hint">Compris</button>
            </div>
          </div>
        </section>

        <section class="modal-screen hidden" data-modal="character">
          <div class="modal-card large-card">
            <p class="eyebrow">Choix du personnage</p>
            <h2>Choisis un personnage inspire de Sonny Angel</h2>
            <p class="lead">Petit guide cute, flottant, doux et un peu magique, comme une mascotte de mmorpg romantique.</p>
            <div class="character-grid" data-ui="character-grid"></div>
            <div class="modal-actions">
              <button class="primary-button" data-ui="start-game" disabled>Entrer dans le monde</button>
            </div>
          </div>
        </section>

        <section class="modal-screen hidden" data-modal="choice">
          <div class="modal-card">
            <p class="eyebrow" data-ui="choice-tag"></p>
            <h2 data-ui="choice-title"></h2>
            <p class="lead">Veux-tu d'abord la morale ou l'article de luxe ?</p>
            <div class="choice-grid">
              <button class="primary-button" data-ui="choose-morale">Choisir la morale</button>
              <button class="secondary-button" data-ui="choose-luxury">Choisir l'article de luxe</button>
            </div>
          </div>
        </section>

        <section class="modal-screen hidden" data-modal="kiss">
          <div class="modal-card kiss-card">
            <p class="eyebrow">Cinematique</p>
            <h2>Le Bisou surprise</h2>
            <div class="kiss-scene" data-ui="kiss-scene">
              <canvas class="kiss-canvas" data-ui="kiss-canvas" aria-hidden="true"></canvas>
              <div class="kiss-heart heart-a">&#10084;</div>
              <div class="kiss-heart heart-b">&#10084;</div>
              <div class="kiss-heart heart-c">&#10084;</div>
            </div>
            <p>Un gorille stylise sort de la maison, avance avec gravite, s'approche du petit angel puis lui donne un bisou dramatique et cute avant de repartir dans un nuage de coeurs.</p>
            <div class="modal-actions">
              <button class="primary-button" data-ui="close-kiss">Recevoir la phrase</button>
            </div>
          </div>
        </section>

        <section class="modal-screen hidden" data-modal="message">
          <div class="modal-card">
            <p class="eyebrow" data-ui="message-tag"></p>
            <h2 data-ui="message-title"></h2>
            <div class="reward-banner hidden" data-ui="message-reward"></div>
            <p class="message-text" data-ui="message-text"></p>
            <div class="message-extra hidden" data-ui="message-extra"></div>
            <div class="modal-actions">
              <button class="primary-button" data-ui="close-message">Retour au monde</button>
            </div>
          </div>
        </section>

        <section class="modal-screen hidden" data-modal="letter">
          <div class="modal-card letter-card">
            <p class="eyebrow">Derniere porte</p>
            <h2>La lettre complete</h2>
            <div class="letter-frame">
              <div class="letter-content" data-ui="letter-content"></div>
            </div>
            <div class="modal-actions">
              <button class="primary-button" data-ui="close-letter">Fermer la lettre</button>
            </div>
          </div>
        </section>
      </div>
    `;
  }

  bindElements() {
    this.gameShell = this.root.querySelector(".game-shell");
    this.canvas = this.root.querySelector(".game-canvas");
    this.hud = this.root.querySelector(".hud");
    this.minimapCanvas = this.root.querySelector(".minimap-canvas");
    this.touchControls = this.root.querySelector('[data-ui="touch-controls"]');
    this.touchStick = this.root.querySelector('[data-ui="touch-stick"]');
    this.touchThumb = this.root.querySelector('[data-ui="touch-thumb"]');
    this.toast = this.root.querySelector('[data-ui="toast"]');
    this.prompt = this.root.querySelector('[data-ui="prompt"]');
    this.worldName = this.root.querySelector('[data-ui="world-name"]');
    this.worldSubtitle = this.root.querySelector('[data-ui="world-subtitle"]');
    this.objectiveText = this.root.querySelector('[data-ui="objective-text"]');
    this.housesCount = this.root.querySelector('[data-ui="houses-count"]');
    this.keyStatus = this.root.querySelector('[data-ui="key-status"]');
    this.portalStatus = this.root.querySelector('[data-ui="portal-status"]');
    this.characterName = this.root.querySelector('[data-ui="character-name"]');
    this.characterRole = this.root.querySelector('[data-ui="character-role"]');
    this.avatarSwatch = this.root.querySelector('[data-ui="avatar-swatch"]');
    this.inventoryList = this.root.querySelector('[data-ui="inventory-list"]');
    this.hintText = this.root.querySelector('[data-ui="hint-text"]');

    this.modals = {
      auth: this.root.querySelector('[data-modal="auth"]'),
      hint: this.root.querySelector('[data-modal="hint"]'),
      character: this.root.querySelector('[data-modal="character"]'),
      choice: this.root.querySelector('[data-modal="choice"]'),
      kiss: this.root.querySelector('[data-modal="kiss"]'),
      message: this.root.querySelector('[data-modal="message"]'),
      letter: this.root.querySelector('[data-modal="letter"]')
    };

    this.authStepName = this.root.querySelector('[data-ui="auth-step-name"]');
    this.authStepPassword = this.root.querySelector('[data-ui="auth-step-password"]');
    this.authNameInput = this.root.querySelector('[data-ui="auth-name"]');
    this.authPasswordInput = this.root.querySelector('[data-ui="auth-password"]');
    this.nameFeedback = this.root.querySelector('[data-ui="name-feedback"]');
    this.passwordFeedback = this.root.querySelector('[data-ui="password-feedback"]');
    this.characterGrid = this.root.querySelector('[data-ui="character-grid"]');
    this.startGameButton = this.root.querySelector('[data-ui="start-game"]');
    this.choiceTag = this.root.querySelector('[data-ui="choice-tag"]');
    this.choiceTitle = this.root.querySelector('[data-ui="choice-title"]');
    this.messageTag = this.root.querySelector('[data-ui="message-tag"]');
    this.messageTitle = this.root.querySelector('[data-ui="message-title"]');
    this.messageReward = this.root.querySelector('[data-ui="message-reward"]');
    this.messageText = this.root.querySelector('[data-ui="message-text"]');
    this.messageExtra = this.root.querySelector('[data-ui="message-extra"]');
    this.letterContent = this.root.querySelector('[data-ui="letter-content"]');
    this.kissScene = this.root.querySelector('[data-ui="kiss-scene"]');
    this.kissCanvas = this.root.querySelector('[data-ui="kiss-canvas"]');
    this.toggleHudButton = this.root.querySelector('[data-ui="toggle-hud"]');
    this.toggleHudButtonSecondary = this.root.querySelector('[data-ui="toggle-hud-secondary"]');
  }

  bindEvents() {
    window.addEventListener("resize", () => {
      this.renderer.resize();
      this.kissRenderer.resize();
      this.updateTouchVisibility();
    });

    window.addEventListener("beforeunload", () => this.persist());

    this.root.querySelector('[data-ui="reset"]').addEventListener("click", () => this.resetGame());
    this.root.querySelector('[data-ui="name-next"]').addEventListener("click", () => this.submitName());
    this.root.querySelector('[data-ui="password-next"]').addEventListener("click", () => this.submitPassword());
    this.root.querySelector('[data-ui="back-name"]').addEventListener("click", () => this.showAuthStep("name"));
    this.root.querySelector('[data-ui="close-hint"]').addEventListener("click", () => this.modals.hint.classList.add("hidden"));
    this.startGameButton.addEventListener("click", () => this.startGame());
    this.toggleHudButton.addEventListener("click", () => this.toggleMobileHud());
    this.toggleHudButtonSecondary.addEventListener("click", () => this.toggleMobileHud());
    this.root.querySelector('[data-ui="choose-morale"]').addEventListener("click", () => this.resolveHouseChoice("morale"));
    this.root.querySelector('[data-ui="choose-luxury"]').addEventListener("click", () => this.resolveHouseChoice("luxury"));
    this.root.querySelector('[data-ui="close-kiss"]').addEventListener("click", () => this.finishKissScene());
    this.root.querySelector('[data-ui="close-message"]').addEventListener("click", () => this.closeModal("message"));
    this.root.querySelector('[data-ui="close-letter"]').addEventListener("click", () => this.closeModal("letter"));

    window.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();
      if (key === "escape") {
        this.handleEscape();
        return;
      }
      if (!this.modalLock && (key === "e" || key === " ")) {
        this.tryInteract();
      }
    });
  }

  handleEscape() {
    if (!this.modals.hint.classList.contains("hidden")) {
      this.modals.hint.classList.add("hidden");
      return;
    }
    if (!this.modals.message.classList.contains("hidden")) {
      this.closeModal("message");
      return;
    }
    if (!this.modals.kiss.classList.contains("hidden")) {
      this.finishKissScene();
      return;
    }
    if (!this.modals.letter.classList.contains("hidden")) {
      this.closeModal("letter");
    }
  }

  renderCharacterCards() {
    this.characterGrid.innerHTML = "";
    CHARACTERS.forEach((character) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "character-card";
      if (this.state.characterId === character.id) {
        card.classList.add("selected");
      }
      card.innerHTML = `
        <div class="character-preview" style="background:linear-gradient(135deg, ${character.float}, ${character.accent})"></div>
        <h3>${character.name}</h3>
        <p><strong>${character.role}</strong></p>
        <p>${character.description}</p>
      `;
      card.addEventListener("click", () => {
        this.state.characterId = character.id;
        this.startGameButton.disabled = false;
        this.renderCharacterCards();
        this.updateHud();
        this.persist();
      });
      this.characterGrid.appendChild(card);
    });
    this.startGameButton.disabled = !this.state.characterId;
  }

  syncFlow() {
    this.updateTouchVisibility();
    if (!this.state.auth.authenticated) {
      this.openModal("auth");
      this.showAuthStep(this.state.auth.nameAccepted ? "password" : "name");
      return;
    }
    if (!this.state.characterId || !this.state.started) {
      this.openModal("character");
      return;
    }
    this.closeAllModals();
    this.modalLock = false;
  }

  showAuthStep(step) {
    this.authStepName.classList.toggle("hidden", step !== "name");
    this.authStepPassword.classList.toggle("hidden", step !== "password");
  }

  submitName() {
    const value = normalize(this.authNameInput.value);
    if (!value) {
      this.nameFeedback.textContent = "Entre le nom attendu pour continuer.";
      return;
    }
    if (value !== AUTH.name) {
      this.nameFeedback.textContent = "Ce portail n'attend qu'un seul nom.";
      return;
    }
    this.state.auth.nameAccepted = true;
    this.nameFeedback.textContent = "";
    this.passwordFeedback.textContent = "";
    this.showAuthStep("password");
    this.persist();
  }

  submitPassword() {
    const value = normalize(this.authPasswordInput.value);
    if (value !== AUTH.password) {
      this.state.auth.failures += 1;
      this.passwordFeedback.textContent = "Mot de passe faux.";
      this.persist();
      if (this.state.auth.failures >= 2) {
        this.modals.hint.classList.remove("hidden");
      }
      return;
    }
    this.state.auth.authenticated = true;
    this.state.auth.failures = 0;
    this.openModal("character");
    this.persist();
  }

  startGame() {
    if (!this.state.characterId) {
      return;
    }
    this.state.started = true;
    this.setSpawn();
    this.closeAllModals();
    this.modalLock = false;
    this.updateHud();
    this.persist();
    this.showToast("Bienvenue dans le premier monde.");
  }

  resetGame() {
    resetState();
    this.state = createDefaultState();
    this.pendingHouse = null;
    this.pendingReward = null;
    this.pendingKissHouse = null;
    this.toastTimer = 0;
    this.currentInteraction = null;
    this.modalLock = true;
    this.player = { x: 0, y: 0, bob: 0, facing: 0 };
    this.camera = { x: 0, y: 0 };
    this.lastTime = performance.now();
    this.input.clear();
    this.authNameInput.value = "";
    this.authPasswordInput.value = "";
    this.nameFeedback.textContent = "";
    this.passwordFeedback.textContent = "";
    this.messageReward.classList.add("hidden");
    this.messageExtra.classList.add("hidden");
    this.toast.classList.add("hidden");
    this.prompt.classList.add("hidden");
    this.hudCollapsed = false;
    this.userToggledHud = false;
    this.ensureWorldState(this.state.worldIndex);
    this.renderCharacterCards();
    this.syncFlow();
    this.updateHud();
    this.updatePrompt();
    this.persist();
  }

  loop(time) {
    const delta = Math.min((time - this.lastTime) / 1000, 0.033);
    this.lastTime = time;
    this.time = time / 1000;
    this.update(delta);
    this.render();
    requestAnimationFrame(this.tick);
  }

  update(delta) {
    if (this.toastTimer > 0) {
      this.toastTimer -= delta;
      if (this.toastTimer <= 0) {
        this.toast.classList.add("hidden");
      }
    }

    if (!this.state.started || this.modalLock) {
      this.currentInteraction = null;
      this.updatePrompt();
      return;
    }

    const axis = this.input.moveAxis();
    if (axis.x !== 0 || axis.y !== 0) {
      const length = Math.hypot(axis.x, axis.y) || 1;
      const speed = this.mobileUi ? 350 : 320;
      const nextX = clamp(this.player.x + (axis.x / length) * speed * delta, -WORLD_LIMIT, WORLD_LIMIT);
      const nextY = clamp(this.player.y + (axis.y / length) * speed * delta, -WORLD_LIMIT, WORLD_LIMIT);
      const world = this.currentWorld();
      if (!this.houseCollision(nextX, this.player.y, world)) {
        this.player.x = nextX;
      }
      if (!this.houseCollision(this.player.x, nextY, world)) {
        this.player.y = nextY;
      }
      this.player.facing = Math.atan2(axis.x, axis.y);
      this.player.bob += delta * 8;
    }

    this.camera.x += (this.player.x - this.camera.x) * 0.14;
    this.camera.y += (this.player.y - this.camera.y) * 0.14;

    this.state.player = { x: this.player.x, y: this.player.y };
    this.currentInteraction = this.findInteraction();
    this.updatePrompt();
    this.persist(false);
  }

  render() {
    const world = this.currentWorld();
    const worldState = this.ensureWorldState(this.state.worldIndex);
    const scene = {
      world,
      time: this.time,
      camera: this.camera,
      player: this.player,
      character: this.currentCharacter(),
      inventory: this.state.inventory,
      visitedHouses: new Set(Object.keys(worldState.visited)),
      portal: {
        position: { x: 0, y: -430 },
        unlocked: this.portalUnlocked(this.state.worldIndex)
      }
    };
    this.renderer.render(scene);
    this.kissRenderer.render(
      this.time,
      !this.modals.kiss.classList.contains("hidden"),
      this.currentCharacter(),
      this.state.inventory
    );
  }

  currentWorld() {
    return WORLDS[this.state.worldIndex];
  }

  currentCharacter() {
    return CHARACTERS.find((character) => character.id === this.state.characterId) || CHARACTERS[0];
  }

  ensureWorldState(index) {
    if (!this.state.worldStates[index]) {
      this.state.worldStates[index] = { visited: {}, hasKey: false };
    }
    return this.state.worldStates[index];
  }

  portalUnlocked(index) {
    const worldState = this.ensureWorldState(index);
    return Object.keys(worldState.visited).length >= this.currentWorld().houses.length && worldState.hasKey;
  }

  setSpawn() {
    this.player.x = 0;
    this.player.y = 320;
    this.player.facing = 0;
    this.camera.x = this.player.x;
    this.camera.y = this.player.y;
    this.state.player = { x: this.player.x, y: this.player.y };
  }

  houseCollision(x, y, world) {
    return world.houses.some((house) => {
      const left = house.position.x - house.size.w / 2 - PLAYER_RADIUS;
      const right = house.position.x + house.size.w / 2 + PLAYER_RADIUS;
      const top = house.position.y - house.size.h / 2 - PLAYER_RADIUS;
      const bottom = house.position.y + house.size.h / 2 + PLAYER_RADIUS;
      return x > left && x < right && y > top && y < bottom;
    });
  }

  findInteraction() {
    const world = this.currentWorld();
    let best = null;
    let bestDistance = Infinity;
    world.houses.forEach((house) => {
      const frontDoor = { x: house.position.x, y: house.position.y + house.size.h / 2 + 50 };
      const d = distance(this.player, frontDoor);
      if (d < INTERACTION_DISTANCE && d < bestDistance) {
        best = { type: "house", house };
        bestDistance = d;
      }
    });
    const portalPoint = { x: 0, y: -430 };
    const portalDistance = distance(this.player, portalPoint);
    if (portalDistance < INTERACTION_DISTANCE && portalDistance < bestDistance) {
      best = { type: "portal" };
    }
    return best;
  }

  tryInteract() {
    if (!this.currentInteraction || this.modalLock) {
      return;
    }
    if (this.currentInteraction.type === "house") {
      this.pendingHouse = this.currentInteraction.house;
      this.choiceTag.textContent = `${this.currentWorld().subtitle} - Maison ${this.pendingHouse.number}`;
      this.choiceTitle.textContent = this.pendingHouse.title;
      this.openModal("choice");
      return;
    }
    this.openPortal();
  }

  resolveHouseChoice(choice) {
    if (!this.pendingHouse) {
      return;
    }
    const house = this.pendingHouse;
    this.closeModal("choice");

    if (choice === "luxury") {
      const reward = LUXURY_ITEMS[Math.floor(Math.random() * LUXURY_ITEMS.length)];
      this.pendingReward = reward;
      this.state.inventory.push(reward);
      this.updateHud();
      this.persist();
      if (reward === "Bisou") {
        this.pendingKissHouse = house;
        this.pendingHouse = null;
        this.prepareKissScene();
        this.openModal("kiss");
        return;
      }
      this.pendingHouse = null;
      this.revealHouse(house, reward);
      return;
    }

    this.pendingHouse = null;
    this.revealHouse(house, null);
  }

  finishKissScene() {
    this.closeModal("kiss");
    if (this.pendingReward === "Bisou" && this.pendingKissHouse) {
      const house = this.pendingKissHouse;
      this.pendingKissHouse = null;
      this.revealHouse(house, this.pendingReward);
    }
  }

  prepareKissScene() {
    this.kissRenderer.play(this.currentCharacter(), this.state.inventory);
  }

  revealHouse(house, reward) {
    const worldState = this.ensureWorldState(this.state.worldIndex);
    worldState.visited[house.id] = true;
    if (house.givesKey) {
      worldState.hasKey = true;
    }

    this.messageTag.textContent = `${this.currentWorld().subtitle} - Maison ${house.number}`;
    this.messageTitle.textContent = house.title;
    this.messageText.textContent = house.text;

    if (reward) {
      this.messageReward.textContent = reward === "Bisou"
        ? "Article de luxe obtenu : Bisou. Le personnage porte maintenant ce souvenir-la aussi."
        : `Article de luxe obtenu : ${reward}. Il est maintenant ajoute au personnage.`;
      this.messageReward.classList.remove("hidden");
    } else {
      this.messageReward.classList.add("hidden");
    }

    const extra = reward ? `${house.rewardFlavor} ${house.extra || ""}`.trim() : (house.extra || house.rewardFlavor);
    this.messageExtra.textContent = extra;
    this.messageExtra.classList.toggle("hidden", !extra);
    this.pendingHouse = null;
    this.pendingReward = null;
    this.pendingKissHouse = null;
    this.openModal("message");
    this.updateHud();
    this.persist();
  }

  openPortal() {
    if (!this.portalUnlocked(this.state.worldIndex)) {
      this.showToast("La porte demande encore les 3 maisons et la cle.");
      return;
    }
    if (this.state.worldIndex < WORLDS.length - 1) {
      this.state.worldIndex += 1;
      this.ensureWorldState(this.state.worldIndex);
      this.setSpawn();
      this.updateHud();
      this.persist();
      this.showToast("Un nouveau monde s'ouvre.");
      return;
    }
    this.openModal("letter");
  }

  updateHud() {
    const world = this.currentWorld();
    const worldState = this.ensureWorldState(this.state.worldIndex);
    this.worldName.textContent = world.name;
    this.worldSubtitle.textContent = world.subtitle;
    this.objectiveText.textContent = this.state.worldIndex === WORLDS.length - 1
      ? "Entre dans les 3 maisons, trouve la derniere cle et ouvre la porte finale."
      : "Entre dans les 3 maisons, trouve la cle et ouvre la porte du monde suivant.";
    this.housesCount.textContent = `${Object.keys(worldState.visited).length} / ${world.houses.length}`;
    this.keyStatus.textContent = worldState.hasKey ? "Oui" : "Non";
    this.portalStatus.textContent = this.portalUnlocked(this.state.worldIndex)
      ? (this.state.worldIndex === WORLDS.length - 1 ? "Pret pour la lettre" : "Prete a s'ouvrir")
      : "Verrouillee";
    this.hintText.textContent = world.hint;

    const character = this.currentCharacter();
    this.characterName.textContent = character.name;
    this.characterRole.textContent = `${character.role} - ${character.description}`;
    this.avatarSwatch.style.background = `linear-gradient(135deg, ${character.float}, ${character.accent})`;

    this.inventoryList.innerHTML = "";
    if (this.state.inventory.length === 0) {
      this.inventoryList.innerHTML = '<span class="empty-pill">Aucun article pour l\'instant</span>';
    } else {
      this.state.inventory.forEach((item) => {
        const chip = document.createElement("span");
        chip.className = "inventory-pill";
        chip.textContent = item;
        this.inventoryList.appendChild(chip);
      });
    }
  }

  updatePrompt() {
    if (!this.currentInteraction || this.modalLock || !this.state.started) {
      this.prompt.classList.add("hidden");
      return;
    }
    this.prompt.textContent = this.currentInteraction.type === "house"
      ? (this.mobileUi
        ? `Touchez Interagir pour entrer dans la maison ${this.currentInteraction.house.number}`
        : `Appuie sur E pour entrer dans la maison ${this.currentInteraction.house.number}`)
      : (this.portalUnlocked(this.state.worldIndex)
        ? (this.mobileUi ? "Touchez Interagir pour ouvrir la porte" : "Appuie sur E pour ouvrir la porte")
        : "La porte est encore verrouillee");
    this.prompt.classList.remove("hidden");
  }

  openModal(name) {
    this.closeAllModals();
    this.modals[name].classList.remove("hidden");
    this.modalLock = true;
  }

  closeModal(name) {
    this.modals[name].classList.add("hidden");
    this.syncFlowAfterModal();
  }

  closeAllModals() {
    Object.values(this.modals).forEach((modal) => modal.classList.add("hidden"));
    this.modalLock = false;
  }

  syncFlowAfterModal() {
    if (!this.state.auth.authenticated || !this.state.characterId || !this.state.started) {
      this.syncFlow();
      return;
    }
    this.modalLock = false;
  }

  updateTouchVisibility() {
    const visible = window.innerWidth <= 860 || "ontouchstart" in window;
    this.mobileUi = visible;
    this.touchControls.classList.toggle("hidden", !visible);
    this.gameShell.classList.toggle("mobile-ui", visible);

    if (!visible) {
      this.hudCollapsed = false;
      this.userToggledHud = false;
    } else if (!this.userToggledHud) {
      this.hudCollapsed = true;
    }

    this.gameShell.classList.toggle("hud-collapsed", visible && this.hudCollapsed);
    const label = this.hudCollapsed ? "Infos" : "Fermer";
    this.toggleHudButton.textContent = label;
    this.toggleHudButtonSecondary.textContent = label;
  }

  toggleMobileHud() {
    if (!this.mobileUi) {
      return;
    }
    this.userToggledHud = true;
    this.hudCollapsed = !this.hudCollapsed;
    this.gameShell.classList.toggle("hud-collapsed", this.hudCollapsed);
    const label = this.hudCollapsed ? "Infos" : "Fermer";
    this.toggleHudButton.textContent = label;
    this.toggleHudButtonSecondary.textContent = label;
  }

  showToast(text) {
    this.toast.textContent = text;
    this.toast.classList.remove("hidden");
    this.toastTimer = 2.2;
  }

  persist(full = true) {
    if (!full) {
      this.state.player = { x: this.player.x, y: this.player.y };
    }
    saveState(this.state);
  }
}

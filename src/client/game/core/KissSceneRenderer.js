import * as THREE from "three";
import { animateAngelModel, configureShadowTree, poseGorillaModel, styleAngelModel } from "./avatar.js";

const ANGEL_MODEL_SRC = "/src/client/assets/models/angel.gltf";
const GORILLA_MODEL_SRC = "/src/client/assets/models/gorilla.gltf";

export class KissSceneRenderer {
  constructor(canvas, assets) {
    this.canvas = canvas;
    this.assets = assets;
    this.clockStart = 0;
    this.active = false;
    this.currentCharacterId = null;
    this.currentInventoryKey = "";

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
    this.camera.position.set(0, 9, 24);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const hemi = new THREE.HemisphereLight(0xffeff8, 0x50343f, 1.2);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff0df, 1.5);
    sun.position.set(12, 18, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.camera.left = -18;
    sun.shadow.camera.right = 18;
    sun.shadow.camera.top = 18;
    sun.shadow.camera.bottom = -18;
    this.scene.add(sun);

    const ground = new THREE.Mesh(
      new THREE.CylinderGeometry(12.5, 14, 1.8, 42),
      new THREE.MeshStandardMaterial({
        color: 0xffd8ea,
        roughness: 0.84
      })
    );
    ground.position.y = -0.9;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(10.5, 42),
      new THREE.MeshBasicMaterial({
        color: 0xffd3e8,
        transparent: true,
        opacity: 0.28
      })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.02;
    this.scene.add(glow);

    this.heartMeshes = [];
    for (let index = 0; index < 6; index += 1) {
      const heart = new THREE.Group();
      const lobeA = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 14, 12),
        new THREE.MeshStandardMaterial({
          color: 0xff7eb8,
          emissive: 0xff7eb8,
          emissiveIntensity: 0.2
        })
      );
      const lobeB = lobeA.clone();
      lobeA.position.set(-0.18, 0.05, 0);
      lobeB.position.set(0.18, 0.05, 0);
      const tip = new THREE.Mesh(
        new THREE.ConeGeometry(0.38, 0.62, 18),
        new THREE.MeshStandardMaterial({
          color: 0xff7eb8,
          emissive: 0xff7eb8,
          emissiveIntensity: 0.2
        })
      );
      tip.rotation.z = Math.PI;
      tip.position.set(0, -0.3, 0);
      heart.add(lobeA, lobeB, tip);
      heart.visible = false;
      this.scene.add(heart);
      this.heartMeshes.push(heart);
    }

    this.angelRoot = new THREE.Group();
    this.angelRoot.position.set(3.4, 0, 0.8);
    this.scene.add(this.angelRoot);

    this.gorillaRoot = new THREE.Group();
    this.gorillaRoot.position.set(-8.5, 0, 0);
    this.scene.add(this.gorillaRoot);

    this.readyPromise = null;
    this.angelModel = null;
    this.gorillaModel = null;
  }

  resize() {
    const width = this.canvas.clientWidth || 1;
    const height = this.canvas.clientHeight || 1;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  async ensureReady() {
    if (this.readyPromise) {
      return this.readyPromise;
    }

    this.readyPromise = Promise.all([
      this.assets.getModel(ANGEL_MODEL_SRC),
      this.assets.getModel(GORILLA_MODEL_SRC)
    ]).then(([angelGltf, gorillaGltf]) => {
      this.angelModel = angelGltf.scene.clone(true);
      configureShadowTree(this.angelModel);
      this.angelRoot.add(this.angelModel);

      this.gorillaModel = gorillaGltf.scene.clone(true);
      configureShadowTree(this.gorillaModel);
      this.gorillaRoot.add(this.gorillaModel);
    });

    return this.readyPromise;
  }

  play(character, inventory = []) {
    this.active = true;
    this.clockStart = performance.now();
    this.currentCharacterId = null;
    this.currentInventoryKey = "";
    this.renderFrame((performance.now() - this.clockStart) / 1000, character, inventory);
  }

  render(time, visible, character, inventory = []) {
    if (!visible) {
      return;
    }

    this.ensureReady().then(() => {
      const elapsed = this.active ? (performance.now() - this.clockStart) / 1000 : time;
      this.renderFrame(elapsed, character, inventory);
    }).catch(() => {});
  }

  renderFrame(elapsed, character, inventory) {
    if (!this.angelModel || !this.gorillaModel) {
      return;
    }

    const inventoryKey = inventory.join("|");
    if (this.currentCharacterId !== character.id || this.currentInventoryKey !== inventoryKey) {
      styleAngelModel(this.angelModel, character, inventory);
      this.currentCharacterId = character.id;
      this.currentInventoryKey = inventoryKey;
    }

    const loop = Math.min((elapsed % 4.4) / 4.4, 1);
    animateAngelModel(this.angelModel, elapsed * 1.4, Math.sin(elapsed * 2.6) * 0.08);
    this.angelRoot.rotation.y = -0.26;
    poseGorillaModel(this.gorillaModel, loop);

    const kissAnchor = this.gorillaModel.getObjectByName("KissAnchor");
    const heartsVisible = loop > 0.6 && loop < 0.92;
    this.heartMeshes.forEach((heart, index) => {
      heart.visible = heartsVisible;
      if (!heartsVisible || !kissAnchor) {
        return;
      }
      const t = (loop - 0.6) / 0.32;
      const angle = (Math.PI * 2 * index) / this.heartMeshes.length;
      heart.position.set(
        kissAnchor.getWorldPosition(new THREE.Vector3()).x + Math.cos(angle) * (0.5 + t * 1.4),
        11.6 + t * 4.5 + index * 0.05,
        3.8 + Math.sin(angle) * 0.5
      );
      heart.rotation.z = angle + elapsed * 0.8;
      heart.scale.setScalar(0.9 + t * 0.55);
    });

    this.camera.lookAt(0.8, 7.8, 0.4);
    this.renderer.render(this.scene, this.camera);
  }
}

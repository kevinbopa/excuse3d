import * as THREE from "three";
import { EffectComposer } from "/vendor/three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "/vendor/three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "/vendor/three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { animateAngelModel, configureShadowTree, styleAngelModel } from "./avatar.js";

const SCALE = 0.12;
const ANGEL_MODEL_SRC = "/assets/models/angel.gltf";

function worldUnit(value) {
  return value * SCALE;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function roundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function makeCanvasTexture(size, painter) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  painter(context, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function makeRepeatingTexture(size, painter, repeatX = 1, repeatY = 1) {
  const texture = makeCanvasTexture(size, painter);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  return texture;
}

export class WorldRenderer {
  constructor(canvas, minimapCanvas, assets) {
    this.canvas = canvas;
    this.minimapCanvas = minimapCanvas;
    this.assets = assets;
    this.minimapContext = minimapCanvas.getContext("2d");

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance"
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.16;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x8aa6d6, 45, 260);

    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 1200);
    this.camera.position.set(0, 42, 68);

    this.textureLoader = new THREE.TextureLoader();
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.textureCache = new Map();

    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.48, 0.72, 0.88);
    this.composer.addPass(this.bloomPass);

    this.worldCache = new Map();
    this.currentWorldId = null;
    this.currentWorldBundle = null;
    this.currentCharacterId = null;
    this.currentInventoryKey = "";
    this.playerHeight = 4.72;
    this.playerModel = null;
    this.playerModelPromise = null;

    this.playerGroup = new THREE.Group();
    this.scene.add(this.playerGroup);

    this.playerBodyRoot = new THREE.Group();
    this.playerGroup.add(this.playerBodyRoot);

    this.portalPulse = 0;

    this.setupLights();
  }

  setupLights() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    this.hemiLight = new THREE.HemisphereLight(0xcbe7ff, 0x254035, 1.35);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff4d7, 1.85);
    this.sunLight.position.set(38, 56, 24);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.left = -120;
    this.sunLight.shadow.camera.right = 120;
    this.sunLight.shadow.camera.top = 120;
    this.sunLight.shadow.camera.bottom = -120;
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 220;
    this.scene.add(this.sunLight);

    this.rimLight = new THREE.DirectionalLight(0xc9e9ff, 0.62);
    this.rimLight.position.set(-44, 24, -38);
    this.scene.add(this.rimLight);
  }

  resize() {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(width, height, false);
    this.composer.setPixelRatio(this.pixelRatio);
    this.composer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.bloomPass.strength = width < 860 ? 0.28 : 0.42;
    this.bloomPass.radius = width < 860 ? 0.52 : 0.68;

    const compact = width < 980;
    const mapWidth = compact ? 132 : 164;
    const mapHeight = compact ? 132 : 164;
    this.minimapCanvas.width = Math.round(mapWidth * this.pixelRatio);
    this.minimapCanvas.height = Math.round(mapHeight * this.pixelRatio);
    this.minimapCanvas.style.width = `${mapWidth}px`;
    this.minimapCanvas.style.height = `${mapHeight}px`;
  }

  render(sceneState) {
    if (this.currentWorldId !== sceneState.world.id) {
      this.switchWorld(sceneState.world);
    }

    this.rebuildPlayerIfNeeded(sceneState.character, sceneState.inventory);
    this.updateWorldState(sceneState);
    this.updatePlayer(sceneState);
    this.updateCamera(sceneState);

    this.composer.render();
    this.drawMiniMap(sceneState);
  }

  switchWorld(world) {
    if (this.currentWorldBundle) {
      this.scene.remove(this.currentWorldBundle.group);
    }

    if (!this.worldCache.has(world.id)) {
      this.worldCache.set(world.id, this.buildWorld(world));
    }

    this.currentWorldId = world.id;
    this.currentWorldBundle = this.worldCache.get(world.id);
    this.scene.add(this.currentWorldBundle.group);

    const background = new THREE.Color(world.skyBottom);
    this.scene.background = background;
    this.scene.fog.color.copy(background);
    this.hemiLight.color = new THREE.Color(world.skyTop);
    this.hemiLight.groundColor = new THREE.Color(world.terrainB);
  }

  buildWorld(world) {
    const group = new THREE.Group();
    const seed = world.id.length * 13.17;

    const skyDome = this.buildSkyDome(world);
    group.add(skyDome);

    const cloudLayer = this.buildCloudLayer(world, seed);
    group.add(cloudLayer);

    const mountainGroup = this.buildMountains(world);
    group.add(mountainGroup);

    const realmBackdrop = this.buildRealmBackdrop(world, seed);
    group.add(realmBackdrop);

    const terrain = this.buildTerrain(world, seed);
    group.add(terrain.mesh);

    const meadow = this.buildMeadow(world, seed);
    group.add(meadow);

    const forestClusters = this.buildForestClusters(world, seed);
    group.add(forestClusters);

    const paths = this.buildPathRibbon(world);
    group.add(paths);

    const pathLanterns = this.buildPathLanterns(world, seed);
    group.add(pathLanterns);

    const houses = world.houses.map((house) => this.buildHouse(world, house, seed));
    houses.forEach((houseBundle) => group.add(houseBundle.group));

    const decorations = world.decorations.map((decoration) => {
      const decorationObject = this.buildDecoration(world, decoration, seed);
      group.add(decorationObject);
      return decorationObject;
    });

    const portal = this.buildPortal(world);
    group.add(portal.group);

    const petals = this.buildPetals(world, seed);
    group.add(petals);

    const fireflies = this.buildFireflies(world, seed);
    group.add(fireflies);

    return {
      group,
      cloudLayer,
      terrain,
      meadow,
      forestClusters,
      pathLanterns,
      houses,
      decorations,
      portal,
      petals,
      fireflies,
      world
    };
  }

  buildSkyDome(world) {
    const texture = makeCanvasTexture(1024, (context, size) => {
      const gradient = context.createLinearGradient(0, 0, 0, size);
      gradient.addColorStop(0, world.skyTop);
      gradient.addColorStop(0.48, new THREE.Color(world.skyTop).lerp(new THREE.Color(world.skyBottom), 0.32).getStyle());
      gradient.addColorStop(1, world.skyBottom);
      context.fillStyle = gradient;
      context.fillRect(0, 0, size, size);

      const sun = context.createRadialGradient(size * 0.5, size * 0.18, 10, size * 0.5, size * 0.18, size * 0.18);
      sun.addColorStop(0, "rgba(255,245,215,0.92)");
      sun.addColorStop(0.35, "rgba(255,230,186,0.54)");
      sun.addColorStop(1, "rgba(255,230,186,0)");
      context.fillStyle = sun;
      context.fillRect(0, 0, size, size);

      for (let index = 0; index < 180; index += 1) {
        const x = (Math.sin(index * 17.1) * 0.5 + 0.5) * size;
        const y = (Math.cos(index * 11.7) * 0.5 + 0.5) * size * 0.78;
        const radius = 1 + (index % 3);
        context.fillStyle = `rgba(255,255,255,${0.18 + (index % 5) * 0.08})`;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
      }
    });

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      fog: false
    });

    const geometry = new THREE.SphereGeometry(420, 32, 18);
    const dome = new THREE.Mesh(geometry, material);
    dome.position.y = 40;
    return dome;
  }

  buildMountains(world) {
    const group = new THREE.Group();
    const color = new THREE.Color(world.skyBottom).offsetHSL(0, 0, -0.04);
    const farColor = new THREE.Color(world.skyBottom).lerp(new THREE.Color("#ffffff"), 0.1);

    for (let layer = 0; layer < 2; layer += 1) {
      for (let index = 0; index < 18; index += 1) {
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(22 + (index % 4) * 10 + layer * 6, 48 + (index % 6) * 10 + layer * 12, 7),
          new THREE.MeshStandardMaterial({
            color: layer === 0 ? color : farColor,
            roughness: 0.95,
            metalness: 0
          })
        );
        const angle = (Math.PI * 2 * index) / 18 + layer * 0.1;
        const radius = 136 + layer * 28 + (index % 3) * 14;
        cone.position.set(Math.cos(angle) * radius, 14 + layer * 4, Math.sin(angle) * radius);
        cone.castShadow = false;
        cone.receiveShadow = true;
        group.add(cone);
      }
    }

    return group;
  }

  buildCloudLayer(world, seed) {
    const group = new THREE.Group();
    const cloudColor = new THREE.Color(world.skyTop).lerp(new THREE.Color(0xffffff), 0.62);

    for (let index = 0; index < 9; index += 1) {
      const cluster = new THREE.Group();
      const puffCount = 4 + (index % 3);
      for (let puffIndex = 0; puffIndex < puffCount; puffIndex += 1) {
        const puff = new THREE.Mesh(
          new THREE.SphereGeometry(5.4 + ((puffIndex + index) % 3), 18, 16),
          new THREE.MeshStandardMaterial({
            color: cloudColor,
            transparent: true,
            opacity: 0.3,
            roughness: 1,
            depthWrite: false
          })
        );
        puff.scale.set(1.4, 0.84, 1);
        puff.position.set((puffIndex - puffCount / 2) * 4.8, Math.sin(puffIndex + index) * 1.2, Math.cos(puffIndex) * 2.4);
        cluster.add(puff);
      }

      const angle = (Math.PI * 2 * index) / 9 + seed * 0.03;
      const radius = 60 + (index % 4) * 15;
      cluster.position.set(Math.cos(angle) * radius, 44 + (index % 3) * 5, Math.sin(angle) * radius);
      cluster.userData = {
        baseX: cluster.position.x,
        baseY: cluster.position.y,
        baseZ: cluster.position.z,
        drift: 0.3 + index * 0.04
      };
      group.add(cluster);
    }

    return group;
  }

  buildRealmBackdrop(world, seed) {
    const group = new THREE.Group();
    const wallColor = new THREE.Color(world.portalColor).lerp(new THREE.Color("#fffaf0"), 0.3);
    const towerColor = new THREE.Color(world.terrainA).lerp(new THREE.Color("#ffffff"), 0.5);

    const castleBase = new THREE.Mesh(
      new THREE.BoxGeometry(28, 18, 18),
      new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.84 })
    );
    castleBase.position.set(0, 10, -108);
    castleBase.castShadow = true;
    castleBase.receiveShadow = true;
    group.add(castleBase);

    [-10, 10].forEach((x) => {
      const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(4.4, 5, 24, 12),
        new THREE.MeshStandardMaterial({ color: towerColor, roughness: 0.82 })
      );
      tower.position.set(x, 15, -105);
      tower.castShadow = true;
      group.add(tower);

      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(5.8, 8, 10),
        new THREE.MeshStandardMaterial({ color: new THREE.Color(world.portalColor).offsetHSL(0, 0.05, -0.1), roughness: 0.74 })
      );
      roof.position.set(x, 31, -105);
      roof.castShadow = true;
      group.add(roof);
    });

    const gateGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 12),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(world.portalColor), transparent: true, opacity: 0.22 })
    );
    gateGlow.position.set(0, 10, -98.5);
    group.add(gateGlow);

    for (let index = 0; index < 14; index += 1) {
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(8, 7, 3.5),
        new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.9 })
      );
      const side = index < 7 ? -1 : 1;
      const offset = (index % 7) * 7.2;
      wall.position.set(side * (28 + offset), 4.8, -110 + Math.sin(index + seed) * 2);
      wall.castShadow = true;
      wall.receiveShadow = true;
      group.add(wall);
    }

    return group;
  }

  buildTerrain(world, seed) {
    const size = 300;
    const segments = 120;
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position;
    const colors = [];
    const colorA = new THREE.Color(world.terrainA);
    const colorB = new THREE.Color(world.terrainB);

    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index);
      const z = positions.getZ(index);
      const height = this.terrainHeight(x, z, seed);
      positions.setY(index, height);

      const distanceFade = clamp(Math.hypot(x, z) / 145, 0, 1);
      const blend = clamp((height + 5) / 10, 0, 1);
      const mixed = colorA.clone().lerp(colorB, 1 - blend);
      mixed.lerp(new THREE.Color(world.skyBottom), distanceFade * 0.12);
      colors.push(mixed.r, mixed.g, mixed.b);
    }

    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const textureKey = `${world.id}:terrain`;
    if (!this.textureCache.has(textureKey)) {
      const flowerA = new THREE.Color(world.flower).lerp(new THREE.Color("#ffffff"), 0.08);
      const grassA = new THREE.Color(world.terrainA).offsetHSL(0, 0.02, -0.02);
      const grassB = new THREE.Color(world.terrainB).offsetHSL(0, 0.03, -0.06);
      const grassTexture = makeRepeatingTexture(512, (context, size) => {
        context.fillStyle = grassA.getStyle();
        context.fillRect(0, 0, size, size);
        for (let index = 0; index < 1200; index += 1) {
          const x = (Math.sin(index * 2.17 + seed) * 0.5 + 0.5) * size;
          const y = (Math.cos(index * 1.73 + seed) * 0.5 + 0.5) * size;
          context.fillStyle = index % 4 === 0 ? flowerA.getStyle() : grassB.getStyle();
          context.fillRect(x, y, 2 + (index % 3), 4 + (index % 4));
        }
      }, 14, 14);
      grassTexture.anisotropy = this.maxAnisotropy;
      this.textureCache.set(textureKey, grassTexture);
    }

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: this.textureCache.get(textureKey),
      roughness: 0.92,
      metalness: 0.02
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;

    return { mesh, seed };
  }

  buildMeadow(world, seed) {
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];
    const colorA = new THREE.Color(world.flower);
    const colorB = new THREE.Color(world.portalColor).lerp(new THREE.Color(0xffffff), 0.38);

    for (let index = 0; index < 920; index += 1) {
      const x = (Math.sin(index * 4.17 + seed) * 0.5 + 0.5) * 252 - 126;
      const z = (Math.cos(index * 3.73 + seed) * 0.5 + 0.5) * 252 - 126;
      const y = this.terrainHeight(x, z, seed) + 0.18;
      positions.push(x, y, z);
      const tint = index % 2 === 0 ? colorA : colorB;
      colors.push(tint.r, tint.g, tint.b);
    }

    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

    return new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        size: 0.62,
        vertexColors: true,
        transparent: true,
        opacity: 0.46
      })
    );
  }

  buildForestClusters(world, seed) {
    const group = new THREE.Group();
    const palette = [
      new THREE.Color(world.terrainA).lerp(new THREE.Color("#b8ffea"), 0.28),
      new THREE.Color(world.terrainB).lerp(new THREE.Color("#ffffff"), 0.2),
      new THREE.Color(world.skyTop).lerp(new THREE.Color("#d8fff4"), 0.36)
    ];

    for (let index = 0; index < 48; index += 1) {
      const x = Math.sin(index * 1.9 + seed) * 108;
      const z = Math.cos(index * 2.3 + seed) * 106;
      if (Math.abs(z) < 22 && Math.abs(x) < 26) {
        continue;
      }
      const height = 11 + (index % 5) * 2.2;
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.75, 1.05, height, 8),
        new THREE.MeshStandardMaterial({ color: 0x70503a, roughness: 0.94 })
      );
      trunk.position.set(x, this.terrainHeight(x, z, seed) + height / 2, z);
      trunk.castShadow = true;
      group.add(trunk);

      const crown = new THREE.Mesh(
        new THREE.SphereGeometry(4.6 + (index % 3), 18, 16),
        new THREE.MeshStandardMaterial({ color: palette[index % palette.length], roughness: 0.8 })
      );
      crown.position.set(x, trunk.position.y + height / 2 + 1.8, z);
      crown.scale.set(1.18, 0.92, 1.12);
      crown.castShadow = true;
      group.add(crown);
    }

    return group;
  }

  buildPathRibbon(world) {
    const points = [
      new THREE.Vector3(0, 0.05, worldUnit(420)),
      ...world.houses.map((house) => new THREE.Vector3(worldUnit(house.position.x), 0.05, worldUnit(house.position.y))),
      new THREE.Vector3(0, 0.05, worldUnit(-430))
    ];

    const curve = new THREE.CatmullRomCurve3(points);
    const geometry = new THREE.TubeGeometry(curve, 100, 2.4, 12, false);
    const textureKey = "path:texture";
    if (!this.textureCache.has(textureKey)) {
      const pathTexture = makeRepeatingTexture(256, (context, size) => {
        context.fillStyle = "#f0ddbd";
        context.fillRect(0, 0, size, size);
        for (let index = 0; index < 360; index += 1) {
          const x = (Math.sin(index * 1.77) * 0.5 + 0.5) * size;
          const y = (Math.cos(index * 1.21) * 0.5 + 0.5) * size;
          context.fillStyle = index % 3 === 0 ? "rgba(231, 190, 130, 0.55)" : "rgba(255,255,255,0.08)";
          context.beginPath();
          context.arc(x, y, 2 + (index % 4), 0, Math.PI * 2);
          context.fill();
        }
      }, 10, 2);
      pathTexture.anisotropy = this.maxAnisotropy;
      this.textureCache.set(textureKey, pathTexture);
    }

    const material = new THREE.MeshStandardMaterial({
      color: 0xf9e8cd,
      map: this.textureCache.get(textureKey),
      roughness: 0.88,
      metalness: 0.02
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    return mesh;
  }

  buildPathLanterns(world) {
    const group = new THREE.Group();
    const points = [
      { x: 0, y: 420 },
      ...world.houses.map((house) => house.position),
      { x: 0, y: -430 }
    ];

    points.forEach((point, index) => {
      if (index === 0 || index === points.length - 1) {
        return;
      }
      [-1, 1].forEach((side) => {
        const gx = worldUnit(point.x + side * 48);
        const gz = worldUnit(point.y + side * 18);
        const gy = this.terrainHeight(gx, gz, world.id.length * 13.17);
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.22, 0.22, 4.8, 8),
          new THREE.MeshStandardMaterial({ color: 0x645246, roughness: 0.92 })
        );
        post.position.set(gx, gy + 2.4, gz);
        group.add(post);

        const lamp = new THREE.Mesh(
          new THREE.SphereGeometry(0.52, 12, 12),
          new THREE.MeshStandardMaterial({
            color: 0xfff0c0,
            emissive: 0xffe4b6,
            emissiveIntensity: 1.3,
            roughness: 0.28
          })
        );
        lamp.position.set(gx, gy + 4.9, gz);
        lamp.userData = { kind: "lantern", phase: index + side };
        group.add(lamp);
      });
    });

    return group;
  }

  buildHouse(world, house, seed) {
    const group = new THREE.Group();
    const style = house.style || {};
    const architecture = style.architecture || "cottage";
    const footprintX = worldUnit(house.size.w);
    const footprintZ = worldUnit(house.size.h) * 0.84;
    const baseHeight = architecture === "sanctuary" ? 13.6 : architecture === "guild" ? 12.4 : 11.5;
    const roofHeight = architecture === "sanctuary" ? 10 : architecture === "atelier" ? 7.2 : 8;
    const groundY = this.terrainHeight(worldUnit(house.position.x), worldUnit(house.position.y), seed);
    const wallColor = new THREE.Color(style.wall || world.terrainA).lerp(new THREE.Color(0xffffff), 0.58);
    const trimColor = new THREE.Color(style.trim || world.portalColor).lerp(new THREE.Color(0xffffff), 0.18);
    const roofColor = new THREE.Color(style.roof || world.portalColor).offsetHSL(0, 0.02, -0.08);
    const wallTextureKey = `wall:${world.id}`;
    if (!this.textureCache.has(wallTextureKey)) {
      const wallTexture = makeRepeatingTexture(512, (context, size) => {
        context.fillStyle = wallColor.getStyle();
        context.fillRect(0, 0, size, size);
        for (let index = 0; index < 240; index += 1) {
          const x = (index * 31) % size;
          const y = (index * 17) % size;
          context.fillStyle = index % 3 === 0 ? "rgba(255,255,255,0.12)" : "rgba(120,80,60,0.06)";
          context.fillRect(x, y, 42, 8);
        }
      }, 3, 2);
      wallTexture.anisotropy = this.maxAnisotropy;
      this.textureCache.set(wallTextureKey, wallTexture);
    }
    const roofTextureKey = `roof:${world.id}`;
    if (!this.textureCache.has(roofTextureKey)) {
      const roofTexture = makeRepeatingTexture(512, (context, size) => {
        context.fillStyle = roofColor.getStyle();
        context.fillRect(0, 0, size, size);
        for (let row = 0; row < 12; row += 1) {
          for (let col = 0; col < 10; col += 1) {
            const width = 52;
            const height = 26;
            const x = col * width + (row % 2) * 18;
            const y = row * height;
            context.fillStyle = row % 2 === 0 ? "rgba(255,255,255,0.08)" : "rgba(60,20,30,0.08)";
            context.fillRect(x, y, width - 6, height - 4);
          }
        }
      }, 2.2, 2.2);
      roofTexture.anisotropy = this.maxAnisotropy;
      this.textureCache.set(roofTextureKey, roofTexture);
    }

    group.position.set(worldUnit(house.position.x), groundY, worldUnit(house.position.y));

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(footprintX, baseHeight, footprintZ),
      new THREE.MeshStandardMaterial({
        color: wallColor,
        map: this.textureCache.get(wallTextureKey),
        roughness: 0.76,
        metalness: 0.02
      })
    );
    base.position.y = baseHeight / 2;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    const accent = new THREE.Mesh(
      new THREE.BoxGeometry(footprintX + 1.6, 1.8, footprintZ + 1.6),
      new THREE.MeshStandardMaterial({
        color: trimColor,
        roughness: 0.82
      })
    );
    accent.position.y = 0.9;
    accent.castShadow = true;
    accent.receiveShadow = true;
    group.add(accent);

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(
        Math.max(footprintX, footprintZ) * (architecture === "sanctuary" ? 0.7 : 0.74),
        roofHeight,
        architecture === "sanctuary" ? 6 : 4
      ),
      new THREE.MeshStandardMaterial({
        color: roofColor,
        map: this.textureCache.get(roofTextureKey),
        roughness: 0.78,
        metalness: 0.02
      })
    );
    roof.rotation.y = architecture === "sanctuary" ? 0 : Math.PI * 0.25;
    roof.position.y = baseHeight + roofHeight / 2 + 0.4;
    roof.castShadow = true;
    group.add(roof);

    const roofCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.34, 2.2, 10),
      new THREE.MeshStandardMaterial({
        color: 0xfff2cd,
        roughness: 0.44,
        metalness: 0.12
      })
    );
    roofCap.position.y = baseHeight + roofHeight + 1.2;
    roofCap.castShadow = true;
    group.add(roofCap);

    const door = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 5.2, 0.4),
      new THREE.MeshStandardMaterial({
        color: 0x2b1b21,
        roughness: 0.9
      })
    );
    door.position.set(0, 2.7, footprintZ / 2 + 0.24);
    group.add(door);

    const stoop = new THREE.Mesh(
      new THREE.BoxGeometry(6.6, 1.1, 4.2),
      new THREE.MeshStandardMaterial({
        color: 0xf7e1c4,
        roughness: 0.9
      })
    );
    stoop.position.set(0, 0.55, footprintZ / 2 + 2.4);
    stoop.receiveShadow = true;
    group.add(stoop);

    const step = new THREE.Mesh(
      new THREE.BoxGeometry(8.2, 0.6, 3.2),
      new THREE.MeshStandardMaterial({
        color: 0xf0d4b0,
        roughness: 0.92
      })
    );
    step.position.set(0, 0.3, footprintZ / 2 + 5);
    step.receiveShadow = true;
    group.add(step);

    const windowMaterial = new THREE.MeshStandardMaterial({
      color: 0xffefb6,
      emissive: 0xffefb6,
      emissiveIntensity: 0.9,
      roughness: 0.24
    });

    [-1, 1].forEach((side) => {
      const windowMesh = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2, 0.3), windowMaterial);
      windowMesh.position.set(side * 4, 4.2, footprintZ / 2 + 0.25);
      group.add(windowMesh);

      const sideWindow = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 0.3), windowMaterial);
      sideWindow.rotation.y = Math.PI / 2;
      sideWindow.position.set(side * (footprintX / 2 + 0.2), 4.4, 0);
      group.add(sideWindow);
    });

    const chimney = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 5.4, 2.2),
      new THREE.MeshStandardMaterial({
        color: 0xe3b48e,
        roughness: 0.88
      })
    );
    chimney.position.set(footprintX * 0.2, baseHeight + 4, -footprintZ * 0.12);
    chimney.castShadow = true;
    group.add(chimney);

    if (architecture === "sanctuary") {
      const sideTower = new THREE.Mesh(
        new THREE.CylinderGeometry(2.6, 2.9, 13.5, 10),
        new THREE.MeshStandardMaterial({
          color: wallColor.clone().lerp(new THREE.Color("#ffffff"), 0.06),
          roughness: 0.82
        })
      );
      sideTower.position.set(-footprintX * 0.34, 6.75, -footprintZ * 0.08);
      sideTower.castShadow = true;
      sideTower.receiveShadow = true;
      group.add(sideTower);

      const sideTowerRoof = new THREE.Mesh(
        new THREE.ConeGeometry(3.3, 5.8, 8),
        new THREE.MeshStandardMaterial({ color: roofColor.clone().offsetHSL(0, 0.03, -0.06), roughness: 0.7 })
      );
      sideTowerRoof.position.set(-footprintX * 0.34, 16.2, -footprintZ * 0.08);
      sideTowerRoof.castShadow = true;
      group.add(sideTowerRoof);
    }

    if (architecture === "atelier") {
      const annex = new THREE.Mesh(
        new THREE.BoxGeometry(footprintX * 0.34, baseHeight * 0.68, footprintZ * 0.42),
        new THREE.MeshStandardMaterial({
          color: wallColor.clone().lerp(new THREE.Color("#fff3ec"), 0.06),
          map: this.textureCache.get(wallTextureKey),
          roughness: 0.8
        })
      );
      annex.position.set(footprintX * 0.34, baseHeight * 0.34, -footprintZ * 0.06);
      annex.castShadow = true;
      annex.receiveShadow = true;
      group.add(annex);

      const annexRoof = new THREE.Mesh(
        new THREE.BoxGeometry(footprintX * 0.38, 0.8, footprintZ * 0.52),
        new THREE.MeshStandardMaterial({
          color: roofColor.clone().offsetHSL(0, 0.04, 0.02),
          roughness: 0.68
        })
      );
      annexRoof.rotation.z = -0.12;
      annexRoof.position.set(footprintX * 0.34, baseHeight * 0.72 + 0.6, -footprintZ * 0.06);
      annexRoof.castShadow = true;
      group.add(annexRoof);
    }

    if (architecture === "guild") {
      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(2.6, 0.3, 12, 20, Math.PI),
        new THREE.MeshStandardMaterial({
          color: trimColor.clone().lerp(new THREE.Color("#fff8de"), 0.18),
          roughness: 0.54,
          metalness: 0.08
        })
      );
      arch.rotation.z = Math.PI;
      arch.position.set(0, 4.55, footprintZ / 2 + 0.48);
      group.add(arch);

      [-1, 1].forEach((side) => {
        const banner = new THREE.Mesh(
          new THREE.PlaneGeometry(2.1, 4.6),
          new THREE.MeshStandardMaterial({
            color: roofColor.clone().lerp(new THREE.Color("#ffffff"), 0.14),
            side: THREE.DoubleSide,
            roughness: 0.72
          })
        );
        banner.position.set(side * 5.3, 7.4, footprintZ / 2 + 0.38);
        group.add(banner);
      });
    }

    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(footprintX * 0.58, 0.5, 2.8),
      new THREE.MeshStandardMaterial({
        color: trimColor.clone().lerp(new THREE.Color("#ffffff"), 0.18),
        roughness: 0.64
      })
    );
    awning.position.set(0, 6.6, footprintZ / 2 + 1.65);
    group.add(awning);

    if (style.label) {
      const sign = this.makeCaptionSprite(style.label, {
        background: "rgba(18, 23, 37, 0.82)",
        text: "#fff8ff",
        width: 512,
        height: 256,
        font: "bold 38px Segoe UI"
      });
      sign.position.set(0, baseHeight + roofHeight + 2.8, footprintZ / 2 + 2.4);
      sign.scale.set(8.6, 4.2, 1);
      group.add(sign);
    }

    [-1, 1].forEach((side) => {
      const flowerBox = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 0.6, 1.3),
        new THREE.MeshStandardMaterial({ color: 0xc88b69, roughness: 0.84 })
      );
      flowerBox.position.set(side * 4, 2.7, footprintZ / 2 + 0.9);
      group.add(flowerBox);

      const blossom = new THREE.Mesh(
        new THREE.SphereGeometry(0.46, 12, 12),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(world.flower),
          emissive: new THREE.Color(world.flower),
          emissiveIntensity: 0.24
        })
      );
      blossom.position.set(side * 4, 3.38, footprintZ / 2 + 0.9);
      group.add(blossom);
    });

    const lanterns = [-1, 1].map((side) => {
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.58, 12, 12),
        new THREE.MeshStandardMaterial({
          color: 0xfff0c0,
          emissive: 0xffe2a0,
          emissiveIntensity: 1.8,
          roughness: 0.28
        })
      );
      glow.position.set(side * 3.1, 5.4, footprintZ / 2 + 1.1);
      group.add(glow);
      return glow;
    });

    const fence = new THREE.Group();
    [-1, 1].forEach((side) => {
      for (let index = 0; index < 4; index += 1) {
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.22, 0.22, 2.4, 8),
          new THREE.MeshStandardMaterial({ color: 0xf7ebd2, roughness: 0.92 })
        );
        post.position.set(side * (footprintX / 2 + 4.2), 1.2, footprintZ / 2 - 5 + index * 3.6);
        fence.add(post);
      }
    });
    const fenceRail = new THREE.Mesh(
      new THREE.BoxGeometry(footprintX + 15, 0.32, 0.32),
      new THREE.MeshStandardMaterial({ color: 0xf9f1df, roughness: 0.92 })
    );
    fenceRail.position.set(0, 1.6, footprintZ / 2 + 10.4);
    fence.add(fenceRail);
    group.add(fence);

    const badge = this.makeHouseBadge(house.number);
    badge.position.set(0, baseHeight + roofHeight + 5.8, 0);
    group.add(badge);

    const visitedMarker = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 16, 16),
      new THREE.MeshStandardMaterial({
        color: 0xffec9f,
        emissive: 0xffec9f,
        emissiveIntensity: 1.3
      })
    );
    visitedMarker.position.set(footprintX / 2 - 2.5, baseHeight + 3.2, footprintZ / 2 - 1.2);
    visitedMarker.visible = false;
    group.add(visitedMarker);

    return {
      id: house.id,
      group,
      badge,
      lanterns,
      visitedMarker,
      house
    };
  }

  buildDecoration(world, decoration, seed) {
    if (decoration.type === "tree") {
      return this.buildTree(decoration, seed);
    }
    if (decoration.type === "river") {
      return this.buildRiver(decoration, seed);
    }
    if (decoration.type === "home") {
      return this.buildHome(decoration, seed);
    }
    if (decoration.type === "mageShop") {
      return this.buildMageShop(decoration, seed);
    }
    if (decoration.type === "animal") {
      return this.buildAnimal(decoration, seed);
    }
    if (decoration.type === "fairy") {
      return this.buildFairy(decoration, seed);
    }
    if (decoration.type === "resident") {
      return this.buildResident(decoration, seed);
    }
    if (decoration.type === "town") {
      return this.buildTown(decoration, seed);
    }
    if (decoration.type === "lanternCluster") {
      return this.buildLanternCluster(decoration, seed);
    }
    if (decoration.type === "castle") {
      return this.buildCastle(decoration, seed);
    }
    if (decoration.type === "pond") {
      return this.buildPond(decoration, seed);
    }
    if (decoration.type === "crystal") {
      return this.buildCrystal(decoration, seed);
    }
    if (decoration.type === "billboard") {
      return this.buildBillboard(decoration, seed);
    }
    return new THREE.Group();
  }

  buildRiver(river, seed) {
    const points = river.points.map((point) => {
      const x = worldUnit(point.x);
      const z = worldUnit(point.y);
      return new THREE.Vector3(x, this.terrainHeight(x, z, seed) + 0.12, z);
    });
    const curve = new THREE.CatmullRomCurve3(points);
    const textureKey = `river:${river.color}`;
    if (!this.textureCache.has(textureKey)) {
      const riverTexture = makeRepeatingTexture(512, (context, size) => {
        const gradient = context.createLinearGradient(0, 0, size, size);
        gradient.addColorStop(0, "#d7fbff");
        gradient.addColorStop(1, "#79c7ea");
        context.fillStyle = gradient;
        context.fillRect(0, 0, size, size);
        context.strokeStyle = "rgba(255,255,255,0.22)";
        context.lineWidth = 3;
        for (let index = 0; index < 36; index += 1) {
          context.beginPath();
          context.moveTo(0, (index * 19) % size);
          context.bezierCurveTo(size * 0.3, (index * 17) % size, size * 0.6, (index * 23) % size, size, (index * 19) % size);
          context.stroke();
        }
      }, 6, 1);
      riverTexture.anisotropy = this.maxAnisotropy;
      this.textureCache.set(textureKey, riverTexture);
    }
    const mesh = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 100, worldUnit(river.width) * 0.16, 18, false),
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(river.color),
        map: this.textureCache.get(textureKey),
        transmission: 0.2,
        transparent: true,
        opacity: 0.76,
        roughness: 0.18,
        metalness: 0.02
      })
    );
    mesh.receiveShadow = true;
    mesh.userData = { kind: "river", phase: seed * 0.1 };
    return mesh;
  }

  buildHome(home, seed) {
    const group = new THREE.Group();
    const groundY = this.terrainHeight(worldUnit(home.x), worldUnit(home.y), seed);
    group.position.set(worldUnit(home.x), groundY, worldUnit(home.y));

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(14, 10, 12),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(home.color), roughness: 0.84 })
    );
    body.position.y = 5;
    body.castShadow = true;
    group.add(body);

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(10.2, 8.4, 4),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(home.roof), roughness: 0.74 })
    );
    roof.rotation.y = Math.PI * 0.25;
    roof.position.y = 13;
    roof.castShadow = true;
    group.add(roof);

    const door = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 4.8, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x4a2d27, roughness: 0.88 })
    );
    door.position.set(0, 2.7, 6.2);
    group.add(door);

    const heartWindow = new THREE.Mesh(
      new THREE.CircleGeometry(1.4, 20),
      new THREE.MeshStandardMaterial({
        color: 0xffd4ea,
        emissive: 0xffc1de,
        emissiveIntensity: 0.72,
        roughness: 0.26
      })
    );
    heartWindow.position.set(0, 6.8, 6.18);
    group.add(heartWindow);

    const mailbox = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1, 1.4),
      new THREE.MeshStandardMaterial({ color: 0xe7a2c8, roughness: 0.72 })
    );
    mailbox.position.set(-5.4, 1.4, 9.4);
    group.add(mailbox);

    const mailboxPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 2, 8),
      new THREE.MeshStandardMaterial({ color: 0x6e553b, roughness: 0.92 })
    );
    mailboxPost.position.set(-5.4, 0.5, 9.4);
    group.add(mailboxPost);

    const label = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: makeCanvasTexture(256, (context, size) => {
          context.clearRect(0, 0, size, size);
          context.fillStyle = "rgba(13, 18, 32, 0.85)";
          roundedRect(context, 22, 78, size - 44, 96, 28);
          context.fill();
          context.fillStyle = "#fff5fb";
          context.font = "bold 28px Segoe UI";
          context.textAlign = "center";
          context.fillText(home.label, size / 2, size / 2 + 8);
        }),
        transparent: true
      })
    );
    label.position.set(0, 20, 0);
    label.scale.set(10, 4.2, 1);
    group.add(label);

    group.userData = { kind: "home" };
    return group;
  }

  buildMageShop(shop, seed) {
    const group = new THREE.Group();
    const groundY = this.terrainHeight(worldUnit(shop.x), worldUnit(shop.y), seed);
    group.position.set(worldUnit(shop.x), groundY, worldUnit(shop.y));

    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(7.2, 8.4, 17, 10),
      new THREE.MeshStandardMaterial({ color: 0xf6efe7, roughness: 0.86 })
    );
    tower.position.y = 8.5;
    tower.castShadow = true;
    group.add(tower);

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(9.6, 10.8, 10),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(shop.roof), roughness: 0.72 })
    );
    roof.position.y = 22.5;
    roof.castShadow = true;
    group.add(roof);

    const glowCrystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.8, 0),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(shop.glow),
        emissive: new THREE.Color(shop.glow),
        emissiveIntensity: 1.2,
        transparent: true,
        opacity: 0.92,
        roughness: 0.2
      })
    );
    glowCrystal.position.y = 29;
    group.add(glowCrystal);

    const sign = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: makeCanvasTexture(256, (context, size) => {
          context.clearRect(0, 0, size, size);
          context.fillStyle = "rgba(31, 20, 44, 0.9)";
          roundedRect(context, 28, 72, size - 56, 108, 34);
          context.fill();
          context.fillStyle = "#fff6ff";
          context.font = "bold 34px Segoe UI";
          context.textAlign = "center";
          context.fillText(shop.sign, size / 2, size / 2 + 12);
        }),
        transparent: true
      })
    );
    sign.position.set(0, 17.5, 10);
    sign.scale.set(10.4, 4.8, 1);
    group.add(sign);

    group.userData = { kind: "mageShop" };
    return group;
  }

  buildAnimal(animal, seed) {
    const group = new THREE.Group();
    const groundY = this.terrainHeight(worldUnit(animal.x), worldUnit(animal.y), seed);
    group.position.set(worldUnit(animal.x), groundY + 1.1, worldUnit(animal.y));

    const body = new THREE.Mesh(
      new THREE.SphereGeometry(2.3, 16, 14),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(animal.color), roughness: 0.82 })
    );
    body.scale.set(animal.animal === "bird" ? 0.9 : 1.35, animal.animal === "rabbit" ? 1.1 : 0.88, 0.96);
    group.add(body);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(animal.animal === "bird" ? 1.2 : 1.5, 14, 12),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(animal.color).lerp(new THREE.Color("#ffffff"), 0.1), roughness: 0.78 })
    );
    head.position.set(animal.animal === "fox" ? 2.3 : 2.1, 1.05, 0);
    group.add(head);

    if (animal.animal === "deer") {
      [-0.4, 0.4].forEach((offset) => {
        const antler = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.14, 1.8, 6),
          new THREE.MeshStandardMaterial({ color: 0xdbc4a1, roughness: 0.9 })
        );
        antler.position.set(2.5, 2.6, offset);
        antler.rotation.z = offset > 0 ? -0.4 : 0.4;
        group.add(antler);
      });
    }
    if (animal.animal === "bird") {
      const beak = new THREE.Mesh(
        new THREE.ConeGeometry(0.34, 0.85, 8),
        new THREE.MeshStandardMaterial({ color: 0xffcc7e, roughness: 0.5 })
      );
      beak.rotation.z = -Math.PI / 2;
      beak.position.set(3, 1, 0);
      group.add(beak);
    }

    group.userData = { kind: "animal", baseY: group.position.y, phase: animal.x * 0.02 };
    return group;
  }

  buildFairy(fairy, seed) {
    const group = new THREE.Group();
    const groundY = this.terrainHeight(worldUnit(fairy.x), worldUnit(fairy.y), seed);
    group.position.set(worldUnit(fairy.x), groundY + 7.5, worldUnit(fairy.y));

    const [base, accent, glow] = fairy.palette;
    const fairyTexture = fairy.src
      ? this.textureLoader.load(fairy.src)
      : makeCanvasTexture(512, (context, size) => {
          context.clearRect(0, 0, size, size);
          context.fillStyle = "rgba(255,255,255,0)";
          context.fillRect(0, 0, size, size);

          context.fillStyle = glow;
          context.beginPath();
          context.ellipse(size * 0.5, size * 0.56, size * 0.13, size * 0.19, 0, 0, Math.PI * 2);
          context.fill();

          context.fillStyle = base;
          context.beginPath();
          context.arc(size * 0.5, size * 0.32, size * 0.13, 0, Math.PI * 2);
          context.fill();

          context.fillStyle = accent;
          context.beginPath();
          context.moveTo(size * 0.5, size * 0.42);
          context.lineTo(size * 0.39, size * 0.75);
          context.lineTo(size * 0.61, size * 0.75);
          context.closePath();
          context.fill();

          context.fillStyle = "rgba(255,255,255,0.75)";
          context.beginPath();
          context.ellipse(size * 0.36, size * 0.53, size * 0.08, size * 0.14, -0.5, 0, Math.PI * 2);
          context.fill();
          context.beginPath();
          context.ellipse(size * 0.64, size * 0.53, size * 0.08, size * 0.14, 0.5, 0, Math.PI * 2);
          context.fill();

          context.fillStyle = "#2a2135";
          context.beginPath();
          context.arc(size * 0.46, size * 0.31, size * 0.012, 0, Math.PI * 2);
          context.arc(size * 0.54, size * 0.31, size * 0.012, 0, Math.PI * 2);
          context.fill();
        });
    fairyTexture.colorSpace = THREE.SRGBColorSpace;

    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: fairyTexture,
        transparent: true,
        depthWrite: false
      })
    );
    sprite.scale.set(10, 12, 1);
    group.add(sprite);
    group.userData = { kind: "fairy", baseY: group.position.y, phase: fairy.x * 0.025 };
    return group;
  }

  buildResident(resident, seed) {
    const group = new THREE.Group();
    const x = worldUnit(resident.x);
    const z = worldUnit(resident.y);
    const scale = resident.scale || 14;
    const groundY = this.terrainHeight(x, z, seed);
    const texture = this.textureLoader.load(resident.src);
    texture.colorSpace = THREE.SRGBColorSpace;

    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.08,
        depthWrite: false
      })
    );
    sprite.scale.set(scale * 0.56, scale, 1);
    sprite.position.y = scale * 0.5;
    group.add(sprite);

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(scale * 0.2, 20),
      new THREE.MeshBasicMaterial({
        color: 0x10131f,
        transparent: true,
        opacity: 0.16
      })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.06;
    group.add(shadow);

    if (resident.label) {
      const tag = this.makeCaptionSprite(resident.label, {
        background: "rgba(11, 18, 32, 0.84)",
        text: "#fff8ff",
        width: 384,
        height: 170,
        font: "bold 28px Segoe UI"
      });
      tag.position.set(0, scale + 2.4, 0);
      tag.scale.set(7, 3, 1);
      group.add(tag);
    }

    group.position.set(x, groundY, z);
    group.userData = {
      kind: "resident",
      baseX: x,
      baseZ: z,
      height: 0,
      phase: (resident.x + resident.y) * 0.02,
      radiusX: resident.wander?.radiusX ? worldUnit(resident.wander.radiusX) : 0,
      radiusZ: resident.wander?.radiusY ? worldUnit(resident.wander.radiusY) : 0,
      speed: resident.wander?.speed || 0.3,
      sprite,
      shadow
    };
    return group;
  }

  buildTown(town, seed) {
    const group = new THREE.Group();
    const x = worldUnit(town.x);
    const z = worldUnit(town.y);
    const scale = town.scale || 1;
    const groundY = this.terrainHeight(x, z, seed);
    const themes = {
      azure: { stone: "#f0f5ff", trim: "#8fb8ff", roof: "#5d7bd3", cloth: "#dff2ff" },
      rose: { stone: "#fff3fb", trim: "#ffaddf", roof: "#c57ef4", cloth: "#ffe8f7" },
      mint: { stone: "#f2fff8", trim: "#8fd8ba", roof: "#5fb88e", cloth: "#efffd9" }
    };
    const palette = themes[town.theme] || themes.azure;

    group.position.set(x, groundY, z);

    const plaza = new THREE.Mesh(
      new THREE.CylinderGeometry(16 * scale, 18 * scale, 1.8, 28),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(palette.stone),
        roughness: 0.9
      })
    );
    plaza.position.y = 0.9;
    plaza.receiveShadow = true;
    group.add(plaza);

    const fountain = new THREE.Mesh(
      new THREE.CylinderGeometry(4.6 * scale, 5.6 * scale, 2.2, 18),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(palette.trim).lerp(new THREE.Color("#ffffff"), 0.26),
        roughness: 0.74
      })
    );
    fountain.position.y = 1.9;
    fountain.castShadow = true;
    group.add(fountain);

    const fountainCore = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1 * scale, 1.2 * scale, 6.2 * scale, 12),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(palette.trim),
        emissive: new THREE.Color(palette.trim),
        emissiveIntensity: 0.14,
        roughness: 0.48
      })
    );
    fountainCore.position.y = 5.4 * scale;
    fountainCore.castShadow = true;
    group.add(fountainCore);

    const waterGlow = new THREE.Mesh(
      new THREE.CircleGeometry(3.6 * scale, 24),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(palette.cloth),
        transparent: true,
        opacity: 0.45
      })
    );
    waterGlow.rotation.x = -Math.PI / 2;
    waterGlow.position.y = 3.15;
    group.add(waterGlow);

    [-1, 1].forEach((side) => {
      const hall = new THREE.Mesh(
        new THREE.BoxGeometry(9 * scale, 8.8 * scale, 7.4 * scale),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(palette.stone),
          roughness: 0.82
        })
      );
      hall.position.set(side * 13.5 * scale, 4.4 * scale, -4.6 * scale);
      hall.castShadow = true;
      hall.receiveShadow = true;
      group.add(hall);

      const hallRoof = new THREE.Mesh(
        new THREE.ConeGeometry(7.6 * scale, 6.6 * scale, 4),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(palette.roof),
          roughness: 0.68
        })
      );
      hallRoof.rotation.y = Math.PI * 0.25;
      hallRoof.position.set(side * 13.5 * scale, 11.1 * scale, -4.6 * scale);
      hallRoof.castShadow = true;
      group.add(hallRoof);
    });

    [-1, 0, 1].forEach((offset, index) => {
      const stall = new THREE.Group();
      const counter = new THREE.Mesh(
        new THREE.BoxGeometry(5.8 * scale, 2.6 * scale, 3.4 * scale),
        new THREE.MeshStandardMaterial({
          color: 0x9a6e4a,
          roughness: 0.84
        })
      );
      counter.position.y = 1.3 * scale;
      stall.add(counter);

      const canopy = new THREE.Mesh(
        new THREE.BoxGeometry(6.6 * scale, 0.55 * scale, 4.2 * scale),
        new THREE.MeshStandardMaterial({
          color: index % 2 === 0 ? new THREE.Color(palette.cloth) : new THREE.Color(palette.trim),
          roughness: 0.62
        })
      );
      canopy.position.y = 4.4 * scale;
      stall.add(canopy);

      stall.position.set(offset * 8.6 * scale, 0.4, 10.5 * scale);
      stall.rotation.y = offset * -0.08;
      group.add(stall);
    });

    for (let index = 0; index < 4; index += 1) {
      const angle = (Math.PI * 2 * index) / 4 + Math.PI / 4;
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22 * scale, 0.26 * scale, 7 * scale, 8),
        new THREE.MeshStandardMaterial({ color: 0x6b5341, roughness: 0.92 })
      );
      post.position.set(Math.cos(angle) * 18 * scale, 3.5 * scale, Math.sin(angle) * 18 * scale);
      group.add(post);

      const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.72 * scale, 12, 12),
        new THREE.MeshStandardMaterial({
          color: 0xfff2c7,
          emissive: 0xffeeb0,
          emissiveIntensity: 1.2,
          roughness: 0.24
        })
      );
      lamp.position.set(Math.cos(angle) * 18 * scale, 7.2 * scale, Math.sin(angle) * 18 * scale);
      group.add(lamp);
    }

    if (town.label) {
      const label = this.makeCaptionSprite(town.label, {
        background: "rgba(12, 18, 34, 0.84)",
        text: "#fff8ff",
        width: 512,
        height: 210,
        font: "bold 34px Segoe UI"
      });
      label.position.set(0, 16 * scale, -12 * scale);
      label.scale.set(11, 4, 1);
      group.add(label);
    }

    group.userData = { kind: "town" };
    return group;
  }

  buildLanternCluster(cluster, seed) {
    const group = new THREE.Group();
    const groundY = this.terrainHeight(worldUnit(cluster.x), worldUnit(cluster.y), seed);
    group.position.set(worldUnit(cluster.x), groundY, worldUnit(cluster.y));

    for (let index = 0; index < 6; index += 1) {
      const angle = (Math.PI * 2 * index) / 6;
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 5 + (index % 2), 8),
        new THREE.MeshStandardMaterial({ color: 0x685447, roughness: 0.92 })
      );
      post.position.set(Math.cos(angle) * 5.2, 2.5, Math.sin(angle) * 4.4);
      group.add(post);

      const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.56, 12, 12),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(cluster.color),
          emissive: new THREE.Color(cluster.color),
          emissiveIntensity: 1.5,
          roughness: 0.24
        })
      );
      lamp.position.set(Math.cos(angle) * 5.2, 5.5 + (index % 2), Math.sin(angle) * 4.4);
      lamp.userData = { kind: "lantern", phase: index * 0.8 };
      group.add(lamp);
    }

    return group;
  }

  buildCastle(castle, seed) {
    const group = new THREE.Group();
    const groundY = this.terrainHeight(worldUnit(castle.x), worldUnit(castle.y), seed);
    group.position.set(worldUnit(castle.x), groundY + 4, worldUnit(castle.y));

    const wallColor = new THREE.Color(castle.color);
    const center = new THREE.Mesh(
      new THREE.BoxGeometry(18, 14, 14),
      new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.9 })
    );
    center.position.y = 7;
    group.add(center);

    [-7, 7].forEach((x) => {
      const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(3.4, 3.8, 20, 10),
        new THREE.MeshStandardMaterial({ color: wallColor.clone().lerp(new THREE.Color("#ffffff"), 0.08), roughness: 0.84 })
      );
      tower.position.set(x, 10, 0);
      group.add(tower);

      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(4.4, 6.6, 10),
        new THREE.MeshStandardMaterial({ color: new THREE.Color(castle.glow).offsetHSL(0, 0.05, -0.16), roughness: 0.74 })
      );
      roof.position.set(x, 23, 0);
      group.add(roof);
    });

    const aura = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 24),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(castle.glow), transparent: true, opacity: 0.12 })
    );
    aura.position.set(0, 12, 8);
    group.add(aura);

    group.userData = { kind: "castle" };
    return group;
  }

  buildTree(tree, seed) {
    const group = new THREE.Group();
    const groundY = this.terrainHeight(worldUnit(tree.x), worldUnit(tree.y), seed);
    group.position.set(worldUnit(tree.x), groundY, worldUnit(tree.y));

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 2.1, 12, 10),
      new THREE.MeshStandardMaterial({
        color: 0x6f4c3a,
        roughness: 0.94
      })
    );
    trunk.position.y = 6;
    trunk.castShadow = true;
    group.add(trunk);

    const crown = new THREE.Mesh(
      new THREE.SphereGeometry(worldUnit(tree.radius) * 0.18, 22, 18),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(tree.color),
        roughness: 0.82
      })
    );
    crown.position.y = 16;
    crown.castShadow = true;
    group.add(crown);

    const crownHighlight = new THREE.Mesh(
      new THREE.SphereGeometry(worldUnit(tree.radius) * 0.08, 18, 16),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.12,
        roughness: 0.3
      })
    );
    crownHighlight.position.set(-2, 19, 2);
    group.add(crownHighlight);

    return group;
  }

  buildPond(pond, seed) {
    const groundY = this.terrainHeight(worldUnit(pond.x), worldUnit(pond.y), seed);
    const textureKey = `water:${pond.rx}:${pond.ry}:${Math.round(pond.x)}`;
    if (!this.textureCache.has(textureKey)) {
      const waterTexture = makeRepeatingTexture(512, (context, size) => {
        const gradient = context.createLinearGradient(0, 0, size, size);
        gradient.addColorStop(0, "#bff5ff");
        gradient.addColorStop(1, "#69bfe6");
        context.fillStyle = gradient;
        context.fillRect(0, 0, size, size);
        context.strokeStyle = "rgba(255,255,255,0.24)";
        context.lineWidth = 2;
        for (let index = 0; index < 42; index += 1) {
          context.beginPath();
          context.arc((index * 31) % size, (index * 19) % size, 18 + (index % 5) * 6, 0, Math.PI);
          context.stroke();
        }
      }, 2.4, 2.4);
      waterTexture.anisotropy = this.maxAnisotropy;
      this.textureCache.set(textureKey, waterTexture);
    }
    const mesh = new THREE.Mesh(
      new THREE.CircleGeometry(worldUnit(pond.rx), 48),
      new THREE.MeshPhysicalMaterial({
        color: 0x8de2ff,
        map: this.textureCache.get(textureKey),
        transmission: 0.18,
        transparent: true,
        opacity: 0.7,
        roughness: 0.16
      })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(worldUnit(pond.x), groundY + 0.08, worldUnit(pond.y));
    mesh.scale.y = pond.ry / pond.rx;
    mesh.userData = {
      kind: "pond",
      baseY: mesh.position.y,
      baseScaleY: mesh.scale.y
    };
    mesh.receiveShadow = true;
    return mesh;
  }

  buildCrystal(crystal, seed) {
    const group = new THREE.Group();
    const groundY = this.terrainHeight(worldUnit(crystal.x), worldUnit(crystal.y), seed);
    group.position.set(worldUnit(crystal.x), groundY + 2, worldUnit(crystal.y));

    const mesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(worldUnit(crystal.size) * 0.12, 0),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(crystal.color),
        emissive: new THREE.Color(crystal.color),
        emissiveIntensity: 0.24,
        transparent: true,
        opacity: 0.92,
        roughness: 0.26,
        metalness: 0.18
      })
    );
    mesh.castShadow = true;
    group.add(mesh);
    group.userData = {
      kind: "crystal",
      baseY: group.position.y,
      spin: (crystal.x + crystal.y) * 0.002
    };
    return group;
  }

  buildBillboard(billboard, seed) {
    const group = new THREE.Group();
    const groundY = this.terrainHeight(worldUnit(billboard.x), worldUnit(billboard.y), seed);
    group.position.set(worldUnit(billboard.x), groundY + 12, worldUnit(billboard.y));

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(12.5, 15.8, 0.8),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(billboard.frame),
        roughness: 0.72
      })
    );
    frame.castShadow = true;
    group.add(frame);

    const texture = this.textureLoader.load(billboard.src);
    texture.colorSpace = THREE.SRGBColorSpace;
    const art = new THREE.Mesh(
      new THREE.PlaneGeometry(10.6, 13.6),
      new THREE.MeshBasicMaterial({
        map: texture
      })
    );
    art.position.z = 0.45;
    group.add(art);

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.4, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0x5b4c58, roughness: 0.92 })
    );
    pole.position.y = -11;
    pole.castShadow = true;
    group.add(pole);

    group.userData = { kind: "billboard" };

    return group;
  }

  buildPortal(world) {
    const group = new THREE.Group();
    group.position.set(0, 0, worldUnit(-430));

    const ringMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(world.portalColor),
      emissive: new THREE.Color(world.portalColor),
      emissiveIntensity: 0.6,
      roughness: 0.24,
      metalness: 0.12
    });

    const ring = new THREE.Mesh(new THREE.TorusGeometry(8, 1.2, 18, 44), ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 14;
    ring.castShadow = true;
    group.add(ring);

    const core = new THREE.Mesh(
      new THREE.CircleGeometry(6.2, 38),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(world.portalColor),
        transparent: true,
        opacity: 0.28
      })
    );
    core.rotation.x = -Math.PI / 2;
    core.position.y = 14;
    group.add(core);

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(10, 12, 4.2, 18),
      new THREE.MeshStandardMaterial({
        color: 0xf8e5c8,
        roughness: 0.88
      })
    );
    pedestal.position.y = 2;
    pedestal.receiveShadow = true;
    pedestal.castShadow = true;
    group.add(pedestal);

    return { group, ring, core };
  }

  buildPetals(world, seed) {
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];
    const color = new THREE.Color(world.flower);

    for (let index = 0; index < 400; index += 1) {
      const x = (Math.sin(index * 12.1 + seed) * 0.5 + 0.5) * 220 - 110;
      const z = (Math.cos(index * 8.7 + seed) * 0.5 + 0.5) * 220 - 110;
      const y = this.terrainHeight(x, z, seed) + 0.2 + ((index % 5) * 0.04);
      positions.push(x, y, z);
      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({
      size: 0.95,
      vertexColors: true,
      transparent: true,
      opacity: 0.6
    });

    return new THREE.Points(geometry, material);
  }

  buildFireflies(world, seed) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(160 * 3);
    const colors = new Float32Array(160 * 3);
    const basePositions = new Float32Array(160 * 3);
    const glow = new THREE.Color(world.portalColor).lerp(new THREE.Color(0xffffff), 0.22);

    for (let index = 0; index < 160; index += 1) {
      const x = (Math.sin(index * 9.7 + seed) * 0.5 + 0.5) * 190 - 95;
      const z = (Math.cos(index * 7.2 + seed) * 0.5 + 0.5) * 190 - 95;
      const y = this.terrainHeight(x, z, seed) + 4 + (index % 8) * 0.34;
      basePositions[index * 3] = x;
      basePositions[index * 3 + 1] = y;
      basePositions[index * 3 + 2] = z;
      positions[index * 3] = x;
      positions[index * 3 + 1] = y;
      positions[index * 3 + 2] = z;
      colors[index * 3] = glow.r;
      colors[index * 3 + 1] = glow.g;
      colors[index * 3 + 2] = glow.b;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const points = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        size: 1.05,
        vertexColors: true,
        transparent: true,
        opacity: 0.78,
        depthWrite: false
      })
    );
    points.userData = { kind: "fireflies", basePositions };
    return points;
  }

  makeHouseBadge(number) {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext("2d");
    context.fillStyle = "rgba(11, 18, 33, 0.88)";
    context.beginPath();
    context.arc(64, 64, 46, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "rgba(255,255,255,0.16)";
    context.lineWidth = 6;
    context.stroke();
    context.fillStyle = "#fff7ff";
    context.font = "bold 52px Segoe UI";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(String(number), 64, 66);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(6, 6, 6);
    return sprite;
  }

  makeCaptionSprite(text, options = {}) {
    const width = options.width || 320;
    const height = options.height || 160;
    const texture = makeCanvasTexture(width, (context) => {
      context.clearRect(0, 0, width, height);
      context.fillStyle = options.background || "rgba(13, 18, 32, 0.84)";
      roundedRect(context, 18, 18, width - 36, height - 36, 30);
      context.fill();
      context.strokeStyle = options.stroke || "rgba(255,255,255,0.12)";
      context.lineWidth = 4;
      context.stroke();
      context.fillStyle = options.text || "#fff8ff";
      context.font = options.font || "bold 28px Segoe UI";
      context.textAlign = "center";
      context.textBaseline = "middle";
      const words = String(text).split(" ");
      const lines = [];
      let currentLine = "";
      words.forEach((word) => {
        const nextLine = currentLine ? `${currentLine} ${word}` : word;
        if (nextLine.length > 18 && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = nextLine;
        }
      });
      if (currentLine) {
        lines.push(currentLine);
      }
      const finalLines = lines.slice(0, 2);
      const lineHeight = finalLines.length > 1 ? 34 : 0;
      finalLines.forEach((line, index) => {
        context.fillText(line, width / 2, height / 2 + (index - (finalLines.length - 1) / 2) * lineHeight);
      });
    });
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false
      })
    );
    return sprite;
  }

  rebuildPlayerIfNeeded(character, inventory) {
    const inventoryKey = inventory.join("|");
    if (this.currentCharacterId === character.id && this.currentInventoryKey === inventoryKey) {
      return;
    }

    this.currentCharacterId = character.id;
    this.currentInventoryKey = inventoryKey;

    this.playerBodyRoot.clear();
    this.playerBodyRoot.scale.setScalar(0.78);
    this.accessoryAnchors = {};

    const skinColor = new THREE.Color(character.skin);
    const floatColor = new THREE.Color(character.float);
    const accentColor = new THREE.Color(character.accent);
    const blushColor = accentColor.clone().lerp(new THREE.Color(0xffffff), 0.32);

    const floatRing = new THREE.Mesh(
      new THREE.TorusGeometry(3.9, 0.8, 16, 34),
      new THREE.MeshStandardMaterial({
        color: floatColor,
        roughness: 0.42,
        metalness: 0.02
      })
    );
    floatRing.rotation.x = Math.PI / 2;
    floatRing.position.y = 1.2;
    floatRing.castShadow = true;
    this.playerBodyRoot.add(floatRing);

    const wingMaterial = new THREE.MeshStandardMaterial({
      color: 0xfff8ff,
      transparent: true,
      opacity: 0.9,
      roughness: 0.18
    });

    [-1, 1].forEach((side) => {
      const wing = new THREE.Mesh(new THREE.SphereGeometry(1.7, 18, 16), wingMaterial);
      wing.scale.set(0.55, 1.3, 0.85);
      wing.position.set(side * 2.9, 7.8, -1.6);
      wing.rotation.z = side * 0.52;
      this.playerBodyRoot.add(wing);
    });

    const torso = new THREE.Mesh(
      new THREE.CapsuleGeometry(1.9, 3.8, 8, 16),
      new THREE.MeshStandardMaterial({
        color: skinColor,
        roughness: 0.6
      })
    );
    torso.position.y = 6.9;
    torso.castShadow = true;
    this.playerBodyRoot.add(torso);

    const bloomers = new THREE.Mesh(
      new THREE.SphereGeometry(2.35, 18, 18),
      new THREE.MeshStandardMaterial({
        color: floatColor,
        roughness: 0.54
      })
    );
    bloomers.scale.set(1, 0.68, 1);
    bloomers.position.y = 5.4;
    bloomers.castShadow = true;
    this.playerBodyRoot.add(bloomers);

    const belly = new THREE.Mesh(
      new THREE.SphereGeometry(1.18, 16, 16),
      new THREE.MeshStandardMaterial({
        color: skinColor.clone().lerp(new THREE.Color(0xffffff), 0.22),
        roughness: 0.5
      })
    );
    belly.scale.set(1.06, 0.84, 0.72);
    belly.position.set(0, 6.4, 1.55);
    this.playerBodyRoot.add(belly);

    [-1.05, 1.05].forEach((side) => {
      const leg = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.58, 2.6, 6, 10),
        new THREE.MeshStandardMaterial({
          color: skinColor,
          roughness: 0.62
        })
      );
      leg.position.set(side, 2.7, 0.15);
      leg.castShadow = true;
      this.playerBodyRoot.add(leg);

      const foot = new THREE.Mesh(
        new THREE.SphereGeometry(0.74, 16, 12),
        new THREE.MeshStandardMaterial({
          color: skinColor.clone().lerp(new THREE.Color(0xffffff), 0.12),
          roughness: 0.52
        })
      );
      foot.scale.set(1.24, 0.7, 1.55);
      foot.position.set(side, 1.1, 0.92);
      foot.castShadow = true;
      this.playerBodyRoot.add(foot);
    });

    [-1, 1].forEach((side) => {
      const arm = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.46, 2.8, 6, 10),
        new THREE.MeshStandardMaterial({
          color: skinColor,
          roughness: 0.64
        })
      );
      arm.position.set(side * 2.8, 7.05, 0.35);
      arm.rotation.z = side * 0.32;
      arm.castShadow = true;
      this.playerBodyRoot.add(arm);
    });

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(4.2, 26, 22),
      new THREE.MeshStandardMaterial({
        color: skinColor,
        roughness: 0.46
      })
    );
    head.position.y = 13.3;
    head.castShadow = true;
    this.playerBodyRoot.add(head);

    const headHighlight = new THREE.Mesh(
      new THREE.SphereGeometry(4.16, 24, 20),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.08,
        roughness: 0.3
      })
    );
    headHighlight.scale.set(0.86, 0.62, 0.86);
    headHighlight.position.set(0, 14.6, 1.35);
    this.playerBodyRoot.add(headHighlight);

    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(4.15, 26, 22, 0, Math.PI * 2, 0, Math.PI / 1.85),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(character.hair),
        roughness: 0.82
      })
    );
    hair.position.y = 13.95;
    hair.rotation.x = -0.25;
    this.playerBodyRoot.add(hair);

    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x2d2431 });
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12), eyeMaterial);
    leftEye.position.set(-1.18, 13.55, 3.88);
    const rightEye = leftEye.clone();
    rightEye.position.x = 1.2;
    this.playerBodyRoot.add(leftEye, rightEye);

    const leftBlush = new THREE.Mesh(
      new THREE.SphereGeometry(0.48, 14, 12),
      new THREE.MeshStandardMaterial({
        color: blushColor,
        transparent: true,
        opacity: 0.72,
        roughness: 0.36
      })
    );
    leftBlush.scale.set(1.2, 0.6, 0.34);
    leftBlush.position.set(-2.2, 12.5, 3.6);
    const rightBlush = leftBlush.clone();
    rightBlush.position.x = 2.2;
    this.playerBodyRoot.add(leftBlush, rightBlush);

    const mouth = new THREE.Mesh(
      new THREE.TorusGeometry(0.54, 0.08, 8, 24, Math.PI * 0.86),
      new THREE.MeshBasicMaterial({ color: 0x63394a })
    );
    mouth.rotation.z = Math.PI;
    mouth.position.set(0, 12.25, 4.06);
    this.playerBodyRoot.add(mouth);

    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(2.2, 0.16, 10, 26),
      new THREE.MeshStandardMaterial({
        color: 0xffe6aa,
        emissive: 0xffe6aa,
        emissiveIntensity: 0.42,
        roughness: 0.22
      })
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 18.45;
    this.playerBodyRoot.add(halo);

    this.accessoryAnchors.rightHand = new THREE.Group();
    this.accessoryAnchors.rightHand.position.set(4.05, 6.3, 0.95);
    this.playerBodyRoot.add(this.accessoryAnchors.rightHand);

    this.accessoryAnchors.leftShoulder = new THREE.Group();
    this.accessoryAnchors.leftShoulder.position.set(-3.85, 9.2, -0.1);
    this.playerBodyRoot.add(this.accessoryAnchors.leftShoulder);

    this.accessoryAnchors.leftWrist = new THREE.Group();
    this.accessoryAnchors.leftWrist.position.set(-3.1, 6.4, 0.5);
    this.playerBodyRoot.add(this.accessoryAnchors.leftWrist);

    this.accessoryAnchors.cheek = new THREE.Group();
    this.accessoryAnchors.cheek.position.set(3.05, 13.18, 3.18);
    this.playerBodyRoot.add(this.accessoryAnchors.cheek);

    this.playerBodyRoot.add(this.buildHat(character));
    this.buildInventoryProps(inventory);
  }

  buildHat(character) {
    const hatGroup = new THREE.Group();
    hatGroup.position.y = 16.75;

    if (character.hat === "duck") {
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(2.45, 18, 16),
        new THREE.MeshStandardMaterial({ color: new THREE.Color(character.accent), roughness: 0.52 })
      );
      const beak = new THREE.Mesh(
        new THREE.SphereGeometry(0.84, 16, 12),
        new THREE.MeshStandardMaterial({ color: 0xffa437, roughness: 0.42 })
      );
      beak.scale.set(1.4, 0.8, 0.9);
      beak.position.set(1.45, -0.2, 0.45);
      hatGroup.add(head, beak);
      return hatGroup;
    }

    if (character.hat === "flower") {
      const center = new THREE.Mesh(
        new THREE.SphereGeometry(0.96, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xffed8c, roughness: 0.44 })
      );
      hatGroup.add(center);
      for (let index = 0; index < 5; index += 1) {
        const petal = new THREE.Mesh(
          new THREE.SphereGeometry(0.92, 12, 12),
          new THREE.MeshStandardMaterial({ color: new THREE.Color(character.accent), roughness: 0.42 })
        );
        const angle = (Math.PI * 2 * index) / 5;
        petal.scale.set(0.8, 1.3, 0.8);
        petal.position.set(Math.cos(angle) * 1.7, Math.sin(angle) * 1.7, 0);
        hatGroup.add(petal);
      }
      return hatGroup;
    }

    const starShape = new THREE.Shape();
    for (let index = 0; index < 10; index += 1) {
      const angle = (Math.PI * 2 * index) / 10 - Math.PI / 2;
      const radius = index % 2 === 0 ? 2.8 : 1.2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (index === 0) {
        starShape.moveTo(x, y);
      } else {
        starShape.lineTo(x, y);
      }
    }
    starShape.closePath();

    const star = new THREE.Mesh(
      new THREE.ExtrudeGeometry(starShape, { depth: 0.8, bevelEnabled: false }),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(character.accent),
        roughness: 0.38,
        metalness: 0.12
      })
    );
    star.rotation.y = Math.PI;
    star.position.set(0, -0.95, -0.3);
    star.scale.set(0.46, 0.46, 0.46);
    hatGroup.add(star);
    return hatGroup;
  }

  buildInventoryProps(inventory) {
    if (inventory.includes("Birkin")) {
      const bagGroup = new THREE.Group();
      const bagBody = new THREE.Mesh(
        new THREE.BoxGeometry(2.35, 1.7, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x7b4d31, roughness: 0.74 })
      );
      bagBody.position.y = -0.3;
      bagBody.castShadow = true;
      const bagHandle = new THREE.Mesh(
        new THREE.TorusGeometry(0.7, 0.1, 10, 18, Math.PI),
        new THREE.MeshStandardMaterial({ color: 0xcaa37e, roughness: 0.34, metalness: 0.12 })
      );
      bagHandle.rotation.z = Math.PI;
      bagHandle.position.y = 0.88;
      bagGroup.add(bagBody, bagHandle);
      bagGroup.rotation.z = -0.28;
      this.accessoryAnchors.rightHand.add(bagGroup);
    }

    if (inventory.includes("Lipliner")) {
      const linerGroup = new THREE.Group();
      const liner = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 2.45, 10),
        new THREE.MeshStandardMaterial({ color: 0xff589d, roughness: 0.44 })
      );
      liner.rotation.z = 0.42;
      liner.position.set(0, 0.2, 0.3);
      liner.castShadow = true;
      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, 0.5, 10),
        new THREE.MeshStandardMaterial({ color: 0x231e26, roughness: 0.62 })
      );
      cap.rotation.z = 0.42;
      cap.position.set(0.52, 1.08, 0.3);
      linerGroup.add(liner, cap);
      linerGroup.rotation.z = -0.72;
      this.accessoryAnchors.leftShoulder.add(linerGroup);
    }

    if (inventory.includes("Clou Cartier")) {
      const bracelet = new THREE.Mesh(
        new THREE.TorusGeometry(0.62, 0.12, 12, 22),
        new THREE.MeshStandardMaterial({
          color: 0xffd16e,
          roughness: 0.3,
          metalness: 0.4
        })
      );
      bracelet.rotation.x = Math.PI / 2;
      this.accessoryAnchors.leftWrist.add(bracelet);
    }

    if (inventory.includes("Bisou")) {
      const heartGroup = new THREE.Group();
      const heart = new THREE.Mesh(
        new THREE.SphereGeometry(0.46, 16, 16),
        new THREE.MeshStandardMaterial({
          color: 0xff79b4,
          emissive: 0xff79b4,
          emissiveIntensity: 0.34
        })
      );
      const heartTwo = heart.clone();
      heart.position.set(6.6, 18.4, 0.6);
      heartTwo.position.set(0.5, -0.36, 0.1);
      const heartCone = new THREE.Mesh(
        new THREE.ConeGeometry(0.72, 1.1, 16),
        new THREE.MeshStandardMaterial({
          color: 0xff79b4,
          emissive: 0xff79b4,
          emissiveIntensity: 0.34
        })
      );
      heart.position.set(0, 0, 0.1);
      heartCone.position.set(0.25, -0.68, 0.1);
      heartCone.rotation.z = Math.PI;
      heartGroup.add(heart, heartTwo, heartCone);
      heartGroup.rotation.z = 0.28;
      this.accessoryAnchors.cheek.add(heartGroup);
    }
  }

  ensurePlayerModel() {
    if (this.playerModelPromise) {
      return this.playerModelPromise;
    }

    this.playerModelPromise = this.assets.getModel(ANGEL_MODEL_SRC).then((gltf) => {
      this.playerModel = gltf.scene.clone(true);
      configureShadowTree(this.playerModel);
      this.playerBodyRoot.clear();
      this.playerBodyRoot.add(this.playerModel);
      this.playerBodyRoot.scale.setScalar(0.78);
      this.playerBodyRoot.position.set(0, 0, 0);
      this.currentCharacterId = null;
      this.currentInventoryKey = "";
    }).catch(() => {
      this.playerModelPromise = null;
    });

    return this.playerModelPromise;
  }

  rebuildPlayerIfNeeded(character, inventory) {
    this.ensurePlayerModel();
    if (!this.playerModel) {
      return;
    }

    const inventoryKey = inventory.join("|");
    if (this.currentCharacterId === character.id && this.currentInventoryKey === inventoryKey) {
      return;
    }

    this.currentCharacterId = character.id;
    this.currentInventoryKey = inventoryKey;
    styleAngelModel(this.playerModel, character, inventory);
  }

  updateWorldState(sceneState) {
    const bundle = this.currentWorldBundle;
    const visited = sceneState.visitedHouses;
    bundle.houses.forEach((houseBundle) => {
      houseBundle.visitedMarker.visible = visited.has(houseBundle.id);
      const glow = visited.has(houseBundle.id) ? 1.9 : 1.1;
      houseBundle.lanterns.forEach((lantern, index) => {
        lantern.material.emissiveIntensity = glow + Math.sin(sceneState.time * 3 + index) * 0.18;
      });
    });

    bundle.portal.group.position.y = this.terrainHeight(bundle.portal.group.position.x, bundle.portal.group.position.z, bundle.terrain.seed);
    bundle.portal.ring.material.emissiveIntensity = sceneState.portal.unlocked ? 1.2 : 0.18;
    bundle.portal.core.material.opacity = sceneState.portal.unlocked ? 0.38 : 0.08;
    bundle.portal.ring.rotation.z += 0.008;
    bundle.portal.core.scale.setScalar(1 + Math.sin(sceneState.time * 2.2) * 0.05);

    bundle.cloudLayer.children.forEach((cloud, index) => {
      cloud.position.x = cloud.userData.baseX + Math.sin(sceneState.time * cloud.userData.drift + index) * 4;
      cloud.position.y = cloud.userData.baseY + Math.cos(sceneState.time * cloud.userData.drift * 0.7 + index) * 1.2;
      cloud.position.z = cloud.userData.baseZ + Math.cos(sceneState.time * cloud.userData.drift + index) * 2;
    });

    bundle.decorations.forEach((object) => {
      if (object.userData.kind === "billboard") {
        object.lookAt(this.camera.position.x, object.position.y, this.camera.position.z);
      }
      if (object.userData.kind === "fairy") {
        object.position.y = object.userData.baseY + Math.sin(sceneState.time * 2.2 + object.userData.phase) * 0.9;
        object.lookAt(this.camera.position.x, object.position.y, this.camera.position.z);
      }
      if (object.userData.kind === "resident") {
        const offsetX = Math.sin(sceneState.time * object.userData.speed + object.userData.phase) * object.userData.radiusX;
        const offsetZ = Math.cos(sceneState.time * object.userData.speed * 0.85 + object.userData.phase) * object.userData.radiusZ;
        object.position.x = object.userData.baseX + offsetX;
        object.position.z = object.userData.baseZ + offsetZ;
        object.position.y = this.terrainHeight(object.position.x, object.position.z, bundle.terrain.seed);
        object.rotation.y = Math.sin(sceneState.time * object.userData.speed + object.userData.phase) * 0.06;
        object.userData.shadow.scale.setScalar(1 + Math.sin(sceneState.time * 1.6 + object.userData.phase) * 0.03);
      }
      if (object.userData.kind === "animal") {
        object.position.y = object.userData.baseY + Math.sin(sceneState.time * 1.8 + object.userData.phase) * 0.12;
        object.rotation.y = Math.sin(sceneState.time * 0.8 + object.userData.phase) * 0.18;
      }
      if (object.userData.kind === "crystal") {
        object.position.y = object.userData.baseY + Math.sin(sceneState.time * 1.8 + object.userData.spin) * 0.8;
        object.rotation.y += 0.01;
      }
      if (object.userData.kind === "pond") {
        object.position.y = object.userData.baseY + Math.sin(sceneState.time * 2.3 + object.position.x) * 0.05;
        object.scale.x = 1 + Math.sin(sceneState.time * 0.9 + object.position.z) * 0.015;
        object.scale.y = object.userData.baseScaleY + Math.cos(sceneState.time * 1.1 + object.position.x) * 0.015;
      }
      if (object.userData.kind === "river") {
        object.rotation.y = Math.sin(sceneState.time * 0.12 + object.userData.phase) * 0.01;
      }
    });

    bundle.pathLanterns.children.forEach((child) => {
      if (child.userData.kind === "lantern") {
        child.material.emissiveIntensity = 1.2 + Math.sin(sceneState.time * 2.6 + child.userData.phase) * 0.3;
      }
    });

    const fireflies = bundle.fireflies;
    const fireflyPositions = fireflies.geometry.attributes.position.array;
    const basePositions = fireflies.userData.basePositions;
    for (let index = 0; index < fireflyPositions.length; index += 3) {
      const offset = index / 3;
      fireflyPositions[index] = basePositions[index] + Math.sin(sceneState.time * 0.6 + offset) * 0.32;
      fireflyPositions[index + 1] = basePositions[index + 1] + Math.sin(sceneState.time * 2.2 + offset * 0.6) * 0.46;
      fireflyPositions[index + 2] = basePositions[index + 2] + Math.cos(sceneState.time * 0.8 + offset) * 0.28;
    }
    fireflies.geometry.attributes.position.needsUpdate = true;
  }

  updatePlayer(sceneState) {
    const x = worldUnit(sceneState.player.x);
    const z = worldUnit(sceneState.player.y);
    const motion = sceneState.player.locomotion || 0;
    const stepBob = Math.sin(sceneState.player.bob) * 0.14 * motion;
    const y = this.terrainHeight(x, z, this.currentWorldBundle.terrain.seed) + this.playerHeight + stepBob;

    this.playerGroup.position.set(x, y, z);
    this.playerGroup.rotation.y = sceneState.player.facing || 0;
    animateAngelModel(this.playerModel, sceneState.time * (1 + (sceneState.player.runBlend || 0) * 0.8), motion, sceneState.player.runBlend || 0);
  }

  updateCamera(sceneState) {
    const target = this.playerGroup.position.clone();
    const compact = this.canvas.clientWidth < 860;
    const runBlend = sceneState.player.runBlend || 0;
    const lead = new THREE.Vector3(
      (sceneState.player.moveX || 0) * (compact ? 7 : 9),
      0,
      (sceneState.player.moveY || 0) * (compact ? 9 : 11)
    );
    const desired = target.clone().add(
      new THREE.Vector3(compact ? 28 : 34, compact ? 24 : 29, compact ? 40 : 50 + runBlend * 7)
    ).add(lead);
    this.camera.position.lerp(desired, compact ? 0.11 : 0.085);
    this.camera.lookAt(target.x + lead.x * 0.35, target.y + 5.4, target.z + lead.z * 0.28);
  }

  terrainHeight(x, z, seed) {
    return (
      Math.sin((x + seed) * 0.09) * 2.4 +
      Math.cos((z - seed) * 0.07) * 1.7 +
      Math.sin((x + z) * 0.045) * 1.15 +
      Math.cos((x - z) * 0.018) * 2.1
    );
  }

  drawMiniMap(sceneState) {
    const context = this.minimapContext;
    const width = this.minimapCanvas.width / this.pixelRatio;
    const height = this.minimapCanvas.height / this.pixelRatio;
    context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);

    context.save();
    context.globalAlpha = 0.85;
    roundedRect(context, 0, 0, width, height, 20);
    context.fillStyle = "rgba(10, 16, 30, 0.42)";
    context.fill();
    context.strokeStyle = "rgba(255,255,255,0.08)";
    context.stroke();

    const scale = width < 150 ? 0.046 : 0.058;
    const originX = width / 2;
    const originY = height / 2;

    sceneState.world.houses.forEach((house) => {
      context.fillStyle = sceneState.visitedHouses.has(house.id) ? "#ffe78c" : "rgba(255,255,255,0.88)";
      context.fillRect(originX + house.position.x * scale - 6, originY + house.position.y * scale - 6, 12, 12);
    });

    context.fillStyle = sceneState.portal.unlocked ? sceneState.world.portalColor : "rgba(255,255,255,0.3)";
    context.beginPath();
    context.arc(originX + sceneState.portal.position.x * scale, originY + sceneState.portal.position.y * scale, 7, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = sceneState.character.accent;
    context.beginPath();
    context.arc(originX + sceneState.player.x * scale, originY + sceneState.player.y * scale, 7, 0, Math.PI * 2);
    context.fill();

    context.restore();
  }
}

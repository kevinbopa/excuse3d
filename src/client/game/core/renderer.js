import * as THREE from "three";
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
    this.renderer.toneMappingExposure = 1.1;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x8aa6d6, 45, 260);

    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 1200);
    this.camera.position.set(0, 42, 68);

    this.textureLoader = new THREE.TextureLoader();
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    this.worldCache = new Map();
    this.currentWorldId = null;
    this.currentWorldBundle = null;
    this.currentCharacterId = null;
    this.currentInventoryKey = "";
    this.playerHeight = 4.9;
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
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.42));

    this.hemiLight = new THREE.HemisphereLight(0xcbe7ff, 0x254035, 1.25);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff4d7, 1.55);
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
  }

  resize() {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

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

    this.renderer.render(this.scene, this.camera);
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

    const terrain = this.buildTerrain(world, seed);
    group.add(terrain.mesh);

    const meadow = this.buildMeadow(world, seed);
    group.add(meadow);

    const paths = this.buildPathRibbon(world);
    group.add(paths);

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
      houses,
      decorations,
      portal,
      petals,
      fireflies,
      world
    };
  }

  buildSkyDome(world) {
    const canvas = document.createElement("canvas");
    canvas.width = 2;
    canvas.height = 512;
    const context = canvas.getContext("2d");
    const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, world.skyTop);
    gradient.addColorStop(1, world.skyBottom);
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

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

    for (let index = 0; index < 16; index += 1) {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(18 + (index % 3) * 8, 42 + (index % 5) * 8, 6),
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.95,
          metalness: 0
        })
      );
      const angle = (Math.PI * 2 * index) / 16;
      const radius = 128 + (index % 4) * 18;
      cone.position.set(Math.cos(angle) * radius, 16, Math.sin(angle) * radius);
      cone.castShadow = false;
      cone.receiveShadow = true;
      group.add(cone);
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

  buildTerrain(world, seed) {
    const size = 240;
    const segments = 90;
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

      const blend = clamp((height + 4) / 8, 0, 1);
      const mixed = colorA.clone().lerp(colorB, 1 - blend);
      colors.push(mixed.r, mixed.g, mixed.b);
    }

    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.96,
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

    for (let index = 0; index < 540; index += 1) {
      const x = (Math.sin(index * 4.17 + seed) * 0.5 + 0.5) * 210 - 105;
      const z = (Math.cos(index * 3.73 + seed) * 0.5 + 0.5) * 210 - 105;
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

  buildPathRibbon(world) {
    const points = [
      new THREE.Vector3(0, 0.05, worldUnit(420)),
      ...world.houses.map((house) => new THREE.Vector3(worldUnit(house.position.x), 0.05, worldUnit(house.position.y))),
      new THREE.Vector3(0, 0.05, worldUnit(-430))
    ];

    const curve = new THREE.CatmullRomCurve3(points);
    const geometry = new THREE.TubeGeometry(curve, 100, 2.4, 12, false);
    const material = new THREE.MeshStandardMaterial({
      color: 0xf9e8cd,
      roughness: 1,
      metalness: 0
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    return mesh;
  }

  buildHouse(world, house, seed) {
    const group = new THREE.Group();
    const footprintX = worldUnit(house.size.w);
    const footprintZ = worldUnit(house.size.h) * 0.84;
    const baseHeight = 11.5;
    const roofHeight = 8;
    const groundY = this.terrainHeight(worldUnit(house.position.x), worldUnit(house.position.y), seed);
    const wallColor = new THREE.Color(world.terrainA).lerp(new THREE.Color(0xffffff), 0.78);
    const trimColor = new THREE.Color(world.portalColor).lerp(new THREE.Color(0xffffff), 0.28);
    const roofColor = new THREE.Color(world.portalColor).offsetHSL(0, 0.02, -0.08);

    group.position.set(worldUnit(house.position.x), groundY, worldUnit(house.position.y));

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(footprintX, baseHeight, footprintZ),
      new THREE.MeshStandardMaterial({
        color: wallColor,
        roughness: 0.8,
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
      new THREE.ConeGeometry(Math.max(footprintX, footprintZ) * 0.74, roofHeight, 4),
      new THREE.MeshStandardMaterial({
        color: roofColor,
        roughness: 0.82,
        metalness: 0.02
      })
    );
    roof.rotation.y = Math.PI * 0.25;
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
    const mesh = new THREE.Mesh(
      new THREE.CircleGeometry(worldUnit(pond.rx), 48),
      new THREE.MeshPhysicalMaterial({
        color: 0x8de2ff,
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
      if (object.userData.kind === "crystal") {
        object.position.y = object.userData.baseY + Math.sin(sceneState.time * 1.8 + object.userData.spin) * 0.8;
        object.rotation.y += 0.01;
      }
      if (object.userData.kind === "pond") {
        object.position.y = object.userData.baseY + Math.sin(sceneState.time * 2.3 + object.position.x) * 0.05;
        object.scale.x = 1 + Math.sin(sceneState.time * 0.9 + object.position.z) * 0.015;
        object.scale.y = object.userData.baseScaleY + Math.cos(sceneState.time * 1.1 + object.position.x) * 0.015;
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
    const y = this.terrainHeight(x, z, this.currentWorldBundle.terrain.seed) + this.playerHeight + Math.sin(sceneState.player.bob + sceneState.time * 2) * 0.22;

    this.playerGroup.position.set(x, y, z);
    this.playerGroup.rotation.y = sceneState.player.facing || 0;
    animateAngelModel(this.playerModel, sceneState.time * 1.4, 0);
  }

  updateCamera(sceneState) {
    const target = this.playerGroup.position.clone();
    const compact = this.canvas.clientWidth < 860;
    const desired = target.clone().add(new THREE.Vector3(compact ? 28 : 34, compact ? 27 : 31, compact ? 38 : 46));
    this.camera.position.lerp(desired, 0.08);
    this.camera.lookAt(target.x, target.y + 5.4, target.z);
  }

  terrainHeight(x, z, seed) {
    return Math.sin((x + seed) * 0.11) * 1.8 + Math.cos((z - seed) * 0.08) * 1.2 + Math.sin((x + z) * 0.06) * 0.9;
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

    const scale = width < 150 ? 0.078 : 0.094;
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

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

globalThis.FileReader ??= class FileReader {
  constructor() {
    this.result = null;
    this.onloadend = null;
  }

  async readAsDataURL(blob) {
    const buffer = Buffer.from(await blob.arrayBuffer());
    this.result = `data:${blob.type || "application/octet-stream"};base64,${buffer.toString("base64")}`;
    if (typeof this.onloadend === "function") {
      this.onloadend();
    }
  }
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const outputDir = path.join(rootDir, "src", "client", "assets", "models");

function createMaterial(name, color, options = {}) {
  return new THREE.MeshStandardMaterial({
    name,
    color,
    roughness: 0.6,
    metalness: 0.02,
    ...options
  });
}

function createAnchor(name, x, y, z) {
  const anchor = new THREE.Group();
  anchor.name = name;
  anchor.position.set(x, y, z);
  return anchor;
}

function createAngelModel() {
  const root = new THREE.Group();
  root.name = "AngelRoot";

  const materials = {
    float: createMaterial("FloatMat", 0xffd7ee, { roughness: 0.42 }),
    wing: createMaterial("WingMat", 0xfffbff, { roughness: 0.18, transparent: true, opacity: 0.9 }),
    skin: createMaterial("SkinMat", 0xffd8c7, { roughness: 0.58 }),
    skinSoft: createMaterial("SkinSoftMat", 0xf7e2d8, { roughness: 0.5 }),
    hair: createMaterial("HairMat", 0x56322a, { roughness: 0.82 }),
    eye: new THREE.MeshBasicMaterial({ name: "EyeMat", color: 0x2d2431 }),
    blush: createMaterial("BlushMat", 0xffa3c9, { roughness: 0.38, transparent: true, opacity: 0.72 }),
    mouth: new THREE.MeshBasicMaterial({ name: "MouthMat", color: 0x754d58 }),
    halo: createMaterial("HaloMat", 0xffe4a4, { emissive: 0xffe4a4, emissiveIntensity: 0.42, roughness: 0.22 })
  };

  const floatRing = new THREE.Mesh(new THREE.TorusGeometry(3.9, 0.8, 16, 34), materials.float);
  floatRing.name = "FloatRing";
  floatRing.rotation.x = Math.PI / 2;
  floatRing.position.y = 1.2;
  root.add(floatRing);

  [-1, 1].forEach((side) => {
    const wing = new THREE.Mesh(new THREE.SphereGeometry(1.7, 18, 16), materials.wing);
    wing.name = side < 0 ? "WingL" : "WingR";
    wing.scale.set(0.55, 1.3, 0.85);
    wing.position.set(side * 2.9, 7.8, -1.6);
    wing.rotation.z = side * 0.52;
    root.add(wing);
  });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(1.9, 3.8, 8, 16), materials.skin);
  torso.name = "Torso";
  torso.position.y = 6.9;
  root.add(torso);

  const bloomers = new THREE.Mesh(new THREE.SphereGeometry(2.35, 18, 18), materials.float);
  bloomers.name = "Bloomers";
  bloomers.scale.set(1, 0.68, 1);
  bloomers.position.y = 5.4;
  root.add(bloomers);

  const belly = new THREE.Mesh(new THREE.SphereGeometry(1.18, 16, 16), materials.skinSoft);
  belly.name = "Belly";
  belly.scale.set(1.06, 0.84, 0.72);
  belly.position.set(0, 6.4, 1.55);
  root.add(belly);

  [-1.05, 1.05].forEach((side) => {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.58, 2.6, 6, 10), materials.skin);
    leg.name = side < 0 ? "LegL" : "LegR";
    leg.position.set(side, 2.7, 0.15);
    root.add(leg);

    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.74, 16, 12), materials.skinSoft);
    foot.name = side < 0 ? "FootL" : "FootR";
    foot.scale.set(1.24, 0.7, 1.55);
    foot.position.set(side, 1.1, 0.92);
    root.add(foot);
  });

  [-1, 1].forEach((side) => {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.46, 2.8, 6, 10), materials.skin);
    arm.name = side < 0 ? "ArmL" : "ArmR";
    arm.position.set(side * 2.8, 7.05, 0.35);
    arm.rotation.z = side * 0.32;
    root.add(arm);
  });

  const head = new THREE.Mesh(new THREE.SphereGeometry(4.2, 26, 22), materials.skin);
  head.name = "Head";
  head.position.y = 13.3;
  root.add(head);

  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(4.15, 26, 22, 0, Math.PI * 2, 0, Math.PI / 1.85),
    materials.hair
  );
  hair.name = "Hair";
  hair.position.y = 13.95;
  hair.rotation.x = -0.25;
  root.add(hair);

  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12), materials.eye);
  eyeL.name = "EyeL";
  eyeL.position.set(-1.18, 13.55, 3.88);
  const eyeR = eyeL.clone();
  eyeR.name = "EyeR";
  eyeR.position.x = 1.2;
  root.add(eyeL, eyeR);

  const blushL = new THREE.Mesh(new THREE.SphereGeometry(0.48, 14, 12), materials.blush);
  blushL.name = "BlushL";
  blushL.scale.set(1.2, 0.6, 0.34);
  blushL.position.set(-2.2, 12.5, 3.6);
  const blushR = blushL.clone();
  blushR.name = "BlushR";
  blushR.position.x = 2.2;
  root.add(blushL, blushR);

  const mouth = new THREE.Mesh(
    new THREE.TorusGeometry(0.54, 0.08, 8, 24, Math.PI * 0.86),
    materials.mouth
  );
  mouth.name = "Mouth";
  mouth.rotation.z = Math.PI;
  mouth.position.set(0, 12.25, 4.06);
  root.add(mouth);

  const halo = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.16, 10, 26), materials.halo);
  halo.name = "Halo";
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 18.45;
  root.add(halo);

  root.add(createAnchor("HatAnchor", 0, 16.75, 0));
  root.add(createAnchor("RightHandAnchor", 4.05, 6.3, 0.95));
  root.add(createAnchor("LeftShoulderAnchor", -3.85, 9.2, -0.1));
  root.add(createAnchor("LeftWristAnchor", -3.1, 6.4, 0.5));
  root.add(createAnchor("CheekAnchor", 3.05, 13.18, 3.18));

  return root;
}

function createGorillaModel() {
  const root = new THREE.Group();
  root.name = "GorillaRoot";

  const fur = createMaterial("GorillaFurMat", 0x5f4843, { roughness: 0.84 });
  const face = createMaterial("GorillaFaceMat", 0xf0cfc2, { roughness: 0.58 });
  const eye = new THREE.MeshBasicMaterial({ name: "GorillaEyeMat", color: 0x1d1514 });
  const mouth = new THREE.MeshBasicMaterial({ name: "GorillaMouthMat", color: 0x3b2326 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(4.8, 22, 20), fur);
  body.name = "GorillaBody";
  body.scale.set(1.15, 1.22, 0.98);
  body.position.y = 8.2;
  root.add(body);

  const chest = new THREE.Mesh(new THREE.SphereGeometry(2.8, 18, 16), face);
  chest.name = "GorillaChest";
  chest.scale.set(1.18, 1.05, 0.62);
  chest.position.set(0, 7.25, 3.05);
  root.add(chest);

  const headPivot = new THREE.Group();
  headPivot.name = "HeadPivot";
  headPivot.position.y = 13.6;
  root.add(headPivot);

  const head = new THREE.Mesh(new THREE.SphereGeometry(3.6, 22, 20), fur);
  head.name = "GorillaHead";
  headPivot.add(head);

  const facePlate = new THREE.Mesh(new THREE.SphereGeometry(2.1, 18, 16), face);
  facePlate.name = "GorillaFace";
  facePlate.scale.set(1.08, 0.82, 0.92);
  facePlate.position.set(0, -0.35, 2.38);
  headPivot.add(facePlate);

  [-1, 1].forEach((side) => {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(1.02, 16, 14), fur);
    ear.name = side < 0 ? "GorillaEarL" : "GorillaEarR";
    ear.position.set(side * 2.6, 1.7, -0.5);
    headPivot.add(ear);

    const eyeMesh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 10), eye);
    eyeMesh.name = side < 0 ? "GorillaEyeL" : "GorillaEyeR";
    eyeMesh.position.set(side * 1.05, 0.15, 3.12);
    headPivot.add(eyeMesh);
  });

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 12), eye);
  nose.name = "GorillaNose";
  nose.scale.set(1.3, 0.72, 1);
  nose.position.set(0, -0.2, 3.28);
  headPivot.add(nose);

  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.64, 0.06, 8, 18, Math.PI * 0.84),
    mouth
  );
  smile.name = "GorillaSmile";
  smile.rotation.z = Math.PI;
  smile.position.set(0, -0.92, 3.22);
  headPivot.add(smile);

  const armLPivot = new THREE.Group();
  armLPivot.name = "ArmLPivot";
  armLPivot.position.set(-4.8, 10.4, 0.4);
  armLPivot.rotation.z = 0.34;
  root.add(armLPivot);

  const armRPivot = new THREE.Group();
  armRPivot.name = "ArmRPivot";
  armRPivot.position.set(4.8, 10.4, 0.4);
  armRPivot.rotation.z = -0.14;
  root.add(armRPivot);

  [armLPivot, armRPivot].forEach((pivot, index) => {
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.8, 4.2, 6, 10), fur);
    upper.name = index === 0 ? "ArmL" : "ArmR";
    upper.position.set(0, -2.6, 0);
    pivot.add(upper);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.86, 14, 12), fur);
    hand.name = index === 0 ? "HandL" : "HandR";
    hand.scale.set(1.2, 0.84, 1.1);
    hand.position.set(0.25, -5.6, 0.4);
    pivot.add(hand);
  });

  [-1.7, 1.7].forEach((x, index) => {
    const legPivot = new THREE.Group();
    legPivot.name = index === 0 ? "LegLPivot" : "LegRPivot";
    legPivot.position.set(x, 3.8, 0.2);
    root.add(legPivot);

    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.9, 3.8, 6, 10), fur);
    leg.name = index === 0 ? "LegL" : "LegR";
    leg.position.y = -2;
    legPivot.add(leg);

    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.9, 14, 12), fur);
    foot.name = index === 0 ? "GorillaFootL" : "GorillaFootR";
    foot.scale.set(1.3, 0.6, 1.7);
    foot.position.set(0.1, -4.6, 0.72);
    legPivot.add(foot);
  });

  root.add(createAnchor("KissAnchor", 5.3, 10.7, 3.9));
  return root;
}

async function exportScene(name, object3d) {
  const scene = new THREE.Scene();
  scene.add(object3d);
  scene.updateMatrixWorld(true);

  const exporter = new GLTFExporter();
  const gltf = await exporter.parseAsync(scene, {
    binary: false,
    trs: true,
    onlyVisible: true
  });

  await writeFile(path.join(outputDir, `${name}.gltf`), JSON.stringify(gltf, null, 2), "utf8");
}

await mkdir(outputDir, { recursive: true });
await exportScene("angel", createAngelModel());
await exportScene("gorilla", createGorillaModel());

console.log(`Generated glTF models in ${outputDir}`);

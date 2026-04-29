import * as THREE from "three";

function cloneMaterial(material) {
  return material?.clone ? material.clone() : material;
}

function colorFrom(value) {
  return value instanceof THREE.Color ? value : new THREE.Color(value);
}

function tintMaterial(material, color, extras = {}) {
  material.color.copy(colorFrom(color));
  Object.assign(material, extras);
}

function clearAnchor(anchor) {
  if (!anchor) {
    return;
  }
  [...anchor.children].forEach((child) => anchor.remove(child));
}

function createHat(character) {
  const hatGroup = new THREE.Group();

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

function createBirkin() {
  const bagGroup = new THREE.Group();
  const bagBody = new THREE.Mesh(
    new THREE.BoxGeometry(2.35, 1.7, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x7b4d31, roughness: 0.74 })
  );
  bagBody.position.y = -0.3;
  const bagHandle = new THREE.Mesh(
    new THREE.TorusGeometry(0.7, 0.1, 10, 18, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0xcaa37e, roughness: 0.34, metalness: 0.12 })
  );
  bagHandle.rotation.z = Math.PI;
  bagHandle.position.y = 0.88;
  bagGroup.add(bagBody, bagHandle);
  bagGroup.rotation.z = -0.28;
  return bagGroup;
}

function createLipliner() {
  const linerGroup = new THREE.Group();
  const liner = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 2.45, 10),
    new THREE.MeshStandardMaterial({ color: 0xff589d, roughness: 0.44 })
  );
  liner.rotation.z = 0.42;
  liner.position.set(0, 0.2, 0.3);
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.14, 0.5, 10),
    new THREE.MeshStandardMaterial({ color: 0x231e26, roughness: 0.62 })
  );
  cap.rotation.z = 0.42;
  cap.position.set(0.52, 1.08, 0.3);
  linerGroup.add(liner, cap);
  linerGroup.rotation.z = -0.72;
  return linerGroup;
}

function createBracelet() {
  const bracelet = new THREE.Mesh(
    new THREE.TorusGeometry(0.62, 0.12, 12, 22),
    new THREE.MeshStandardMaterial({
      color: 0xffd16e,
      roughness: 0.3,
      metalness: 0.4
    })
  );
  bracelet.rotation.x = Math.PI / 2;
  return bracelet;
}

function createBisouCharm() {
  const heartGroup = new THREE.Group();
  const heartMaterial = new THREE.MeshStandardMaterial({
    color: 0xff79b4,
    emissive: 0xff79b4,
    emissiveIntensity: 0.34
  });
  const heart = new THREE.Mesh(new THREE.SphereGeometry(0.46, 16, 16), heartMaterial);
  const heartTwo = heart.clone();
  heart.position.set(0, 0, 0.1);
  heartTwo.position.set(0.5, -0.36, 0.1);
  const heartCone = new THREE.Mesh(new THREE.ConeGeometry(0.72, 1.1, 16), heartMaterial);
  heartCone.position.set(0.25, -0.68, 0.1);
  heartCone.rotation.z = Math.PI;
  heartGroup.add(heart, heartTwo, heartCone);
  heartGroup.rotation.z = 0.28;
  return heartGroup;
}

export function configureShadowTree(root) {
  root.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
      node.material = cloneMaterial(node.material);
    }
  });
}

export function styleAngelModel(root, character, inventory = []) {
  if (!root) {
    return;
  }

  const skin = new THREE.Color(character.skin);
  const skinSoft = skin.clone().lerp(new THREE.Color(0xffffff), 0.24);
  const float = new THREE.Color(character.float);
  const accent = new THREE.Color(character.accent);
  const blush = accent.clone().lerp(new THREE.Color(0xffffff), 0.34);
  const hair = new THREE.Color(character.hair);

  root.traverse((node) => {
    if (!node.isMesh || !node.material?.name) {
      return;
    }

    switch (node.material.name) {
      case "SkinMat":
        tintMaterial(node.material, skin);
        break;
      case "SkinSoftMat":
        tintMaterial(node.material, skinSoft);
        break;
      case "FloatMat":
        tintMaterial(node.material, float);
        break;
      case "HairMat":
        tintMaterial(node.material, hair);
        break;
      case "BlushMat":
        tintMaterial(node.material, blush, { transparent: true, opacity: 0.72 });
        break;
      case "HaloMat":
        tintMaterial(node.material, 0xffe4a4, { emissive: new THREE.Color(0xffe4a4), emissiveIntensity: 0.42 });
        break;
      case "WingMat":
        tintMaterial(node.material, 0xfffbff, { transparent: true, opacity: 0.9 });
        break;
      default:
        break;
    }
  });

  const hatAnchor = root.getObjectByName("HatAnchor");
  const rightHandAnchor = root.getObjectByName("RightHandAnchor");
  const leftShoulderAnchor = root.getObjectByName("LeftShoulderAnchor");
  const leftWristAnchor = root.getObjectByName("LeftWristAnchor");
  const cheekAnchor = root.getObjectByName("CheekAnchor");
  const head = root.getObjectByName("Head");
  const hairMesh = root.getObjectByName("Hair");
  const torso = root.getObjectByName("Torso");
  const bloomers = root.getObjectByName("Bloomers");
  const belly = root.getObjectByName("Belly");
  const armL = root.getObjectByName("ArmL");
  const armR = root.getObjectByName("ArmR");
  const legL = root.getObjectByName("LegL");
  const legR = root.getObjectByName("LegR");
  const footL = root.getObjectByName("FootL");
  const footR = root.getObjectByName("FootR");
  const eyeL = root.getObjectByName("EyeL");
  const eyeR = root.getObjectByName("EyeR");
  const blushL = root.getObjectByName("BlushL");
  const blushR = root.getObjectByName("BlushR");
  const mouth = root.getObjectByName("Mouth");
  const floatRing = root.getObjectByName("FloatRing");
  const halo = root.getObjectByName("Halo");
  const wingL = root.getObjectByName("WingL");
  const wingR = root.getObjectByName("WingR");

  clearAnchor(hatAnchor);
  clearAnchor(rightHandAnchor);
  clearAnchor(leftShoulderAnchor);
  clearAnchor(leftWristAnchor);
  clearAnchor(cheekAnchor);

  if (head) {
    head.scale.set(1.12, 1.08, 1.1);
    head.position.y = 13.5;
  }
  if (hairMesh) {
    hairMesh.scale.set(1.08, 1.04, 1.06);
    hairMesh.position.y = 14.15;
  }
  if (torso) {
    torso.scale.set(0.92, 0.88, 0.92);
    torso.position.y = 6.55;
  }
  if (bloomers) {
    bloomers.scale.set(1.06, 0.72, 1.04);
    bloomers.position.y = 5.1;
  }
  if (belly) {
    belly.scale.set(1.12, 0.94, 0.8);
    belly.position.set(0, 6.05, 1.75);
  }
  if (armL) {
    armL.scale.set(0.92, 0.92, 0.92);
    armL.position.set(-2.72, 6.92, 0.42);
    armL.rotation.z = -0.42;
  }
  if (armR) {
    armR.scale.set(0.92, 0.92, 0.92);
    armR.position.set(2.72, 6.92, 0.42);
    armR.rotation.z = 0.42;
  }
  if (legL) {
    legL.scale.set(0.94, 0.86, 0.94);
    legL.position.set(-1.02, 2.55, 0.2);
  }
  if (legR) {
    legR.scale.set(0.94, 0.86, 0.94);
    legR.position.set(1.02, 2.55, 0.2);
  }
  if (footL) {
    footL.scale.set(1.42, 0.78, 1.72);
    footL.position.set(-1.08, 0.96, 1.14);
  }
  if (footR) {
    footR.scale.set(1.42, 0.78, 1.72);
    footR.position.set(1.08, 0.96, 1.14);
  }
  if (eyeL && eyeR) {
    eyeL.scale.set(0.92, 1.32, 0.92);
    eyeR.scale.set(0.92, 1.32, 0.92);
    eyeL.position.set(-1.26, 13.55, 4.12);
    eyeR.position.set(1.26, 13.55, 4.12);
  }
  if (blushL && blushR) {
    blushL.scale.set(1.42, 0.72, 0.42);
    blushR.scale.set(1.42, 0.72, 0.42);
    blushL.position.set(-2.42, 12.5, 3.88);
    blushR.position.set(2.42, 12.5, 3.88);
  }
  if (mouth) {
    mouth.scale.set(0.82, 0.82, 0.82);
    mouth.position.set(0, 12.1, 4.18);
  }
  if (floatRing) {
    floatRing.visible = false;
  }
  if (halo) {
    halo.visible = false;
  }
  if (wingL && wingR) {
    wingL.scale.set(0.42, 0.98, 0.66);
    wingR.scale.set(0.42, 0.98, 0.66);
    wingL.position.set(-2.28, 7.4, -1.24);
    wingR.position.set(2.28, 7.4, -1.24);
  }
  if (hatAnchor) {
    hatAnchor.position.set(0, 17.25, 0);
  }
  if (rightHandAnchor) {
    rightHandAnchor.position.set(3.78, 6.02, 1.02);
  }
  if (leftShoulderAnchor) {
    leftShoulderAnchor.position.set(-3.58, 8.86, 0.02);
  }
  if (leftWristAnchor) {
    leftWristAnchor.position.set(-2.88, 6.16, 0.6);
  }
  if (cheekAnchor) {
    cheekAnchor.position.set(3.2, 13.02, 3.44);
  }

  hatAnchor?.add(createHat(character));

  if (inventory.includes("Birkin")) {
    rightHandAnchor?.add(createBirkin());
  }
  if (inventory.includes("Lipliner")) {
    leftShoulderAnchor?.add(createLipliner());
  }
  if (inventory.includes("Clou Cartier")) {
    leftWristAnchor?.add(createBracelet());
  }
  if (inventory.includes("Bisou")) {
    cheekAnchor?.add(createBisouCharm());
  }
}

export function animateAngelModel(root, time, locomotion = 0, runBlend = 0) {
  if (!root) {
    return;
  }

  const ring = root.getObjectByName("FloatRing");
  const halo = root.getObjectByName("Halo");
  const wingL = root.getObjectByName("WingL");
  const wingR = root.getObjectByName("WingR");
  const hatAnchor = root.getObjectByName("HatAnchor");
  const legL = root.getObjectByName("LegL");
  const legR = root.getObjectByName("LegR");
  const armL = root.getObjectByName("ArmL");
  const armR = root.getObjectByName("ArmR");
  const footL = root.getObjectByName("FootL");
  const footR = root.getObjectByName("FootR");
  const swing = locomotion * (0.22 + runBlend * 0.18);
  const cadence = 2.3 + runBlend * 2.2;
  const breath = 0.018 + locomotion * 0.01;

  if (ring) {
    ring.rotation.z = time * 0.8;
  }
  if (halo) {
    halo.rotation.z = time * 0.45;
  }
  if (wingL && wingR) {
    wingL.rotation.z = -0.52 + Math.sin(time * 2.8) * 0.08;
    wingR.rotation.z = 0.52 - Math.sin(time * 2.8) * 0.08;
  }
  if (hatAnchor) {
    hatAnchor.rotation.z = Math.sin(time * 1.9) * 0.05;
  }
  if (armL && armR) {
    armL.rotation.x = Math.sin(time * cadence) * swing;
    armR.rotation.x = -Math.sin(time * cadence) * swing;
  }
  if (legL && legR) {
    legL.rotation.x = Math.sin(time * cadence) * swing * 1.25;
    legR.rotation.x = -Math.sin(time * cadence) * swing * 1.25;
  }
  if (footL && footR) {
    footL.rotation.x = -0.12 + Math.sin(time * cadence) * swing * 0.45;
    footR.rotation.x = -0.12 - Math.sin(time * cadence) * swing * 0.45;
  }

  root.rotation.z = Math.sin(time * 2.1) * breath;
  root.position.y = Math.sin(time * cadence * 0.5) * locomotion * 0.09;
}

export function poseGorillaModel(root, timeline) {
  if (!root) {
    return;
  }

  const head = root.getObjectByName("HeadPivot");
  const armL = root.getObjectByName("ArmLPivot");
  const armR = root.getObjectByName("ArmRPivot");
  const legL = root.getObjectByName("LegLPivot");
  const legR = root.getObjectByName("LegRPivot");

  const approach = THREE.MathUtils.smoothstep(timeline, 0.08, 0.58);
  const kiss = THREE.MathUtils.smoothstep(timeline, 0.58, 0.78);
  const settle = THREE.MathUtils.smoothstep(timeline, 0.78, 1);

  root.position.x = THREE.MathUtils.lerp(-8.5, -1.8, approach) + Math.sin(timeline * Math.PI * 4) * 0.08;
  root.position.y = Math.sin(timeline * Math.PI * 6) * 0.06;
  root.rotation.y = THREE.MathUtils.lerp(0.32, 0.08, approach);

  if (head) {
    head.rotation.z = -0.06 + kiss * 0.14 - settle * 0.08;
  }
  if (armL) {
    armL.rotation.z = 0.34 + Math.sin(timeline * Math.PI * 2) * 0.05;
  }
  if (armR) {
    armR.rotation.z = THREE.MathUtils.lerp(-0.14, -0.84, kiss) + settle * 0.22;
  }
  if (legL) {
    legL.rotation.z = Math.sin(timeline * Math.PI * 4) * 0.06;
  }
  if (legR) {
    legR.rotation.z = -Math.sin(timeline * Math.PI * 4) * 0.06;
  }
}

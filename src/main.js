import * as THREE from "three";

const state = {
  C0: 35,
  V: 1,
  m: 0.5,
  tau: 30,
  qmaxChitosan: 666.67,
  KLChitosan: 0.03,
  k2Chitosan: 0.05,
  qmaxAC: 59.27,
  KLAC: 0.411,
  epsilon: 62600,
  MW: 696.66,
  visualMode: "equilibrium"
};

// Remove old top-right panel if it still exists in index.html.
const oldHud = document.getElementById("hud");
if (oldHud) oldHud.remove();

const hideOldHudStyle = document.createElement("style");
hideOldHudStyle.textContent = `
  #hud,
  #liveOutlet,
  #live-outlet,
  .live-outlet,
  .live-outlet-comparison,
  .outlet-comparison {
    display: none !important;
  }
`;
document.head.appendChild(hideOldHudStyle);

let results = computeResults(state);
let captureRates = { ac: 0.69, chitosan: 0.90 };

const root = document.getElementById("scene-root");
const scene = new THREE.Scene();

const camera = new THREE.OrthographicCamera(-6, 6, 3.6, -3.6, 0.1, 100);
camera.position.set(0, 0, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
root.appendChild(renderer.domElement);

const modelRoot = new THREE.Group();
modelRoot.position.set(0.45, -0.05, 0);
scene.add(modelRoot);

const ambient = new THREE.AmbientLight(0xffffff, 1.15);
scene.add(ambient);

const glowLight = new THREE.PointLight(0x9dfcff, 3.2, 20);
glowLight.position.set(1.8, 1.4, 6);
scene.add(glowLight);

const redLight = new THREE.PointLight(0xff4268, 2.6, 16);
redLight.position.set(-3.6, 0.8, 4);
scene.add(redLight);

const metalKeyLight = new THREE.DirectionalLight(0xffffff, 1.6);
metalKeyLight.position.set(-3.5, 4.2, 6.5);
scene.add(metalKeyLight);

const pathPoints = {
  ac: [
    new THREE.Vector3(-4.8, 0.0, 0.0),
    new THREE.Vector3(-3.2, 0.0, 0.0),
    new THREE.Vector3(-2.25, 0.7, 0.0),
    new THREE.Vector3(-1.35, 1.25, 0.0),
    new THREE.Vector3(-0.35, 1.25, 0.0),
    new THREE.Vector3(0.65, 1.25, 0.0),
    new THREE.Vector3(1.55, 1.25, 0.0),
    new THREE.Vector3(4.7, 1.25, 0.0)
  ],
  chitosan: [
    new THREE.Vector3(-4.8, 0.0, 0.0),
    new THREE.Vector3(-3.2, 0.0, 0.0),
    new THREE.Vector3(-2.25, -0.7, 0.0),
    new THREE.Vector3(-1.35, -1.25, 0.0),
    new THREE.Vector3(-0.35, -1.25, 0.0),
    new THREE.Vector3(0.65, -1.25, 0.0),
    new THREE.Vector3(1.55, -1.25, 0.0),
    new THREE.Vector3(4.7, -1.25, 0.0)
  ]
};

const curves = {
  ac: new THREE.CatmullRomCurve3(pathPoints.ac, false, "centripetal", 0.25),
  chitosan: new THREE.CatmullRomCurve3(pathPoints.chitosan, false, "centripetal", 0.25)
};

// Shared pipe/filter dimensions.
// The filter insert is now the same diameter as the pipe, so it looks replaceable.
const PIPE_RADIUS = 0.305;
const WATER_RADIUS = 0.155;
const OUTLET_WATER_RADIUS = 0.145;

const FILTER_RADIUS = PIPE_RADIUS;
const FILTER_LENGTH = 1.35;
const COLLAR_RADIUS = PIPE_RADIUS + 0.048;

// Dye sticks to the inner lining, not the center of the filter.
const PIPE_INNER_WALL_RADIUS = PIPE_RADIUS * 0.72;

const CAPTURE_T_RANGE = {
  ac: [0.50, 0.66],
  chitosan: [0.50, 0.66]
};

function getPipeWallAxes(pathType, t) {
  const curve = curves[pathType];
  const tangent = curve.getTangentAt(clamp(t, 0, 1)).normalize();

  const normal = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();
  const binormal = new THREE.Vector3(0, 0, 1);

  return { normal, binormal };
}

function liningPoint(pathType, t, angle, inset = 0) {
  const curve = curves[pathType];
  const base = curve.getPointAt(clamp(t, 0, 1));
  const { normal, binormal } = getPipeWallAxes(pathType, t);

  const radius = PIPE_INNER_WALL_RADIUS - inset;

  base.addScaledVector(normal, Math.cos(angle) * radius);
  base.addScaledVector(binormal, Math.sin(angle) * radius);

  return base;
}

function visibleLiningAngle() {
  // Mostly front-facing so viewers can see adsorption,
  // but some particles still spread around the full inner wall.
  if (Math.random() < 0.72) {
    return Math.PI / 2 + (Math.random() - 0.5) * 1.55;
  }

  return Math.random() * Math.PI * 2;
}

const inletCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-4.8, 0.0, 0.0),
  new THREE.Vector3(-3.95, 0.0, 0.0),
  new THREE.Vector3(-3.18, 0.0, 0.0)
]);

const acOutletCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(1.45, 1.25, 0.0),
  new THREE.Vector3(2.55, 1.25, 0.0),
  new THREE.Vector3(4.7, 1.25, 0.0)
]);

const chitosanOutletCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(1.45, -1.25, 0.0),
  new THREE.Vector3(2.55, -1.25, 0.0),
  new THREE.Vector3(4.7, -1.25, 0.0)
]);

const materials = {
  pipe: new THREE.MeshPhysicalMaterial({
    color: 0xd8fbff,
    transparent: true,
    opacity: 0.28,
    roughness: 0.06,
    metalness: 0.0,
    transmission: 0.45,
    thickness: 0.35,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    side: THREE.DoubleSide,
    depthWrite: false
  }),

  pipeInnerGlow: new THREE.MeshBasicMaterial({
    color: 0xbff7ff,
    transparent: true,
    opacity: 0.16,
    side: THREE.DoubleSide,
    depthWrite: false
  }),

  pipeHighlight: new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.34,
    depthWrite: false
  }),

  metal: new THREE.MeshStandardMaterial({
    color: 0xc8d2dc,
    roughness: 0.18,
    metalness: 0.9
  }),

  darkMetal: new THREE.MeshStandardMaterial({
    color: 0x2b3138,
    roughness: 0.22,
    metalness: 0.85
  }),

  inletWater: new THREE.MeshBasicMaterial({
    color: 0xff2848,
    transparent: true,
    opacity: 0.76,
    depthWrite: false
  }),

  acWater: new THREE.MeshBasicMaterial({
    color: 0xff6d78,
    transparent: true,
    opacity: 0.64,
    depthWrite: false
  }),

  chitosanWater: new THREE.MeshBasicMaterial({
    color: 0xcff8ff,
    transparent: true,
    opacity: 0.42,
    depthWrite: false
  })
};

function tube(curve, radius, material, segments = 120, radial = 24) {
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(curve, segments, radius, radial, false),
    material
  );
  modelRoot.add(mesh);
  return mesh;
}

function addTubeHighlight(curve, radius, yOffsetHint = 0) {
  const points = curve.getPoints(100);
  const highlightPoints = points.map((point) => {
    const lifted = point.clone();
    lifted.y += yOffsetHint > 0 ? 0.055 : -0.055;
    lifted.z += 0.16;
    return lifted;
  });

  const highlightCurve = new THREE.CatmullRomCurve3(
    highlightPoints,
    false,
    "centripetal",
    0.25
  );

  const highlight = new THREE.Mesh(
    new THREE.TubeGeometry(highlightCurve, 100, 0.018, 8, false),
    materials.pipeHighlight
  );

  modelRoot.add(highlight);
  return highlight;
}

// Transparent pipes.
tube(curves.ac, PIPE_RADIUS, materials.pipe, 180, 32);
tube(curves.chitosan, PIPE_RADIUS, materials.pipe, 180, 32);

// Inner glow so the water remains visible through the pipe.
tube(curves.ac, PIPE_RADIUS * 0.82, materials.pipeInnerGlow, 180, 20);
tube(curves.chitosan, PIPE_RADIUS * 0.82, materials.pipeInnerGlow, 180, 20);

// White highlight lines make the pipes look polished.
addTubeHighlight(curves.ac, PIPE_RADIUS + 0.022, 1.18);
addTubeHighlight(curves.chitosan, PIPE_RADIUS + 0.022, -1.18);

// Flowing water streams.
const inletWater = tube(inletCurve, WATER_RADIUS, materials.inletWater, 70, 20);
const acOutletWater = tube(acOutletCurve, OUTLET_WATER_RADIUS, materials.acWater, 70, 20);
const chitosanOutletWater = tube(
  chitosanOutletCurve,
  OUTLET_WATER_RADIUS,
  materials.chitosanWater,
  70,
  20
);

function addPipeRing(x, y, radius = COLLAR_RADIUS) {
  const group = new THREE.Group();

  const outerRing = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.035, 16, 72),
    materials.metal
  );
  outerRing.rotation.y = Math.PI / 2;
  group.add(outerRing);

  const innerDarkRing = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.92, 0.012, 12, 56),
    materials.darkMetal
  );
  innerDarkRing.rotation.y = Math.PI / 2;
  innerDarkRing.position.z = 0.012;
  group.add(innerDarkRing);

  const shine = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 1.04, 0.006, 8, 72),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.72
    })
  );
  shine.rotation.y = Math.PI / 2;
  shine.position.z = 0.035;
  group.add(shine);

  group.position.set(x, y, 0.08);
  modelRoot.add(group);

  return group;
}

// Metallic pipe collars and replaceable filter collars.
addPipeRing(-4.8, 0);
addPipeRing(-3.18, 0);

addPipeRing(-1.35, 1.25);
addPipeRing(0.55, 1.25, COLLAR_RADIUS + 0.02);
addPipeRing(1.55, 1.25);
addPipeRing(4.7, 1.25);

addPipeRing(-1.35, -1.25);
addPipeRing(0.55, -1.25, COLLAR_RADIUS + 0.02);
addPipeRing(1.55, -1.25);
addPipeRing(4.7, -1.25);

function makeCartridge(label, color, y, options = {}) {
  const group = new THREE.Group();
  group.position.set(0.55, y, 0.16);

  const radius = options.radius ?? FILTER_RADIUS;
  const length = options.length ?? FILTER_LENGTH;

  // Clear outer sleeve: same diameter as pipe.
  // This makes the filter look like a replaceable pipe segment.
  const sleeve = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, length, 64, 1, true),
    new THREE.MeshPhysicalMaterial({
      color: 0xd8fbff,
      transparent: true,
      opacity: 0.24,
      roughness: 0.08,
      metalness: 0.0,
      transmission: 0.38,
      thickness: 0.28,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );

  sleeve.rotation.z = Math.PI / 2;
  group.add(sleeve);

  // Colored inner lining: the actual active membrane/filter surface.
  const lining = new THREE.Mesh(
    new THREE.CylinderGeometry(
      PIPE_INNER_WALL_RADIUS,
      PIPE_INNER_WALL_RADIUS,
      length * 0.92,
      64,
      1,
      true
    ),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: options.liningOpacity ?? 0.42,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );

  lining.rotation.z = Math.PI / 2;
  group.add(lining);

  // Metallic collars at both ends.
  for (const x of [-length / 2, length / 2]) {
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(COLLAR_RADIUS, 0.035, 16, 72),
      materials.metal
    );
    collar.position.x = x;
    collar.rotation.y = Math.PI / 2;
    group.add(collar);

    const innerShadow = new THREE.Mesh(
      new THREE.TorusGeometry(COLLAR_RADIUS * 0.91, 0.012, 12, 56),
      materials.darkMetal
    );
    innerShadow.position.x = x;
    innerShadow.position.z = 0.012;
    innerShadow.rotation.y = Math.PI / 2;
    group.add(innerShadow);
  }

  const labelSprite = textSprite(label, options.labelColor ?? "#ffffff");
  labelSprite.position.set(0, y > 0 ? 0.82 : -0.82, 0.18);
  labelSprite.scale.set(1.85, 0.46, 1);
  group.add(labelSprite);

  modelRoot.add(group);
  return group;
}

makeCartridge("Activated carbon insert", 0x15191f, 1.25, {
  liningOpacity: 0.50,
  labelColor: "#e8ecf4"
});

makeCartridge("Chitosan membrane insert", 0xf5deb2, -1.25, {
  liningOpacity: 0.48,
  labelColor: "#bffff1"
});

function addAcPellets() {
  const geo = new THREE.SphereGeometry(0.040, 10, 10);
  const colors = [0x050609, 0x161a20, 0x29313b];

  // Activated carbon is shown as a rough lining on the inside wall.
  for (let i = 0; i < 115; i++) {
    const pellet = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({
        color: colors[i % colors.length],
        transparent: true,
        opacity: 0.90,
        depthWrite: false
      })
    );

    const t = 0.505 + Math.random() * 0.15;
    const angle = visibleLiningAngle();

    pellet.position.copy(liningPoint("ac", t, angle, 0.035));

    const s = 0.55 + Math.random() * 1.15;
    pellet.scale.setScalar(s);

    modelRoot.add(pellet);
  }
}

const bindingSites = [];

function addChitosanSitesAndFibers() {
  const fiberMat = new THREE.MeshBasicMaterial({
    color: 0xffefc9,
    transparent: true,
    opacity: 0.84,
    depthWrite: false
  });

  // Chitosan fibers are drawn along the pipe lining.
  for (let i = 0; i < 58; i++) {
    const t1 = 0.505 + Math.random() * 0.13;
    const t2 = clamp(t1 + 0.018 + Math.random() * 0.035, 0.505, 0.665);
    const angle = visibleLiningAngle();

    const curve = new THREE.CatmullRomCurve3([
      liningPoint("chitosan", t1, angle, 0.035),
      liningPoint("chitosan", (t1 + t2) / 2, angle + 0.18, 0.035),
      liningPoint("chitosan", t2, angle - 0.08, 0.035)
    ]);

    const fiber = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 12, 0.010, 6, false),
      fiberMat
    );

    modelRoot.add(fiber);
  }

  const siteGeo = new THREE.SphereGeometry(0.030, 12, 12);
  const siteMat = new THREE.MeshBasicMaterial({
    color: 0x7fffd4,
    transparent: true,
    opacity: 0.96,
    depthWrite: false
  });

  // Positive binding sites sit on the inner lining.
  for (let i = 0; i < 90; i++) {
    const t = 0.505 + Math.random() * 0.15;
    const angle = visibleLiningAngle();

    const site = new THREE.Mesh(siteGeo, siteMat);
    site.position.copy(liningPoint("chitosan", t, angle, 0.050));
    site.userData.phase = Math.random() * Math.PI * 2;

    bindingSites.push(site);
    modelRoot.add(site);
  }
}

addAcPellets();
addChitosanSitesAndFibers();

function addSceneTitle() {
  const inlet = textSprite("Red dye + blue water", "#d9f7ff");
  inlet.position.set(-3.85, 0.55, 0.4);
  inlet.scale.set(1.95, 0.43, 1);
  modelRoot.add(inlet);

  const acOutlet = textSprite("AC outlet: more dye remains", "#ffd6dc");
  acOutlet.position.set(3.08, 0.62, 0.4);
  acOutlet.scale.set(2.15, 0.43, 1);
  modelRoot.add(acOutlet);

  const outlet = textSprite("Chitosan outlet: clearer", "#cffff4");
  outlet.position.set(3.12, -0.62, 0.4);
  outlet.scale.set(2.0, 0.43, 1);
  modelRoot.add(outlet);
}

addSceneTitle();

function textSprite(text, color = "#f1fbff") {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 192;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(5, 12, 24, 0.76)";
  roundRect(ctx, 24, 32, 720, 128, 34);

  ctx.strokeStyle = "rgba(160, 230, 255, 0.35)";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.font = "700 42px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 4);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  return new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false
    })
  );
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

const dyeMaterial = new THREE.MeshBasicMaterial({
  color: 0xff2447,
  transparent: true,
  opacity: 0.98,
  depthWrite: false
});

const capturedDyeMaterial = new THREE.MeshBasicMaterial({
  color: 0xd90036,
  transparent: true,
  opacity: 0.90,
  depthWrite: false
});

const waterMaterial = new THREE.MeshBasicMaterial({
  color: 0x59c8ff,
  transparent: true,
  opacity: 0.78,
  depthWrite: false
});

const particleGeometry = new THREE.SphereGeometry(0.045, 14, 14);
const waterGeometry = new THREE.SphereGeometry(0.027, 10, 10);
const particles = [];
const waterParticles = [];

function makeDyeParticle(pathType, randomize = true) {
  const particle = new THREE.Mesh(particleGeometry, dyeMaterial);
  particle.userData.pathType = pathType;
  resetParticle(particle, randomize);
  modelRoot.add(particle);
  particles.push(particle);
}

function makeWaterParticle(pathType, randomize = true) {
  const particle = new THREE.Mesh(waterGeometry, waterMaterial);
  particle.userData.pathType = pathType;
  resetWaterParticle(particle, randomize);
  modelRoot.add(particle);
  waterParticles.push(particle);
}

function resetParticle(particle, randomize = false) {
  const pathType = particle.userData.pathType;

  particle.userData.t = randomize ? Math.random() : Math.random() * 0.04;
  particle.userData.speed = 0.13 + Math.random() * 0.07;
  particle.userData.stuck = false;
  particle.userData.stuckAt = 0;
  particle.userData.willCapture = Math.random() < captureRates[pathType];
  particle.userData.capturePoint = randomCapturePoint(pathType);

  particle.material = dyeMaterial;
  particle.scale.setScalar(0.82 + Math.random() * 0.50);
  particle.visible = true;
}

function resetWaterParticle(particle, randomize = false) {
  particle.userData.t = randomize ? Math.random() : Math.random() * 0.05;
  particle.userData.speed = 0.19 + Math.random() * 0.09;
  particle.userData.phase = Math.random() * Math.PI * 2;
  particle.scale.setScalar(0.75 + Math.random() * 0.55);
  particle.visible = true;
}

function randomCapturePoint(pathType, nearT = null) {
  const range = CAPTURE_T_RANGE[pathType];

  const t =
    nearT === null
      ? range[0] + Math.random() * (range[1] - range[0])
      : clamp(nearT + (Math.random() - 0.5) * 0.035, range[0], range[1]);

  const angle = visibleLiningAngle();

  // Captured dye sits directly on the active lining.
  return liningPoint(pathType, t, angle, 0.018);
}

function isInsideCaptureZone(pathType, pos, t) {
  const range = CAPTURE_T_RANGE[pathType];

  return (
    t > range[0] &&
    t < range[1] &&
    Math.abs(pos.z) < PIPE_RADIUS
  );
}

for (let i = 0; i < 180; i++) {
  makeDyeParticle(i % 2 === 0 ? "ac" : "chitosan", true);
}

for (let i = 0; i < 260; i++) {
  makeWaterParticle(i % 2 === 0 ? "ac" : "chitosan", true);
}

function computeResults(s) {
  const R = safePositive(s.m / s.V, 0.000001);
  const chitosan = solveEquilibrium(s.C0, R, s.qmaxChitosan, s.KLChitosan);
  const ac = solveEquilibrium(s.C0, R, s.qmaxAC, s.KLAC);

  const t = s.tau / 60;
  const x = s.k2Chitosan * chitosan.qe * t;
  const f = x / (1 + x);

  const removalFlow = f * chitosan.removalEq;
  const CeFlow = s.C0 * (1 - removalFlow / 100);

  const zUntreated = lightDepthCm(s.C0, s.epsilon, s.MW);
  const zTreated = lightDepthCm(CeFlow, s.epsilon, s.MW);
  const foldGain = s.C0 / Math.max(CeFlow, 0.000001);

  return {
    R,
    chitosan,
    ac,
    f,
    removalFlow,
    CeFlow,
    zUntreated,
    zTreated,
    foldGain
  };
}

function solveEquilibrium(C0, R, qmax, KL) {
  const a = KL;
  const b = 1 + KL * (R * qmax - C0);
  const c = -C0;
  const disc = Math.max(0, b * b - 4 * a * c);

  let Ce = (-b + Math.sqrt(disc)) / (2 * a);
  Ce = clamp(Ce, 0, C0);

  const removalEq = ((C0 - Ce) / C0) * 100;
  const qe = (C0 - Ce) / R;
  const saturation = (qe / qmax) * 100;

  return { Ce, removalEq, qe, saturation };
}

function lightDepthCm(Ce, epsilon, MW) {
  return (2 * 1000 * MW) / (epsilon * Math.max(Ce, 0.000001));
}

function safePositive(value, fallback) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatPct(value, digits = 1) {
  return `${value.toFixed(digits)}%`;
}

function colorFromRelativeConcentration(relative) {
  const clean = new THREE.Color(0xbfefff);
  const red = new THREE.Color(0xff2848);
  const t = Math.pow(clamp(relative, 0, 1), 0.62);
  return clean.lerp(red, t);
}

function getVisualMetrics() {
  const acRemoval = results.ac.removalEq;
  const acCe = results.ac.Ce;
  const acRelative = acCe / state.C0;

  if (state.visualMode === "flow") {
    return {
      chitosanLabel: "flow-limited chitosan",
      chitosanRemoval: results.removalFlow,
      chitosanCe: results.CeFlow,
      chitosanRelative: results.CeFlow / state.C0,
      acRemoval,
      acCe,
      acRelative
    };
  }

  return {
    chitosanLabel: "equilibrium comparison",
    chitosanRemoval: results.chitosan.removalEq,
    chitosanCe: results.chitosan.Ce,
    chitosanRelative: results.chitosan.Ce / state.C0,
    acRemoval,
    acCe,
    acRelative
  };
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function updateSimulation() {
  results = computeResults(state);
  const visual = getVisualMetrics();

  captureRates.ac = clamp(visual.acRemoval / 100, 0.02, 0.98);
  captureRates.chitosan = clamp(visual.chitosanRemoval / 100, 0.02, 0.98);

  materials.acWater.color.copy(colorFromRelativeConcentration(visual.acRelative));
  materials.chitosanWater.color.copy(colorFromRelativeConcentration(visual.chitosanRelative));

  materials.acWater.opacity = 0.24 + 0.62 * clamp(visual.acRelative, 0, 1);
  materials.chitosanWater.opacity = 0.18 + 0.46 * clamp(visual.chitosanRelative, 0, 1);

  setText("metricChitosan", formatPct(visual.chitosanRemoval));
  setText("metricChitosanSub", visual.chitosanLabel);
  setText("metricAc", formatPct(results.ac.removalEq));
  setText("metricFlow", formatPct(results.removalFlow));
  setText("metricFlowSub", `${formatPct(results.f * 100, 0)} of chitosan equilibrium reached`);
  setText("metricFold", `${results.foldGain.toFixed(1)}x`);

  setText(
    "modeNote",
    state.visualMode === "equilibrium"
      ? "Best for visually comparing capacity and final clarity. This is why chitosan looks stronger in the pipe scene."
      : "Shows the chitosan single-pass result from pipe contact time. AC is still only a benchmark because no matched AC rate constant is supplied."
  );

  setText("scene-status", "3D pipe system loaded - drag scene to tilt");

  for (const p of particles) {
    if (!p.userData.stuck && Math.random() < 0.06) {
      p.userData.willCapture = Math.random() < captureRates[p.userData.pathType];
    }
  }
}

function bindInputs() {
  const ranges = document.querySelectorAll('input[type="range"][data-key]');
  const numbers = document.querySelectorAll('input[type="number"][data-key]');

  function setValue(key, rawValue, source) {
    const allForKey = document.querySelectorAll(`[data-key="${key}"]`);
    if (!allForKey.length) return;

    const min = Number(allForKey[0].min);
    const max = Number(allForKey[0].max);
    const value = clamp(Number(rawValue), min, max);

    state[key] = value;

    allForKey.forEach((el) => {
      if (el !== source) el.value = value;
    });

    updateSimulation();
  }

  ranges.forEach((input) => {
    input.addEventListener("input", (event) =>
      setValue(input.dataset.key, event.target.value, input)
    );
  });

  numbers.forEach((input) => {
    input.addEventListener("change", (event) =>
      setValue(input.dataset.key, event.target.value, input)
    );

    input.addEventListener("input", (event) => {
      if (event.target.value !== "") {
        setValue(input.dataset.key, event.target.value, input);
      }
    });
  });

  const visualMode = document.getElementById("visualMode");
  if (visualMode) {
    visualMode.addEventListener("change", (event) => {
      state.visualMode = event.target.value;
      updateSimulation();
    });
  }
}

bindInputs();
updateSimulation();

let targetRotationX = 0;
let targetRotationY = 0;
let isDragging = false;
let lastX = 0;
let lastY = 0;
let zoom = 1;

root.addEventListener("pointerdown", (event) => {
  isDragging = true;
  lastX = event.clientX;
  lastY = event.clientY;
  root.setPointerCapture(event.pointerId);
});

root.addEventListener("pointermove", (event) => {
  if (!isDragging) return;

  const dx = event.clientX - lastX;
  const dy = event.clientY - lastY;

  lastX = event.clientX;
  lastY = event.clientY;

  targetRotationY += dx * 0.004;
  targetRotationX += dy * 0.003;
  targetRotationX = clamp(targetRotationX, -0.45, 0.45);
});

root.addEventListener("pointerup", () => {
  isDragging = false;
});

root.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
    zoom = clamp(zoom + event.deltaY * 0.0007, 0.72, 1.45);
    resize();
  },
  { passive: false }
);

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.035);
  const elapsed = clock.elapsedTime;

  modelRoot.rotation.x += (targetRotationX - modelRoot.rotation.x) * 0.08;
  modelRoot.rotation.y += (targetRotationY - modelRoot.rotation.y) * 0.08;

  inletWater.position.x = Math.sin(elapsed * 3.2) * 0.018;
  acOutletWater.position.x = Math.sin(elapsed * 2.4 + 1.7) * 0.015;
  chitosanOutletWater.position.x = Math.sin(elapsed * 2.7 + 0.6) * 0.015;

  for (const particle of particles) {
    updateParticle(particle, dt, elapsed);
  }

  for (const particle of waterParticles) {
    updateWaterParticle(particle, dt, elapsed);
  }

  for (const site of bindingSites) {
    const pulse = 1 + Math.sin(elapsed * 3.2 + site.userData.phase) * 0.24;
    site.scale.setScalar(pulse);
  }

  renderer.render(scene, camera);
}

function updateParticle(particle, dt, elapsed) {
  const data = particle.userData;

  if (data.stuck) {
    const age = elapsed - data.stuckAt;
    particle.scale.setScalar(0.72 + Math.sin(elapsed * 4.5 + data.capturePoint.x) * 0.05);

    if (age > 7 + Math.random() * 1.2) {
      resetParticle(particle, false);
    }

    return;
  }

  data.t += data.speed * dt;

  if (data.t > 1) {
    resetParticle(particle, false);
    return;
  }

  const curve = curves[data.pathType];
  const pos = curve.getPointAt(data.t);
  const tangent = curve.getTangentAt(data.t);
  const side = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();

  const swirlA = Math.sin(
    elapsed * 7.0 + data.t * 24 + (data.pathType === "ac" ? 1 : 3)
  );

  const swirlB = Math.cos(
    elapsed * 6.0 + data.t * 18 + (data.pathType === "ac" ? 2 : 4)
  );

  // Free-moving dye stays inside the pipe core.
  pos.addScaledVector(side, swirlA * 0.075);
  pos.z = swirlB * 0.075;

  particle.position.copy(pos);

  if (data.willCapture && isInsideCaptureZone(data.pathType, pos, data.t)) {
    data.stuck = true;
    data.stuckAt = elapsed;

    // Adsorption happens on the filter lining, not in the center.
    data.capturePoint = randomCapturePoint(data.pathType, data.t);
    particle.position.copy(data.capturePoint);

    particle.material = capturedDyeMaterial;
    particle.scale.setScalar(0.58 + Math.random() * 0.18);
  }
}

function updateWaterParticle(particle, dt, elapsed) {
  const data = particle.userData;

  data.t += data.speed * dt;

  if (data.t > 1) {
    resetWaterParticle(particle, false);
    return;
  }

  const curve = curves[data.pathType];
  const pos = curve.getPointAt(data.t);
  const tangent = curve.getTangentAt(data.t);
  const side = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();

  const swirlA = Math.sin(elapsed * 8.5 + data.t * 32 + data.phase);
  const swirlB = Math.cos(elapsed * 7.4 + data.t * 26 + data.phase);

  // Water molecules pass through easily and remain inside the pipe.
  pos.addScaledVector(side, swirlA * 0.105);
  pos.z = swirlB * 0.105;

  particle.position.copy(pos);
}

function resize() {
  const width = root.clientWidth || window.innerWidth;
  const height = root.clientHeight || window.innerHeight;

  renderer.setSize(width, height, false);

  const aspect = width / height;
  const viewHeight = 6.1 * zoom;
  const viewWidth = viewHeight * aspect;

  camera.left = -viewWidth / 2;
  camera.right = viewWidth / 2;
  camera.top = viewHeight / 2;
  camera.bottom = -viewHeight / 2;
  camera.updateProjectionMatrix();
}

window.addEventListener("resize", resize);

resize();
animate();
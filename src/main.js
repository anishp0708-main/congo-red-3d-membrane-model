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

// Remove the old top-right Live outlet comparison panel if index.html still has it.
const oldHud = document.getElementById("hud");
if (oldHud) oldHud.remove();

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

const glowLight = new THREE.PointLight(0x9dfcff, 2.4, 18);
glowLight.position.set(1.8, 1.4, 6);
scene.add(glowLight);

const redLight = new THREE.PointLight(0xff4268, 2.2, 15);
redLight.position.set(-3.6, 0.8, 4);
scene.add(redLight);

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
  pipe: new THREE.MeshBasicMaterial({
    color: 0xa9efff,
    transparent: true,
    opacity: 0.42,
    side: THREE.DoubleSide,
    depthWrite: false
  }),
  pipeRim: new THREE.MeshBasicMaterial({
    color: 0xe8fdff,
    transparent: true,
    opacity: 0.56,
    side: THREE.DoubleSide,
    depthWrite: false
  }),
  inletWater: new THREE.MeshBasicMaterial({
    color: 0xff2848,
    transparent: true,
    opacity: 0.74,
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

tube(curves.ac, 0.25, materials.pipe, 180, 28);
tube(curves.chitosan, 0.25, materials.pipe, 180, 28);
tube(curves.ac, 0.275, materials.pipeRim, 180, 10);
tube(curves.chitosan, 0.275, materials.pipeRim, 180, 10);

const inletWater = tube(inletCurve, 0.155, materials.inletWater, 70, 20);
const acOutletWater = tube(acOutletCurve, 0.145, materials.acWater, 70, 20);
const chitosanOutletWater = tube(chitosanOutletCurve, 0.145, materials.chitosanWater, 70, 20);

function addPipeRing(x, y) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.29, 0.024, 10, 48),
    new THREE.MeshBasicMaterial({ color: 0xe5fbff, transparent: true, opacity: 0.9 })
  );
  ring.position.set(x, y, 0.05);
  ring.rotation.y = Math.PI / 2;
  modelRoot.add(ring);
  return ring;
}

addPipeRing(-3.18, 0);
addPipeRing(4.7, 1.25);
addPipeRing(4.7, -1.25);

function makeCartridge(label, color, y, options = {}) {
  const group = new THREE.Group();
  group.position.set(0.55, y, 0.18);

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.48, 0.48, 1.35, 48, 1, true),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: options.opacity ?? 0.78,
      side: THREE.DoubleSide
    })
  );
  body.rotation.z = Math.PI / 2;
  group.add(body);

  const capMat = new THREE.MeshBasicMaterial({
    color: options.ringColor ?? 0xffffff,
    transparent: true,
    opacity: 0.96
  });

  for (const x of [-0.675, 0.675]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.49, 0.045, 12, 64), capMat);
    ring.position.x = x;
    ring.rotation.y = Math.PI / 2;
    group.add(ring);
  }

  const labelSprite = textSprite(label, options.labelColor ?? "#ffffff");
  labelSprite.position.set(0, y > 0 ? 0.82 : -0.82, 0.18);
  labelSprite.scale.set(1.85, 0.46, 1);
  group.add(labelSprite);

  modelRoot.add(group);
  return group;
}

makeCartridge("Activated carbon", 0x14171d, 1.25, {
  opacity: 0.92,
  ringColor: 0x9ba3ae,
  labelColor: "#e8ecf4"
});

makeCartridge("Chitosan membrane", 0xf5deb2, -1.25, {
  opacity: 0.82,
  ringColor: 0xf1fff7,
  labelColor: "#bffff1"
});

function addAcPellets() {
  const geo = new THREE.SphereGeometry(0.045, 10, 10);
  const colors = [0x050609, 0x161a20, 0x29313b];

  for (let i = 0; i < 95; i++) {
    const pellet = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({
        color: colors[i % colors.length],
        transparent: true,
        opacity: 0.94
      })
    );

    pellet.position.set(
      0.55 + (Math.random() - 0.5) * 1.06,
      1.25 + (Math.random() - 0.5) * 0.34,
      (Math.random() - 0.5) * 0.22
    );

    const s = 0.6 + Math.random() * 1.35;
    pellet.scale.setScalar(s);
    modelRoot.add(pellet);
  }
}

const bindingSites = [];

function addChitosanSitesAndFibers() {
  const fiberMat = new THREE.MeshBasicMaterial({
    color: 0xffefc9,
    transparent: true,
    opacity: 0.78
  });

  for (let i = 0; i < 38; i++) {
    const yBase = -1.25 + (Math.random() - 0.5) * 0.30;
    const zBase = (Math.random() - 0.5) * 0.20;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.06 + Math.random() * 0.16, yBase, zBase),
      new THREE.Vector3(
        0.35 + Math.random() * 0.15,
        yBase + (Math.random() - 0.5) * 0.18,
        zBase
      ),
      new THREE.Vector3(
        0.75 + Math.random() * 0.16,
        yBase + (Math.random() - 0.5) * 0.18,
        zBase
      )
    ]);

    modelRoot.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 14, 0.012, 6, false), fiberMat));
  }

  const siteGeo = new THREE.SphereGeometry(0.035, 12, 12);
  const siteMat = new THREE.MeshBasicMaterial({
    color: 0x7fffd4,
    transparent: true,
    opacity: 0.96
  });

  for (let i = 0; i < 70; i++) {
    const site = new THREE.Mesh(siteGeo, siteMat);

    site.position.set(
      0.55 + (Math.random() - 0.5) * 1.05,
      -1.25 + (Math.random() - 0.5) * 0.34,
      (Math.random() - 0.5) * 0.22
    );

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
  opacity: 0.88,
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

function randomCapturePoint(pathType) {
  const centerY = pathType === "ac" ? 1.25 : -1.25;

  return new THREE.Vector3(
    0.55 + (Math.random() - 0.5) * 1.06,
    centerY + (Math.random() - 0.5) * 0.28,
    (Math.random() - 0.5) * 0.22
  );
}

function isInsideCaptureZone(pathType, pos) {
  const centerY = pathType === "ac" ? 1.25 : -1.25;

  return (
    pos.x > -0.08 &&
    pos.x < 1.15 &&
    Math.abs(pos.y - centerY) < 0.28 &&
    Math.abs(pos.z) < 0.22
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

function updateSimulation() {
  results = computeResults(state);
  const visual = getVisualMetrics();

  captureRates.ac = clamp(visual.acRemoval / 100, 0.02, 0.98);
  captureRates.chitosan = clamp(visual.chitosanRemoval / 100, 0.02, 0.98);

  materials.acWater.color.copy(colorFromRelativeConcentration(visual.acRelative));
  materials.chitosanWater.color.copy(colorFromRelativeConcentration(visual.chitosanRelative));

  materials.acWater.opacity = 0.24 + 0.62 * clamp(visual.acRelative, 0, 1);
  materials.chitosanWater.opacity = 0.18 + 0.46 * clamp(visual.chitosanRelative, 0, 1);

  document.getElementById("metricChitosan").textContent = formatPct(visual.chitosanRemoval);
  document.getElementById("metricChitosanSub").textContent = visual.chitosanLabel;
  document.getElementById("metricAc").textContent = formatPct(results.ac.removalEq);
  document.getElementById("metricFlow").textContent = formatPct(results.removalFlow);
  document.getElementById("metricFlowSub").textContent =
    `${formatPct(results.f * 100, 0)} of chitosan equilibrium reached`;
  document.getElementById("metricFold").textContent = `${results.foldGain.toFixed(1)}x`;

  document.getElementById("modeNote").textContent =
    state.visualMode === "equilibrium"
      ? "Best for visually comparing capacity and final clarity. This is why chitosan looks stronger in the pipe scene."
      : "Shows the chitosan single-pass result from pipe contact time. AC is still only a benchmark because no matched AC rate constant is supplied.";

  document.getElementById("scene-status").textContent =
    "3D pipe system loaded - drag scene to tilt";

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

  document.getElementById("visualMode").addEventListener("change", (event) => {
    state.visualMode = event.target.value;
    updateSimulation();
  });
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
    particle.scale.setScalar(0.95 + Math.sin(elapsed * 4.5 + data.capturePoint.x) * 0.07);

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

  pos.addScaledVector(side, swirlA * 0.075);
  pos.z = swirlB * 0.075;

  particle.position.copy(pos);

  if (data.willCapture && isInsideCaptureZone(data.pathType, pos)) {
    data.stuck = true;
    data.stuckAt = elapsed;
    particle.position.copy(data.capturePoint);
    particle.material = capturedDyeMaterial;
    particle.scale.setScalar(0.74 + Math.random() * 0.24);
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
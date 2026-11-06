/** The scene is optional: object information remains usable without WebGL. */
export function shouldUseFallback({ reducedMotion = false, webgl = true, importFailed = false } = {}) {
  return Boolean(reducedMotion || !webgl || importFailed);
}

/** Project a world point with a column-major view/projection matrix (no DOM/Three). */
export function projectPoint(point, matrix, width, height) {
  if (!point || !matrix || matrix.length !== 16 || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  const { x, y, z } = point;
  if (![x, y, z, ...matrix].every(Number.isFinite)) return null;
  const w = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15];
  if (w <= 0) return null;
  const nx = (matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12]) / w;
  const ny = (matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13]) / w;
  const nz = (matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14]) / w;
  return { x: (nx + 1) * width / 2, y: (1 - ny) * height / 2, visible: nx >= -1 && nx <= 1 && ny >= -1 && ny <= 1 && nz >= -1 && nz <= 1 };
}

/** CSS owns scene colors; missing/invalid values have neutral, offline defaults. */
export function readScenePalette(style) {
  const defaults = { sky: '#E8EDFF', ground: '#E6F0E9', felt: '#FFFFFF', wood: '#74513B', star: '#566B91' };
  return Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => {
    const value = style.getPropertyValue('--scene-' + key).trim();
    return [key, /^#[0-9a-f]{6}$/i.test(value) ? value : fallback];
  }));
}

/** Update existing GPU materials instead of remounting the camera/animation. */
export function applyScenePalette(colors, parts) {
  parts.renderer.setClearColor(colors.sky); parts.scene.fog.color.set(colors.sky);
  for (const [material, color] of [[parts.felt, colors.felt], [parts.timber, colors.wood], [parts.gold, colors.star], [parts.dark, colors.wood], [parts.earth.material, colors.ground], [parts.starMaterial, colors.star]]) material.color.set(color);
  parts.paintCloth(colors); parts.texture.needsUpdate = true;
}

/** Named local coordinates are shared by projection and camera selection. */
export const YURT_ANCHORS = Object.freeze({
  shanyrak: [0, 3.7, 0], kuldireuish: [0.3, 3.65, 0.25],
  uyk: [1.3, 2.9, 1.2], kerege: [-1.1, 1.1, 2.4],
  tundik: [-0.65, 3.6, -0.45], uzik: [1.9, 2.7, -0.7],
  tuyrlyk: [-2.7, 1.2, -0.2], baskur: [2.5, 1.73, 1.25], door: [0, 1.05, 2.85],
  batyr: [3.65, 2.8, 2.4], helmet: [3.65, 3.68, 2.4], armor: [3.65, 2.9, 2.63],
  spear: [4.4, 4.05, 2.58], shield: [2.98, 2.8, 2.68], bow: [3.35, 2.95, 2.0],
  horse: [3.65, 1.45, 3.35], dog: [5.1, 0.7, 2.9],
  hearth: [-3.8, 0.5, 2.5], cauldron: [-3.8, 1.15, 2.5],
  eagle: [-3.35, 1.9, -0.9], saba: [2.95, 0.95, -1.8]
});

/** Build the camp out of flat-shaded primitives; independent of the browser/GPU. */
export function buildEncampment(THREE, world, materials) {
  const makeMaterial = (color, options = {}) => new THREE.MeshStandardMaterial({ color, roughness: .88, flatShading: true, ...options });
  const chestnut = makeMaterial('#81503A'), muzzle = makeMaterial('#B98A65');
  const mane = makeMaterial('#312822'), hoof = makeMaterial('#272B32');
  const steel = makeMaterial('#87929B', { metalness: .35, roughness: .55 });
  const cape = makeMaterial('#315C72'), leather = makeMaterial('#49352C');
  const skin = makeMaterial('#D5A179'), white = makeMaterial('#FFFFFF'), black = makeMaterial('#141B24');
  const feather = makeMaterial('#56432F'), beak = makeMaterial('#D0A33B');
  const fireMaterial = makeMaterial('#FF9A31', { emissive: '#FF651E', emissiveIntensity: 1.5 });
  const flameCore = makeMaterial('#FFD96B', { emissive: '#FFB53E', emissiveIntensity: 2 });
  const stone = makeMaterial('#8B9697');
  const mesh = (parent, geometry, material, position = [0, 0, 0], scale = [1, 1, 1]) => {
    const item = new THREE.Mesh(geometry, material); item.position.set(...position); item.scale.set(...scale);
    item.castShadow = true; item.receiveShadow = true; parent.add(item); return item;
  };
  const ball = (parent, material, p, s) => mesh(parent, new THREE.SphereGeometry(1, 10, 7), material, p, s);
  const box = (parent, material, p, s) => mesh(parent, new THREE.BoxGeometry(1, 1, 1), material, p, s);
  const cone = (parent, material, p, r, h) => mesh(parent, new THREE.ConeGeometry(r, h, 7), material, p);
  const rod = (parent, material, a, b, radius = .035) => {
    const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b), delta = to.sub(from);
    const item = mesh(parent, new THREE.CylinderGeometry(radius, radius, delta.length(), 7), material);
    item.position.copy(from).addScaledVector(delta, .5);
    item.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()); return item;
  };
  const group = (name, p) => { const item = new THREE.Group(); item.name = name; item.position.set(...p); world.add(item); return item; };
  const horse = group('horse-and-rider', [3.65, 0, 2.4]);
  const breathing = new THREE.Group(); breathing.name = 'horse-breathing'; horse.add(breathing);
  ball(breathing, chestnut, [0, 1.43, 0], [.47, .56, 1]);
  ball(breathing, chestnut, [0, 1.93, .66], [.33, .72, .37]).rotation.x = -.3;
  ball(breathing, chestnut, [0, 2.46, 1.0], [.28, .36, .48]);
  ball(breathing, muzzle, [0, 2.33, 1.36], [.25, .21, .31]);
  for (const x of [-.17, .17]) {
    cone(breathing, chestnut, [x, 2.86, .87], .105, .4).rotation.z = -x;
    ball(breathing, white, [x * 1.56, 2.53, 1.11], [.046, .058, .075]);
    ball(breathing, black, [x * 1.72, 2.53, 1.14], [.024, .034, .043]);
    ball(breathing, black, [x * .65, 2.37, 1.64], [.035, .025, .012]);
  }
  for (const x of [-.29, .29]) for (const z of [-.63, .6]) {
    rod(horse, chestnut, [x, 1.45, z], [x * 1.12, .48, z + .08], .1);
    rod(horse, chestnut, [x * 1.12, .5, z + .08], [x * 1.08, .14, z + .13], .065);
    box(horse, hoof, [x * 1.08, .12, z + .17], [.2, .2, .29]);
  }
  for (let i = 0; i < 7; i++) ball(breathing, mane, [0, 1.72 + i * .17, .34 + i * .065], [.105, .17, .15]);
  const horseTail = new THREE.Group(); horseTail.position.set(0, 1.8, -.9); horse.add(horseTail);
  rod(horseTail, mane, [0, 0, 0], [.03, -.96, -.36], .095);
  cone(horseTail, mane, [.03, -.94, -.36], .12, .45).rotation.x = .2;
  // Saddle, blanket, girth and reins make the rider sit on the horse.
  box(breathing, cape, [0, 1.88, -.08], [1.0, .12, .95]);
  ball(breathing, leather, [0, 2.01, -.08], [.4, .16, .4]);
  rod(breathing, leather, [-.44, 1.9, 0], [-.44, 1.16, 0], .04);
  rod(breathing, leather, [.44, 1.9, 0], [.44, 1.16, 0], .04);
  rod(breathing, leather, [-.27, 2.42, 1.25], [-.42, 2.52, .2], .018);
  rod(breathing, leather, [.27, 2.42, 1.25], [.42, 2.52, .2], .018);
  const rider = new THREE.Group(); rider.name = 'batyr'; breathing.add(rider);
  cone(rider, cape, [0, 2.45, -.11], .52, .87);
  box(rider, steel, [0, 2.86, -.02], [.68, .86, .42]);
  // Layered rows of scale armor remain readable from a distance.
  for (let row = 0; row < 3; row++) for (const x of [-.2, 0, .2]) {
    ball(rider, steel, [x, 2.65 + row * .2, .22], [.11, .13, .035]);
  }
  box(rider, leather, [0, 2.47, .01], [.72, .12, .48]);
  for (const x of [-.48, .48]) {
    rod(rider, cape, [x * .65, 2.3, -.05], [x, 1.72, .13], .14);
    box(rider, hoof, [x, 1.53, .26], [.24, .46, .39]);
  }
  ball(rider, skin, [0, 3.49, .02], [.235, .29, .23]);
  for (const x of [-.085, .085]) {
    ball(rider, white, [x, 3.52, .228], [.042, .035, .018]);
    ball(rider, black, [x, 3.52, .246], [.019, .023, .01]);
  }
  ball(rider, skin, [0, 3.44, .26], [.045, .065, .055]);
  cone(rider, steel, [0, 3.77, .01], .29, .46);
  cone(rider, materials.gold, [0, 4.06, .01], .055, .2);
  box(rider, steel, [-.245, 3.42, -.02], [.08, .26, .22]);
  box(rider, steel, [.245, 3.42, -.02], [.08, .26, .22]);
  // Right arm grips spear; left arm supports a round shield.
  rod(rider, steel, [.34, 3.12, 0], [.68, 2.78, .2], .13);
  rod(rider, cape, [.68, 2.78, .2], [.75, 3.04, .25], .105);
  ball(rider, skin, [.75, 3.04, .25], [.12, .12, .12]);
  rod(rider, steel, [-.34, 3.1, 0], [-.59, 2.79, .15], .13);
  rod(rider, cape, [-.59, 2.79, .15], [-.64, 2.82, .31], .1);
  const shield = mesh(rider, new THREE.CylinderGeometry(.43, .43, .085, 12), materials.timber, [-.67, 2.83, .34]);
  shield.rotation.x = Math.PI / 2;
  mesh(rider, new THREE.TorusGeometry(.39, .038, 5, 12), steel, [-.67, 2.83, .4]);
  ball(rider, steel, [-.67, 2.83, .42], [.1, .1, .06]);
  rod(rider, materials.timber, [.75, 1.1, .25], [.75, 4.62, .25], .028);
  cone(rider, steel, [.75, 4.78, .25], .09, .34);
  const tassel = new THREE.Group(); tassel.position.set(.75, 4.47, .25); rider.add(tassel);
  for (let i = 0; i < 5; i++) rod(tassel, cape, [0, 0, 0], [.11 + i * .035, -.32 - i * .025, (i - 2) * .035], .021);
  // Sheathed sword hangs from the belt. The bow and quiver sit behind the shoulder.
  rod(rider, steel, [.4, 2.46, -.16], [.62, 1.59, -.43], .045);
  rod(rider, leather, [.35, 2.59, -.12], [.4, 2.44, -.16], .045);
  rod(rider, materials.gold, [.23, 2.46, -.18], [.56, 2.5, -.14], .027);
  const bowPoints = [];
  for (let i = 0; i <= 12; i++) { const t = i / 12 * Math.PI; bowPoints.push(new THREE.Vector3(-.36 - .27 * Math.sin(t), 2.42 + .98 * i / 12, -.32)); }
  for (let i = 0; i < bowPoints.length - 1; i++) rod(rider, materials.timber, bowPoints[i].toArray(), bowPoints[i + 1].toArray(), .025);
  rod(rider, leather, [-.36, 2.42, -.32], [-.36, 3.4, -.32], .009);
  const quiver = mesh(rider, new THREE.CylinderGeometry(.13, .1, .7, 8), leather, [.21, 2.96, -.36]); quiver.rotation.z = -.18;
  for (let i = 0; i < 4; i++) {
    rod(rider, materials.timber, [.1 + i * .065, 3.12, -.36], [.13 + i * .065, 3.66, -.36], .012);
    cone(rider, feather, [.13 + i * .065, 3.59, -.36], .047, .14);
  }
  const dog = group('tazy', [5.1, 0, 2.45]);
  ball(dog, muzzle, [0, .78, 0], [.17, .22, .55]);
  ball(dog, muzzle, [0, 1.0, .4], [.13, .28, .16]);
  ball(dog, muzzle, [0, 1.2, .55], [.145, .16, .22]);
  ball(dog, muzzle, [0, 1.16, .79], [.09, .075, .22]);
  ball(dog, black, [0, 1.16, .99], [.064, .055, .04]);
  for (const x of [-.12, .12]) {
    ball(dog, black, [x, 1.24, .64], [.025, .03, .035]);
    ball(dog, leather, [x * 1.18, 1.07, .44], [.055, .23, .12]);
    for (const z of [-.35, .34]) {
      rod(dog, muzzle, [x, .79, z], [x * 1.2, .08, z + .05], .039);
      ball(dog, muzzle, [x * 1.2, .07, z + .1], [.06, .055, .1]);
    }
  }
  const dogTail = new THREE.Group(); dogTail.position.set(0, .83, -.48); dog.add(dogTail);
  rod(dogTail, muzzle, [0, 0, 0], [0, -.22, -.42], .035);
  rod(dogTail, muzzle, [0, -.22, -.42], [.01, -.08, -.65], .025);
  const hearth = group('hearth', [-3.8, 0, 2.5]);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    ball(hearth, stone, [Math.cos(a) * .56, .13, Math.sin(a) * .56], [.23, .16, .18]);
  }
  for (const a of [-.5, .5]) { const log = rod(hearth, materials.timber, [-.42, .19, a * .5], [.42, .19, -a * .5], .09); log.name = 'firewood'; }
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * Math.PI * 2;
    rod(hearth, hoof, [Math.cos(a) * .64, .05, Math.sin(a) * .64], [Math.cos(a) * .4, 1.03, Math.sin(a) * .4], .035);
  }
  const potPoints = [[0, 0], [.18, 0], [.34, .06], [.46, .22], [.48, .46], [.44, .54]].map(p => new THREE.Vector2(...p));
  const pot = mesh(hearth, new THREE.LatheGeometry(potPoints, 14), hoof, [0, .75, 0]); pot.name = 'cauldron';
  const rim = mesh(hearth, new THREE.TorusGeometry(.45, .035, 5, 18), steel, [0, 1.29, 0]); rim.rotation.x = Math.PI / 2;
  for (const x of [-.5, .5]) { const handle = mesh(hearth, new THREE.TorusGeometry(.12, .028, 5, 10), hoof, [x, 1.13, 0]); handle.rotation.y = Math.PI / 2; }
  const flames = new THREE.Group(); flames.name = 'flames'; hearth.add(flames);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2;
    cone(flames, fireMaterial, [Math.cos(a) * .19, .46, Math.sin(a) * .19], .14, .65 - i * .045);
  }
  cone(flames, flameCore, [0, .42, 0], .18, .57);
  const fireLight = new THREE.PointLight('#FF9A31', 6, 5, 2); fireLight.position.set(0, .6, 0); hearth.add(fireLight);
  const smoke = [];
  for (let i = 0; i < 9; i++) {
    const material = makeMaterial('#919B9B', { transparent: true, opacity: .18, depthWrite: false });
    const puff = ball(hearth, material, [0, 1.6 + i * .2, 0], [.16, .16, .16]); puff.castShadow = false; smoke.push(puff);
  }
  const eagle = group('eagle-on-perch', [-3.35, 0, -.9]);
  rod(eagle, materials.timber, [0, .04, 0], [0, 1.31, 0], .07);
  rod(eagle, materials.timber, [-.42, 1.3, 0], [.42, 1.3, 0], .06);
  for (const x of [-.28, .28]) rod(eagle, materials.timber, [0, .4, 0], [x, .04, .25], .045);
  ball(eagle, feather, [0, 1.72, 0], [.27, .4, .24]);
  ball(eagle, feather, [0, 2.08, .14], [.18, .2, .18]);
  for (const x of [-.23, .23]) {
    ball(eagle, mane, [x, 1.72, -.03], [.09, .3, .2]).rotation.z = -x;
    rod(eagle, beak, [x * .5, 1.5, .05], [x * .5, 1.3, .07], .025);
    ball(eagle, black, [x * .62, 2.11, .24], [.025, .03, .025]);
  }
  cone(eagle, beak, [0, 2.03, .37], .065, .18).rotation.x = Math.PI / 2;
  box(eagle, feather, [0, 1.35, -.22], [.21, .35, .09]).rotation.x = -.5;
  const saba = group('saba-on-stand', [2.95, 0, -1.8]);
  box(saba, materials.timber, [0, .44, 0], [.85, .12, .72]);
  for (const x of [-.32, .32]) for (const z of [-.24, .24]) rod(saba, materials.timber, [x, .44, z], [x * 1.15, .04, z * 1.15], .045);
  const bagShape = new THREE.Shape(); bagShape.moveTo(-.38, .03); bagShape.lineTo(.38, .03); bagShape.lineTo(.28, .58); bagShape.lineTo(.1, .78); bagShape.lineTo(.09, 1); bagShape.lineTo(-.09, 1); bagShape.lineTo(-.1, .78); bagShape.lineTo(-.28, .58); bagShape.closePath();
  const bag = mesh(saba, new THREE.ExtrudeGeometry(bagShape, { depth: .3, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: .06, bevelThickness: .06 }), leather, [0, .51, -.15]); bag.name = 'leather-saba';
  rod(saba, materials.gold, [-.12, 1.3, .19], [.12, 1.3, .19], .018);
  const anchors = {};
  for (const [id, coordinate] of Object.entries(YURT_ANCHORS)) {
    const anchor = new THREE.Object3D(); anchor.name = 'anchor-' + id; anchor.position.set(...coordinate); world.add(anchor); anchors[id] = anchor;
  }
  return {
    anchors,
    animate(time) {
      breathing.scale.y = 1 + Math.sin(time * 1.45) * .007;
      horseTail.rotation.z = Math.sin(time * 1.3) * .15;
      tassel.rotation.z = Math.sin(time * 2.1) * .2;
      dogTail.rotation.y = Math.sin(time * 2.2) * .3;
      flames.scale.y = .92 + Math.sin(time * 11) * .1;
      fireLight.intensity = 5.5 + Math.sin(time * 13) * .7 + Math.sin(time * 19) * .25;
      smoke.forEach((puff, i) => {
        const life = (time * .16 + i / smoke.length) % 1;
        puff.position.set(Math.sin(life * 5 + i) * .14 + life * .28, 1.35 + life * 2.3, Math.cos(life * 4 + i) * .1);
        puff.scale.setScalar(.09 + life * .3); puff.material.opacity = (1 - life) * .2;
      });
    }
  };
}

export function mountYurt(container) {
  const stage = container?.querySelector('.yurt-stage');
  if (!stage) return () => {};
  const links = [...container.querySelectorAll('.yurt-stage [data-yurt-object]')];
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let disposed = false, renderer, scene, frame = 0, observer, resizeObserver;
  let running = false, inView = true, flight = null, width = 1, height = 1;
  const listeners = [];
  const on = (target, event, fn, options) => { target.addEventListener(event, fn, options); listeners.push(() => target.removeEventListener(event, fn, options)); };
  const clearLinkStyles = () => links.forEach(link => { link.removeAttribute('style'); link.removeAttribute('data-behind'); });
  const disposeScene = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    running = false;
    observer?.disconnect(); resizeObserver?.disconnect();
    while (listeners.length) listeners.pop()();
    const textures = new Set(), materials = new Set(), geometries = new Set();
    scene?.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      object.shadow?.dispose();
      for (const material of [object.material].flat().filter(Boolean)) {
        materials.add(material);
        for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      }
    });
    textures.forEach(texture => texture.dispose());
    materials.forEach(material => material.dispose());
    geometries.forEach(geometry => geometry.dispose());
    renderer?.dispose(); renderer?.forceContextLoss(); renderer?.domElement.remove();
    renderer = null; scene = null;
    clearLinkStyles();
    container.classList.remove('yurt-ready');
  };
  const fallback = () => { disposeScene(); container.classList.add('yurt-fallback-mode'); };
  if (shouldUseFallback({ reducedMotion: motion.matches })) { fallback(); return () => { disposed = true; disposeScene(); }; }

  let pendingSelection = null, selectObject = null;
  on(container, 'yurtselect', event => {
    pendingSelection = event.detail?.id || null;
    selectObject?.(pendingSelection);
  });
  (async () => {
    try {
      const THREE = await import('./vendor/three.module.min.js?v=39');
      if (disposed) return;
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      const palette = () => readScenePalette(getComputedStyle(document.documentElement));
      renderer.setClearColor(palette().sky);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.domElement.setAttribute('aria-hidden', 'true');
      stage.appendChild(renderer.domElement);
      scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(palette().sky, 0.016);
      const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 110);
      const target = new THREE.Vector3(0, 1.65, 0);
      const home = new THREE.Vector3(7, 5.6, 11.8);
      camera.position.copy(home); camera.lookAt(target);
      const yurt = new THREE.Group(); scene.add(yurt);
      const felt = new THREE.MeshStandardMaterial({ flatShading: true, color: palette().felt, roughness: 1, side: THREE.DoubleSide });
      const timber = new THREE.MeshStandardMaterial({ flatShading: true, color: palette().wood, roughness: 0.86 });
      const gold = new THREE.MeshStandardMaterial({ flatShading: true, color: palette().star, roughness: 0.6 });
      const dark = new THREE.MeshStandardMaterial({ flatShading: true, color: palette().wood, roughness: 0.9 });
      const line = (from, to, radius = 0.025, material = timber) => {
        const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), delta = b.clone().sub(a);
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, delta.length(), 5), material);
        mesh.position.copy(a).add(b).multiplyScalar(0.5);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
        yurt.add(mesh); return mesh;
      };
      const ring = (radius, tube, y, material) => {
        const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, 80), material);
        mesh.rotation.x = Math.PI / 2; mesh.position.y = y; yurt.add(mesh); return mesh;
      };
      // Felt has an open front quarter, exposing the structural lattice and roof poles.
      const opening = Math.PI * 0.24;
      const wall = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 1.95, 40, 1, true, opening, Math.PI * 2 - opening * 2), felt);
      wall.position.y = 1.03; yurt.add(wall);
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 2.86, 1.6, 40, 1, true, opening, Math.PI * 2 - opening * 2), felt);
      roof.position.y = 2.79; yurt.add(roof);
      for (let i = 0; i < 48; i++) {
        const angle = i / 48 * Math.PI * 2;
        const at = (r, y, offset = 0) => [Math.sin(angle + offset) * r, y, Math.cos(angle + offset) * r];
        line(at(2.75, 0.16, -0.25), at(2.75, 1.98, 0.25), 0.022);
        line(at(2.75, 0.16, 0.25), at(2.75, 1.98, -0.25), 0.022);
        line(at(2.77, 1.98), at(0.68, 3.58), 0.035);
      }
      ring(2.8, 0.045, 0.12, timber); ring(2.8, 0.055, 2.01, timber);
      ring(0.68, 0.085, 3.59, gold); ring(0.68, 0.045, 3.7, timber);
      for (const offset of [-0.3, 0, 0.3]) {
        const extent = Math.sqrt(0.64 ** 2 - offset ** 2);
        line([-extent, 3.63, offset], [extent, 3.63, offset], 0.024, timber);
        line([offset, 3.66, -extent], [offset, 3.66, extent], 0.024, timber);
      }
      // Plain geometric ornament, without simulated script or invented symbols.
      const cloth = document.createElement('canvas'); cloth.width = 512; cloth.height = 96;
      const ctx = cloth.getContext('2d');
      if (!ctx) throw new Error('Canvas texture unavailable');
      const paintCloth = colors => {
        ctx.fillStyle = colors.wood; ctx.fillRect(0, 0, 512, 96);
        for (let x = 0; x < 512; x += 64) {
          ctx.strokeStyle = colors.star; ctx.lineWidth = 7;
          ctx.beginPath(); ctx.moveTo(x, 48); ctx.lineTo(x + 32, 10); ctx.lineTo(x + 64, 48); ctx.lineTo(x + 32, 86); ctx.closePath(); ctx.stroke();
          ctx.fillStyle = colors.felt; ctx.fillRect(x + 24, 39, 16, 18);
        }
      };
      paintCloth(palette());
      const texture = new THREE.CanvasTexture(cloth); texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping; texture.repeat.set(8, 1);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(2.82, 2.82, 0.29, 80, 1, true, opening, Math.PI * 2 - opening * 2), new THREE.MeshStandardMaterial({ flatShading: true, map: texture, roughness: 1, side: THREE.DoubleSide }));
      band.position.y = 1.73; yurt.add(band);
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.87, 1.53, 0.09), dark);
      door.position.set(0, 0.87, 2.72); yurt.add(door);
      line([-0.49, 0.1, 2.79], [-0.49, 1.67, 2.79], 0.055, gold);
      line([0.49, 0.1, 2.79], [0.49, 1.67, 2.79], 0.055, gold);
      line([-0.49, 1.67, 2.79], [0.49, 1.67, 2.79], 0.055, gold);
      line([0, 0.15, 2.79], [0, 1.59, 2.79], 0.014, gold);
      // Folded-back tundik and its tie ropes leave the shanyrak visible.
      const tundik = new THREE.Mesh(new THREE.BoxGeometry(1.1, .07, .85), felt);
      tundik.position.set(-.66, 3.6, -.45); tundik.rotation.z = -.18; yurt.add(tundik);
      line([-1.14, 3.5, -.05], [-2.7, .18, -.45], .018, timber);
      line([-.2, 3.69, -.8], [.9, .2, -2.65], .018, timber);
      const camp = buildEncampment(THREE, yurt, { felt, timber, gold, dark });
      yurt.traverse(object => { if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; } });
      const earth = new THREE.Mesh(new THREE.CircleGeometry(55, 96), new THREE.MeshStandardMaterial({ flatShading: true, color: palette().ground, roughness: 1 }));
      earth.receiveShadow = true; earth.rotation.x = -Math.PI / 2; earth.position.y = 0.015; scene.add(earth);
      const stars = new Float32Array(900 * 3);
      // Deterministic sky avoids scene changes between mounts.
      let seed = 173;
      const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
      for (let i = 0; i < 900; i++) {
        const angle = random() * Math.PI * 2, elevation = random() * 1.35 + 0.12, r = 42;
        stars.set([Math.cos(angle) * Math.cos(elevation) * r, Math.sin(elevation) * r, Math.sin(angle) * Math.cos(elevation) * r], i * 3);
      }
      const starsGeometry = new THREE.BufferGeometry(); starsGeometry.setAttribute('position', new THREE.BufferAttribute(stars, 3));
      const starMaterial = new THREE.PointsMaterial({ color: palette().star, size: 0.17, sizeAttenuation: true, fog: false });
      scene.add(new THREE.Points(starsGeometry, starMaterial));
      scene.add(new THREE.HemisphereLight(0x92b5db, 0x26322b, 2.1));
      const moon = new THREE.DirectionalLight(0xe4e2d5, 3.2); moon.position.set(-5, 10, 7); moon.castShadow = true;
      moon.shadow.mapSize.set(1024, 1024); moon.shadow.camera.left = -9; moon.shadow.camera.right = 9;
      moon.shadow.camera.top = 9; moon.shadow.camera.bottom = -9; moon.shadow.camera.far = 35;
      moon.shadow.normalBias = .04; scene.add(moon);
      const warm = new THREE.PointLight(0xe5a35d, 15, 12, 2); warm.position.set(0, 2, 3.4); scene.add(warm);
      const updatePalette = () => applyScenePalette(palette(), { renderer, scene, felt, timber, gold, dark, earth, starMaterial, paintCloth, texture });
      on(window, 'skinchange', updatePalette);
      const projection = new THREE.Matrix4(), worldPoint = new THREE.Vector3();
      const hotspots = links.filter(link => camp.anchors[link.dataset.yurtObject]).map(link => ({ link, anchor: camp.anchors[link.dataset.yurtObject] }));
      const homeTarget = target.clone();
      const baseHome = home.clone();
      let selectedId = null;
      selectObject = id => {
        if (id && !camp.anchors[id]) return;
        selectedId = id; velocity = 0; pointer = null;
        yurt.updateMatrixWorld(true);
        const destinationTarget = id ? camp.anchors[id].getWorldPosition(new THREE.Vector3()) : homeTarget.clone();
        const external = ['batyr', 'helmet', 'armor', 'spear', 'shield', 'bow', 'horse', 'dog', 'hearth', 'cauldron', 'eagle', 'saba'].includes(id);
        // Approach camp objects from the outside so the yurt cannot hide them.
        const offset = external
          ? new THREE.Vector3(destinationTarget.x, 0, destinationTarget.z).normalize().multiplyScalar(.9).setY(.44).normalize()
          : camera.position.clone().sub(target).normalize();
        const destination = id ? destinationTarget.clone().addScaledVector(offset, id === 'hearth' || id === 'cauldron' || id === 'dog' || id === 'saba' ? 4.7 : 5.6) : home.clone();
        destination.y = Math.max(destination.y, destinationTarget.y + 1.2);
        flight = { start: performance.now(), from: camera.position.clone(), to: destination, targetFrom: target.clone(), targetTo: destinationTarget };
      };
      let yaw = 0, velocity = 0, pointer = null, lastTime = 0, focused = false;
      const resize = () => {
        const rect = stage.getBoundingClientRect(); width = Math.max(1, rect.width); height = Math.max(1, rect.height);
        renderer?.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
        // Preserve the entire camp on tall phone viewports as well as wide screens.
        home.copy(baseHome).sub(homeTarget).multiplyScalar(Math.max(1, 1.18 / camera.aspect)).add(homeTarget);
        if (!selectedId && !flight) { camera.position.copy(home); target.copy(homeTarget); camera.lookAt(target); }
      };
      const tick = now => {
        frame = 0;
        if (disposed || !running || !renderer) return;
        const dt = Math.min((now - (lastTime || now)) / 1000, 0.05); lastTime = now;
        if (flight) {
          const t = Math.min(1, (now - flight.start) / 900), ease = t * t * (3 - 2 * t);
          camera.position.lerpVectors(flight.from, flight.to, ease);
          target.lerpVectors(flight.targetFrom, flight.targetTo, ease);
          if (t === 1) flight = null;
        } else if (!pointer && !focused && !selectedId) {
          velocity *= Math.pow(0.93, dt * 60); yaw += velocity * dt * 60 + dt * 0.035;
        }
        yurt.rotation.y = yaw; camp.animate(now / 1000);
        yurt.updateMatrixWorld(true); camera.lookAt(target);
        camera.updateMatrixWorld(); projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        for (const { link, anchor } of hotspots) {
          anchor.getWorldPosition(worldPoint);
          const projected = projectPoint(worldPoint, projection.elements, width, height);
          const behind = worldPoint.z < 0;
          const marginX = width < 768 ? 24 : Math.min(70, width / 3), marginY = 24;
          const screenX = Math.max(marginX, Math.min(width - marginX, projected?.x ?? width / 2));
          const screenY = Math.max(marginY, Math.min(height - marginY, projected?.y ?? height / 2));
          link.style.left = `${screenX}px`; link.style.top = `${screenY}px`;
          // Off-screen anchors remain in the tab sequence; focus is always prominent.
          link.style.opacity = link === document.activeElement ? '1' : projected?.visible ? behind ? '0.48' : '1' : '0.25';
          link.style.zIndex = behind ? '1' : '2'; link.dataset.behind = String(behind);
        }
        renderer.render(scene, camera); frame = requestAnimationFrame(tick);
      };
      const sync = () => {
        const shouldRun = inView && !document.hidden && !motion.matches && !disposed;
        if (!shouldRun) { running = false; if (frame) cancelAnimationFrame(frame); frame = 0; return; }
        if (!running) { running = true; lastTime = 0; frame = requestAnimationFrame(tick); }
      };
      on(stage, 'pointerdown', event => {
        if (event.button !== 0 || flight || selectedId || event.target.closest?.('a,button,input')) return;
        pointer = { id: event.pointerId, x: event.clientX }; velocity = 0;
        stage.setPointerCapture?.(event.pointerId);
      });
      on(stage, 'pointermove', event => {
        if (!pointer || pointer.id !== event.pointerId) return;
        const change = (event.clientX - pointer.x) * 0.006; yaw += change; velocity = change;
        pointer.x = event.clientX;
      });
      const release = event => { if (pointer?.id === event.pointerId) pointer = null; };
      on(stage, 'pointerup', release); on(stage, 'pointercancel', release); on(stage, 'lostpointercapture', release);
      on(container, 'focusin', () => { focused = true; });
      on(container, 'focusout', event => { if (!container.contains(event.relatedTarget)) focused = false; });
      on(document, 'visibilitychange', sync);
      on(renderer.domElement, 'webglcontextlost', event => { event.preventDefault(); fallback(); });
      on(motion, 'change', () => { if (motion.matches) fallback(); });
      on(window, 'resize', resize);
      if (typeof ResizeObserver !== 'undefined') { resizeObserver = new ResizeObserver(resize); resizeObserver.observe(stage); }
      if (typeof IntersectionObserver !== 'undefined') { observer = new IntersectionObserver(entries => { inView = entries[0].isIntersecting; sync(); }); observer.observe(stage); }
      resize(); if (pendingSelection) selectObject(pendingSelection);
      container.classList.remove('yurt-fallback-mode'); container.classList.add('yurt-ready'); sync();
    } catch {
      if (!disposed) fallback();
    }
  })();
  return () => { disposed = true; disposeScene(); };
}

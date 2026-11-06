'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const esm = source => import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
(async () => {
  const source = fs.readFileSync(require.resolve('../js/yurt3d.js'), 'utf8');
  const THREE = await esm(fs.readFileSync(require.resolve('../js/vendor/three.module.min.js'), 'utf8'));
  const { buildEncampment, YURT_ANCHORS } = await esm(source);
  const world = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({color:'#775544',flatShading:true});
  const camp = buildEncampment(THREE, world, {felt:material,timber:material,gold:material,dark:material});
  const ids = ['shanyrak','kuldireuish','uyk','kerege','tundik','uzik','tuyrlyk','baskur','door','batyr','helmet','armor','spear','shield','bow','horse','dog','hearth','cauldron','eagle','saba'];
  assert.deepEqual(Object.keys(camp.anchors), ids);
  assert.equal(Object.keys(YURT_ANCHORS).length, 21);
  for (const id of ids) {
    assert.ok(YURT_ANCHORS[id].every(Number.isFinite), id + ' has finite coordinates');
    assert.deepEqual(camp.anchors[id].position.toArray(), YURT_ANCHORS[id]);
  }
  let meshes = 0;
  world.traverse(object => {
    if (!object.isMesh) return;
    meshes++;
    assert.equal(object.material.flatShading, true, 'Camp meshes use flat shading');
    assert.equal(object.receiveShadow, true, 'Camp meshes receive shadows');
    const positions = object.geometry.attributes.position.array;
    assert.ok(Array.from(positions).every(Number.isFinite), 'All primitive geometry is finite');
  });
  assert.ok(meshes > 130, 'Camp includes detailed rider, animals, fire and equipment');
  for (const name of ['horse-and-rider','batyr','tazy','hearth','cauldron','eagle-on-perch','saba-on-stand','leather-saba']) assert.ok(world.getObjectByName(name), name);
  const flame = world.getObjectByName('flames');
  camp.animate(0); const first = flame.scale.y;
  camp.animate(.7); assert.notEqual(flame.scale.y, first, 'Flame flickers');
  const breath = world.getObjectByName('horse-breathing');
  assert.notEqual(breath.scale.y, 1, 'Horse breathes slowly');
  const anchor = camp.anchors.horse;
  world.rotation.y = Math.PI / 2; world.updateMatrixWorld(true);
  const rotated = anchor.getWorldPosition(new THREE.Vector3());
  assert.ok(Math.abs(rotated.x - YURT_ANCHORS.horse[2]) < 1e-8, 'Hotspot rotates with its scene');

  // Exercise the real mount with Three geometry and math, replacing only GPU/DOM surfaces.
  const events = () => {
    const handlers = new Map();
    return {
      addEventListener(type, fn) { if (!handlers.has(type)) handlers.set(type, new Set()); handlers.get(type).add(fn); },
      removeEventListener(type, fn) { handlers.get(type)?.delete(fn); },
      emit(type, data = {}) { for (const fn of [...(handlers.get(type) || [])]) fn(data); },
      count() { return [...handlers.values()].reduce((sum, set) => sum + set.size, 0); }
    };
  };
  let renderer, queuedFrame, renders = 0, disposed = 0, intersection, observerDisconnects = 0;
  global.IntersectionObserver = class {
    constructor(callback) { this.callback = callback; intersection = this; }
    observe(target) { this.target = target; }
    disconnect() { observerDisconnects++; }
    setVisible(value) { this.callback([{isIntersecting:value}]); }
  };
  class Renderer {
    constructor() { renderer = this; this.shadowMap = {}; this.domElement = {...events(),setAttribute(){},remove(){}}; }
    setPixelRatio(value) { this.dpr = value; }
    setClearColor() {}
    setSize(w, h) { this.size = [w, h]; }
    render(scene, camera) { renders++; this.cameraPosition = camera.position.clone(); this.scene = scene; this.camera = camera.clone(); }
    dispose() { disposed++; }
    forceContextLoss() {}
  }
  global.__sceneThree = {...THREE,WebGLRenderer:Renderer};
  const motion = {...events(),matches:false};
  global.window = {...events(),devicePixelRatio:3,matchMedia:()=>motion};
  global.document = {...events(),hidden:false,documentElement:{},activeElement:null,createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},stroke(){}})})};
  global.getComputedStyle = () => ({getPropertyValue:()=>''});
  global.requestAnimationFrame = fn => { queuedFrame = fn; return 1; };
  global.cancelAnimationFrame = () => { queuedFrame = null; };
  let viewport = {width:1000,height:600};
  const stage = {...events(),appendChild(){},getBoundingClientRect:()=>viewport};
  const button = {dataset:{yurtObject:'horse'},style:{},removeAttribute(){}};
  const classNames = new Set();
  const container = {...events(),querySelector:()=>stage,querySelectorAll:()=>[button],contains:()=>false,classList:{add:n=>classNames.add(n),remove:n=>classNames.delete(n)}};
  const { mountYurt } = await esm(source.replace("await import('./vendor/three.module.min.js?v=43')", 'await Promise.resolve(globalThis.__sceneThree)'));
  const cleanup = mountYurt(container);
  assert.equal(container.count(), 1, 'Selection listener exists before async import completes');
  container.emit('yurtselect', {detail:{id:'horse'}});
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(classNames.has('yurt-ready'), true);
  assert.equal(renderer.dpr, 2, 'DPR is capped at two');
  assert.equal(renderer.shadowMap.enabled, true);
  queuedFrame(performance.now() + 901);
  const selectedPosition = renderer.cameraPosition.clone();
  const light = renderer.scene.children.find(o=>o.isDirectionalLight);
  assert.equal(light.castShadow, true); assert.equal(light.shadow.mapSize.x,1024); assert.equal(light.shadow.mapSize.y,1024);
  assert.ok(Number.isFinite(parseFloat(button.style.left)), 'Object button has projected screen coordinates');
  container.emit('yurtselect', {detail:{id:null}});
  queuedFrame(performance.now() + 902);
  const homePosition = renderer.cameraPosition.clone();
  assert.ok(homePosition.distanceTo(selectedPosition) > 3, 'Close flies back from object to home camera');
  for (const id of ['eagle', 'saba', 'horse', 'dog', 'hearth', 'cauldron', 'batyr', 'helmet', 'armor', 'spear', 'shield', 'bow']) {
    container.emit('yurtselect', {detail:{id}});
    queuedFrame(performance.now() + 903);
    const selectedAnchor = renderer.scene.getObjectByName('anchor-' + id).getWorldPosition(new THREE.Vector3());
    const cameraXZ = new THREE.Vector2(renderer.cameraPosition.x, renderer.cameraPosition.z);
    const anchorXZ = new THREE.Vector2(selectedAnchor.x, selectedAnchor.z);
    const segment = anchorXZ.clone().sub(cameraXZ);
    const nearestT = Math.max(0, Math.min(1, -cameraXZ.dot(segment) / segment.lengthSq()));
    const clearance = cameraXZ.clone().addScaledVector(segment, nearestT).length();
    assert.ok(clearance > 2.86, `${id} final camera ray stays outside the yurt footprint: ${clearance}`);
    assert.ok(cameraXZ.length() > anchorXZ.length(), `${id} is viewed from its outward side`);
    assert.ok(renderer.cameraPosition.y >= selectedAnchor.y + 1.2, `${id} camera keeps its upward elevation`);
  }
  container.emit('yurtselect', {detail:{id:null}});
  queuedFrame(performance.now() + 904);
  assert.ok(renderer.cameraPosition.distanceTo(homePosition) < 1e-8, 'Close returns home after outward camera approaches');
  document.hidden = true; document.emit('visibilitychange');
  assert.equal(queuedFrame, null, 'Hidden documents stop rendering');
  const count = renders;
  document.hidden = false; document.emit('visibilitychange');
  assert.equal(typeof queuedFrame, 'function'); queuedFrame(performance.now() + 1000);
  assert.ok(renders > count, 'Visible documents resume rendering');
  assert.equal(intersection.target, stage);
  intersection.setVisible(false);
  assert.equal(queuedFrame, null, 'Offscreen stage stops rendering');
  const offscreenRenders = renders;
  intersection.setVisible(true);
  assert.equal(typeof queuedFrame, 'function'); queuedFrame(performance.now() + 1100);
  assert.ok(renders > offscreenRenders, 'Stage coming onscreen resumes rendering');

  // Project every actual mesh vertex, including the yurt, at all sampled angles.
  // This checks the real camera matrices rather than just hotspot coordinates.
  const root = renderer.scene.children.find(object => object.isGroup);
  for (const size of [[1000,600],[1400,460],[360,460],[320,800]]) {
    viewport = {width:size[0],height:size[1]}; window.emit('resize');
    queuedFrame(performance.now() + 1200);
    const camera = renderer.camera;
    camera.updateMatrixWorld(true);
    for (let turn = 0; turn < 16; turn++) {
      root.rotation.y = turn / 16 * Math.PI * 2; root.updateMatrixWorld(true);
      root.traverse(object => {
        if (!object.isMesh) return;
        const positions = object.geometry.attributes.position;
        const point = new THREE.Vector3();
        for (let vertex = 0; vertex < positions.count; vertex++) {
          point.fromBufferAttribute(positions, vertex).applyMatrix4(object.matrixWorld).project(camera);
          assert.ok(Math.abs(point.x) < .98 && Math.abs(point.y) < .98 && point.z > -1 && point.z < 1,
            `Actual scene geometry fits ${size.join('x')} at rotation ${turn}: ${point.toArray()}`);
        }
      });
    }
  }
  cleanup(); cleanup();
  assert.equal(disposed, 1, 'GPU renderer is disposed exactly once');
  assert.equal(container.count(), 0); assert.equal(window.count(), 0); assert.equal(document.count(), 0); assert.equal(motion.count(), 0);
  assert.equal(queuedFrame, null);
  assert.ok(observerDisconnects >= 1, 'Unmount disconnects the visibility observer');
  let parentClicks = 0;
  container.addEventListener('click', () => { parentClicks++; });
  const parentButton = button;
  const motionCleanup = mountYurt(container);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(classNames.has('yurt-ready'), true);
  motion.matches = true; motion.emit('change');
  assert.equal(classNames.has('yurt-fallback-mode'), true, 'Motion preference change displays fallback');
  assert.equal(classNames.has('yurt-ready'), false);
  assert.equal(queuedFrame, null);
  assert.equal(container.querySelectorAll()[0], parentButton, 'Fallback preserves the original object controls');
  container.emit('click'); assert.equal(parentClicks, 1, 'Fallback preserves parent DOM controls and listeners');
  assert.equal(disposed, 2);
  motionCleanup(); assert.equal(disposed, 2, 'Fallback cleanup remains idempotent');
  motion.matches = false;
  const contextCleanup = mountYurt(container);
  await new Promise(resolve => setImmediate(resolve));
  let preventedLoss = false;
  renderer.domElement.emit('webglcontextlost', {preventDefault(){preventedLoss = true;}});
  assert.equal(preventedLoss, true);
  assert.equal(classNames.has('yurt-fallback-mode'), true, 'Lost WebGL context displays fallback');
  assert.equal(queuedFrame, null); assert.equal(disposed, 3);
  container.emit('click'); assert.equal(parentClicks, 2, 'Context loss preserves parent DOM controls');
  assert.equal(window.count(), 0); assert.equal(document.count(), 0); assert.equal(motion.count(), 0);
  contextCleanup(); assert.equal(disposed, 3);
  for (const key of ['IntersectionObserver','__sceneThree','window','document','getComputedStyle','requestAnimationFrame','cancelAnimationFrame']) delete global[key];
  console.log('Yurt camp geometry, animation, selection, shadows and lifecycle checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });

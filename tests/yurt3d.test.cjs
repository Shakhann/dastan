'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  // Load pure exports as ESM without changing the build-free project's module mode.
  const source = fs.readFileSync(require.resolve('../js/yurt3d.js'), 'utf8');
  const { projectPoint, shouldUseFallback, mountYurt, readScenePalette, applyScenePalette } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const palette = readScenePalette({getPropertyValue:key=>({'--scene-sky':' #ABCDEF ','--scene-ground':'bad','--scene-felt':'#ffffff','--scene-wood':'#123456','--scene-star':'#654321'}[key] || '')});
  assert.deepEqual(palette, {sky:'#ABCDEF',ground:'#E6F0E9',felt:'#ffffff',wood:'#123456',star:'#654321'});
  assert.match(source, /on\(window, 'skinchange', updatePalette\)/);
  const updates = {};
  const color = name => ({set(value) {updates[name] = value;}});
  const material = name => ({color:color(name)});
  const texture = {};
  const parts = {renderer:{setClearColor(value) {updates.sky = value;}},scene:{fog:{color:color('fog')}},felt:material('felt'),timber:material('wood'),gold:material('gold'),dark:material('door'),earth:{material:material('ground')},starMaterial:material('star'),texture,paintCloth(value) {updates.cloth = value;}};
  applyScenePalette(palette,parts);
  assert.equal(updates.sky,palette.sky); assert.equal(updates.fog,palette.sky);
  for (const key of ['felt','wood','ground','star']) assert.equal(updates[key],palette[key]);
  assert.equal(updates.gold,palette.star); assert.equal(updates.door,palette.wood);
  assert.equal(updates.cloth,palette); assert.equal(texture.needsUpdate,true);
  const secondPalette = {...palette,sky:'#000000',felt:'#EEEEEE'};
  applyScenePalette(secondPalette,parts);
  assert.equal(updates.sky,'#000000'); assert.equal(updates.felt,'#EEEEEE');
  assert.match(source, /texture\.needsUpdate = true/);
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  assert.deepEqual(projectPoint({ x: 0, y: 0, z: 0 }, identity, 360, 500), { x: 180, y: 250, visible: true });
  assert.deepEqual(projectPoint({ x: -1, y: 1, z: 1 }, identity, 360, 500), { x: 0, y: 0, visible: true });
  assert.deepEqual(projectPoint({ x: 1, y: -1, z: -1 }, identity, 360, 500), { x: 360, y: 500, visible: true });
  assert.equal(projectPoint({ x: 1.01, y: 0, z: 0 }, identity, 360, 500).visible, false);
  assert.equal(projectPoint({ x: 0, y: 0, z: 1.01 }, identity, 360, 500).visible, false);
  const perspective = [...identity]; perspective[15] = 2;
  assert.deepEqual(projectPoint({ x: 1, y: 1, z: 0 }, perspective, 400, 200), { x: 300, y: 50, visible: true });
  const translated = [...identity]; translated[12] = 0.5;
  assert.equal(projectPoint({ x: 0, y: 0, z: 0 }, translated, 400, 200).x, 300);
  for (const w of [0, -1]) { const matrix = [...identity]; matrix[15] = w; assert.equal(projectPoint({ x: 0, y: 0, z: 0 }, matrix, 400, 200), null); }
  for (const [point, matrix, width, height] of [[null, identity, 1, 1], [{ x: NaN, y: 0, z: 0 }, identity, 1, 1], [{ x: 0, y: 0, z: 0 }, [], 1, 1], [{ x: 0, y: 0, z: 0 }, identity, 0, 1], [{ x: 0, y: 0, z: 0 }, identity, 1, Infinity]]) assert.equal(projectPoint(point, matrix, width, height), null);
  assert.equal(shouldUseFallback(), false);
  assert.equal(shouldUseFallback({ reducedMotion: true }), true);
  assert.equal(shouldUseFallback({ webgl: false }), true);
  assert.equal(shouldUseFallback({ importFailed: true }), true);
  assert.equal(shouldUseFallback({ reducedMotion: false, webgl: true, importFailed: false }), false);
  assert.equal(typeof mountYurt(null), 'function');
  // Reduced-motion mount never imports Three or creates a WebGL context.
  const classes = new Set(); let cleared = 0;
  global.window = { matchMedia: () => ({ matches: true }) };
  const cleanup = mountYurt({
    querySelector: () => ({}),
    querySelectorAll: () => [{ removeAttribute: () => { cleared++; } }],
    classList: { add: name => classes.add(name), remove: name => classes.delete(name) }
  });
  assert.equal(classes.has('yurt-fallback-mode'), true);
  assert.equal(classes.has('yurt-ready'), false);
  cleanup(); cleanup();
  assert.ok(cleared >= 2, 'Fallback and repeated disposal safely reset projected link styles');
  delete global.window;
  assert.match(source, /event\.target\.closest\?\.\('a,button,input'\)/, 'Interactive targets do not start pointer capture');
  console.log('Yurt pure projection and fallback checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });

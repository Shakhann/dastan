'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const css = fs.readFileSync('css/skins.css', 'utf8');
function tokens(selector) {
  const start = css.indexOf(selector + ' {'); assert.ok(start >= 0, selector);
  const block = css.slice(start, css.indexOf('}', start));
  return Object.fromEntries([...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([,k,v])=>[k,v.trim()]));
}
const palettes = ['ak','altyn','shuaq'].map(skin=>tokens(`:root[data-skin="${skin}"]`));
palettes.push({...palettes[0],...tokens(':root[data-skin="ak"][data-theme="night"]')});
const luminance = hex => hex.slice(1).match(/../g).map(c=>parseInt(c,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4).reduce((sum,c,i)=>sum+c*[.2126,.7152,.0722][i],0);
const contrast = (a,b) => { const values = [luminance(a),luminance(b)].sort((a,b)=>b-a); return (values[0]+.05)/(values[1]+.05); };
for (const palette of palettes) {
  for (const background of ['--skin-bg','--skin-surface','--skin-soft','--skin-tint']) {
    assert.ok(contrast(palette['--skin-link'],palette[background]) >= 4.5, `AA link ${palette['--skin-link']} on ${palette[background]}`);
    assert.ok(contrast(palette['--skin-text'],palette[background]) >= 4.5, `AA text ${palette['--skin-text']} on ${palette[background]}`);
    assert.ok(contrast(palette['--skin-muted'],palette[background]) >= 4.5, `AA muted ${palette['--skin-muted']} on ${palette[background]}`);
  }
  assert.ok(contrast(palette['--skin-action-text'],palette['--skin-action']) >= 4.5, 'AA action label');
  for (const part of ['sky','ground','felt','wood','star']) assert.match(palette['--scene-'+part],/^#[a-f\d]{6}$/i);
}
for (const color of ['#FFC933','#1CB0F6','#FF4B4B','#FFFFFF']) assert.ok(contrast('#14213D',color)>=4.5, 'Shuaq color fields '+color);
assert.equal(palettes[0]['--heading'], "'Onest', sans-serif");
assert.equal(palettes[1]['--heading'], "'Piazzolla', serif");
assert.equal(palettes[1]['--skin-radius'], '0px');
assert.equal(palettes[1]['--skin-shadow'], 'none');
assert.equal(palettes[2]['--skin-radius'], '28px');
for (const component of ['.menu-panel','.command-palette','.word-lamp-dialog','.mobile-nav','.auth-layout','.profile-header','.banner-pattern','.site-footer','.skin-chooser']) assert.ok(css.includes(component), component);
assert.match(css,/\.brick-band[^}]+\.hero::after\)\s*\{\s*display:\s*none;\s*content:\s*none/);
assert.match(css,/@media \(min-width: 1100px\)[\s\S]*?flex-wrap:\s*nowrap/);
assert.match(css,/@media \(max-width: 479px\)/);
assert.match(css,/safe-area-inset-bottom/);
assert.match(css,/prefers-reduced-motion: reduce/);
// This essential observer contract must stay on the inner image, never the observed frame.
const motion = fs.readFileSync('css/stage13.css','utf8');
assert.match(motion,/\.image-frame\.reveal-pending img\s*\{\s*clip-path:/);
assert.doesNotMatch(css,/\.image-frame\.reveal-pending[^}]*clip-path/);
console.log('Three skin systems: palette AA pairs, scene tokens, geometry, shell coverage, responsive rules and preserved image reveal passed');

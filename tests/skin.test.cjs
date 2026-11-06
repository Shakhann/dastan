'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('js/skin.js', 'utf8');
function boot(search = '', stored = {}, blocked = false) {
  const listeners = {}, buttons = [], events = [], elements = [];
  const themeButton = {};
  const make = tag => {
    const el = { tag, dataset: {}, children: [], attributes: {}, className: '',
      setAttribute(k,v) { this.attributes[k] = v; },
      append(...nodes) { this.children.push(...nodes); },
      addEventListener(type, fn) { this[type] = fn; },
      querySelectorAll() { return buttons; }
    };
    if (tag === 'button') buttons.push(el);
    elements.push(el); return el;
  };
  const document = { documentElement: { dataset: {} }, readyState: 'loading',
    addEventListener(type, fn) { listeners[type] = fn; },
    createElement: make, body: make('body'), querySelectorAll: () => [themeButton] };
  const context = { document, location: {search, href:'http://localhost/' + search + '#lab'}, URLSearchParams, URL,
    localStorage: {getItem(k) { if (blocked) throw Error('denied'); return stored[k] ?? null; }, setItem(k,v) { if (blocked) throw Error('denied'); stored[k] = v; }},
    history: {state:null, replaceState(state,unused,url) { this.url = String(url); }},
    CustomEvent: class { constructor(type,options) { this.type = type; this.detail = options.detail; } },
    window: { dispatchEvent(e) { events.push(e); } }
  };
  vm.runInNewContext(source, context);
  const initial = {...document.documentElement.dataset}; listeners.DOMContentLoaded();
  return { context, initial, buttons, stored, themeButton, events, elements };
}
assert.equal(boot().initial.skin, 'ak');
assert.equal(boot().initial.theme, 'day');
assert.equal(boot('?skin=altyn', {'dastan-skin':'shuaq'}).initial.skin, 'altyn');
assert.equal(boot('?skin=oops', {'dastan-skin':'shuaq'}).initial.skin, 'shuaq');
assert.equal(boot('?skin=__proto__').initial.skin, 'ak');
assert.equal(boot('', {'dastan-skin':'bad'}).initial.skin, 'ak');
assert.equal(boot('?skin=shuaq', {}, true).initial.skin, 'shuaq');
assert.equal(boot('', {}, true).initial.skin, 'ak');
assert.equal(boot().buttons.length, 0);
assert.equal(boot('', {'dastan-choose':'1'}).buttons.length, 3);
const app = boot('?choose&skin=ak');
assert.equal(app.buttons.length, 3);
assert.equal(app.buttons[0].attributes['aria-pressed'], 'true');
assert.equal(app.themeButton.hidden, false);
app.buttons[1].click();
assert.equal(app.context.document.documentElement.dataset.skin, 'altyn');
assert.equal(app.stored['dastan-skin'], 'altyn');
assert.equal(app.themeButton.hidden, true);
assert.equal(app.buttons[0].attributes['aria-pressed'], 'false');
assert.equal(app.buttons[1].attributes['aria-pressed'], 'true');
assert.equal(app.events[0].type, 'skinchange');
assert.equal(app.events[0].detail.skin, 'altyn');
assert.match(app.context.history.url, /skin=altyn#lab$/);
app.buttons[0].click(); assert.equal(app.themeButton.hidden, false);
const noStorage = boot('?choose', {}, true); noStorage.buttons[2].click();
assert.equal(noStorage.context.document.documentElement.dataset.skin, 'shuaq');
const index = fs.readFileSync('index.html', 'utf8');
assert.ok(index.indexOf('js/skin.js?v=44') < index.indexOf('css/fonts.css'));
assert.ok(index.indexOf('css/stage13.css') < index.indexOf('css/skins.css'));
assert.match(fs.readFileSync('js/app.js','utf8'), /yurt3d.js\?v=44/);
console.log('Skin startup, storage failures, chooser visibility, persistence, event, URL and theme controls passed');

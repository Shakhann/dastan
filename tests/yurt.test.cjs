'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const YURT = require('../js/yurt.js');
const brief = fs.readFileSync('.impeccable/stage15-brief.md','utf8');
const expected = [...brief.slice(brief.indexOf('Шаңырақ:')).split('Сахнада мәтін')[0].matchAll(/^([А-ЯӘҒҚҢӨҰҮҺІа-яәғқңөұүһі]+): (.+)$/gm)].map(([,name,text])=>({name,text}));
assert.equal(expected.length,21);
assert.deepEqual(YURT.objects.map(({name,text})=>({name,text})),expected,'All descriptions match the brief verbatim');
assert.equal(new Set(YURT.objects.map(object=>object.id)).size,21);
assert.equal(YURT.find('missing'),undefined);
assert.equal(YURT.find('__proto__'),undefined);
global.esc = value=>String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
global.imageFigure = ()=>'<figure><img alt="Киіз үй"><figcaption>Кредит</figcaption></figure>';
global.CustomEvent = class extends Event {constructor(name,options){super(name);this.detail=options.detail;}};
const html = YURT.render();
assert.equal((html.match(/<button /g)||[]).length,43);
assert.equal((html.match(/aria-controls="yurtInfo" aria-expanded="false"/g)||[]).length,42);
assert.match(html,/yurt-fallback[\s\S]*Кредит/);
assert.doesNotMatch(html,/Мәтінді маман тексеруде|data-yurt-link|yurt-hotspots/);
class Node extends EventTarget {
  constructor(dataset={}) {super();this.dataset=dataset;this.attributes={};this.textContent='';this.isConnected=true;this.hidden=false;this.classes=new Set();this.classList={add:key=>this.classes.add(key),remove:key=>this.classes.delete(key)};}
  setAttribute(key,value){this.attributes[key]=value;}
  focus(){doc.activeElement=this;}
  closest(selector){
    if(selector==='[data-yurt-object]')return this.dataset.yurtObject?this:null;
    if(selector==='[data-yurt-close]')return this===closeButton?this:null;
    if(selector==='.yurt-stage')return this.stage?{}:null;
    return null;
  }
}
const doc = new Node(), root = new Node(), card = new Node(), title = new Node(), text = new Node(), lab = new Node(), closeButton = new Node(), status = new Node();
card.hidden=true;root.ownerDocument=doc;
const buttons = [false,true].flatMap(stage=>YURT.objects.map(object=>{const node=new Node({yurtObject:object.id});node.stage=stage;return node;}));
const nodes={'#yurtInfo':card,'#yurtInfoTitle':title,'#yurtInfoText':text,'[data-yurt-lab]':lab,'[data-yurt-close]':closeButton,'[data-yurt-status]':status};
root.querySelector=selector=>nodes[selector];root.querySelectorAll=()=>buttons;
root.contains=node=>buttons.includes(node)||node===card;
card.contains=node=>node===lab||node===closeButton;
const selections=[];root.addEventListener('yurtselect',event=>selections.push(event.detail.id));
function click(target){const event=new Event('click');Object.defineProperty(event,'target',{value:target});root.dispatchEvent(event);}
function key(key,shiftKey=false){const event=new Event('keydown',{cancelable:true});Object.assign(event,{key,shiftKey});doc.dispatchEvent(event);return event;}
let cleanup=YURT.mount(root);
for(const button of buttons) {
  const object=YURT.find(button.dataset.yurtObject);click(button);
  assert.equal(card.hidden,false);assert.equal(title.textContent,object.name);assert.equal(text.textContent,object.text);
  assert.equal(lab.attributes.href,'#lab/'+encodeURIComponent(object.name));
  assert.equal(doc.activeElement,closeButton);assert.equal(selections.at(-1),object.id);
  assert.equal(button.attributes['aria-expanded'],'true');assert.ok(status.textContent.includes(object.text));
  assert.equal(key('Tab').defaultPrevented,true);assert.equal(doc.activeElement,lab);
  assert.equal(key('Tab',true).defaultPrevented,true);assert.equal(doc.activeElement,closeButton);
  assert.equal(key('Escape').defaultPrevented,true);assert.equal(card.hidden,true);
  assert.equal(doc.activeElement,button);assert.equal(selections.at(-1),null);
  assert.ok(buttons.every(item=>item.attributes['aria-expanded']==='false'));
}
click(buttons[0]);click(buttons[1]);click(closeButton);assert.equal(doc.activeElement,buttons[1]);
click(buttons[0]);const focused=doc.activeElement;cleanup();cleanup();assert.equal(doc.activeElement,focused,'Disposal never focuses outgoing DOM');
const count=selections.length;click(buttons[0]);assert.equal(selections.length,count,'No stale handlers after route cleanup');
cleanup=YURT.mount(root,'horse');assert.equal(title.textContent,'Ат');assert.equal(card.hidden,false);click(closeButton);assert.equal(doc.activeElement,buttons.find(button=>button.dataset.yurtObject==='horse'));cleanup();
cleanup=YURT.mount(root,'invalid');assert.equal(card.hidden,true);cleanup();
assert.equal(typeof YURT.mount(null),'function');
console.log('PASS: 21 exact descriptions, 42 scene/list controls, open/close, Esc, Tab, deep links, focus return and route cleanup');

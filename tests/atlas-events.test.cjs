'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const heritage=JSON.parse(fs.readFileSync('data/heritage.json','utf8'));
const c=vm.createContext({console,APP:{data:heritage},esc:v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])),sourceLink:url=>`<a href="${url}">Дереккөз</a>`});
const run=s=>vm.runInContext(s,c);
for(const file of ['js/history-map-data.js','js/history.js','js/atlas.js'])run(fs.readFileSync(file,'utf8'));
const a=run('ATLAS');
const years=[1465,1643,1698,1723,1730,1731,1801,1822,1836,1841,1913,1916,1917,1930,1931,1936,1949,1954,1986,1991,1997];
assert.deepEqual(Array.from(a.events,e=>e.year),years);
assert.equal(new Set(a.events.map(e=>e.id)).size,21);
assert.deepEqual(Array.from(a.events,e=>e.type),['development','struggle','development','harm','struggle','turning','turning','turning','struggle','struggle','development','struggle','development','development','harm','turning','harm','development','struggle','turning','development']);
for(const event of a.events){
  assert.match(event.source_url,/^https:\/\//,'every event has a source');
  if(event.section){const local=heritage.timeline.find(t=>Number(t.year)===event.year);assert.equal(event.text,local.text_kk);assert.equal(event.source_url,local.source_url);assert.match(a.eventCard(event),new RegExp(`#timeline/${event.section}`));}
  else assert.doesNotMatch(a.eventCard(event),/#timeline\//);
  assert.match(a.eventCard(event),/Дереккөз/);
  assert.match(a.eventSVG(event),new RegExp(`atlas-impact-${event.type}`));
}
const extras=[...fs.readFileSync('.impeccable/stage20-brief.md','utf8').matchAll(/^(1731|1822|1836|1936|1949|1954|1997) [^,]+, «([^»]+)»: (.+?) (\d+(?:\.\d+)?),(\d+(?:\.\d+)?)\./gm)];
assert.equal(extras.length,7);
for(const [,year,title,text,lon,lat] of extras){const e=a.events.find(e=>e.year===+year);assert.equal(e.title,title);assert.equal(e.text,text);assert.equal(e.lon,+lon);assert.equal(e.lat,+lat);}
assert.equal(a.events.find(e=>e.year===1836).source_url,'https://ru.wikipedia.org/wiki/Восстание_Исатая_Тайманова');
for(const type of Object.keys(a.eventTypes))assert.deepEqual(Array.from(a.filterEvents([type]),e=>e.year),Array.from(a.events.filter(e=>e.type===type),e=>e.year));
assert.equal(a.filterEvents([]).length,0);
const points=run('[...HISTORY_MAP.lands.kz.matchAll(/(-?\\d+(?:\\.\\d+)?) (-?\\d+(?:\\.\\d+)?)/g)].map(m=>[+m[1],+m[2]])');
for(const event of a.events){const [x,y,w,h]=a.eventCamera(event);assert.ok(1000/w<=1.35+1e-9);assert.ok(620/h<=1.35+1e-9);for(const [px,py] of points)assert.ok(px>=x&&px<=x+w&&py>=y&&py<=y+h,'entire outline visible');}
function harness(reduced=false){
  let seq=0;const frames=new Map(),listeners={},motionEvents={};
  const node=()=>({innerHTML:'',textContent:'',value:'',disabled:false,attrs:{},setAttribute(k,v){this.attrs[k]=v;}});
  const nodes=Object.fromEntries(['map','layer','slider','cities','card','year','position','status','prev','next','ticks'].map(k=>[`[data-event-${k}]`,node()]));
  const filters=Object.keys(a.eventTypes).map(value=>({value,checked:true}));
  const root={querySelector:s=>nodes[s],querySelectorAll:s=>s==='[data-event-filter]'?filters:[],addEventListener(k,v){listeners[k]=v;},removeEventListener(k){delete listeners[k];}};
  const media={matches:reduced,addEventListener(k,v){motionEvents[k]=v;},removeEventListener(k){delete motionEvents[k];}};
  c.window={matchMedia:()=>media};c.document={querySelector:()=>root};
  c.requestAnimationFrame=fn=>{const n=++seq;frames.set(n,fn);return n;};c.cancelAnimationFrame=n=>frames.delete(n);
  c.setTimeout=()=>{throw Error('No hold or playback timers allowed');};
  nodes['[data-event-period]']={innerHTML:''};
  const dispose=a.mount();
  const target=(selector,data={})=>({dataset:data,closest:s=>s===selector?target(selector,data):null});
  const click=(selector,data)=>listeners.click({target:target(selector,data)});
  const input=index=>{nodes['[data-event-slider]'].value=String(index);listeners.input({target:nodes['[data-event-slider]']});};
  const key=key=>{let prevented=false;listeners.keydown({key,target:target(''),preventDefault(){prevented=true;}});return prevented;};
  const change=()=>listeners.change({target:target('[data-event-filter]')});
  return {nodes,filters,frames,listeners,motionEvents,media,dispose,click,input,key,change};
}
let h=harness();
assert.equal(h.nodes['[data-event-year]'].textContent,'1465');assert.equal(h.nodes['[data-event-slider]'].max,'20');
assert.equal(h.nodes['[data-event-prev]'].disabled,true);
h.input(1);assert.equal(h.nodes['[data-event-year]'].textContent,'1643','empty years skipped');assert.doesNotMatch(h.nodes['[data-event-layer]'].innerHTML,/atlas-impact-arrow/);assert.ok(h.frames.size);
assert.equal(h.key('ArrowRight'),true);assert.equal(h.nodes['[data-event-year]'].textContent,'1698');
h.click('[data-event-next]');assert.equal(h.nodes['[data-event-year]'].textContent,'1723');assert.match(h.nodes['[data-event-layer]'].innerHTML,/atlas-impact-harm/);
h.click('[data-event-prev]');assert.equal(h.nodes['[data-event-year]'].textContent,'1698');
h.click('[data-event-index]',{eventIndex:'20'});assert.equal(h.nodes['[data-event-year]'].textContent,'1997');assert.equal(h.nodes['[data-event-next]'].disabled,true);assert.match(h.nodes['[data-event-cities]'].innerHTML,/Астана/);
h.input(0);assert.doesNotMatch(h.nodes['[data-event-cities]'].innerHTML,/Ақмола|Целиноград|Астана/);
h.filters.forEach(n=>n.checked=n.value==='harm');h.change();assert.equal(h.nodes['[data-event-slider]'].max,'2');assert.equal(h.nodes['[data-event-year]'].textContent,'1723');h.input(1);assert.equal(h.nodes['[data-event-year]'].textContent,'1931');h.key('ArrowRight');assert.equal(h.nodes['[data-event-year]'].textContent,'1949');
h.filters.forEach(n=>n.checked=false);h.change();assert.equal(h.nodes['[data-event-slider]'].disabled,true);assert.match(h.nodes['[data-event-card]'].innerHTML,/Кемінде бір сүзгіні/);assert.equal(h.nodes['[data-event-layer]'].innerHTML,'');
h.filters.forEach(n=>n.checked=true);h.change();assert.equal(h.nodes['[data-event-year]'].textContent,'1465');
h.input(20);h.media.matches=true;h.motionEvents.change();assert.equal(h.frames.size,0);
h.dispose();assert.equal(h.frames.size,0);assert.equal(Object.keys(h.listeners).length,0);assert.equal(Object.keys(h.motionEvents).length,0);
h=harness(true);h.input(1);assert.equal(h.frames.size,0);h.dispose();
console.log('PASS: exactly 21 sourced events, verbatim approved text, effects, whole-outline camera, discrete slider, filters, keyboard, cities, reduced motion and cleanup');

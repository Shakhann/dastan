'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const heritage=JSON.parse(fs.readFileSync('data/heritage.json','utf8'));
function harness(id='khanate',reduced=false) {
  const timers=new Map(),frames=new Map(),docEvents={},events={},motionEvents={};let serial=0;
  const node=()=>({innerHTML:'',textContent:'',hidden:true,disabled:false,attrs:{},setAttribute(k,v){this.attrs[k]=v;},animate(){},scrollTop:99});
  const selectors=['[data-history-map]','[data-history-scene]','[data-history-caption]','[data-history-play]','[data-history-text]','[data-history-prev]','[data-history-next]','[data-history-remember]','[data-history-status]','.history-reading'];
  const nodes=Object.fromEntries(selectors.map(k=>[k,node()]));
  const buttons=Array.from({length:4},()=>node());
  const cards=Array.from({length:5},()=>({classList:{toggle(k,v){this.active=v;}}}));
  const root={isConnected:true,querySelector:s=>nodes[s],querySelectorAll:s=>s==='[data-history-index]'?buttons:s==='[data-history-section]'?cards:[],addEventListener(k,v){events[k]=v;},removeEventListener(k){delete events[k];}};
  const media={matches:reduced,addEventListener(k,v){motionEvents[k]=v;},removeEventListener(k){delete motionEvents[k];}};
  const c=vm.createContext({console,APP:{data:heritage,cachedJSON:async()=>JSON.parse(fs.readFileSync('data/tarikh/tarikh_kazakh_khanaty.json','utf8'))},heading:t=>`<h1>${t}</h1>`,routeLink:(r,t)=>`<a href="#${r}">${t}</a>`,timelineRail:()=>'<ol class="timeline-rail"></ol>',esc:v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;'),attribution:d=>`<p>${d.source_url}</p>`,fullDetails:(k,c='',opts={})=>`<details data-full="${k}">${c}${opts.fallback||''}</details>`,window:{matchMedia:()=>media},document:{querySelector:()=>root,addEventListener(k,v){docEvents[k]=v;},removeEventListener(k){delete docEvents[k];}},setTimeout(fn){const n=++serial;timers.set(n,fn);return n;},clearTimeout:n=>timers.delete(n),requestAnimationFrame(fn){const n=++serial;frames.set(n,fn);return n;},cancelAnimationFrame:n=>frames.delete(n)});
  const run=s=>vm.runInContext(s,c);
  run(fs.readFileSync('js/history-map-data.js','utf8'));run(fs.readFileSync('js/history.js','utf8'));
  const dispose=run(`HISTORY.mount(${JSON.stringify(id)})`);
  function click(selector,index) {
    events.click({target:{closest:()=>({dataset:{historyIndex:String(index)},matches:s=>s===selector})}});
  }
  function advance(){const [n,fn]=timers.entries().next().value;timers.delete(n);fn();}
  return {run,nodes,timers,frames,events,docEvents,media,motionEvents,buttons,cards,dispose,click,advance};
}
(async()=>{
  const cameraHarness=harness('khanate',true);
  const points=cameraHarness.run('[...HISTORY_MAP.lands.kz.matchAll(/(-?\\d+(?:\\.\\d+)?) (-?\\d+(?:\\.\\d+)?)/g)].map(m=>[+m[1],+m[2]])');
  for(const section of cameraHarness.run('HISTORY.sections')) for(const scene of section.scenes) {
    assert.ok(scene.camera[2]<=1.35,'scene zoom ceiling');
    const [x,y,w,h]=cameraHarness.run(`HISTORY.cameraBox(...${JSON.stringify(scene.camera)})`);
    assert.ok(1000/w<=1.35+1e-9);
    for(const [px,py] of points) assert.ok(px>=x && px<=x+w && py>=y && py<=y+h,'whole outline remains visible');
  }
  assert.equal(cameraHarness.nodes['[data-history-map]'].attrs.viewBox,'0 0 1000 620','initial wide view');
  cameraHarness.dispose();
  const h=harness();
  assert.equal(h.timers.size,1);assert.equal(h.nodes['[data-history-play]'].textContent,'Тоқтату');
  assert.ok(h.nodes['[data-history-text]'].innerHTML.includes(heritage.timeline.find(t=>t.year===1465).text_kk));
  assert.equal(h.buttons[0].attrs['aria-pressed'],'true');
  h.click('[data-history-next]');
  assert.equal(h.timers.size,0);assert.equal(h.buttons[1].attrs['aria-pressed'],'true');
  assert.equal(h.nodes['[data-history-next]'].disabled,true);assert.equal(h.nodes['[data-history-remember]'].hidden,false);
  assert.ok(h.nodes['[data-history-text]'].innerHTML.includes(heritage.timeline.find(t=>t.year===1698).text_kk));
  assert.equal(h.nodes['.history-reading'].scrollTop,0);
  h.docEvents.keydown({key:'ArrowLeft',target:{closest:()=>null},preventDefault(){}});
  assert.equal(h.buttons[0].attrs['aria-pressed'],'true');
  h.click('[data-history-index]',1);assert.equal(h.buttons[1].attrs['aria-pressed'],'true');
  h.click('[data-history-play]');assert.equal(h.timers.size,1);h.advance();assert.equal(h.timers.size,0);
  h.dispose();assert.equal(h.frames.size,0);assert.equal(Object.keys(h.events).length,0);assert.equal(Object.keys(h.docEvents).length,0);assert.equal(Object.keys(h.motionEvents).length,0);
  const m=harness('modern');for(let i=0;i<3;i++)m.advance();
  assert.equal(m.buttons[3].attrs['aria-pressed'],'true');assert.equal(m.timers.size,0);m.dispose();
  const overview=harness('');
  assert.equal(overview.timers.size,0,'overview is mounted by ATLAS, no legacy autoplay');
  assert.equal(Object.keys(overview.events).length,0);overview.dispose();
  const r=harness('khanate',true);assert.equal(r.timers.size,0);assert.equal(r.frames.size,0);assert.equal(r.nodes['[data-history-play]'].textContent,'Ойнату');r.click('[data-history-next]');assert.equal(r.frames.size,0);r.dispose();
  const motion=harness();motion.media.matches=true;motion.motionEvents.change();assert.equal(motion.timers.size,0);assert.equal(motion.frames.size,0);motion.dispose();
  const reading=harness();reading.events.focusin({target:{closest:()=>true}});assert.equal(reading.timers.size,0);reading.dispose();
  // Every year displays the complete original text, not a shortened animation caption.
  for(const section of h.run('HISTORY.sections')) {
    const p=harness(section.id);
    for(let i=0;i<section.scenes.length;i++) {
      p.click('[data-history-index]',i);
      const data=heritage.timeline.find(t=>t.year===section.scenes[i].year);
      assert.ok(p.nodes['[data-history-text]'].innerHTML.includes(data.text_kk),String(data.year));
      assert.match(p.nodes['[data-history-text]'].innerHTML,new RegExp('data-full="tl_'+data.year+'"'));
    }
    p.dispose();
  }
  await h.run('HISTORY.render("khanate")');
  // Re-mount after prepare uses the exact local tarikh article as the fullDetails fallback.
  const cleanup=h.run('HISTORY.mount("khanate")');
  const article=JSON.parse(fs.readFileSync('data/tarikh/tarikh_kazakh_khanaty.json','utf8'));
  assert.ok(h.nodes['[data-history-text]'].innerHTML.includes(article.text));cleanup();
  console.log('PASS: history 14 full texts, local article, controls, keyboard, autoplay, summary, reduced motion and cleanup');
})().catch(e=>{console.error(e);process.exitCode=1;});

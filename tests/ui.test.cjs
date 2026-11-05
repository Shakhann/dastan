'use strict';
// DOM-сыз тексеріс: маршруттар, нақты жергілікті дерек және қолжетімді мәзір әрекеті.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const context = vm.createContext({
  console, URL, Map, Set, Date, Promise,
  document: {addEventListener(){}, getElementById(){return null;}, querySelectorAll(){return [];}},
  window: {addEventListener(){}}, location: new URL('https://example.test/#home'),
  localStorage: {getItem(){return null;}},
  fetch: async path => {
    const exists = fs.existsSync(path);
    return {ok:exists,status:exists ? 200 : 404,json:async()=>JSON.parse(fs.readFileSync(path,'utf8'))};
  }, setTimeout(){}, clearTimeout(){}
});
const run = source => vm.runInContext(source, context);
for (const path of ['content','shanyrak','app','menu','profile']) run(fs.readFileSync(`js/${path}.js`,'utf8'));
run('const AUTH = {user:null,message:""}; function authAccountHTML(){return "";}');
for (const path of ['views_a','views_b','views_c']) run(fs.readFileSync(`js/${path}.js`,'utf8'));
(async () => {
  await run('APP.loadHeritage();');
  await run('APP.initProfile();');
  const routes = run('Object.keys(VIEWS)');
  let count = 0;
  async function render(route,id) {
    context.testRoute=route; context.testID=id;
    const html = await run('APP.route=testRoute; VIEWS[testRoute].render(testID)');
    assert.equal(typeof html,'string');
    assert.ok(html.length > 50,route);
    for (const [,path] of html.matchAll(/<img[^>]*src="(assets\/[^\"]+)"/g)) assert.ok(fs.existsSync(path),path);
    if (route !== 'credits') assert.doesNotMatch(html,/<a\b[^>]*href="https?:/);
    assert.doesNotMatch(html,/class="image-action"/);
    count++;
    return html;
  }
  for (const route of routes) await render(route);
  const people=run('APP.data.people.map(p=>p.id)');
  for (const id of people) await render('people',id);
  for (const id of run('APP.data.traditions.map(t=>t.id)')) await render('traditions',id);
  for (const id of run('APP.profileArticles.map(t=>t.id)')) await render('culture',id);
  const home=await render('home');
  assert.match(home,/hero-shanyrak/); assert.match(home,/hero-copy/);
  assert.ok((home.match(/<img /g)||[]).length >= 15,'Басты бет фотоға бай');
  const credits=await render('credits');
  assert.match(credits,/Alegreya Sans және Literata/);
  assert.match(credits,/SIL Open Font License/);
  const svg=run('shanyrakSVG({rays:24,extended:true})');
  assert.equal((svg.match(/<line /g)||[]).length,24);
  assert.equal((svg.match(/<path /g)||[]).length,6);
  assert.match(svg,/stroke="currentColor"/);
  assert.match(svg,/aria-hidden="true"/);
  const index=fs.readFileSync('index.html','utf8');
  assert.ok(index.indexOf('css/fonts.css') < index.indexOf('css/style.css'));
  assert.doesNotMatch(index,/fonts\.google/);
  const css=fs.readFileSync('css/style.css','utf8');
  assert.doesNotMatch(css,/gradient\(|box-shadow|Montserrat|\bInter\b|--blue|--gold/);
  for(const [token,value] of Object.entries({kiiz:'#24282E',zhun:'#D8C3A0',ak:'#F7F6F2',qyzyl:'#A11D33',kok:'#4C6675',line:'#24282E33'})) {
    assert.ok(css.includes(`--${token}: ${value}`),token);
  }
  assert.match(css,/@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css,/@media print/);
  const fontCSS=fs.readFileSync('css/fonts.css','utf8');
  for(const [,path] of fontCSS.matchAll(/url\("([^"]+)"\)/g)) assert.ok(fs.existsSync(require('node:path').resolve('css',path)),path);
  for(const [,path] of index.matchAll(/(?:src|href)="((?:js|css)\/[^\"]+)"/g)) {
    if (!path.includes('js/vendor/')) assert.match(path,/\?v=8$/);
  }
  // Мәзірдің қабат, inert, Esc, Tab және фокус қайтару келісімі.
  const events = {};
  function node(id) {
    return {id,hidden:true,inert:false,attrs:{},events:{},
      setAttribute(k,v){this.attrs[k]=v;},
      addEventListener(k,fn){this.events[k]=fn;},
      focus(){doc.activeElement=this;},
      contains(target){return target===this || this.items?.includes(target);}
    };
  }
  const panel=node('menuPanel'),toggle=node('menuToggle'),overlay=node('menuOverlay'),close=node('menuClose'),link=node('link');
  panel.items=[close,link]; panel.querySelectorAll=()=>panel.items;
  const backgrounds=[node('header'),node('main'),node('footer')]; backgrounds[2].inert=true;
  const nodes={menuPanel:panel,menuToggle:toggle,menuOverlay:overlay,menuClose:close};
  const doc={activeElement:null,getElementById:id=>nodes[id],querySelectorAll:()=>backgrounds,
    addEventListener(k,fn){events[k]=fn;},body:{classList:{add(){},remove(){}}}};
  context.document=doc; run('setupMenu()'); toggle.events.click();
  assert.equal(panel.hidden,false); assert.equal(overlay.hidden,false);
  assert.equal(toggle.attrs['aria-expanded'],'true');
  assert.ok(backgrounds.every(n=>n.inert)); assert.equal(doc.activeElement,close);
  let prevented=false; doc.activeElement=link;
  events.keydown({key:'Tab',shiftKey:false,preventDefault(){prevented=true;}});
  assert.equal(prevented,true); assert.equal(doc.activeElement,close);
  events.keydown({key:'Escape',preventDefault(){}});
  assert.equal(panel.hidden,true); assert.equal(overlay.hidden,true);
  assert.equal(toggle.attrs['aria-expanded'],'false'); assert.equal(doc.activeElement,toggle);
  assert.deepEqual(backgrounds.map(n=>n.inert),[false,false,true]);
  // Callback hash-ты initAuth күтіліп тұрғанда өзгертсе, ескі бет көрсетілмейді.
  const routeRoot={innerHTML:''},routeMain={focus(){}};
  const routeContext=vm.createContext({console,URL,Map,Set,Promise,
    location:new URL('https://example.test/#home'),
    window:{addEventListener(){},scrollTo(){},scrollY:0},
    document:{addEventListener(){},querySelectorAll(){return [];},
      body:{classList:{toggle(){}}},getElementById:id=>id==='view'?routeRoot:routeMain},
    setTimeout(){},clearTimeout(){}});
  vm.runInContext(fs.readFileSync('js/app.js','utf8'),routeContext);
  vm.runInContext(`
    function closeMenu(){return false;}
    APP.loadHeritage=async()=>{};APP.initProfile=async()=>{};
    APP.initAuth=async()=>{location.hash='#login';};
    APP.authRoute=route=>route==='home'?'login':route;
    APP.updateAuthUI=()=>{};
    VIEWS.home={render:()=>'<h1>Ескі бет</h1>'};
    VIEWS.login={render:()=>'<h1>Кіру</h1>'};
  `,routeContext);
  await vm.runInContext('renderRoute()',routeContext);
  assert.match(routeRoot.innerHTML,/<h1>Кіру<\/h1>/);
  assert.doesNotMatch(routeRoot.innerHTML,/Ескі бет/);
  console.log(`PASS: ${count} маршрут көрінісі, суреттер, ішкі сілтемелер, шаңырақ, қаріптер және мәзір фокусы`);
})().catch(error=>{console.error(error);process.exitCode=1;});

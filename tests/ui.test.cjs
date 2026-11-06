'use strict';
// DOM-сыз тексеріс: маршруттар, нақты жергілікті дерек және қолжетімді мәзір әрекеті.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const documentEvents = {};
const requests = [];
const context = vm.createContext({
  console, URL, Map, Set, Date, Promise,
  document: {addEventListener(type, listener){(documentEvents[type] ||= []).push(listener);}, getElementById(){return null;}, querySelectorAll(){return [];}},
  window: {addEventListener(){}}, location: new URL('https://example.test/#home'),
  localStorage: {getItem(){return null;}},
  fetch: async path => {
    requests.push(path);
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
  // Сөйлем, қысқарту, сан және сөз шекаралары.
  const shortCases = [
    ['',220,''], ['Қысқа мәтін.',220,'Қысқа мәтін.'],
    ['  Қазақ   тілі.  ',220,'Қазақ тілі.'],
    ['Бір сөйлем. Екінші сөйлем өте ұзақ болып жалғасады.',25,'Бір сөйлем.'],
    ['Сұрақ па? Келесі сөйлем ұзақ жалғасады.',15,'Сұрақ па?'],
    ['Бір сөз әрі қарай жалғасады',0,''],
    ['Бір сөз әрі қарай жалғасады',1,'…'],
    ['бір екі үш төрт',8,'бір екі…']
  ];
  for (const [text,limit,expected] of shortCases) {
    context.excerptText=text; context.excerptLimit=limit;
    assert.equal(run('shortText(excerptText,excerptLimit)'),expected);
  }
  for (const text of [
    '1930 ж. ел өмірінде үлкен өзгерістер басталды және жалғасты',
    'А. Бөкейхан ел өмірінде үлкен із қалдырған көрнекті тұлға',
    'А.Б. Бөкейхан ел өмірінде үлкен із қалдырған көрнекті тұлға',
    'Мысалы, т.б. деректер осы жерде кеңінен баяндалып жалғасады',
    '1930. Бұл саннан кейін мәтін әлі де жалғасып жатыр',
    'Домбыра (ноғ. Домбра) — қазақ халқының музыкалық аспабы'
  ]) {
    context.excerptText=text; context.excerptLimit=28;
    const result=run('shortText(excerptText,excerptLimit)');
    assert.ok(result.length<=28,result);
    assert.ok(result.endsWith('…'),result);
  }
  for (let limit=0;limit<240;limit++) {
    context.excerptText='Қазақ тілі — бай әрі көркем тіл, халықтың мәдени мұрасы. '.repeat(8);
    context.excerptLimit=limit;
    assert.ok(run('shortText(excerptText,excerptLimit).length')<=limit);
  }
  // Дайын толық мәтіндер мен жаңа мәдениет мақалаларының келісімі.
  const languageIDs = ['kazakh-language','kazakh-alphabet','proverbs','tongue-twisters','orkhon-script'];
  const timelineYears = run('APP.data.timeline.map(t=>t.year)');
  assert.equal(timelineYears.length,14);
  const fullKeys = [...languageIDs.map(id=>'lang_'+id), ...timelineYears.map(year=>'tl_'+year),
    'trad_konakasy','trad_kymyzmuryndyk', ...['dombyra','qobyz','kui','aitys','kiiz-ui'].map(id=>'art_'+id)];
  for (const key of fullKeys) {
    const data=JSON.parse(fs.readFileSync(`data/full/${key}.json`,'utf8'));
    assert.equal(data.key,key);
    assert.ok(data.title && data.source_url && data.source_name && data.license,key);
    assert.ok(data.sections.some(s=>s.paragraphs?.length),key);
    context.fullFixture=data;
    const html=run('fullSections(fullFixture)');
    assert.match(html,/class="fine attribution"/);
    assert.match(html,/href="#credits"/);
    assert.doesNotMatch(html,/<a[^>]+href="https?:/);
  }
  assert.equal(run('NO_FULL_TEXT.has("trad_konakasy")'),false);
  assert.equal(run('NO_FULL_TEXT.has("trad_kymyzmuryndyk")'),false);
  assert.equal(run('NO_FULL_TEXT.has("art_kijim_ishik")'),true);
  const onerIDs=['dombyra','qobyz','kui','aitys','kiiz-ui'];
  assert.equal(run('CATEGORIES.oner'),'Өнер және тұрмыс');
  assert.equal(run('Object.keys(CATEGORIES)[1]'),'oner');
  for (const id of onerIDs) {
    const data=JSON.parse(fs.readFileSync(`data/oner/${id}.json`,'utf8'));
    assert.equal(data.category,'oner');
    context.onerID=id;
    assert.equal(run('APP.materials.has("article:"+onerID)'),true);
    assert.equal(run('validateProfile({saved:[{type:"article",id:onerID}]}).saved.length'),1);
    assert.match(run('profileCard({type:"article",id:onerID},true)'),new RegExp('href="#culture/'+id+'"'));
  }
  for (const [id,name] of [['dombyra','dombra-zhambyl.jpg'],['kiiz-ui','yurt-assembling.jpg']]) {
    context.onerID=id;
    assert.equal(run('APP.visuals.articles[onerID]'),'assets/heritage/'+name);
    assert.equal(run('APP.credits.some(c=>c.path===APP.visuals.articles[onerID])'),true);
  }
  for (const id of ['qobyz','kui','aitys']) {
    context.onerID=id;
    assert.equal(run('APP.visuals.articles[onerID]'),undefined);
  }
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
  // Портретсіз карточкада бос сурет орны қалмайды; Тұмарша дәл берілген.
  assert.doesNotMatch(fs.readFileSync('js/app.js','utf8') + fs.readFileSync('js/views_a.js','utf8') + fs.readFileSync('css/style.css','utf8'), /monogram/);
  for (const person of run('APP.data.people.filter(p=>!p.image)')) {
    context.personFixture=person;
    const card=run('personPatch(personFixture,true)');
    assert.doesNotMatch(card, /<figure|<img|<svg|<aside/);
    assert.ok(card.includes(person.name));
  }
  assert.equal(run('ORNAMENTS.find(o=>o.id==="o7").meaning'), 'Тіл-көзден, пәле-жаладан сақтайтын қорғаныш (бойтұмар) белгісі. Сынық сызықтан тарақ тістері сияқты тармақтар шығып тұратын геометриялық өрнек; кілемдерде, басқұрларда және зергерлік әшекейлерде қолданылады.');
  for (const selected of ['saved','recent','settings',undefined,'invalid']) {
    const html=await render('profile',selected);
    const active=['saved','recent','settings'].includes(selected)?selected:'saved';
    assert.match(html,/role="tablist"/);
    assert.equal((html.match(/role="tab"/g)||[]).length,3);
    assert.equal((html.match(/role="tabpanel"/g)||[]).length,3);
    assert.match(html,new RegExp('id="profile-tab-'+active+'" role="tab" aria-selected="true"'));
    assert.match(html,new RegExp('id="profile-panel-'+active+'" role="tabpanel"[^>]+tabindex="0">'));
    assert.equal((html.match(/tabindex="0" hidden/g)||[]).length,2);
    assert.match(html,/Тіркелсеңіз, сақталғандарыңыз басқа құрылғыда да ашылады/);
  }
  // Жабық беттер толық файлдарды сұрамайды; әр мәтін өз орнында ашылады.
  requests.length=0;
  const peopleList=await render('people');
  assert.equal((peopleList.match(/class="card-excerpt"/g)||[]).length,run('APP.data.people.length'));
  for (const id of run('APP.data.people.map(p=>p.id)')) {
    const html=await render('people',id);
    assert.equal((html.match(/<details\b/g)||[]).length,1);
    assert.match(html,new RegExp('data-full="people_'+id+'"'));
    assert.ok(html.indexOf('class="years"')<html.indexOf('<details'));
    assert.match(html,/data-save-type="person"/);
    context.personID=id;
    if (run('APP.data.people.find(p=>p.id===personID).image')) assert.match(html,/<figcaption>/);
    else { assert.doesNotMatch(html, /monogram|<aside/); assert.match(html,/person-detail--text/); }
  }
  for (const id of run('APP.data.traditions.map(t=>t.id)')) {
    const html=await render('traditions',id);
    assert.equal((html.match(/<details\b/g)||[]).length,1);
    assert.match(html,new RegExp('data-full="trad_'+id+'"'));
    assert.ok(html.indexOf('class="video-panel"')<html.indexOf('<details'));
    assert.match(html,/data-save-type="tradition"/);
  }
  const timeline=await render('timeline');
  assert.equal((timeline.match(/<details\b/g)||[]).length,14);
  for (const year of timelineYears) assert.match(timeline,new RegExp('data-full="tl_'+year+'"'));
  const culture=await render('culture');
  for (const id of onerIDs) assert.match(culture,new RegExp('data-article="'+id+'"'));
  assert.match(culture,/<summary>[\s\S]*class="article-excerpt"/);
  assert.equal(requests.filter(path=>path.startsWith('data/full/')).length,0,'Толық мәтін тек ашылғанда жүктеледі');
  const language=await render('language');
  assert.match(language,/Тіл туралы/);
  assert.equal((language.match(/<details\b/g)||[]).length,5);
  for (const id of languageIDs) assert.match(language,new RegExp('data-full="lang_'+id+'"'));
  for (const [route,id] of [['proverbs','proverbs'],['twisters','tongue-twisters']]) {
    const html=await render(route);
    assert.match(html,new RegExp('data-full="lang_'+id+'"'));
    assert.ok(html.indexOf('class="language-material"')<html.indexOf('class="word-grid"'));
  }
  for (const route of routes) await render(route);
  assert.ok(run('ornamentGamePool().length')>=4);
  const people=run('APP.data.people.map(p=>p.id)');
  for (const id of people) await render('people',id);
  for (const id of run('APP.data.traditions.map(t=>t.id)')) await render('traditions',id);
  for (const id of run('APP.profileArticles.map(t=>t.id)')) await render('culture',id);
  const home=await render('home');
  assert.doesNotMatch(home,/class="card-excerpt"/);
  assert.match(home,/hero-shanyrak/); assert.match(home,/hero-copy/);
  assert.ok((home.match(/<img /g)||[]).length >= 15,'Басты бет фотоға бай');
  const credits=await render('credits');
  assert.match(credits,/Alegreya Sans және Literata/);
  assert.match(credits,/SIL Open Font License/);
  for (const key of fullKeys.filter(k=>/^(?:lang|tl)_/.test(k))) {
    const data=JSON.parse(fs.readFileSync(`data/full/${key}.json`,'utf8'));
    context.sourceURL=data.source_url;
    assert.ok(credits.includes(run('esc(sourceURL)')),key);
  }
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
  assert.match(css,/\.person-detail--text \{ grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css,/\.profile-danger \{[^}]*border-top: 2px solid var\(--qyzyl\)/);
  assert.match(css,/\.full-details > summary \{ min-height: 44px/);
  assert.match(css,/\.full-details > summary:focus-visible/);
  assert.match(css,/\.full-details\[open\] \.details-more \{ display: none/);
  assert.match(css,/\.full-details:not\(\[open\]\) > :not\(summary\)/);
  const fontCSS=fs.readFileSync('css/fonts.css','utf8');
  for(const [,path] of fontCSS.matchAll(/url\("([^"]+)"\)/g)) assert.ok(fs.existsSync(require('node:path').resolve('css',path)),path);
  for(const [,path] of index.matchAll(/(?:src|href)="((?:js|css)\/[^\"]+)"/g)) {
    if (!path.includes('js/vendor/')) assert.match(path,/\?v=13$/);
  }
  // Ортақ lazy жүктеу: жабық күй, бір сұрау, қате/қайта көру және кеш жауап.
  function fullNode(key, fallback='', content=false) {
    const body={innerHTML:fallback,previousElementSibling:content ? {} : null};
    const node={dataset:{full:key},open:false,isConnected:true,removed:false,
      querySelector(selector){assert.equal(selector,'[data-full-body]');return body;},
      remove(){this.removed=true;}};
    return {node,body};
  }
  const lazy=fullNode('tl_1465'); context.fullNode=lazy.node;
  run('APP.cache.delete("data/full/tl_1465.json")'); requests.length=0;
  await run('loadArticle(fullNode)'); assert.equal(requests.length,0);
  lazy.node.open=true;
  const pending=run('loadArticle(fullNode)');
  assert.match(lazy.body.innerHTML,/role="status"/);
  assert.equal(lazy.node.dataset.loading,'true');
  await run('loadArticle(fullNode)'); await pending;
  assert.equal(requests.filter(p=>p==='data/full/tl_1465.json').length,1);
  assert.equal(lazy.node.dataset.loaded,'true');
  assert.match(lazy.body.innerHTML,/class="fine attribution"/);
  await run('loadArticle(fullNode)'); assert.equal(requests.length,1);
  const originalFetch=context.fetch;
  const retry=fullNode('tl_1643'); retry.node.open=true; context.fullNode=retry.node;
  run('APP.cache.delete("data/full/tl_1643.json")');
  context.fetch=async()=>({ok:false,status:503});
  await run('loadArticle(fullNode)');
  assert.match(retry.body.innerHTML,/role="alert"/);
  assert.match(retry.body.innerHTML,/data-full-retry>Қайта көру/);
  assert.notEqual(retry.node.dataset.loaded,'true');
  assert.equal(retry.node.dataset.loading,'false');
  context.fetch=originalFetch;
  await run('loadArticle(fullNode)');
  assert.equal(retry.node.dataset.loaded,'true');
  assert.doesNotMatch(retry.body.innerHTML,/data-full-retry/);
  const stale=fullNode('tl_1465'); stale.node.open=true; stale.node.isConnected=false;
  context.fullNode=stale.node; await run('loadArticle(fullNode)');
  assert.doesNotMatch(stale.body.innerHTML,/class="fine attribution"/);
  const missing=fullNode('nonexistent_stage9'); missing.node.open=true; context.fullNode=missing.node;
  await run('loadArticle(fullNode)'); assert.equal(missing.node.removed,true);
  assert.equal(run('fullDetails("nonexistent_stage9")'),'');
  assert.equal(run('fullDetails("art_kijim_ishik")'),'');
  requests.length=0; await run('optionalFull("art_kijim_ishik")');
  assert.equal(requests.length,0);
  assert.equal(documentEvents.toggle.length,1,'Ашуды ортақ тыңдаушы басқарады');
  // Нақты mount тыңдаушылары: көрсеткі, Home/End, click, ARIA, фокус және URL.
  const previousDocument=context.document;
  const tabKeys=['saved','recent','settings'];
  const tabNodes=tabKeys.map(key=>({dataset:{profileTab:key},attrs:{},events:{},
    setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,fn){this.events[k]=fn;},focus(){context.document.activeElement=this;}}));
  const profileNodes=Object.fromEntries(['profileZhuz','profileTribe','profileForm','deleteProfile',...tabKeys.map(k=>'profile-panel-'+k)].map(id=>[id,{hidden:true,events:{},addEventListener(k,fn){this.events[k]=fn;}}]));
  context.document={getElementById:id=>profileNodes[id],querySelectorAll:()=>tabNodes};
  context.history={pushState(_a,_b,hash){context.location.hash=hash;}};
  run('VIEWS.profile.mount()');
  function key(index,key){let prevented=false;tabNodes[index].events.keydown({key,preventDefault(){prevented=true;}});assert.equal(prevented,true);}
  key(0,'ArrowLeft'); assert.equal(context.location.hash,'#profile/settings');assert.equal(context.document.activeElement,tabNodes[2]);
  assert.equal(tabNodes[2].attrs['aria-selected'],'true');assert.equal(tabNodes[0].tabIndex,-1);
  assert.equal(profileNodes['profile-panel-settings'].hidden,false);assert.equal(profileNodes['profile-panel-saved'].hidden,true);
  key(2,'ArrowRight');assert.equal(context.location.hash,'#profile/saved');
  key(0,'End');assert.equal(context.location.hash,'#profile/settings');
  key(2,'Home');assert.equal(context.location.hash,'#profile/saved');
  tabNodes[1].events.click();assert.equal(context.location.hash,'#profile/recent');
  assert.equal(profileNodes['profile-panel-recent'].hidden,false);
  context.document=previousDocument;
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
  console.log(`PASS: ${count} маршрут көрінісі, shortText, lazy details/retry, oner/профиль, деректер, суреттер және мәзір фокусы`);
})().catch(error=>{console.error(error);process.exitCode=1;});

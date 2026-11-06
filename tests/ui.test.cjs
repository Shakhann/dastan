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
for (const path of ['content','app','lab','menu','profile']) run(fs.readFileSync(`js/${path}.js`,'utf8'));
run('const AUTH = {user:null,message:""}; function authAccountHTML(){return "";}');
for (const path of ['yurt','views_a','views_b','views_c','search']) run(fs.readFileSync(`js/${path}.js`,'utf8'));
(async () => {
  await run('APP.loadHeritage();');
  await run('APP.initProfile();');
  // Іздеу барлық дерек түрін қамтиды және жалғаулы сөзді түбірмен табады.
  const searchRows=await run('SEARCH.index()');
  assert.deepEqual([...new Set(searchRows.map(r=>r.type))],['Тұлғалар','Дәстүрлер','Тарих','Көнерген сөздер','Сөздік','Мақал-мәтел','Жаңылтпаш','Мақалалар','Киіз үй әлемі']);
  context.searchRows=searchRows;
  assert.ok(run('SEARCH.groups(searchRows,"Абайдың").some(([,rows])=>rows.some(r=>r.title.includes("Абай")))'));
  assert.equal(run('SEARCH.matches({title:"бала",text:""},"балаларға")'),true);
  assert.equal(run('SEARCH.matches({title:"Абай",text:""},"АБАЙДЫҢ")'),true);
  assert.equal(run('SEARCH.matches({title:"Абай",text:""},"жоқсөз")'),false);
  assert.equal(run('SEARCH.groups(searchRows,"").length'),0);
  assert.match(run('SEARCH.results([])'),/Ештеңе табылмады/);
  const searchHTML=await run('VIEWS.search.render("<b>жоқсөз</b>")');
  assert.match(searchHTML,/aria-live="polite"/);assert.doesNotMatch(searchHTML,/<b>жоқсөз<\/b>/);
  const aboutHTML=await run('VIEWS.about.render()');
  const topics=JSON.parse(fs.readFileSync('content_topics.json','utf8'));
  const manifest=JSON.parse(fs.readFileSync('audio/manifest.json','utf8'));
  const expectedCounts={'Тұлға':run('APP.data.people.length'),'Дәстүр':run('APP.data.traditions.length'),'Сөз':run('APP.data.words.length+DICT.length'),'Мақал':run('PROVERBS.length'),'Мақала':topics.length,'Аудио':new Set(Object.values(manifest).filter(p=>typeof p==='string' && /^[\w.-]+\.mp3$/.test(p))).size};
  for(const [label,n] of Object.entries(expectedCounts)) assert.ok(aboutHTML.includes('<dt>'+label+'</dt><dd>'+n+'</dd>'),label+' деректен есептеледі');
  assert.match(aboutHTML,/href="#credits"/);
  // Зертхана DOM-ға бекітілгенде нәтижелер нақты енгізуге ілеседі.
  const labDocument=context.document;
  const labNodes=Object.fromEntries(['labWord','labText','labForms','labCyr','labLatin','labArab'].map(id=>[id,{value:'',textContent:'',innerHTML:'',events:{},addEventListener(type,fn){this.events[type]=fn;}}]));
  labNodes.labWord.value='бала';labNodes.labText.value='тіл';
  context.document={getElementById:id=>labNodes[id]};
  run('VIEWS.lab.mount()');
  assert.match(labNodes.labForms.innerHTML,/word-root/);
  assert.match(labNodes.labForms.innerHTML,/баланың|бала<\/span><strong class="word-suffix">ның/);
  assert.equal(labNodes.labLatin.textContent,'tıl');assert.equal(labNodes.labArab.textContent,'ٴتىل');
  labNodes.labWord.value='кітап';labNodes.labWord.events.input();
  assert.match(labNodes.labForms.innerHTML,/кітаб/);
  labNodes.labWord.value='123';labNodes.labWord.events.input();
  assert.match(labNodes.labForms.innerHTML,/кирилл/);assert.doesNotMatch(labNodes.labForms.innerHTML,/word-root/);
  labNodes.labText.value='<b>қазақ</b>';labNodes.labText.events.input();
  assert.equal(labNodes.labCyr.textContent,'<b>қазақ</b>');assert.equal(labNodes.labLatin.textContent,'<b>qazaq</b>');
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
    if (route !== 'credits') {
      for(const [,url] of html.matchAll(/<a\b[^>]*href="(https?:[^"]+)"/g)) assert.match(url,/^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/);
    }
    assert.doesNotMatch(html,/<(?:img|iframe)\b[^>]*src="https?:(?!\/\/i\.ytimg\.com\/)/);
    assert.doesNotMatch(html,/class="image-action"/);
    assert.doesNotMatch(html,/shanyrak-svg|hero-shanyrak|section-shanyrak|menu-orbit/);
    for (const [,classes] of html.matchAll(/<figure class="([^"]*)"/g)) {
      assert.equal((classes.match(/\bplate-(?:lg|md|sm)\b/g)||[]).length,1,'Әр суретте бір пештақ өлшемі бар');
    }
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
  for (const person of run('APP.data.people.filter(p=>p.image)')) {
    context.personFixture=person;
    const card=run('profileCard({type:"person",id:personFixture.id},true)');
    assert.match(card,/profile-card-image portrait plate-sm/);
    assert.match(card,/<figcaption>/);
    assert.ok(card.includes('data-remove-id="'+person.id+'"'));
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
  assert.equal(run('homeDayIndex(new Date(2026,10,6,0,1))'),run('homeDayIndex(new Date(2026,10,6,23,59))'));
  assert.equal(run('homeDayIndex(new Date(2026,10,7))-homeDayIndex(new Date(2026,10,6))'),1);
  const home=await render('home');
  assert.doesNotMatch(home,/class="card-excerpt"/);
  assert.match(home,/hero-visual/); assert.match(home,/hero-copy/);
  assert.match(home,/hero-image plate-lg/);
  assert.match(home,/<h1 class="sr-only">ДАСТАН/);
  assert.match(home,/hero-signature[^>]+aria-hidden="true"/);
  for(const label of ['ДАСТАН','Dastan','داستان']) assert.ok(home.includes(label));
  const mosaicLinks=home.match(/<div class="section-mosaic">([\s\S]*?)<\/section>/)[1];
  assert.equal((mosaicLinks.match(/<a /g)||[]).length,9);
  assert.doesNotMatch(mosaicLinks,/href="#home"/);
  for (const route of ['people','shezhire','traditions','timeline','culture','language','encyclopedia','lab','yurt']) assert.ok(mosaicLinks.includes('href="#'+route+'"'));
  for (const kind of ['mosaic','people','traditions','gallery']) assert.match(home,new RegExp('class="home-'+kind+'"'));
  for(const section of ['daily-proverb','daily-word','lab-intro']) assert.ok(home.includes('class="'+section+'"'));
  assert.match(home,/href="#lab\//);
  assert.ok((home.match(/<img /g)||[]).length >= 15,'Басты бет фотоға бай');
  // 13-кезең: шынайы сілтемелер, деректен алынған сандар және екі тарих лентасы.
  assert.doesNotMatch(home,/data-yurt-link|yurt-hotspots|data-yurt(?:>|\s)/);
  assert.match(home,/href="#yurt"[^>]*>Киіз үйге кіру/);
  assert.match(home,/assets\/heritage\/hero-horseman.jpg/);
  const exhibit = await render('yurt');
  assert.equal((exhibit.match(/data-yurt-object=/g)||[]).length,42);
  assert.match(exhibit,/id="yurtInfo"[^>]+hidden/);
  assert.match(exhibit,/data-yurt-status role="status" aria-live="polite"/);
  assert.ok(searchRows.some(row=>row.route==='yurt/horse' && row.title==='Ат'));
  assert.equal(run('NAV.some(([id])=>id === "yurt")'),true);
  const routeSource = fs.readFileSync('js/app.js','utf8');
  assert.match(routeSource,/if \(route === "yurt"\) \{[\s\S]*?import\("\.\/yurt3d\.js\?v=39"\)/);
  assert.equal((routeSource.match(/import\("\.\/yurt3d/g)||[]).length,1);
  assert.match(routeSource,/APP\.cleanupYurtUI\?\.\(\)/);
  assert.match(fs.readFileSync('index.html','utf8'),/<nav class="mobile-nav"[\s\S]*?href="#yurt"/);

  assert.match(home,/class="heritage-panorama" data-parallax/);
  assert.match(home,/class="portrait-rail" data-drag-rail tabindex="0"/);
  assert.equal((home.match(/data-drag-rail/g)||[]).length,2);
  assert.match(timeline,/timeline-rail" data-drag-rail tabindex="0"/);
  const homeCounts=[...home.matchAll(/<span data-count="(\d+)">(\d+)<\/span>/g)];
  assert.deepEqual(homeCounts.map(m=>Number(m[1])),['Тұлға','Дәстүр','Сөз','Мақала','Аудио'].map(k=>expectedCounts[k]));
  for(const m of homeCounts) assert.equal(m[1],m[2],'accessible count exists before animation');
  for(const proverb of run('PROVERBS.slice(0,8)')) assert.ok(home.includes(run('esc('+JSON.stringify(proverb.kk)+')')));
  const credits=await render('credits');
  assert.match(credits,/Piazzolla және Golos Text/);
  assert.match(credits,/SIL Open Font License/);
  for (const key of fullKeys.filter(k=>/^(?:lang|tl)_/.test(k))) {
    const data=JSON.parse(fs.readFileSync(`data/full/${key}.json`,'utf8'));
    context.sourceURL=data.source_url;
    assert.ok(credits.includes(run('esc(sourceURL)')),key);
  }
  // Бөлім ашылымы фотосыз да толық портал болып қалады.
  context.sectionVisuals=run('APP.visuals.sections');
  run('APP.visuals.sections = {}; APP.route = "missing-stage11";');
  assert.match(run('heading("Бос күй", "Түсіндірме")'),/^<header class="section-banner">/);
  assert.match(run('heading("Бос күй", "Түсіндірме")'),/<h1>Бос күй<\/h1><p>Түсіндірме<\/p>/);
  run('APP.visuals.sections = sectionVisuals;');
  assert.equal(fs.existsSync('js/shanyrak.js'),false);
  const index=fs.readFileSync('index.html','utf8');
  assert.ok(index.indexOf('css/fonts.css') < index.indexOf('css/style.css'));
  assert.doesNotMatch(index,/fonts\.google|shanyrak|menu-orbit/);
  for(const id of ['desktopNav','menuToggle','menuPanel','siteNav','menuClose']) assert.match(index,new RegExp('id="'+id+'"'));
  assert.match(index,/data-auth-menu/);
  assert.match(index,/id="menuToggle"[^>]+aria-controls="menuPanel"/);
  assert.match(index,/id="menuPanel"[^>]+role="dialog"[^>]+aria-modal="true"/);
  const appSource=fs.readFileSync('js/app.js','utf8');
  assert.match(appSource,/#siteNav a, #desktopNav a, #footerNav a/);
  assert.match(appSource,/getElementById\("desktopNav"\)\.innerHTML = NAV\.filter/);
  for(const file of ['js/app.js','js/profile.js','js/auth.js','js/views_a.js','js/views_b.js','js/views_c.js']) assert.doesNotMatch(fs.readFileSync(file,'utf8'),/shanyrakSVG|hero-shanyrak|section-shanyrak/);
  const css=fs.readFileSync('css/style.css','utf8');
  assert.doesNotMatch(css,/gradient\(|box-shadow|Montserrat|\bInter\b|--blue|--gold|--kiiz|--zhun|--qyzyl|--kok|shanyrak|menu-orbit|Alegreya|Literata/);
  for(const [token,value] of Object.entries({lazurit:'#12355B',tun:'#0C2238',firuza:'#1E8E8E',kirpish:'#B5764A',sylaq:'#EEF3F1',ak:'#FBFCFB',qara:'#101E2A'})) {
    assert.match(css,new RegExp(`--${token}:\\s*${value}`,"i"),token);
  }
  assert.match(css,/--heading:\s*'Piazzolla'/);
  assert.match(css,/--body:\s*'Piazzolla'/);
  assert.match(css,/--ui:\s*'Golos Text'/);
  assert.match(css,/\.prose\s*\{[^}]*max-width:\s*68ch/);
  assert.match(css,/\.prose\s*\{[^}]*1\.125rem\/1\.65/);
  assert.match(css,/::selection\s*\{/);
  assert.match(css,/caret-color:\s*var\(--lazurit\)/);
  assert.match(css,/scrollbar-color:\s*var\(--lazurit\) var\(--sylaq\)/);
  assert.doesNotMatch(css,/border-radius:\s*(?:[3-9]\d*px|[1-9]\d*%)/);
  for (const size of ['lg','md','sm']) assert.match(css,new RegExp('\\.plate-'+size+' \\.image-frame\\s*\\{'));
  assert.match(css,/\.image-frame\s*\{[^}]*border:\s*12px solid var\(--lazurit\)/);
  assert.match(css,/\.portrait[^{}]*\.image-frame[^{}]*\{[^}]*aspect-ratio:\s*4\/5/);
  assert.match(css,/\.portrait[^{}]*img[^{}]*\{[^}]*object-position:\s*center 20%/);
  assert.match(css,/\.hero-image \.image-frame img\s*\{[^}]*object-fit:\s*cover/);
  assert.doesNotMatch(css.match(/\.header-actions\s*\{([^}]*)\}/)[1],/position:\s*fixed/);
  assert.match(css,/@media \(min-width:\s*1100px\)\s*\{[\s\S]*?#desktopNav[^{}]*\{[^}]*display:\s*flex/);
  assert.match(css,/@media \(min-width:\s*1100px\)\s*\{[\s\S]*?#menuToggle\s*\{[^}]*display:\s*none/);
  assert.match(css,/@media \(max-width:\s*599px\)/);
  const brickURL=css.match(/--brick-pattern:\s*url\("data:image\/svg\+xml,([^"\n]+)"\)/);
  assert.ok(brickURL,'Кірпіш белдеудің ортақ SVG торы');
  const brickSVG=decodeURIComponent(brickURL[1]);
  const dimensions=brickSVG.match(/width='(\d+)' height='(\d+)'/);
  assert.ok(dimensions && Number(dimensions[2])>32,'Белдеу екі қатардан биік');
  assert.doesNotMatch(brickSVG,/<text|<image|<circle|<line/);
  for (const color of ['#12355B','#1E8E8E','#B5764A']) assert.ok(brickSVG.includes(color));
  assert.match(css,/\.section-banner::after[^{}]*\{[^}]*var\(--brick-pattern\)/);
  assert.match(css,/@keyframes brick-build\s*\{\s*from\s*\{\s*clip-path:/);
  const animations=[...css.matchAll(/animation:\s*([^;}]+)/g)].map(match=>match[1]).filter(value=>!value.startsWith('none'));
  assert.ok(animations.length>=2,'Қолтаңба мен бет ауысуының анимациясы');
  const motion=animations.find(a=>a.startsWith('brick-build'))?.match(/^brick-build\s+(\d+)ms/);
  assert.ok(motion && Number(motion[1])<=900);
  const luminance=hex=>{const rgb=hex.match(/[\da-f]{2}/ig).map(channel=>parseInt(channel,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
  for(const [ink,paper] of [['#FBFCFB','#12355B'],['#FBFCFB','#0C2238'],['#101E2A','#EEF3F1'],['#101E2A','#FBFCFB']]) {
    const values=[luminance(ink),luminance(paper)].sort((a,b)=>b-a);
    assert.ok((values[0]+.05)/(values[1]+.05)>=4.5,ink+' / '+paper+' AA мәтін контрасты');
  }
  assert.match(css,/@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css,/@media print/);
  assert.match(css,/\.person-detail--text\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(css,/\.profile-danger \{[^}]*border-top:/);
  assert.match(css,/\.full-details > summary \{ min-height: 44px/);
  assert.match(css,/\.full-details > summary:focus-visible/);
  assert.match(css,/\.full-details\[open\] \.details-more \{ display: none/);
  assert.match(css,/\.full-details:not\(\[open\]\) > :not\(summary\)/);
  const stage13CSS=fs.readFileSync('css/stage13.css','utf8');
  assert.match(index,/css\/stage13.css\?v=39/); assert.match(index,/js\/experience.js\?v=39/);
  for(const attr of ['data-command-open','data-theme-toggle','data-scroll-progress','data-mobile-menu']) assert.ok(index.includes(attr));
  assert.match(index,/<nav class="mobile-nav"/);
  assert.match(stage13CSS,/safe-area-inset-bottom/);assert.match(stage13CSS,/height: 45svh/);
  assert.match(stage13CSS,/@media \(prefers-reduced-motion: reduce\)/);
  assert.match(stage13CSS,/animation-play-state: paused/);
  const fontCSS=fs.readFileSync('css/fonts.css','utf8');
  for(const [,path] of fontCSS.matchAll(/url\("([^"]+)"\)/g)) assert.ok(fs.existsSync(require('node:path').resolve('css',path)),path);
  for(const [,path] of index.matchAll(/(?:src|href)="((?:js|css)\/[^\"]+)"/g)) {
    if (!path.includes('js/vendor/')) assert.match(path,/\?v=39$/);
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
  const mobileMenu=node('mobileMenu'); mobileMenu.matches=selector=>selector==='[data-mobile-menu]';
  doc.activeElement=mobileMenu; toggle.events.click();
  assert.equal(doc.activeElement,close);
  events.keydown({key:'Escape',preventDefault(){}});
  assert.equal(doc.activeElement,mobileMenu,'mobile menu restores visible opener');
  // Callback hash-ты initAuth күтіліп тұрғанда өзгертсе, ескі бет көрсетілмейді.
  const routeRoot={innerHTML:''},routeMain={focus(){}};
  const routeLinks=['login','culture','language'].map(route=>({href:'#'+route,attrs:{'aria-current':'page'},
    getAttribute(name){return name==='href'?this.href:this.attrs[name];},
    setAttribute(name,value){this.attrs[name]=value;},removeAttribute(name){delete this.attrs[name];}}));
  const routeContext=vm.createContext({console,URL,Map,Set,Promise,
    location:new URL('https://example.test/#home'),
    window:{addEventListener(){},scrollTo(){},scrollY:0},
    document:{addEventListener(){},querySelectorAll(selector){assert.equal(selector,'#siteNav a, #desktopNav a, #footerNav a, .mobile-nav a');return routeLinks;},
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
  // Маршрут lifecycle: жаңа бетке дейін ескі көрініс тазартылады,
  // View Transitions пен reduced-motion fallback бірдей мазмұнды береді.
  vm.runInContext(`
    const lifecycle=[];
    const EXPERIENCE={cleanup(){lifecycle.push('cleanup');},mount(){lifecycle.push('mount');}};
    APP.cleanupYurt=()=>lifecycle.push('yurt-dispose');
    document.startViewTransition=callback=>{lifecycle.push('transition');callback();return {finished:Promise.resolve(),updateCallbackDone:Promise.resolve()};};
    APP.initAuth=async()=>{};APP.authRoute=route=>route;
  `,routeContext);
  await vm.runInContext('renderRoute()',routeContext);
  assert.deepEqual([...vm.runInContext('lifecycle',routeContext)],['yurt-dispose','cleanup','transition','mount']);
  vm.runInContext(`lifecycle.length=0;window.matchMedia=()=>({matches:true});`,routeContext);
  await vm.runInContext('renderRoute()',routeContext);
  assert.deepEqual([...vm.runInContext('lifecycle',routeContext)],['cleanup','mount']);
  vm.runInContext(`window.matchMedia=()=>({matches:false});document.startViewTransition=undefined;`,routeContext);
  // Ішкі маршрут desktop/mobile/footer сілтемелерінде ата-анасын белгілейді.
  vm.runInContext(`APP.initAuth=async()=>{}; APP.authRoute=route=>route; VIEWS.ornaments={render:()=>'<h1>Ою</h1>'}; location.hash='#ornaments';`,routeContext);
  await vm.runInContext('renderRoute()',routeContext);
  assert.equal(routeLinks[1].attrs['aria-current'],'page');
  assert.equal(routeLinks[0].attrs['aria-current'],undefined);
  assert.equal(routeLinks[2].attrs['aria-current'],undefined);
  vm.runInContext(`location.hash='';`,routeContext);
  await vm.runInContext('renderRoute()',routeContext);
  assert.match(routeRoot.innerHTML,/<h1>Ескі бет<\/h1>/);
  assert.equal(vm.runInContext('APP.route',routeContext),'home');
  vm.runInContext(`location.hash='#missing-stage11';`,routeContext);
  await vm.runInContext('renderRoute()',routeContext);
  assert.equal(vm.runInContext('APP.route',routeContext),'notfound');
  assert.match(routeRoot.innerHTML,/section-banner/);
  assert.match(routeRoot.innerHTML,/Бет табылмады/);
  assert.match(routeRoot.innerHTML,/href="#home"/);
  assert.ok(routeLinks.every(link=>link.attrs['aria-current']===undefined));
  console.log(`PASS: ${count} маршрут көрінісі, shortText, lazy details/retry, oner/профиль, деректер, суреттер және мәзір фокусы`);
})().catch(error=>{console.error(error);process.exitCode=1;});

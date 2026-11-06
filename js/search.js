"use strict";
// Барлық іздеу жергілікті дерекпен орындалады; сыртқы API қажет емес.
const SEARCH = {
  async index() {
    const topics = await APP.cachedJSON("content_topics.json");
    const d = APP.data, rows = [];
    const add = (type,title,text,route) => rows.push({type,title:String(title),text:String(text || ""),route});
    d.people.forEach(p=>add("Тұлғалар",p.name,p.summary_kk,"people/"+encodeURIComponent(p.id)));
    d.traditions.forEach(t=>add("Дәстүрлер",t.name,t.summary_kk,"traditions/"+encodeURIComponent(t.id)));
    d.timeline.forEach(t=>add("Тарих",t.title_kk,t.text_kk,"timeline"));
    d.words.forEach(w=>add("Көнерген сөздер",w.kk,`${w.meaning_kk} ${w.example_kk}`,"words"));
    DICT.forEach(w=>add("Сөздік",w.kk,`${w.ru} ${w.en} ${w.ex}`,"dict"));
    PROVERBS.forEach(p=>add("Мақал-мәтел",p.kk,p.cat,"proverbs"));
    TWISTERS.forEach(t=>add("Жаңылтпаш",t.kk,"","twisters"));
    topics.forEach(t=>add("Мақалалар",t.title,"","culture/"+encodeURIComponent(t.id)));
    add("Киіз үй әлемі", "Киіз үй әлемі", "", "yurt");
    if (typeof YURT !== "undefined") YURT.objects.forEach(object => add("Киіз үй әлемі", object.name, object.text, "yurt/" + object.id));
    return rows;
  },
  matches(row,query) {
    const normalize = s=>String(s).toLocaleLowerCase("kk").normalize("NFC");
    const tokens = normalize(row.title+" "+row.text).match(/[\p{L}\p{N}]+/gu) || [];
    const terms = normalize(query).match(/[\p{L}\p{N}]+/gu) || [];
    if (!terms.length) return false;
    return terms.every(term=> {
      if(tokens.some(t=>t.includes(term))) return true;
      // Екі жақтағы кездейсоқ қысқа қиықтарды салыстырмаймыз: сұраудың
      // ықтимал түбірін индекстегі тұтас сөзге салыстырамыз.
      return LAB.stems(term).filter(s=>s.length>=3).some(stem=>tokens.includes(stem));
    });
  },
  rank(row,query) {
    const norm = v=>String(v).toLocaleLowerCase("kk").normalize("NFC");
    const title = norm(row.title), q = norm(query).trim();
    if (title === q) return 0;
    if (title.startsWith(q)) return 1;
    return title.includes(q) ? 2 : 3;
  },
  sorted(rows,query) { return rows.map((row,i)=>[SEARCH.rank(row,query),i,row]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]).map(x=>x[2]); },
  groups(rows,query) {
    const grouped = new Map();
    for(const row of SEARCH.sorted(rows.filter(r=>SEARCH.matches(r,query)),query)) {
      if(!grouped.has(row.type)) grouped.set(row.type,[]);
      grouped.get(row.type).push(row);
    }
    return [...grouped];
  },
  form(id,value="") { return `<form data-site-search><label for="${id}">Қазақша іздеу</label><div class="search-row"><input id="${id}" name="q" type="search" maxlength="120" value="${esc(value)}" placeholder="Мысалы: Абайдың, балаларға"><button>Іздеу</button></div>${LAB.keyboard(id)}</form>`; },
  results(groups) { return groups.map(([name,rows])=>`<section class="search-group"><h2>${esc(name)} <span class="fine">(${rows.length})</span></h2><ul>${rows.map(r=>`<li>${routeLink(r.route,r.title)}${r.text ? `<p>${esc(shortText(r.text,150))}</p>` : ""}</li>`).join("")}</ul></section>`).join("") || '<p class="empty-state">Ештеңе табылмады. Басқа сөзбен іздеп көріңіз.</p>'; }
};
function setupSiteSearch() {
  LAB.ensureKeyboards?.(document);
  document.addEventListener("submit",e=>{
    const form=e.target.closest("[data-site-search]");
    if(!form) return;
    e.preventDefault();
    const q=form.querySelector('[name="q"]').value.trim();
    location.hash="#search/"+encodeURIComponent(q);
  });
}
VIEWS.search = {
  title:"Қазақша іздеу",
  async render(query="") {
    const rows=await SEARCH.index(), groups=SEARCH.groups(rows,query);
    return heading("Қазақша іздеу","Тұлғалар, дәстүрлер және тіл мұрасы — бір жергілікті іздеуде.","assets/heritage/syrmak-pattern.jpg")+SEARCH.form("siteSearch",query)+`<div id="siteSearchResults" aria-live="polite"><p role="status">${query ? groups.reduce((sum,[,r])=>sum+r.length,0)+" нәтиже" : "Іздейтін сөзіңізді жазыңыз."}</p>${query ? SEARCH.results(groups) : ""}</div>`;
  }
};
VIEWS.about = {
  title:"Жоба туралы",
  async render() {
    const [topics,manifest]=await Promise.all([APP.cachedJSON("content_topics.json"),APP.cachedJSON("audio/manifest.json")]);
    const counts={"Тұлға":APP.data.people.length,"Дәстүр":APP.data.traditions.length,"Сөз":APP.data.words.length+DICT.length,"Мақал":PROVERBS.length,"Мақала":topics.length,"Аудио":new Set(Object.values(manifest).filter(p=>typeof p==="string" && /^[\w.-]+\.mp3$/.test(p))).size};
    return heading("Жоба туралы","ДАСТАН — қазақ тілін қолдануға және мәдени мұраны тануға арналған цифрлық орта.","assets/heritage/yasawi.jpg")+`<div class="prose"><h2>Мәселе</h2><p>Тұлғалар мен дәстүрлер ұмытылып барады. Қазақша цифрлық құралдар аз: сөзді танып қана қоймай, оны жазып, түрлендіріп қолдануға көмектесетін орта қажет.</p><h2>Шешім</h2><p>ДАСТАН мәдени мұраны тіл құралдарымен байланыстырады. Тұлғаларды, дәстүрлерді және тарихты оқып, сөздің мағынасын таныңыз; зертханада зат есімді түрлендіріп, мәтінді үш әліпбиде көріңіз.</p><h2>Кімге арналған?</h2><p>Қазақ тілін үйренушілерге, оқушылар мен мұғалімдерге, мәдени мұраны танып-білгісі келетін әр адамға.</p><h2>Не бар?</h2><p>Жеті септік, көптік және тәуелдік жалғаулары; кирилл, латын жобасы және тәжірибелік төте жазу; қазақ пернелері, жалғаулы сөздерді танитын іздеу, күн сөзі және қазақша аудио.</p></div><dl class="about-counts">${Object.entries(counts).map(([name,count])=>`<div><dt>${name}</dt><dd>${count}</dd></div>`).join("")}</dl><div class="prose"><p class="fine">Сандар сайтқа қосылған жергілікті деректерден есептеледі. Сөз саны екі жинақтағы жазбаларды қамтиды; аудио саны — манифесттегі бөлек файлдар.</p><h2>Жасанды интеллект қайда қолданылды</h2><p>Сайт кодын жазуға, тексеруге және дизайнын жасауға ChatGPT Codex пен Claude көмектесті. Материал жинау мен мәтін тексеруде Gemini қолданылды. Сөздердің дауысы Microsoft edge-tts құралының қазақша kk-KZ-AigulNeural дауысымен алдын ала жасалған. Идеяны, бөлімдерді және нәтижені автор таңдап, басқарды.</p><p>Зертхананың өзі жасанды интеллектке сүйенбейді: сөз түрлендіргіш, үш әліпби және іздеу қазақ тілінің ережелерімен браузерде жұмыс істейді, сондықтан нәтижесін түсіндіруге болады. Мәтіндер мен суреттердің дереккөзі «Суреттер мен дереккөздер» бетінде көрсетілген.</p><h2>Технология</h2><p>Оқу мен тіл құралдары тіркеусіз, браузерде жұмыс істейді. Тіл ережелері мен әліпби түрлендіруі сыртқы API-ға сұрау жібермейді. Мазмұн, қаріп және аудио жергілікті файлдардан ашылады; жүктелген жинақпен интернетсіз жергілікті серверде қолдануға болады. Аккаунт пен бұлттық сақтау — қосымша онлайн мүмкіндік.</p><p>Ашық лицензиялы суреттер мен қазақша дауыс жазбалары қолданылады. ${routeLink("credits","Суреттердің авторлығы мен дереккөздері")}. Ерекше сөздердің тұлғалары және тәжірибелік төте жазу маман тексеруін қажет етуі мүмкін.</p>${routeLink("lab","Зертхананы ашу","button")}</div>`;
  }
};

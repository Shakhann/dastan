"use strict";
function dictionaryWord(w) {
  return `<article class="word patch"><p class="group-label">${esc(w.cat)}</p><h2>${esc(w.kk)}</h2><blockquote>${esc(w.ex)}</blockquote>${audioButton(w.kk, "d_" + w.id)}</article>`;
}
VIEWS.dict = {
  render() { return searchableWords("Сөздік", "Күнделікті сөздердің қолданылуына үңіліп, айтылуын тыңдаңыз.", DICT, dictionaryWord); },
  mount() { mountWordSearch(DICT, dictionaryWord, w => `${w.kk} ${w.cat} ${w.ex}`); }
};
VIEWS.proverbs = {
  render() {
    return heading("Мақал-мәтел", "Қысқа сөзге сыйған халық тәжірибесі.") + `<label for="proverbGroup">Тақырыбы</label><select id="proverbGroup"><option value="">Барлығы</option>${[...new Set(PROVERBS.map(p => p.cat))].map(cat => `<option>${esc(cat)}</option>`).join("")}</select><div class="word-grid" id="proverbResults">${PROVERBS.map(proverb).join("")}</div>`;
  },
  mount() {
    document.getElementById("proverbGroup").addEventListener("change", e => {
      document.getElementById("proverbResults").innerHTML = PROVERBS.filter(p => !e.target.value || p.cat === e.target.value).map(proverb).join("");
    });
  }
};
function proverb(p) { return `<article class="word patch"><p>${esc(p.cat)}</p><h2>${esc(p.kk)}</h2>${audioButton(p.kk, "p_" + p.id)}</article>`; }
VIEWS.twisters = {
  title: "Жаңылтпаш",
  render() { return heading("Жаңылтпаш", "Ауыз әдебиетінің тілге ширақтық беретін шағын үлгілері.") + `<div class="word-grid">${TWISTERS.map(t => `<article class="word patch"><p class="verse">${esc(t.kk)}</p>${audioButton(t.kk, "tw_" + t.id)}</article>`).join("")}</div>`; }
};
VIEWS.gram = {
  title: "Тіл ережелері",
  render() {
    return heading("Тіл ережелері") + GRAMMAR.map(g => `<details class="patch rule"><summary>${esc(g.title)}</summary><p>${esc(g.rule)}</p><ul>${g.examples.map(e => `<li>${esc(e)}</li>`).join("")}</ul>${audioButton(g.title + ": " + g.rule, "gram_" + g.id)}</details>`).join("");
  }
};
VIEWS.voice = {
  title: "Тыңдау",
  render() { return heading("Тыңдау", "Қазақша сөздердің айтылуын тыңдаңыз.") + `<div class="word-grid">${DICT.map(dictionaryWord).join("")}</div>`; }
};
const CATEGORIES = {jyr: "Жыр-дастан", oner: "Өнер және тұрмыс", taam: "Ұлттық тағамдар", kijim: "Ұлттық киімдер", tarikh: "Тарих", tulgalar: "Тұлғалар", oyu: "Ою-өрнек"};
function ornamentNotice() {
  return `<aside class="notice"><h2>Суреттер туралы</h2><p>Суреті бар оюлардың атауы дереккөзде көрсетілген. Қалған оюлардың суреттері маман тексергеннен кейін қосылады.</p></aside>`;
}
function cleanExcerpt(text) {
  return String(text || "").replace(/\[Толық мәтін Wikipedia-да:[^\]]*\]/g, "").replace(/Толық мәтін Wikipedia-да[^\n]*/g, "").trim();
}
function articleText(d) { return cleanExcerpt(d.text).split(/\n+/).map(p=>`<p>${esc(p)}</p>`).join(""); }
function article(d) {
  const image = APP.visuals.articles?.[d.id] || (d.category === "jyr" ? APP.visuals.articles?.jyr_default : "");
  const summary = `${image ? imageFigure(image,"article-cover") : ""}<span class="article-title">${esc(d.title)}</span><span class="article-excerpt">${esc(shortText(cleanExcerpt(d.text)))}</span>`;
  const tools = `<div class="article-tools">${saveButton("article", d.id)}${audioButton(cleanExcerpt(d.text).slice(0,500),d.id)}</div>`;
  return fullDetails("art_" + d.id, tools, {summary, articleID:d.id, fallback:articleText(d) + attribution(d)});
}

async function culturalArticles(category) {
  const topics = await APP.cachedJSON("content_topics.json");
  return Promise.all(topics.filter(t => category ? t.category === category : t.category !== "oyu").map(t => APP.cachedJSON(`data/${t.category}/${t.id}.json`)));
}
const CULTURE_LINKS = [["culture", "Мақалалар"], ["jyr", "Жыр-дастан"], ["ornaments", "Ою-өрнек"]];
function subnav(links, label) { return `<nav class="subnav" aria-label="${esc(label)}">${links.map(([r,n])=>routeLink(r,n)).join("")}</nav>`; }
VIEWS.culture = {
  async render(id) {
    const articles = await culturalArticles();
    if (id && !articles.some(a => a.id === id)) {
      const extra = APP.profileArticles.find(a => a.id === id);
      if (extra) articles.push(await APP.cachedJSON(`data/${extra.category}/${extra.id}.json`));
    }
    return heading("Мәдениет", "Әдебиет, тұрмыс және тарих туралы сақталған мақалалар.") + `<nav class="subnav" aria-label="Мәдениет бөлімдері">${CULTURE_LINKS.map(([r, n]) => routeLink(r, n)).join("")}</nav>` + Object.entries(CATEGORIES).filter(([key]) => key !== "oyu" || articles.some(a => a.category === "oyu")).map(([key, name]) => `<section class="article-group"><h2>${name}</h2>${articles.filter(d => d.category === key).map(article).join("")}</section>`).join("");
  },
  async mount(id) {
    if (!id) return;
    const details = [...document.querySelectorAll("details[data-article]")].find(d => d.dataset.article === id);
    if (!details) return;
    details.open = true;
    APP.visit("article", id);
    await loadArticle(details);
    if (details.isConnected) details.scrollIntoView({block:"start"});
  }
};
VIEWS.makan = {title: "Мәдениет", render: () => VIEWS.culture.render()};
VIEWS.read = {
  title: "Оқу мәтіндері",
  async render() { return heading("Оқу мәтіндері") + (await culturalArticles("jyr")).map(article).join(""); }
};
VIEWS.jyr = {
  title: "Жыр-дастан",
  async render() { return heading("Жыр-дастан", "Әдеби мұраға арналған мәтіндер мен түйіндемелер.") + (await culturalArticles("jyr")).map(article).join(""); }
};
VIEWS.ornaments = {
  title: "Ою-өрнек",
  async render() {
    const articles = await culturalArticles("oyu");
    return heading("Ою-өрнек") + ornamentNotice() + `<div class="word-grid">${[...ORNAMENTS].sort((a,b) => Boolean(b.image) - Boolean(a.image)).map(o => `<article class="word patch">${o.image ? imageFigure(o.image, "ornament-image") : ""}<h2>${esc(o.name)}</h2><p>${esc(o.meaning)}</p></article>`).join("")}</div><section class="ornament-items"><h2>Оюлы бұйымдар</h2><p>Мұражайдағы және тұрмыстағы нақты бұйымдар.</p><div class="gallery">${APP.visuals.ornaments.map(path => imageFigure(path)).join("")}</div></section>` + (ornamentGamePool().length >= 4 ? '<section class="ornament-game"><h2>Ою тап</h2><p>Атауы берілген оюды суреттерден табыңыз.</p><div id="ornaGame"></div></section>' : "") + articles.map(article).join("");
  },
  mount() { startOrnamentGame(); }
};
function ornamentGamePool() { return ORNAMENTS.filter(o => o.image); }
function shuffled(items) {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}
function startOrnamentGame() {
  const box = document.getElementById("ornaGame");
  if (!box) return;
  let lastID = "";
  function round() {
    const pool = ornamentGamePool();
    const answer = shuffled(pool.filter(o => o.id !== lastID))[0];
    lastID = answer.id;
    const options = shuffled([answer, ...shuffled(pool.filter(o => o !== answer)).slice(0, 3)]);
    // Жауап алдын ала білінбеуі үшін суреттің сипаттамасында атау жазылмайды.
    box.innerHTML = `<p class="game-question">Атауы: <b>${esc(answer.name)}</b></p><div class="game-options">${options.map((o, i) => `<button type="button" class="game-option" data-orna="${esc(o.id)}"><img src="${esc(o.image)}" alt="${i + 1}-ою"></button>`).join("")}</div><p id="ornaStatus" role="status"></p>`;
    box.querySelectorAll("[data-orna]").forEach(button => button.addEventListener("click", () => {
      const status = document.getElementById("ornaStatus");
      if (button.dataset.orna !== answer.id) {
        button.disabled = true;
        status.textContent = "Бұл басқа ою. Қайта таңдаңыз.";
        return;
      }
      box.querySelectorAll("[data-orna]").forEach(b => { b.disabled = true; });
      button.classList.add("is-correct");
      status.innerHTML = `Дұрыс, бұл ${esc(answer.name)}. <button type="button" id="ornaNext">Келесі ою</button>`;
      const next = document.getElementById("ornaNext");
      next.addEventListener("click", round);
      next.focus();
    }));
  }
  round();
}
function wikiSections(text) {
  return text.split(/\n+/).filter(Boolean).map(line=>{
    const h = line.match(/^(={2,})\s*(.*?)\s*\1$/);
    if (h) { const tag=h[1].length>=3 ? "h3":"h2"; return `<${tag}>${esc(h[2])}</${tag}>`; }
    return `<p>${esc(line)}</p>`;
  }).join("");
}
const LANGUAGE_LINKS = [["dict","Сөздік"],["words","Көнерген сөздер"],["proverbs","Мақал-мәтел"],["twisters","Жаңылтпаш"],["gram","Тіл ережелері"],["voice","Тыңдау"]];
const LANGUAGE_ARTICLES = [["kazakh-language", "Қазақ тілі"], ["kazakh-alphabet", "Қазақ әліпбиі"], ["proverbs", "Мақал-мәтелдер"], ["tongue-twisters", "Жаңылтпаш"], ["orkhon-script", "Көне түркі жазбалары"]];
async function languageMaterial(id, title) {
  const key = "lang_" + id;
  try {
    const full = await optionalFull(key);
    const first = full?.sections?.flatMap(s => s.paragraphs || []).find(p => String(p).trim());
    if (!first) return "";
    return `<section class="language-material"><h2>${esc(title)}</h2><p>${esc(shortText(first))}</p>${fullDetails(key)}</section>`;
  } catch {
    return `<section class="language-material"><h2>${esc(title)}</h2><p role="alert">Қысқа мәтін жүктелмеді.</p>${fullDetails(key)}</section>`;
  }
}
VIEWS.encyclopedia = {
  render() {
    return heading("Энциклопедия", "Қазақ Уикипедиясының толық мәтіндерін осы бетте оқыңыз.") + `<form id="encyclopediaForm"><label for="articleSearch">Тақырып атауы</label><div class="search-row"><input id="articleSearch" type="search" required maxlength="200" placeholder="Мысалы: Домбыра"><button>Іздеу</button></div></form><div id="articleResult" aria-live="polite"></div>`;
  },
  mount() {
    let request=0;
    const root=document.getElementById("articleResult");
    const input=document.getElementById("articleSearch");
    async function search(q) {
      if (!q) return;
      input.value=q; const version=++request;
      root.innerHTML='<p role="status">Мақала жүктелуде…</p>';
      const valid=()=>version===request && root.isConnected;
      try {
        const base="https://kk.wikipedia.org/w/api.php?format=json&origin=*&action=query&";
        const data=await APP.json(base+"prop=extracts&explaintext=1&redirects=1&titles="+encodeURIComponent(q));
        if (!valid()) return;
        const page=Object.values(data.query.pages)[0];
        if (!page?.extract) {
          const similar=await APP.json(base+"list=search&srsearch="+encodeURIComponent(q)+"&srlimit=8");
          if (!valid()) return;
          const hits=similar.query.search || [];
          root.innerHTML='<p>Мақала табылмады. Басқа атаумен іздеп көріңіз.</p>'+ (hits.length ? `<h2>Ұқсас атаулар</h2><ul>${hits.map(p=>`<li><button type="button" data-wiki-title="${esc(p.title)}">${esc(p.title)}</button></li>`).join("")}</ul>` : "");
          return;
        }
        root.innerHTML=`<article class="prose search-result"><h2>${esc(page.title)}</h2>${wikiSections(page.extract)}${attribution({title:page.title,source_url:"https://kk.wikipedia.org/wiki/"+encodeURIComponent(page.title.replace(/ /g,"_"))})}</article>`;
      } catch {
        if (valid()) root.innerHTML='<p role="alert">Мақаланы жүктеу мүмкін болмады. Байланысты тексеріп, қайта көріңіз.</p><button type="button" data-wiki-retry>Қайта көру</button>';
      }
    }
    document.getElementById("encyclopediaForm").addEventListener("submit", e=>{e.preventDefault();search(input.value.trim());});
    root.addEventListener("click", e=>{
      const b=e.target.closest("[data-wiki-title]");
      if(b) search(b.dataset.wikiTitle);
      if(e.target.closest("[data-wiki-retry]")) search(input.value.trim());
    });
  }
};
VIEWS.language = {title:"Тіл", async render() { return heading("Тіл", "Қазақ тілінің сөз байлығы мен айтылымы.") + `<div class="language-index">${LANGUAGE_LINKS.map(([r,n])=>routeLink(r,n)).join("")}</div><section><h2>Тіл туралы</h2>${(await Promise.all(LANGUAGE_ARTICLES.map(([id,title]) => languageMaterial(id,title)))).join("")}</section>`; }};
for (const [route, id, title] of [["proverbs", "proverbs", "Мақал-мәтелдер"], ["twisters", "tongue-twisters", "Жаңылтпаш"]]) {
  const render = VIEWS[route].render;
  VIEWS[route].render = async function() { return await languageMaterial(id,title) + render.call(this); };
}
for (const [r, title] of LANGUAGE_LINKS) {
  VIEWS[r].title = title;
  const render = VIEWS[r].render;
  VIEWS[r].render = async function(id) { return subnav(LANGUAGE_LINKS,"Тіл бөлімдері") + await render.call(this,id); };
}
for (const r of ["jyr","read","ornaments"]) {
  const render = VIEWS[r].render;
  VIEWS[r].render = async function(id) { return subnav(CULTURE_LINKS,"Мәдениет бөлімдері") + await render.call(this,id); };
}

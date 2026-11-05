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
const CATEGORIES = {jyr: "Жыр-дастан", taam: "Ұлттық тағамдар", kijim: "Ұлттық киімдер", tarikh: "Тарих", tulgalar: "Тұлғалар", oyu: "Ою-өрнек"};
const ORNAMENT_NOTICE = "Төмендегі сақталған SVG сызбалары оюлардың дәл үлгісі емес. Оларды дәстүрлі ою пішінін жаттауға пайдаланбаңыз. Атаулар мен сипаттамалар зерттеу жинағынан берілген.";
function ornamentNotice() {
  return `<aside class="notice"><h2>Сызбалар туралы</h2><p>${esc(ORNAMENT_NOTICE)}</p><p>Сәйкес келмейтін сызбалар бұл бетте көрсетілмейді. Қазір тек атаулар мен сипаттамалар берілген.</p></aside>`;
}
function cleanExcerpt(text) {
  return String(text || "").replace(/\[Толық мәтін Wikipedia-да:[^\]]*\]/g, "").replace(/Толық мәтін Wikipedia-да[^\n]*/g, "").trim();
}
function articleText(d) { return cleanExcerpt(d.text).split(/\n+/).map(p=>`<p>${esc(p)}</p>`).join(""); }
function article(d) {
  return `<details class="patch article" data-article="${esc(d.id)}"><summary>${esc(d.title)}</summary><div class="article-body"><div class="prose" data-article-body>${articleText(d)}${attribution(d)}</div><div class="article-tools">${audioButton(cleanExcerpt(d.text).slice(0,500),d.id)}</div></div></details>`;
}
async function loadArticle(details) {
  if (details.dataset.loaded === "true" || details.dataset.loading === "true") return;
  details.dataset.loading = "true";
  const body = details.querySelector("[data-article-body]");
  const fallback = details._fallback || body.innerHTML; details._fallback = fallback;
  body.innerHTML = '<p role="status">Толық мәтін жүктелуде…</p>';
  try {
    const full = await optionalFull("art_" + details.dataset.article);
    if (!details.isConnected) return;
    body.innerHTML = full ? fullSections(full) : fallback;
    details.dataset.loaded = "true";
  } catch {
    if (details.isConnected) { body.innerHTML = '<p role="alert">Толық мәтін жүктелмеді.</p><button type="button" data-article-retry>Қайта көру</button>'; }
  } finally { details.dataset.loading = "false"; }
}
document.addEventListener("toggle", e => {
  if (e.target.matches("details[data-article]") && e.target.open) loadArticle(e.target);
}, true);
document.addEventListener("click", e => {
  if (e.target.closest("[data-article-retry]")) loadArticle(e.target.closest("details"));
});
async function culturalArticles(category) {
  const topics = await APP.cachedJSON("content_topics.json");
  return Promise.all(topics.filter(t => category ? t.category === category : t.category !== "oyu").map(t => APP.cachedJSON(`data/${t.category}/${t.id}.json`)));
}
const CULTURE_LINKS = [["culture", "Мақалалар"], ["jyr", "Жыр-дастан"], ["ornaments", "Ою-өрнек"]];
function subnav(links, label) { return `<nav class="subnav" aria-label="${esc(label)}">${links.map(([r,n])=>routeLink(r,n)).join("")}</nav>`; }
VIEWS.culture = {
  async render() {
    const articles = await culturalArticles();
    return heading("Мәдениет", "Әдебиет, тұрмыс және тарих туралы сақталған мақалалар.") + `<nav class="subnav" aria-label="Мәдениет бөлімдері">${CULTURE_LINKS.map(([r, n]) => routeLink(r, n)).join("")}</nav>` + Object.entries(CATEGORIES).filter(([key]) => key !== "oyu").map(([key, name]) => `<section class="article-group"><h2>${name}</h2>${articles.filter(d => d.category === key).map(article).join("")}</section>`).join("");
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
    return heading("Ою-өрнек") + ornamentNotice() + `<div class="word-grid">${ORNAMENTS.map(o => `<article class="word patch"><h2>${esc(o.name)}</h2><p>${esc(o.meaning)}</p></article>`).join("")}</div>` + articles.map(article).join("");
  }
};
function wikiSections(text) {
  return text.split(/\n+/).filter(Boolean).map(line=>{
    const h = line.match(/^(={2,})\s*(.*?)\s*\1$/);
    if (h) { const tag=h[1].length>=3 ? "h3":"h2"; return `<${tag}>${esc(h[2])}</${tag}>`; }
    return `<p>${esc(line)}</p>`;
  }).join("");
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
const LANGUAGE_LINKS = [["dict","Сөздік"],["words","Көнерген сөздер"],["proverbs","Мақал-мәтел"],["twisters","Жаңылтпаш"],["gram","Тіл ережелері"],["voice","Тыңдау"]];
VIEWS.language = {title:"Тіл", render() { return heading("Тіл", "Қазақ тілінің сөз байлығы мен айтылымы.") + `<div class="language-index">${LANGUAGE_LINKS.map(([r,n])=>routeLink(r,n)).join("")}</div>`; }};
for (const [r, title] of LANGUAGE_LINKS) {
  VIEWS[r].title = title;
  const render = VIEWS[r].render;
  VIEWS[r].render = function(id) { return subnav(LANGUAGE_LINKS,"Тіл бөлімдері") + render.call(this,id); };
}
for (const r of ["jyr","read","ornaments"]) {
  const render = VIEWS[r].render;
  VIEWS[r].render = async function(id) { return subnav(CULTURE_LINKS,"Мәдениет бөлімдері") + await render.call(this,id); };
}

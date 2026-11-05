"use strict";
const GROUPS = {
  "birth and childhood": "Дүниеге келу және балалық шақ",
  marriage: "Үйлену және отбасын құру", hospitality: "Қонақжайлық",
  seasons: "Жыл мезгілдері", mourning: "Аза тұту және еске алу", "mutual help": "Өзара көмек"
};
VIEWS.home = {
  title: "Қазақ мұрасы",
  render() {
    const day = Math.floor(Date.now() / 86400000);
    const p = APP.data.people[day % APP.data.people.length];
    const t = APP.data.traditions[day % APP.data.traditions.length];
    return `<section class="hero"><div class="hero-copy"><h1>Қазақ мұрасы</h1><p>Елдің тарихы — адам тағдырында, дәстүрінде, тілінде.</p>${routeLink("culture", "Мұрамен танысу", "button")}</div>${imageFigure("assets/heritage/interior_museum.jpg", "hero-image", true)}</section>
    <div class="home-content"><section class="heritage-paths" aria-label="Мұра бөлімдері"><a href="#shezhire" class="path-main"><h2>Шежіре</h2><p>Қазақтың ру-тайпалық құрылымы мен тарихи сабақтастығы.</p><span>Шежірені қарау</span></a><div class="path-side"><a href="#people"><h2>Ел тұлғалары</h2><p>Өмірі мен еңбегі ел тарихымен сабақтас ғұмырлар.</p></a><a href="#traditions"><h2>Салт-дәстүр</h2><p>Дәстүрдің шығу тегі, мәні мен бүгінгі жалғасы.</p></a></div></section><section class="featured"><h2>Бүгінгі танысу</h2><div class="featured-grid">${personPatch(p)}${traditionPatch(t)}</div></section></div>`;
  }
};
VIEWS.people = {
  async render(id) {
    if (!id) return heading("Ел тұлғалары", "Елге еңбек сіңірген жандардың өмірі мен мұрасына үңілейік.") + `<div class="people-grid">${APP.data.people.map(personPatch).join("")}</div>`;
    const p = APP.data.people.find(x => x.id === id);
    if (!p) return heading("Тұлға табылмады") + routeLink("people", "Тұлғалар тізіміне оралу");
    const full = await optionalFull("people_" + p.id);
    return routeLink("people", "Барлық тұлғалар", "back") + heading(p.name) + `<div class="person-detail"><aside>${p.image ? imageFigure(p.image, "portrait") : monogram(p)}</aside><article class="prose"><p class="years">${esc(p.years)}</p>${p.years_note_kk ? `<p class="note">${esc(p.years_note_kk)}</p>` : ""}<p><b>${esc(p.role)}</b></p><p>${esc(p.era)}</p><h2>Өмірі мен мұрасы</h2><p>${esc(p.summary_kk)}</p><h2>Тарихтағы орны</h2><p>${esc(p.why_forgotten_kk)}</p><h2>Толық өмірбаян</h2>${full ? fullSections(full) : `<p>Толық өмірбаян әзірге қолжетімсіз.</p>${attribution({title:p.name,source_url:p.wiki_url})}`}</article></div>`;
  }
};
VIEWS.traditions = {
  async render(id) {
    if (id) {
      const t = APP.data.traditions.find(x => x.id === id);
      if (!t) return heading("Дәстүр табылмады") + routeLink("traditions", "Дәстүрлерге оралу");
      const full = await optionalFull("trad_" + t.id);
      return routeLink("traditions", "Барлық дәстүрлер", "back") + heading(t.name, GROUPS[t.group]) + `<div class="tradition-detail">${videoFacade(t.video)}<article class="prose tradition-text"><p>${esc(t.summary_kk)}</p>${t.image ? imageFigure(t.image) : ""}${[["Қалай шыққан",t.origin_kk],["Не үшін жасалады",t.purpose_kk]].map(([h,p]) => `<h2>${h}</h2><p>${esc(p)}</p>`).join("")}<h2>Қалай өтеді</h2><ol>${(t.steps_kk || []).map(p=>`<li>${esc(p)}</li>`).join("")}</ol><h2>Мәні</h2><p>${esc(t.meaning_kk)}</p><h2>Бүгінгі күні</h2><p>${esc(t.today_kk)}</p><h2>Қызық деректер</h2><ul>${(t.facts_kk || []).map(p=>`<li>${esc(p)}</li>`).join("")}</ul>${full ? `<details class="article"><summary>Толығырақ</summary><div class="article-body">${fullSections(full)}</div></details>` : attribution({title:t.name,source_url:t.source_url || t.wiki_url})}</article></div>`;
    }
    return heading("Салт-дәстүр", "Халықтың тұрмысынан, бір-біріне деген ықыласынан туған мұра.") + Object.entries(GROUPS).map(([key, name]) => `<section class="tradition-group"><h2>${esc(name)}</h2><div class="tradition-grid">${APP.data.traditions.filter(t => t.group === key).map(traditionPatch).join("")}</div></section>`).join("");
  }
};
VIEWS.timeline = {
  render() {
    return heading("Тарих жолы", "Өткенге көз жүгіртіп, бүгіннің тамырын таниық.") + `<ol class="timeline">${APP.data.timeline.map(t => `<li><div class="date">${esc(t.year)}</div><article><h2>${esc(t.title_kk)}</h2><p>${esc(t.text_kk)}</p>${attribution({title:t.title_kk,source_url:t.source_url})}</article></li>`).join("")}</ol>`;
  }
};
function searchableWords(title, intro, items, renderer) {
  return heading(title, intro) + `<label class="search-label" for="wordSearch">Сөз іздеу</label><input id="wordSearch" type="search" placeholder="Іздейтін сөзіңізді жазыңыз"><p id="searchCount" role="status">${items.length} сөз</p><div id="wordResults" class="word-grid">${items.map(renderer).join("")}</div>`;
}
function mountWordSearch(items, renderer, text) {
  document.getElementById("wordSearch").addEventListener("input", event => {
    const q = event.target.value.toLocaleLowerCase("kk").trim();
    const matches = items.filter(item => text(item).toLocaleLowerCase("kk").includes(q));
    document.getElementById("wordResults").innerHTML = matches.map(renderer).join("") || '<p>Сөз табылмады. Басқа сөзбен іздеп көріңіз.</p>';
    document.getElementById("searchCount").textContent = `${matches.length} сөз`;
  });
}
function oldWord(w) {
  return `<article class="word patch"><h2>${esc(w.kk)}</h2><p>${esc(w.meaning_kk)}</p><blockquote>${esc(w.example_kk)}</blockquote></article>`;
}
VIEWS.words = {
  render() { return searchableWords("Көнерген сөздер", "Көне сөздерді мағынасы мен қолданысы арқылы таныңыз.", APP.data.words, oldWord); },
  mount() { mountWordSearch(APP.data.words, oldWord, w => `${w.kk} ${w.meaning_kk} ${w.example_kk}`); }
};

function videoFacade(video) {
  if (!video || !/^[\w-]{11}$/.test(video.youtube_id)) return '<aside class="video-panel"><p>Бейне әзірге қолжетімсіз.</p></aside>';
  return `<aside class="video-panel"><div class="video-frame"><button type="button" class="video-play" data-video="${esc(video.youtube_id)}" data-title="${esc(video.title)}" aria-label="${esc(video.title)} — бейнені ойнату"><img src="https://i.ytimg.com/vi/${esc(video.youtube_id)}/hqdefault.jpg" alt="" loading="lazy"><span>▶ Бейнені ойнату</span></button></div><p>${esc(video.title)}<br><small>${esc(video.channel)}</small></p></aside>`;
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-video]");
  if (!b || !/^[\w-]{11}$/.test(b.dataset.video)) return;
  const f = document.createElement("iframe");
  f.src = `https://www.youtube-nocookie.com/embed/${b.dataset.video}?rel=0&autoplay=1`;
  f.title = b.dataset.title; f.allow = "autoplay; encrypted-media; picture-in-picture"; f.allowFullscreen = true;
  b.replaceWith(f);
});

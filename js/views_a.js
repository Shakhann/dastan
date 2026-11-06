"use strict";
const GROUPS = {
  "birth and childhood": "Дүниеге келу және балалық шақ",
  marriage: "Үйлену және отбасын құру", hospitality: "Қонақжайлық",
  seasons: "Жыл мезгілдері", mourning: "Аза тұту және еске алу", "mutual help": "Өзара көмек"
};
VIEWS.home = {
  title: "Қазақ мұрасы",
  async render() {
    const d = await APP.cachedJSON("data/shezhire.json");
    return `<section class="hero"><div class="hero-shanyrak">${imageFigure(APP.visuals.home.hero, "hero-image", true)}${shanyrakSVG({extended:true})}</div><div class="hero-copy"><h1>ДАСТАН</h1><p class="hero-subtitle">Қазақ мұрасы</p><p>Елдің тарихы — адам тағдырында, дәстүрінде, тілінде.</p><div class="hero-actions">${routeLink("shezhire", "Шежірені тану", "button")}${routeLink("traditions", "Салт-дәстүр", "button button-light")}</div></div></section>
    <div class="home-content"><section><div class="section-heading"><h2>Дала. Ел. Шежіре.</h2>${routeLink("shezhire", "Шежірені қарау")}</div><div class="zhuz-grid">${d.zhuzes.map(z=>imageCard(z.image,z.name,"shezhire/"+encodeURIComponent(z.id))).join("")}</div></section>
    <section><div class="section-heading"><h2>Ел тұлғалары</h2>${routeLink("people", "Барлық тұлғалар")}</div><div class="people-grid">${APP.data.people.filter(p=>p.image).slice(0,4).map(p => personPatch(p)).join("")}</div></section>
    <section><div class="section-heading"><h2>Салт-дәстүр</h2>${routeLink("traditions", "Барлық дәстүрлер")}</div><div class="tradition-grid">${APP.data.traditions.filter(t=>t.image).slice(0,4).map(traditionPatch).join("")}</div></section>
    <section><div class="section-heading"><h2>Мұра көріністері</h2><p>Дала, өнер және күнделікті өмір.</p></div><div class="gallery">${APP.visuals.home.gallery.map(path=>imageFigure(path)).join("")}</div></section>
    <section><div class="section-heading"><h2>Тарихтан таңдама</h2>${routeLink("timeline", "Тарих жолы")}</div><div class="history-selection">${APP.data.timeline.filter(t=>t.image).slice(0,2).map(t=>imageCard(t.image,t.title_kk,"timeline","",String(t.year))).join("")}</div></section></div>`;
  }
};
VIEWS.people = {
  async render(id) {
    if (!id) return heading("Ел тұлғалары", "Елге еңбек сіңірген жандардың өмірі мен мұрасына үңілейік.") + `<div class="people-grid">${APP.data.people.map(p => personPatch(p, true)).join("")}</div>`;
    const p = APP.data.people.find(x => x.id === id);
    if (!p) return heading("Тұлға табылмады") + routeLink("people", "Тұлғалар тізіміне оралу");
    const content = `<div class="prose"><p>${esc(p.era)}</p><h2>Өмірі мен мұрасы</h2><p>${esc(p.summary_kk)}</p><h2>Тарихтағы орны</h2><p>${esc(p.why_forgotten_kk)}</p><h2>Толық өмірбаян</h2></div>`;
    return routeLink("people", "Барлық тұлғалар", "back") + heading(p.name) + saveButton("person", p.id) + `<div class="person-detail${p.image ? "" : " person-detail--text"}">${p.image ? `<aside>${imageFigure(p.image, "portrait")}</aside>` : ""}<article class="prose"><p class="years">${esc(p.years)}</p>${p.years_note_kk ? `<p class="note">${esc(p.years_note_kk)}</p>` : ""}<p><b>${esc(p.role)}</b></p><p>${esc(shortText(p.summary_kk))}</p>${fullDetails("people_" + p.id, content, {fallback: attribution({title:p.name,source_url:p.wiki_url})})}</article></div>`;
  }
};
VIEWS.traditions = {
  async render(id) {
    if (id) {
      const t = APP.data.traditions.find(x => x.id === id);
      if (!t) return heading("Дәстүр табылмады") + routeLink("traditions", "Дәстүрлерге оралу");
      const content = `<div class="prose"><p>${esc(t.summary_kk)}</p>${[["Қалай шыққан",t.origin_kk],["Не үшін жасалады",t.purpose_kk]].map(([h,p]) => `<h2>${h}</h2><p>${esc(p)}</p>`).join("")}<h2>Қалай өтеді</h2><ol>${(t.steps_kk || []).map(p=>`<li>${esc(p)}</li>`).join("")}</ol><h2>Мәні</h2><p>${esc(t.meaning_kk)}</p><h2>Бүгінгі күні</h2><p>${esc(t.today_kk)}</p><h2>Қызық деректер</h2><ul>${(t.facts_kk || []).map(p=>`<li>${esc(p)}</li>`).join("")}</ul><h2>Толық мәтін</h2></div>`;
      return routeLink("traditions", "Барлық дәстүрлер", "back") + heading(t.name, GROUPS[t.group], t.image) + saveButton("tradition", t.id) + `<div class="tradition-detail">${videoFacade(t.video)}<article class="prose tradition-text"><p>${esc(shortText(t.summary_kk))}</p>${fullDetails("trad_" + t.id, content, {fallback: attribution({title:t.name,source_url:t.source_url || t.wiki_url})})}</article></div>`;
    }
    return heading("Салт-дәстүр", "Халықтың тұрмысынан, бір-біріне деген ықыласынан туған мұра.") + Object.entries(GROUPS).map(([key, name]) => `<section class="tradition-group"><h2>${esc(name)}</h2><div class="tradition-grid">${APP.data.traditions.filter(t => t.group === key).map(traditionPatch).join("")}</div></section>`).join("");
  }
};
VIEWS.timeline = {
  render() {
    return heading("Тарих жолы", "Өткенге көз жүгіртіп, бүгіннің тамырын таниық.") + `<ol class="timeline">${APP.data.timeline.map(t => `<li><div class="date">${esc(t.year)}</div><article>${t.image ? imageFigure(t.image, "timeline-image") : ""}<h2>${esc(t.title_kk)}</h2><p>${esc(t.text_kk)}</p>${fullDetails("tl_" + t.year)}${attribution({title:t.title_kk,source_url:t.source_url})}</article></li>`).join("")}</ol>`;
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

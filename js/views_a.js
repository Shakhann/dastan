"use strict";
const GROUPS = {
  "birth and childhood": "Дүниеге келу және балалық шақ",
  marriage: "Үйлену және отбасын құру", hospitality: "Қонақжайлық",
  seasons: "Жыл мезгілдері", mourning: "Аза тұту және еске алу", "mutual help": "Өзара көмек"
};
// Local-calendar selection stays stable through the day, including across DST changes.
function homeDayIndex(date = new Date()) {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
}
VIEWS.home = {
  title: "Қазақ мұрасы",
  async render() {
    const day = homeDayIndex();
    const words = [...APP.data.words.map(w => ({...w, meaning:w.meaning_kk, example:w.example_kk})), ...DICT.map(w => ({...w, meaning:`${w.ru} / ${w.en}`, example:w.ex, audio:"d_" + w.id}))];
    const word = words[day % words.length];
    const proverb = PROVERBS[day % PROVERBS.length];
    const [manifest, topics] = await Promise.all([APP.cachedJSON("audio/manifest.json").catch(() => ({})), APP.cachedJSON("content_topics.json").catch(() => [])]);
    const counts = [["Тұлға",APP.data.people.length],["Дәстүр",APP.data.traditions.length],["Сөз",words.length],["Мақала",topics.length],["Аудио",new Set(Object.values(manifest).filter(p => typeof p === "string" && /^[\w.-]+\.mp3$/.test(p))).size]];
    const mosaic = [["people","Ел тұлғалары"],["shezhire","Шежіре"],["traditions","Салт-дәстүр"],["timeline","Тарих жолы"],["culture","Мәдениет"],["language","Тіл"],["encyclopedia","Энциклопедия"],["lab","Зертхана"],["yurt","Киіз үй әлемі"]];
    return `<section class="hero yurt-hero home-hero"><div class="hero-visual home-hero-picture">${imageFigure("assets/heritage/hero-horseman.jpg", "hero-image plate-lg", true)}${routeLink("yurt", "Киіз үйге кіру", "button home-yurt-enter")}</div><div class="hero-copy"><h1 class="sr-only">ДАСТАН — Қазақ мұрасы және тіл зертханасы</h1><div class="hero-signature" aria-hidden="true"><span lang="kk">ДАСТАН</span><span lang="kk-Latn">Dastan</span><span lang="kk-Arab" dir="rtl">داستان</span></div><p class="hero-subtitle">Мұраны таны. Тілді қолдан.</p><p>Тұлғалар мен дәстүрді таныңыз. Қазақ сөзін түрлендіріп, үш әліпбиде жазып көріңіз.</p></div></section>
    <section class="heritage-panorama" data-parallax>${imageFigure(APP.visuals.home.hero, "panorama-image plate-lg")}<p class="panorama-caption">Мұраны таны. Тілді қолдан.</p></section>
    <div class="home-content"><section class="heritage-counts" aria-label="Жергілікті мұра жинағы"><dl>${counts.map(([label,count]) => `<div><dt>${label}</dt><dd><span data-count="${count}">${count}</span></dd></div>`).join("")}</dl><p class="fine">Жергілікті жинақтағы жазбалар мен бөлек аудиофайлдар саны.</p></section><section class="home-mosaic"><div class="section-heading"><h2>Мұраға жол</h2><p>Тарихтан сөзге, сөзден күнделікті қолданысқа.</p></div><div class="section-mosaic">${mosaic.map(([route,name]) => `<a class="mosaic-tile" href="#${route}"><h3>${esc(name)}</h3>${imageFigure((route==="lab"?"assets/heritage/alash-trio.jpg":route==="yurt"?"assets/heritage/yurt-assembling.jpg":APP.visuals.sections[route] || APP.visuals.home.gallery[5]), "mosaic-image plate-md")}</a>`).join("")}</div></section></div>
    <div class="proverb-marquee" tabindex="0" role="region" aria-label="Қазақ мақалдары, тоқтату үшін меңзерді үстіне қойыңыз"><div class="proverb-track">${[0,1].map(copy => `<div class="proverb-copy" ${copy ? 'aria-hidden="true"' : ""}>${PROVERBS.slice(0,8).map(p => `<span>${esc(p.kk)}</span>`).join("")}</div>`).join("")}</div></div>
    <section class="daily-proverb"><div class="band-inner"><h2>Күн мақалы</h2><blockquote>${esc(proverb.kk)}</blockquote>${audioButton(proverb.kk, "p_" + proverb.id)} ${routeLink("proverbs", "Мақал-мәтелдер")}</div></section>
    <div class="home-content"><section class="daily-word"><div><h2>Күн сөзі</h2><p>Сөздің мағынасын танып, өз сөйлеміңізде қолданып көріңіз.</p></div><article><h3>${esc(word.kk)}</h3><p>${esc(word.meaning)}</p><blockquote>${esc(word.example)}</blockquote><div class="daily-actions">${word.audio && manifest[word.audio] ? audioButton(word.kk, word.audio) : ""}${routeLink("lab/" + encodeURIComponent(word.kk), "Түрлендіру", "button")}</div></article></section><section class="home-people"><div class="section-heading"><h2>Ел тұлғалары</h2>${routeLink("people", "Барлық тұлғалар")}</div><p class="rail-hint">Сүйреп жылжытыңыз немесе көрсеткі пернелерін қолданыңыз.</p><div class="portrait-rail" data-drag-rail tabindex="0" role="region" aria-label="Ел тұлғалары">${APP.data.people.filter(p=>p.image).map(p => personPatch(p)).join("")}</div></section><section class="home-timeline"><div class="section-heading"><h2>Тарих жолы</h2>${routeLink("timeline", "Барлық кезеңдер")}</div>${timelineRail(true)}</section></div>
    <section class="lab-intro"><div class="band-inner"><div><h2>Тіл зертханасы</h2><p>Бір сөздің жалғауларын көріңіз, ережесін түсініңіз. Кирилл мәтінін латын және төте жазуға ауыстырыңыз.</p>${routeLink("lab", "Зертхананы ашу", "button button-light")}</div><div class="lab-example" aria-label="Кітап сөзінің түрлену мысалы"><p><span>Түбір</span><strong>кітап</strong></p><p><span>Көптік</span><strong>кітап<em>тар</em></strong></p><p><span>Менің</span><strong>кітаб<em>ым</em></strong></p><small>Дауысты жалғанғанда п дыбысы б дыбысына өзгереді.</small></div></div></section>
    <div class="home-content"><section class="home-traditions"><div class="section-heading"><h2>Салт-дәстүр</h2>${routeLink("traditions", "Барлық дәстүрлер")}</div><div class="tradition-grid">${APP.data.traditions.filter(t=>t.image).slice(0,2).map(traditionPatch).join("")}</div></section><section class="home-gallery"><div class="section-heading"><h2>Мұра көріністері</h2><p>Дала, өнер және күнделікті өмір.</p></div><div class="gallery">${APP.visuals.home.gallery.map(path=>imageFigure(path)).join("")}</div></section></div>`;
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
function timelineRail(preview = false) {
  return `<p class="rail-hint">Уақыт бойымен сүйреңіз немесе көрсеткі пернелерін қолданыңыз.</p><ol class="timeline timeline-rail" data-drag-rail tabindex="0" aria-label="Тарих кезеңдері">${APP.data.timeline.map(t => `<li><div class="date">${esc(t.year)}</div><article>${t.image ? imageFigure(t.image, "timeline-image") : ""}<h2>${esc(t.title_kk)}</h2><p>${esc(preview ? shortText(t.text_kk) : t.text_kk)}</p>${preview ? routeLink("timeline", "Кезеңді оқу") : fullDetails("tl_" + t.year)}${attribution({title:t.title_kk,source_url:t.source_url})}</article></li>`).join("")}</ol>`;
}
VIEWS.timeline = {
  render(id) { return HISTORY.render(id); },
  mount(id) {
    if (id) APP.cleanupHistory = HISTORY.mount(id);
    else APP.cleanupAtlas = ATLAS.mount();
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

VIEWS.yurt = {
  title: "Киіз үй әлемі",
  render() { return YURT.render(); },
  mount(id) { APP.cleanupYurtUI = YURT.mount(document.querySelector('[data-yurt]'), id); }
};

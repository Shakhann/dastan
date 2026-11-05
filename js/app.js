"use strict";
const APP = {data: null, credits: [], navigation: 0, sources: new Map()};
const VIEWS = Object.create(null);
const NAV = [["home", "Басты бет"], ["people", "Ел тұлғалары"], ["shezhire", "Шежіре"], ["traditions", "Салт-дәстүр"], ["timeline", "Тарих жолы"], ["culture", "Мәдениет"], ["language", "Тіл"], ["encyclopedia", "Энциклопедия"]];
function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[c]));
}
function safeURL(value) {
  try { const u = new URL(value); return /^https?:$/.test(u.protocol) ? u.href : ""; }
  catch { return ""; }
}
function sourceLink(url, label = "Дереккөз") {
  const href = safeURL(url);
  return href ? `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(label)}</a>` : "";
}
function heading(title, intro = "") {
  return `<header class="page-head"><h1>${esc(title)}</h1>${intro ? `<p>${esc(intro)}</p>` : ""}</header>`;
}
function routeLink(route, label, cls = "") {
  return `<a class="${esc(cls)}" href="#${esc(route)}">${esc(label)}</a>`;
}
function audioButton(text, key = "") {
  return `<button type="button" class="listen" data-speak="${esc(text)}" data-audio="${esc(key)}">Тыңдау</button>`;
}
APP.toast = message => {
  const node = document.getElementById("notice");
  node.textContent = message;
  clearTimeout(APP.noticeTimer);
  APP.noticeTimer = setTimeout(() => { node.textContent = ""; }, 6000);
};
APP.json = async path => {
  const response = await fetch(path);
  if (!response.ok) throw new Error("Деректер жүктелмеді");
  return response.json();
};
APP.cache = new Map();
APP.cachedJSON = path => {
  if (!APP.cache.has(path)) APP.cache.set(path, APP.json(path).catch(error => { APP.cache.delete(path); throw error; }));
  return APP.cache.get(path);
};
APP.loadHeritage = async () => {
  const [data, credits] = await Promise.all([APP.cachedJSON("data/heritage.json"), APP.cachedJSON("data/image_credits.json")]);
  APP.data = data; APP.credits = credits;
};
function imageCredit(c) {
  if (!c) return "";
  return `${esc(c.caption_kk)}<span class="credit">Сурет авторы: ${esc(c.author)}. ${esc(c.license === "Public domain" ? "Қоғам игілігі" : c.license)}.</span>`;
}
function imageFigure(path, cls = "", eager = false) {
  const c = APP.credits.find(x => x.path === path);
  if (!c || !/^assets\/heritage\/[a-zA-Z0-9_.-]+$/.test(path)) return "";
  return `<figure class="${esc(cls)}"><img src="${esc(path)}" alt="${esc(c.caption_kk)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"><figcaption>${imageCredit(c)}</figcaption></figure>`;
}
function monogram(person) {
  return `<div class="monogram" role="img" aria-label="${esc(person.name)}: портреті жоқ"><span aria-hidden="true">${esc(Array.from(person.name)[0])}</span></div>`;
}
function personPatch(p) {
  return `<article class="person patch">${p.image ? imageFigure(p.image, "portrait") : monogram(p)}<div class="patch-body"><p class="years">${esc(p.years)}</p><h2>${routeLink("people/" + encodeURIComponent(p.id), p.name)}</h2><p>${esc(p.role)}</p></div></article>`;
}
function traditionPatch(t) {
  return `<article class="patch tradition"><div class="patch-body"><p class="group-label">${esc(GROUPS[t.group] || "Дәстүр")}</p><h2>${routeLink("traditions/" + encodeURIComponent(t.id), t.name)}</h2><p>${esc(t.summary_kk)}</p></div></article>`;
}
let activeAudio = null;
let speechVersion = 0;
async function speak(text, key) {
  const version = ++speechVersion;
  if (activeAudio) { activeAudio.pause(); activeAudio = null; }
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  const fallback = () => {
    if (version !== speechVersion) return;
    const synth = window.speechSynthesis;
    const voice = synth?.getVoices().find(v => /^kk(?:[-_]|$)/i.test(v.lang));
    if (!voice) { APP.toast("Бұл мәтіннің дыбыстық жазбасы жоқ. Браузерде қазақша дауыс та қолжетімсіз."); return; }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "kk-KZ"; utterance.voice = voice; utterance.rate = 0.92;
    utterance.onerror = () => APP.toast("Дыбыстау мүмкін болмады. Қайта тыңдап көріңіз.");
    synth.speak(utterance);
  };
  try {
    const manifest = await APP.cachedJSON("audio/manifest.json");
    if (version !== speechVersion) return;
    const path = manifest[key];
    if (typeof path !== "string" || !/^[a-zA-Z0-9_.-]+\.mp3$/.test(path)) { fallback(); return; }
    const audio = new Audio("audio/" + path); activeAudio = audio;
    let failed = false;
    const onFailure = () => { if (!failed) { failed = true; fallback(); } };
    audio.onerror = onFailure;
    await audio.play().catch(onFailure);
  } catch { fallback(); }
}
function stopAudio() {
  speechVersion++;
  if (activeAudio) { activeAudio.pause(); activeAudio = null; }
  window.speechSynthesis?.cancel();
}
async function renderRoute() {
  let parts;
  try { parts = decodeURIComponent(location.hash.slice(1)).split("/"); }
  catch { parts = ["home"]; history.replaceState(null, "", "#home"); }
  let [route, id] = parts;
  if (route === "lineage" || route === "elders") { route = "shezhire"; id = undefined; history.replaceState(null, "", "#shezhire"); }
  if (!Object.hasOwn(VIEWS, route)) {
    route = "home"; id = undefined; history.replaceState(null, "", "#home");
  }
  const version = ++APP.navigation;
  stopAudio();
  const root = document.getElementById("view");
  const main = document.getElementById("main");
  const nav = document.getElementById("siteNav");
  nav.classList.remove("open"); document.getElementById("menuToggle").setAttribute("aria-expanded", "false");
  nav.querySelectorAll("a").forEach(a => {
    if (a.getAttribute("href") === "#" + navParent(route)) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
  root.innerHTML = '<div class="page"><p role="status">Мұра беттері жүктелуде…</p></div>';
  try {
    await APP.loadHeritage();
    const view = VIEWS[route];
    const html = await view.render(id);
    if (version !== APP.navigation) return;
    root.innerHTML = `<div class="${route === "home" ? "home-page" : "page"}">${html}</div>`;
    if (view.mount) await view.mount(id);
    if (version !== APP.navigation) return;
    document.title = `ДАСТАН — ${view.title || NAV.find(n => n[0] === route)?.[1] || "Қазақ мұрасы"}`;
    main.focus({preventScroll: true});
    window.scrollTo(0, 0);
  } catch {
    if (version !== APP.navigation) return;
    root.innerHTML = '<div class="page"><h1>Бет жүктелмеді</h1><p role="alert">Деректерді ашу мүмкін болмады. Интернет байланысын тексеріп, қайта көріңіз.</p><button id="retry">Қайта көру</button></div>';
    document.getElementById("retry").addEventListener("click", renderRoute);
  }
}
document.addEventListener("click", event => {
  if (event.target.closest(".skip")) {
    event.preventDefault(); document.getElementById("main").focus(); document.getElementById("main").scrollIntoView(); return;
  }
  const button = event.target.closest("[data-speak]");
  if (button) speak(button.dataset.speak, button.dataset.audio);

});
window.addEventListener("hashchange", renderRoute);
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("siteNav").innerHTML = NAV.map(([id, name]) => routeLink(id, name)).join("");
  const toggle = document.getElementById("menuToggle");
  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(open)); document.getElementById("siteNav").classList.toggle("open", open);
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
      toggle.setAttribute("aria-expanded", "false"); document.getElementById("siteNav").classList.remove("open"); toggle.focus();
    }
  });
  renderRoute();
});

function navParent(route) {
  if (["dict","words","proverbs","twisters","gram","voice"].includes(route)) return "language";
  if (["jyr","read","makan","ornaments"].includes(route)) return "culture";
  return route;
}
function attribution(d = {}) {
  if (d.source_url) APP.sources.set(d.source_url, d.title || "Мақала");
  return `<p class="fine attribution">Дереккөз: ${esc(d.source_name || "Қазақ Уикипедиясы")}, ${esc(d.license || "CC BY-SA 4.0")}. ${routeLink("credits", "Дереккөздер")}</p>`;
}
function fullSections(d) {
  return (d.sections || []).map(s => `${s.heading ? `<${Number(s.level) >= 3 ? "h3" : "h2"}>${esc(s.heading)}</${Number(s.level) >= 3 ? "h3" : "h2"}>` : ""}${(s.paragraphs || []).map(p => `<p>${esc(p)}</p>`).join("")}`).join("") + attribution(d);
}
// Бұл материалдардың толық мәтін файлы жоқ, сондықтан оларды сұрамаймыз.
const NO_FULL_TEXT = new Set(["trad_konakasy", "trad_kymyzmuryndyk", "art_kijim_ishik"]);
async function optionalFull(key) {
  if (!/^[\w-]+$/.test(key) || NO_FULL_TEXT.has(key)) return null;
  const path = `data/full/${key}.json`;
  if (!APP.cache.has(path)) APP.cache.set(path, (async () => {
    const r = await fetch(path);
    if (r.status === 404) return null;
    if (!r.ok) throw new Error("Мәтін жүктелмеді");
    return r.json();
  })().catch(e => { APP.cache.delete(path); throw e; }));
  return APP.cache.get(path);
}

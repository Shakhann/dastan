"use strict";
const APP = {data: null, credits: [], visuals: {}, navigation: 0, sources: new Map()};
const VIEWS = Object.create(null);
const NAV = [["home", "Басты бет"], ["people", "Ел тұлғалары"], ["shezhire", "Шежіре"], ["traditions", "Салт-дәстүр"], ["timeline", "Тарих жолы"], ["culture", "Мәдениет"], ["language", "Тіл"], ["encyclopedia", "Энциклопедия"], ["lab", "Зертхана"], ["yurt", "Киіз үй әлемі"]];
function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[c]));
}
// Қысқа мәтінді сөйлемге, ол сыймаса сөзге дейін аламыз.
function shortText(text, limit = 220) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  limit = Math.max(0, Math.floor(Number(limit) || 0));
  if (value.length <= limit) return value;
  if (!limit) return "";
  let end = 0;
  for (const match of value.matchAll(/[.!?](?:[»”"')\]]*)(?=\s|$)/gu)) {
    const i = match.index, stop = i + match[0].length;
    if (stop > limit) break;
    if (value[i] === ".") {
      const token = (value.slice(0, i + 1).match(/[^\s]+$/u)?.[0] || "").replace(/^[«“"'(\[]+/u, "");
      if (/\d\.$/u.test(token) || /^(?:ж|жж|ғ|ғғ|т\.б|т\.с\.с|б\.з|б\.з\.д|т|б|с|ноғ|қаз|орыс|лат|ағылш|араб|парсы|гр|фр|нем|қысқ|мыс|шам)\.$/iu.test(token) || /^(?:\p{Lu}\.)+$/u.test(token)) continue;
    }
    end = stop;
  }
  if (end) return value.slice(0, end);
  const clipped = value.slice(0, Math.max(0, limit - 1));
  if (/\s/u.test(value[clipped.length] || "")) return clipped.trimEnd() + "…";
  const boundary = clipped.search(/\s+\S*$/u);
  return (boundary >= 0 ? clipped.slice(0, boundary) : "") + "…";
}
function safeURL(value) {
  try { const u = new URL(value); return /^https?:$/.test(u.protocol) ? u.href : ""; }
  catch { return ""; }
}
function sourceLink(url, label = "Дереккөз") {
  const href = safeURL(url);
  return href ? `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(label)}</a>` : "";
}
function heading(title, intro = "", image) {
  const path = image || APP.visuals.sections?.[navParent(APP.route)];
  return `<header class="section-banner"><div class="banner-copy"><h1>${esc(title)}</h1>${intro ? `<p>${esc(intro)}</p>` : ""}</div>${path ? `<div class="banner-visual">${imageFigure(path, "banner-image plate-md", true)}</div>` : '<div class="banner-pattern" aria-hidden="true"></div>'}</header>`;
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
  const [data, credits, visuals] = await Promise.all([APP.cachedJSON("data/heritage.json"), APP.cachedJSON("data/image_credits.json"), APP.cachedJSON("data/visuals.json")]);
  data.people = data.people.filter(p => p.image);
  APP.data = data; APP.credits = credits; APP.visuals = visuals;
};
function imageCredit(c) {
  if (!c) return "";
  return `${esc(c.caption_kk)}<span class="credit">Сурет авторы: ${esc(c.author)}. ${esc(c.license === "Public domain" ? "Қоғам игілігі" : c.license)}.</span>`;
}
function imageFigure(path, cls = "", eager = false) {
  const c = APP.credits.find(x => x.path === path);
  if (!c || !/^assets\/heritage\/[a-zA-Z0-9_.-]+$/.test(path)) return "";
  const size = /\bplate-(?:lg|md|sm)\b/.test(cls) ? "" : /card-visual|portrait|profile-thumb/.test(cls) ? " plate-sm" : " plate-md";
  return `<figure class="${esc(cls + size)}"><div class="image-frame"><img src="${esc(path)}" alt="${esc(c.caption_kk)}" ${eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} decoding="async"></div><figcaption>${imageCredit(c)}</figcaption></figure>`;
}
function imageCard(path, title, route, cls = "", description = "") {
  return `<article class="image-card ${esc(cls)}">${imageFigure(path, "card-visual")}<div class="card-copy"><h2 class="card-title">${routeLink(route,title)}</h2>${description ? `<p class="card-description">${esc(description)}</p>` : ""}</div></article>`;
}
function personPatch(p, preview = false) {
  const route = "people/" + encodeURIComponent(p.id);
  const summary = preview ? `<p class="card-excerpt">${esc(shortText(p.summary_kk))}</p>` : "";
  if (p.image) return imageCard(p.image, p.name, route, "person portrait", `${p.years}. ${p.role}`).replace("</div></article>", `${summary}</div></article>`);
  return `<article class="image-card person"><div class="card-copy"><h2 class="card-title">${routeLink(route,p.name)}</h2><p class="card-description">${esc(p.years)}. ${esc(p.role)}</p>${summary}</div></article>`;
}
function traditionPatch(t) {
  if (t.image) return imageCard(t.image, t.name, "traditions/" + encodeURIComponent(t.id), "tradition", shortText(t.summary_kk));
  return `<article class="patch"><div class="patch-body"><h2>${routeLink("traditions/" + encodeURIComponent(t.id), t.name)}</h2><p>${esc(shortText(t.summary_kk))}</p></div></article>`;
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
  route ||= "home";
  if (route === "lineage" || route === "elders") { route = "shezhire"; id = undefined; history.replaceState(null, "", "#shezhire"); }
  if (!Object.hasOwn(VIEWS, route)) {
    route = "notfound"; id = undefined;
  }
  APP.route = route;
  const menuFocus = closeMenu() || APP.menuFocusAfterNavigation;
  APP.menuFocusAfterNavigation = false;
  document.body.classList.toggle("home-top", route === "home");
  document.body.classList.toggle("auth-route", ["login","register","reset","new-password"].includes(route));
  const version = ++APP.navigation;
  APP.cleanupYurt?.(); APP.cleanupYurt = null;
  APP.cleanupYurtUI?.(); APP.cleanupYurtUI = null;
  if (typeof EXPERIENCE !== "undefined") EXPERIENCE.cleanup();
  stopAudio();
  const root = document.getElementById("view");
  const main = document.getElementById("main");
  document.querySelectorAll("#siteNav a, #desktopNav a, #footerNav a, .mobile-nav a").forEach(a => {
    if (a.getAttribute("href") === "#" + navParent(route) || a.getAttribute("href") === location.hash) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
  root.setAttribute?.("aria-busy", "true");
  try {
    await APP.loadHeritage();
    if (version !== APP.navigation) return;
    await APP.initProfile();
    if (version !== APP.navigation) return;
    await APP.initAuth();
    if (version !== APP.navigation) return;
    const authRoute = APP.authRoute?.(route) || route;
    if (authRoute !== route) {
      if (location.hash === "#" + authRoute) return renderRoute();
      location.hash = "#" + authRoute;
      return;
    }
    const view = VIEWS[route];
    const html = await view.render(id);
    if (version !== APP.navigation) return;
    const replaceView = () => {
      if (version !== APP.navigation) return;
      root.innerHTML = `<div class="${route === "home" ? "home-page" : "page"}">${html}</div>`;
    };
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (document.startViewTransition && !reduced) {
      const transition = document.startViewTransition(replaceView);
      transition.finished.catch(() => {});
      await transition.updateCallbackDone;
    } else {
      replaceView();
      if (!reduced) root.animate?.([{opacity:0},{opacity:1}], {duration:220});
    }
    if (version !== APP.navigation) return;
    if ((route === "people" || route === "traditions") && id) APP.visit(route === "people" ? "person" : "tradition", id);
    window.scrollTo(0, 0);
    if (view.mount) await view.mount(id);
    if (typeof LAB !== "undefined") LAB.ensureKeyboards?.(document.getElementById("view"));
    if (version !== APP.navigation) return;
    root.removeAttribute?.("aria-busy");
    if (typeof EXPERIENCE !== "undefined") EXPERIENCE.mount(root);
    if (route === "yurt") {
      const host = root.querySelector?.("[data-yurt]");
      if (host) import("./yurt3d.js?v=39").then(module => {
        if (version === APP.navigation && host.isConnected) {
          APP.cleanupYurt = module.mountYurt(host);
          if (YURT.find(id)) host.dispatchEvent(new CustomEvent("yurtselect", {detail:{id}}));
        }
      }).catch(() => { if (host.isConnected) host.classList.add("yurt-fallback-mode"); });
    }
    document.title = `ДАСТАН — ${view.title || NAV.find(n => n[0] === route)?.[1] || "Қазақ мұрасы"}`;
    if (!(route === "yurt" && YURT.find(id))) (menuFocus ? (APP.menuReturnFocus || document.getElementById("menuToggle")) : main).focus({preventScroll: true});
    APP.updateAuthUI();
    updateHeader();
  } catch {
    if (version !== APP.navigation) return;
    root.removeAttribute?.("aria-busy");
    root.innerHTML = `<div class="page">${heading("Бет жүктелмеді")}<p role="alert">Деректерді ашу мүмкін болмады. Интернет байланысын тексеріп, қайта көріңіз.</p><button id="retry">Қайта көру</button></div>`;
    document.getElementById("retry").addEventListener("click", renderRoute);
  }
}
VIEWS.notfound = {
  title: "Бет табылмады",
  render: () => heading("Бет табылмады", "Бұл мекенжайда бет жоқ.") + `<div class="empty-state">${routeLink("home", "Басты бетке оралу", "button")}</div>`
};
document.addEventListener("click", event => {
  if (event.target.closest(".skip")) {
    event.preventDefault(); document.getElementById("main").focus(); document.getElementById("main").scrollIntoView(); return;
  }
  const button = event.target.closest("[data-speak]");
  if (button) speak(button.dataset.speak, button.dataset.audio);

});
window.addEventListener("hashchange", renderRoute);
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("siteNav").innerHTML = NAV.map(([id, name]) => routeLink(id, name)).join("") + routeLink("about", "Жоба туралы");
  document.getElementById("footerNav").innerHTML = NAV.map(([id, name]) => routeLink(id, name)).join("");
  document.getElementById("desktopNav").innerHTML = NAV.filter(([id]) => id !== "home").map(([id, name]) => routeLink(id, name)).join("");
  if (typeof setupSiteSearch === "function") setupSiteSearch();
  setupMenu();
  if (typeof EXPERIENCE !== "undefined") EXPERIENCE.init();
  renderRoute();
});
function updateHeader() {
  document.body.classList.toggle("home-top", APP.route === "home" && window.scrollY < 48);
}
window.addEventListener("scroll", updateHeader, {passive:true});

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
const NO_FULL_TEXT = new Set(["art_kijim_ishik"]);
APP.missingFull = new Set();
async function optionalFull(key) {
  if (!/^[\w-]+$/.test(key) || NO_FULL_TEXT.has(key)) return null;
  const path = `data/full/${key}.json`;
  if (!APP.cache.has(path)) APP.cache.set(path, (async () => {
    const r = await fetch(path);
    if (r.status === 404) { APP.missingFull.add(key); return null; }
    if (!r.ok) throw new Error("Мәтін жүктелмеді");
    return r.json();
  })().catch(e => { APP.cache.delete(path); throw e; }));
  return APP.cache.get(path);
}

function detailsLabel() {
  return '<span class="details-more">Толығырақ</span><span class="details-less">Жасыру</span>';
}
function fullDetails(key, content = "", {summary = "", articleID = "", fallback = ""} = {}) {
  if ((NO_FULL_TEXT.has(key) || APP.missingFull.has(key)) && !content && !fallback) return "";
  return `<details class="article full-details" data-full="${esc(key)}"${articleID ? ` data-article="${esc(articleID)}"` : ""}><summary>${summary}${detailsLabel()}</summary><div class="article-body">${content}<div class="prose" data-full-body>${fallback}</div></div></details>`;
}
async function loadArticle(details) {
  if (!details.open || details.dataset.loaded === "true" || details.dataset.loading === "true") return;
  details.dataset.loading = "true";
  const body = details.querySelector("[data-full-body]");
  const fallback = details._fallback ?? body.innerHTML; details._fallback = fallback;
  body.innerHTML = '<p role="status">Толық мәтін жүктелуде…</p>';
  try {
    const full = await optionalFull(details.dataset.full);
    if (!details.isConnected) return;
    const hasText = full?.sections?.some(s => s.paragraphs?.some(p => String(p).trim()));
    if (!hasText) APP.missingFull.add(details.dataset.full);
    body.innerHTML = hasText ? fullSections(full) : fallback;
    details.dataset.loaded = "true";
    if (!hasText && !fallback && !body.previousElementSibling) details.remove();
  } catch {
    if (details.isConnected) body.innerHTML = '<p role="alert">Толық мәтін жүктелмеді.</p><button type="button" data-full-retry>Қайта көру</button>';
  } finally { details.dataset.loading = "false"; }
}
document.addEventListener("toggle", e => {
  if (!e.target.matches("details[data-full]") || !e.target.open) return;
  if (e.target.dataset.article) APP.visit("article", e.target.dataset.article);
  loadArticle(e.target);
}, true);
document.addEventListener("click", e => {
  if (e.target.closest("[data-full-retry]")) loadArticle(e.target.closest("details[data-full]"));
});

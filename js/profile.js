"use strict";
function profileSymbol(name) {
  return name ? esc(Array.from(name)[0].toLocaleUpperCase("kk")) : '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="7" r="4" fill="currentColor"/><path d="M4 22v-3a8 8 0 0 1 16 0v3Z" fill="currentColor"/></svg>';
}
const PROFILE_KEY = "dastan.profile.v1";
const PROFILE_TYPES = {person:"Тұлғалар", tradition:"Дәстүрлер", article:"Мақалалар"};
function emptyProfile() { return {name:"", zhuz:"", tribe:"", saved:[], recent:[]}; }
APP.profile = emptyProfile();
APP.materials = new Map();
function profileTribes(zhuz) {
  if (zhuz === "non-clan") return APP.profileTree.non_clan;
  return APP.profileTree.zhuzes.find(z => z.id === zhuz)?.branches.flatMap(b => b.tribes) || [];
}
function validateProfile(value) {
  const result = emptyProfile();
  if (!value || typeof value !== "object" || Array.isArray(value)) return result;
  if (typeof value.name === "string") result.name = Array.from(value.name.trim()).slice(0,60).join("");
  if (typeof value.zhuz === "string" && (value.zhuz === "non-clan" || APP.profileTree.zhuzes.some(z => z.id === value.zhuz))) result.zhuz = value.zhuz;
  if (typeof value.tribe === "string" && profileTribes(result.zhuz).some(t => t.id === value.tribe)) result.tribe = value.tribe;
  for (const [key, limit] of [["saved",200],["recent",12]]) {
    const seen = new Set();
    if (!Array.isArray(value[key])) continue;
    for (const entry of value[key]) {
      if (!entry || typeof entry.type !== "string" || !Object.hasOwn(PROFILE_TYPES, entry.type) || typeof entry.id !== "string") continue;
      const identity = entry.type + ":" + entry.id;
      if (!APP.materials.has(identity) || seen.has(identity)) continue;
      result[key].push({type:entry.type, id:entry.id}); seen.add(identity);
      if (result[key].length === limit) break;
    }
  }
  return result;
}
APP.initProfile = async () => {
  if (!APP.profileReady) APP.profileReady = (async () => {
    const [tree, topics] = await Promise.all([APP.cachedJSON("data/shezhire.json"), APP.cachedJSON("content_topics.json")]);
    APP.profileTree = tree; APP.profileArticles = topics;
    APP.data.people.forEach(p => APP.materials.set("person:" + p.id, {title:p.name,image:p.image,route:"people/" + encodeURIComponent(p.id)}));
    APP.data.traditions.forEach(t => APP.materials.set("tradition:" + t.id, {title:t.name,image:t.image,route:"traditions/" + encodeURIComponent(t.id)}));
    topics.forEach(a => APP.materials.set("article:" + a.id, {title:a.title,image:APP.visuals.articles?.[a.id] || (a.category === "jyr" ? APP.visuals.articles?.jyr_default : "") || APP.visuals.sections.culture,route:"culture/" + encodeURIComponent(a.id)}));
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) APP.profile = validateProfile(JSON.parse(raw));
    } catch { APP.toast("Профильді оқу мүмкін болмады. Осы бетте жұмысты жалғастыра аласыз."); }
    APP.updateProfileButton();
  })().catch(error => { APP.profileReady = null; throw error; });
  return APP.profileReady;
};
APP.updateProfileButton = () => {
  const node = document.getElementById("profileButton");
  if (!node) return;
  const user = typeof AUTH !== "undefined" ? AUTH.user : null;
  node.classList.toggle("is-signed-in", Boolean(user));
  node.setAttribute("href", user ? "#profile" : "#login");
  node.setAttribute("aria-label", user ? "Профиль" : "Кіру");
  node.innerHTML = user ? profileSymbol(APP.profile.name || user.email || "П") : "Кіру";
};
APP.persistProfile = () => {
  APP.profile = validateProfile(APP.profile);
  APP.updateProfileButton();
  APP.queueProfileSync?.();
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(APP.profile)); return true; }
  catch { APP.toast("Браузерге сақтау мүмкін болмады. Өзгерістер осы бет ашық тұрғанда ғана сақталады."); return false; }
};
APP.visit = (type,id) => {
  if (!APP.materials.has(type + ":" + id)) return;
  // An opening detail may emit a second toggle event after mounting.
  if (APP.profile.recent[0]?.type === type && APP.profile.recent[0]?.id === id) return;
  APP.profile.recent = [{type,id},...APP.profile.recent.filter(e => e.type !== type || e.id !== id)].slice(0,12);
  APP.persistProfile();
};
function isSaved(type,id) { return APP.profile.saved.some(e => e.type === type && e.id === id); }
function saveButton(type,id) {
  if (!APP.materials.has(type + ":" + id)) return "";
  const saved = isSaved(type,id);
  return `<button type="button" class="save-material" data-save-type="${esc(type)}" data-save-id="${esc(id)}" aria-pressed="${saved}">${saved ? "Сақталды" : "Сақтау"}</button>`;
}
function profileCard(entry, removable = false) {
  const material = APP.materials.get(entry.type + ":" + entry.id);
  if (!material) return "";
  const image = material.image || APP.visuals.sections[entry.type === "person" ? "people" : "traditions"];
  return `<article class="profile-card">${imageFigure(image,"profile-card-image")}<div class="profile-card-copy">${routeLink(material.route, material.title)}${removable ? `<button type="button" class="profile-remove" data-remove-type="${esc(entry.type)}" data-remove-id="${esc(entry.id)}" aria-label="${esc(material.title)} — сақталғандардан алып тастау">Алып тастау</button>` : ""}</div></article>`;
}
function profileSaved() {
  if (!APP.profile.saved.length) return `<div class="profile-empty"><p>Өзіңізге қызық материалдарды жинаңыз: ${routeLink("people","Ел тұлғалары")} мен ${routeLink("traditions","Салт-дәстүр")} бетіндегі «Сақтау» батырмасын басыңыз.</p></div>`;
  return Object.entries(PROFILE_TYPES).map(([type,title]) => {
    const entries = APP.profile.saved.filter(e => e.type === type);
    return entries.length ? `<h3>${title}</h3><div class="profile-grid">${entries.map(e=>profileCard(e,true)).join("")}</div>` : "";
  }).join("");
}
function profileIdentity() {
  const p = APP.profile;
  const zhuz = p.zhuz === "non-clan" ? "Руға жатпайтындар" : APP.profileTree.zhuzes.find(z => z.id === p.zhuz)?.name;
  const tribe = profileTribes(p.zhuz).find(t => t.id === p.tribe)?.name;
  return `<div class="profile-avatar" aria-hidden="true">${profileSymbol(p.name)}</div><div class="profile-identity-copy"><h1>${esc(p.name || "Профиль")}</h1><p class="profile-email">${esc(AUTH.user?.email || (AUTH.user ? "Тіркелгі" : "Қонақ"))}</p>${zhuz ? `<p>${esc(zhuz)}${tribe ? ", " + esc(tribe) : ""}</p>` : ""}${tribe ? routeLink("shezhire/" + encodeURIComponent(p.zhuz),"Шежіреден көру") : ""}</div><dl class="profile-counts"><div><dt>Сақталғандар</dt><dd data-profile-saved-count>${p.saved.length}</dd></div><div><dt>Қаралғандар</dt><dd>${p.recent.length}</dd></div></dl>`;
}
function tribeOptions(zhuz, selected = "") {
  return `<option value="">Таңдалмаған</option>` + profileTribes(zhuz).map(t => `<option value="${esc(t.id)}"${t.id === selected ? " selected" : ""}>${esc(t.name)}</option>`).join("");
}
const PROFILE_TABS = [["saved","Сақталғандар"],["recent","Соңғы қаралғандар"],["settings","Баптаулар"]];
function profileTabID(id) { return PROFILE_TABS.some(([key]) => key === id) ? id : "saved"; }
VIEWS.profile = {
  title:"Профиль",
  render(id) {
    const p = APP.profile;
    const active = profileTabID(id);
    const tabs = PROFILE_TABS.map(([key,title]) => `<button type="button" class="profile-tab" id="profile-tab-${key}" role="tab" aria-selected="${key === active}" aria-controls="profile-panel-${key}" tabindex="${key === active ? 0 : -1}" data-profile-tab="${key}">${title}</button>`).join("");
    const panel = (key, content) => `<section class="profile-panel" id="profile-panel-${key}" role="tabpanel" aria-labelledby="profile-tab-${key}" tabindex="0"${active === key ? "" : " hidden"}>${content}</section>`;
    const settings = `<div class="profile-settings"><form id="profileForm" class="profile-form"><h2>Профильді өңдеу</h2><label for="profileName">Атыңыз</label><input id="profileName" name="name" type="text" maxlength="60" autocomplete="given-name" value="${esc(p.name)}"><label for="profileZhuz">Жүзіңіз</label><select id="profileZhuz" name="zhuz"><option value="">Таңдалмаған</option>${[...APP.profileTree.zhuzes,{id:"non-clan",name:"Руға жатпайтындар"}].map(z => `<option value="${esc(z.id)}"${z.id === p.zhuz ? " selected" : ""}>${esc(z.name)}</option>`).join("")}</select><label for="profileTribe">Руыңыз</label><select id="profileTribe" name="tribe"${p.zhuz ? "" : " disabled"}>${tribeOptions(p.zhuz,p.tribe)}</select><button type="submit">Сақтау</button></form><section class="profile-account" aria-label="Тіркелгі"><h2>Тіркелгі</h2><div data-auth-account>${authAccountHTML()}</div></section><section class="profile-danger"><h2>${AUTH.user ? "Тіркелгі мен профильді өшіру" : "Профильді өшіру"}</h2><p>${AUTH.user ? "Тіркелгіңіз, бұлттағы және осы браузердегі профиль, сақталғандар мен қарау тарихы біржола өшіріледі." : "Атыңыз, жүз бен ру таңдауыңыз, сақталғандар және қарау тарихы осы браузерден өшіріледі."}</p><button id="deleteProfile" type="button">${AUTH.user ? "Тіркелгі мен профильді өшіру" : "Профильді өшіру"}</button></section></div>`;
    return `<header id="profileIdentity" class="profile-header">${profileIdentity()}</header>${AUTH.user ? "" : `<div class="profile-guest"><p>Тіркелсеңіз, сақталғандарыңыз басқа құрылғыда да ашылады</p>${routeLink("register","Тіркелу","button")}</div>`}<p data-auth-message role="status" aria-live="polite">${esc(AUTH.message)}</p><div class="profile-tabs" role="tablist" aria-label="Профиль бөлімдері">${tabs}</div>${panel("saved", `<h2>Сақталғандар</h2><div id="profileSaved">${profileSaved()}</div>`)}${panel("recent", `<h2>Соңғы қаралғандар</h2>${p.recent.length ? `<div class="profile-grid recent-grid">${p.recent.map(e=>profileCard(e)).join("")}</div>` : `<div class="profile-empty"><p>Тұлғаның өмірбаянын немесе дәстүрді ашсаңыз, соңғы қаралған материалдар осында көрінеді. ${routeLink("people","Ел тұлғалары")} мен ${routeLink("traditions","Салт-дәстүр")} бөлімінен бастаңыз.</p></div>`}`)}${panel("settings", settings)}`;
  },
  mount() {
    const tabs = Array.from(document.querySelectorAll("[data-profile-tab]"));
    const select = (key) => {
      for (const tab of tabs) {
        const selected = tab.dataset.profileTab === key;
        tab.setAttribute("aria-selected", String(selected)); tab.tabIndex = selected ? 0 : -1;
        document.getElementById("profile-panel-" + tab.dataset.profileTab).hidden = !selected;
      }
      if (location.hash !== "#profile/" + key) history.pushState(null, "", "#profile/" + key);
    };
    tabs.forEach((tab,index) => {
      tab.addEventListener("click", () => select(tab.dataset.profileTab));
      tab.addEventListener("keydown", event => {
        let next;
        if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
        if (event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
        if (event.key === "Home") next = 0;
        if (event.key === "End") next = tabs.length - 1;
        if (next === undefined) return;
        event.preventDefault(); select(tabs[next].dataset.profileTab); tabs[next].focus();
      });
    });
    const zhuz = document.getElementById("profileZhuz"), tribe = document.getElementById("profileTribe");
    zhuz.addEventListener("change", () => { tribe.innerHTML = tribeOptions(zhuz.value); tribe.disabled = !zhuz.value; });
    document.getElementById("profileForm").addEventListener("submit", event => {
      event.preventDefault();
      APP.profile = validateProfile({...APP.profile,name:document.getElementById("profileName").value,zhuz:zhuz.value,tribe:tribe.value});
      document.getElementById("profileName").value = APP.profile.name;
      document.getElementById("profileIdentity").innerHTML = profileIdentity();
      if (APP.persistProfile()) APP.toast("Профиль сақталды.");
    });
    document.getElementById("deleteProfile").addEventListener("click", async () => {
      if (!window.confirm(AUTH.user ? "Тіркелгіңізді, бұлттағы профильді және сақталған материалдарды біржола өшіресіз бе?" : "Профиль мен сақталған материалдарды осы браузерден өшіресіз бе?")) return;
      if (AUTH.user) { await APP.deleteAccount(); return; }
      let removed = true;
      try { localStorage.removeItem(PROFILE_KEY); } catch { removed = false; }
      APP.profile = emptyProfile(); APP.updateProfileButton();
      const page = document.querySelector("#view .page");
      page.innerHTML = VIEWS.profile.render("settings"); VIEWS.profile.mount();
      document.getElementById("profileName").focus();
      APP.toast(removed ? "Профиль өшірілді." : "Браузердегі профильді өшіру мүмкін болмады. Осы беттегі профиль тазартылды.");
    });
  }
};
document.addEventListener("click", event => {
  const button = event.target.closest("[data-save-type], [data-remove-type]");
  if (!button) return;
  const removing = button.hasAttribute("data-remove-type");
  const type = removing ? button.dataset.removeType : button.dataset.saveType;
  const id = removing ? button.dataset.removeId : button.dataset.saveId;
  if (!APP.materials.has(type + ":" + id)) return;
  const wasSaved = isSaved(type,id);
  if (!removing && !wasSaved && APP.profile.saved.length >= 200) { APP.toast("200 материал сақталған. Жаңа материал қосу үшін біреуін алып тастаңыз."); return; }
  APP.profile.saved = APP.profile.saved.filter(e => e.type !== type || e.id !== id);
  if (!removing && !wasSaved) APP.profile.saved.push({type,id});
  const persisted = APP.persistProfile();
  document.querySelectorAll("[data-save-type]").forEach(b => {
    const saved = isSaved(b.dataset.saveType,b.dataset.saveId);
    b.setAttribute("aria-pressed",String(saved)); b.textContent = saved ? "Сақталды" : "Сақтау";
  });
  const list = document.getElementById("profileSaved");
  const count = document.querySelector("[data-profile-saved-count]");
  if (count) count.textContent = String(APP.profile.saved.length);
  if (list) {
    list.innerHTML = profileSaved();
    const next = list.querySelector("button, a");
    if (next) next.focus();
  }
  if (persisted) APP.toast(removing || wasSaved ? "Сақталғандардан алынды." : "Материал сақталды.");
});

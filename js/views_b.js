"use strict";
function clanNode(value, key) {
  const match = String(value).match(/^(.*?)\s*\((.*)\)\s*$/);
  const name = match ? match[1] : String(value);
  const kids = match ? match[2].split(/,\s*/).filter(Boolean) : [];
  if (!kids.length) return `<li><span class="clan-leaf">${esc(name)}</span></li>`;
  return `<li><button type="button" class="clan-branch" aria-expanded="false" aria-controls="${esc(key)}" data-clan-toggle>${esc(name)}</button><ul id="${esc(key)}" class="clan-list" hidden>${kids.map((kid,i) => clanNode(kid, key + "-" + i)).join("")}</ul></li>`;
}
function clanPanel(t) {
  const kids = t.subclans || t.subgroups || [];
  const key = "clan-" + t.id;
  return `<article class="clan" data-clan="${esc(t.id)}"><button type="button" class="clan-branch" aria-expanded="false" aria-controls="${esc(key)}" data-clan-toggle>${esc(t.name)}</button><div id="${esc(key)}" hidden>${kids.length ? `<ul class="clan-list">${kids.map((kid,i) => clanNode(kid, key + "-" + i)).join("")}</ul>` : '<p class="fine">Тармақтары әзірге енгізілмеген.</p>'}</div></article>`;
}
const MY_SHEZHIRE_KEY = "dastan-my-shezhire";
const MY_SHEZHIRE_FIELDS = [["self","Сіздің атыңыз"],["a1","1-ата: әкеңіз"],["a2","2-ата: атаңыз"],["a3","3-ата"],["a4","4-ата"],["a5","5-ата"],["a6","6-ата"],["a7","7-ата"]];
function myShezhireTribes(d) {
  return d.zhuzes.flatMap(z => z.branches.flatMap(b => b.tribes.map(t => ({zhuz:z.name, name:t.name}))));
}
function myShezhireChain(state) {
  const names = MY_SHEZHIRE_FIELDS.map(([key,label]) => ({key, label, name:String(state?.[key] || "").trim().slice(0,40)})).filter(item => item.name);
  const top = [state?.zhuz, state?.tribe].filter(Boolean).map(name => ({key:"root", label:"", name}));
  return [...top, ...names.reverse()];
}
function myShezhireSection(d) {
  const tribes = myShezhireTribes(d);
  return `<section class="my-shezhire" aria-labelledby="myShezhireTitle"><h2 id="myShezhireTitle">Менің шежірем</h2><p>Жеті атаңызды жазыңыз: сайт шежіре ағашын құрып береді. Қазақ дәстүрінде әр адам жеті атасын білуге тиіс, жеті атаға толмай қыз алыспайды. Деректер тек осы браузерде сақталады, ешқайда жіберілмейді.</p><div class="my-shezhire-grid"><form id="myShezhireForm" class="my-shezhire-form"><label for="myTribe">Руыңыз</label><select id="myTribe" name="tribe"><option value="">Таңдаңыз</option>${tribes.map(t => `<option value="${esc(t.name)}" data-zhuz="${esc(t.zhuz)}">${esc(t.name)} (${esc(t.zhuz)})</option>`).join("")}</select>${MY_SHEZHIRE_FIELDS.map(([key,label]) => `<label for="my-${key}">${esc(label)}</label><input id="my-${key}" name="${key}" maxlength="40" autocomplete="off" data-lab-skip>`).join("")}<div class="my-shezhire-actions"><button type="submit">Шежіре құру</button><button type="button" class="button-light" id="myShezhireSave">Суретке сақтау</button><button type="button" class="button-light" id="myShezhireClear">Тазалау</button></div></form><ol id="myShezhireTree" class="my-shezhire-tree" aria-live="polite"></ol></div></section>`;
}
function setupMyShezhire() {
  const form = document.getElementById("myShezhireForm"), tree = document.getElementById("myShezhireTree");
  if (!form || !tree) return;
  const read = () => { try { return JSON.parse(localStorage.getItem(MY_SHEZHIRE_KEY)) || {}; } catch { return {}; } };
  const write = value => { try { localStorage.setItem(MY_SHEZHIRE_KEY, JSON.stringify(value)); } catch {} };
  const collect = () => { const state = Object.fromEntries(new FormData(form)); state.zhuz = form.tribe.selectedOptions[0]?.dataset.zhuz || ""; return state; };
  const draw = state => {
    const chain = myShezhireChain(state);
    tree.innerHTML = chain.length ? chain.map((item,i) => `<li class="${item.key === "self" ? "is-self" : item.key === "root" ? "is-root" : ""}" style="--i:${i}">${item.label ? `<small>${esc(item.label)}</small>` : ""}<b>${esc(item.name)}</b></li>`).join("") : '<li class="is-empty">Атыңызды жазып, «Шежіре құру» батырмасын басыңыз.</li>';
  };
  const saved = read();
  for (const [key,value] of Object.entries(saved)) if (form.elements[key]) form.elements[key].value = value;
  draw(saved);
  form.addEventListener("submit", event => { event.preventDefault(); const state = collect(); write(state); draw(state); });
  document.getElementById("myShezhireClear").addEventListener("click", () => { form.reset(); try { localStorage.removeItem(MY_SHEZHIRE_KEY); } catch {} draw({}); });
  document.getElementById("myShezhireSave").addEventListener("click", () => {
    const chain = myShezhireChain(collect());
    if (!chain.length) return;
    const canvas = document.createElement("canvas"), row = 74;
    canvas.width = 720; canvas.height = 120 + chain.length * row;
    const c = canvas.getContext("2d");
    c.fillStyle = "#ffffff"; c.fillRect(0,0,canvas.width,canvas.height);
    c.fillStyle = "#0B1220"; c.textAlign = "center"; c.font = "800 34px Onest, sans-serif"; c.fillText("Менің шежірем", 360, 56);
    chain.forEach((item,i) => {
      const y = 96 + i * row;
      if (i) { c.strokeStyle = "#00806C"; c.lineWidth = 3; c.beginPath(); c.moveTo(360,y - 22); c.lineTo(360,y); c.stroke(); }
      c.fillStyle = item.key === "self" ? "#00806C" : "#E6F7F3"; c.fillRect(160,y,400,50);
      c.fillStyle = item.key === "self" ? "#ffffff" : "#0B1220"; c.font = "700 22px Onest, sans-serif"; c.fillText(item.name, 360, y + 33);
    });
    const link = document.createElement("a"); link.download = "menin-shezhirem.png"; link.href = canvas.toDataURL("image/png"); link.click();
  });
}
function zhuzPanel(z) {
  return `<section class="zhuz-panel" data-zhuz="${esc(z.id)}" hidden><h2>${esc(z.name)}</h2><div class="clan-grid">${z.branches.flatMap(b => b.tribes).map(t => clanPanel(t)).join("")}</div></section>`;
}
VIEWS.shezhire = {
  title: "Шежіре",
  async render() {
    const d = await APP.cachedJSON("data/shezhire.json");
    return heading("Шежіре", d.intro_kk) + `${myShezhireSection(d)}<aside class="notice">${esc(d.variants_note_kk)}</aside><p class="fine">Өз руыңыздың толық шежіресін ${sourceLink("https://tumalas.kz/","tumalas.kz")} сайтынан қарай аласыз.</p><label for="clanSearch">Ру немесе ата атауын іздеу</label><input id="clanSearch" type="search" placeholder="Мысалы: Дулат, Сиқым"><p id="clanStatus" role="status" aria-live="polite"></p><div class="family-tree"><div class="tree-root">Қазақ</div><div class="tree-branches">${[...d.zhuzes, {id:"non-clan",name:"Руға жатпайтындар",image:d.non_clan_image}].map(z => `<div class="zhuz-choice">${imageFigure(z.image)}<button class="zhuz-toggle" type="button" data-zhuz-toggle="${esc(z.id)}" aria-expanded="false" aria-controls="zhuz-${esc(z.id)}"><span class="panel-title">${esc(z.name)}</span></button></div>`).join("")}</div></div>${d.zhuzes.map(zhuzPanel).join("")}<section class="zhuz-panel" data-zhuz="non-clan" hidden><h2>Руға жатпайтындар</h2>${d.non_clan.map(t => clanPanel(t,true)).join("")}</section><p class="fine">${esc(d.source_note_kk)}</p>`;
  },
  async mount(id) {
    const d = await APP.cachedJSON("data/shezhire.json");
    if (!document.getElementById("clanSearch")) return;
    setupMyShezhire();
    const panels = [...document.querySelectorAll("[data-zhuz]")];
    const buttons = [...document.querySelectorAll("[data-zhuz-toggle]")];
    panels.forEach(p => { p.id = "zhuz-" + p.dataset.zhuz; });
    let selected = id || d.zhuzes[0].id;
    function select(key, update = true) {
      selected = key;
      panels.forEach(p => { p.hidden = p.dataset.zhuz !== key; });
      buttons.forEach(b => b.setAttribute("aria-expanded", String(b.dataset.zhuzToggle === key)));
      if (update) history.replaceState(null,"", "#shezhire/" + encodeURIComponent(key));
    }
    buttons.forEach(b => b.addEventListener("click", () => { if (b.getAttribute("aria-expanded") === "true") { panels.forEach(p => { p.hidden = true; }); b.setAttribute("aria-expanded","false"); history.replaceState(null,"","#shezhire"); return; } document.getElementById("clanSearch").value = ""; document.getElementById("clanStatus").textContent = ""; document.querySelectorAll("[data-clan]").forEach(c => { c.hidden = false; }); select(b.dataset.zhuzToggle); }));
    document.querySelectorAll("[data-clan-toggle]").forEach(b => b.addEventListener("click", () => {
      const open = b.getAttribute("aria-expanded") !== "true";
      b.setAttribute("aria-expanded", String(open)); document.getElementById(b.getAttribute("aria-controls")).hidden = !open;
    }));
    if (panels.some(p=>p.dataset.zhuz === id)) select(id,false);
    const all = [...d.zhuzes.flatMap(z=>z.branches.flatMap(b=>b.tribes.map(t=>({...t,zhuz:z.id})))), ...d.non_clan.map(t=>({...t,zhuz:"non-clan"}))];
    document.getElementById("clanSearch").addEventListener("input", e => {
      const q = e.target.value.trim().toLocaleLowerCase("kk");
      if (!q) { document.querySelectorAll("[data-clan]").forEach(c=>{c.hidden=false;}); select(selected,false); document.getElementById("clanStatus").textContent=""; return; }
      const matches = all.filter(t=>[t.name,...(t.subclans || t.subgroups || [])].join(" ").toLocaleLowerCase("kk").includes(q));
      panels.forEach(p=>{p.hidden=!matches.some(t=>t.zhuz===p.dataset.zhuz);});
      buttons.forEach(b=>b.setAttribute("aria-expanded", String(matches.some(t=>t.zhuz===b.dataset.zhuzToggle))));
      document.querySelectorAll("[data-clan]").forEach(c=>{
        const match=matches.some(t=>t.id===c.dataset.clan); c.hidden=!match;
        const b=c.querySelector("button"); b.setAttribute("aria-expanded",String(match)); document.getElementById(b.getAttribute("aria-controls")).hidden=!match;
      });
      document.getElementById("clanStatus").textContent=matches.length ? `${matches.length} ру немесе топ табылды.` : "Ру немесе ата табылмады. Басқа атаумен іздеп көріңіз.";
    });
  }
};
VIEWS.credits = {
  title: "Суреттер мен дереккөздер",
  async render() {
    const topics = await APP.cachedJSON("content_topics.json");
    const articles = await Promise.all(topics.map(t=>APP.cachedJSON(`data/${t.category}/${t.id}.json`)));
    const entries = [...APP.data.people.map(p=>({title:p.name,source_url:p.wiki_url})),...APP.data.traditions.map(t=>({title:t.name,source_url:t.source_url || t.wiki_url})),...APP.data.timeline.map(t=>({title:t.title_kk,source_url:t.source_url})),...articles];
    const full = await Promise.all([...APP.data.people.map(p=>"people_"+p.id),...APP.data.traditions.map(t=>"trad_"+t.id),...articles.map(a=>"art_"+a.id),...APP.data.timeline.map(t=>"tl_"+t.year),...LANGUAGE_ARTICLES.map(([id])=>"lang_"+id)].map(optionalFull));
    [...entries,...full.filter(Boolean)].forEach(d=>{if(d.source_url) APP.sources.set(d.source_url,d.title);});
    return heading("Суреттер мен дереккөздер", "Мәтіндер мен суреттердің авторлығы және пайдалану шарттары.") + `<section><h2>Тарихи карталар</h2><p>Кезең шекаралары: historical-basemaps (A. Ourednik), GPL-3.0 лицензиясы. Шекаралар шамамен берілген.</p></section><section><h2>Мәтін дереккөздері</h2><p>Қазақ Уикипедиясы мәтіндері CC BY-SA 4.0 лицензиясымен берілген. Редакциялық мәтіндердің шарттары төменде көрсетілген.</p><ul class="source-list">${[...APP.sources].map(([url,title])=>`<li>${esc(title)} — ${sourceLink(url,"Мақала URL-і")}</li>`).join("")}</ul>${articles.filter(a=>a.source_name!=="Қазақ Уикипедиясы").map(a=>`<p class="fine">${esc(a.title)}: ${esc(a.source_name)}, ${esc(a.license)}</p>`).join("")}</section><section><h2>Қаріп лицензиялары</h2><p>Piazzolla және Golos Text қаріптері SIL Open Font License (SIL OFL) лицензиясымен пайдаланылады.</p></section><section><h2>Суреттер</h2><div class="credits-grid">${APP.credits.map((c,i)=>`<article class="patch">${imageFigure(c.path,"",i===0)}<div class="patch-body">${sourceLink(c.source_url,"Сурет дереккөзі")} ${sourceLink(c.license_url,c.license)}</div></article>`).join("")}</div></section>`;
  }
};

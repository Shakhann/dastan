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
function zhuzPanel(z) {
  return `<section class="zhuz-panel" data-zhuz="${esc(z.id)}" hidden><h2>${esc(z.name)}</h2><div class="clan-grid">${z.branches.flatMap(b => b.tribes).map(t => clanPanel(t)).join("")}</div></section>`;
}
VIEWS.shezhire = {
  title: "Шежіре",
  async render() {
    const d = await APP.cachedJSON("data/shezhire.json");
    return heading("Шежіре", d.intro_kk) + `<aside class="notice">${esc(d.variants_note_kk)}</aside><label for="clanSearch">Ру немесе ата атауын іздеу</label><input id="clanSearch" type="search" placeholder="Мысалы: Дулат, Сиқым"><p id="clanStatus" role="status" aria-live="polite"></p><div class="family-tree"><div class="tree-root">Қазақ</div><div class="tree-branches">${[...d.zhuzes, {id:"non-clan",name:"Руға жатпайтындар",image:d.non_clan_image}].map(z => `<div class="zhuz-choice">${imageFigure(z.image)}<button class="zhuz-toggle" type="button" data-zhuz-toggle="${esc(z.id)}" aria-expanded="false" aria-controls="zhuz-${esc(z.id)}"><span class="panel-title">${esc(z.name)}</span></button></div>`).join("")}</div></div>${d.zhuzes.map(zhuzPanel).join("")}<section class="zhuz-panel" data-zhuz="non-clan" hidden><h2>Руға жатпайтындар</h2>${d.non_clan.map(t => clanPanel(t,true)).join("")}</section><p class="fine">${esc(d.source_note_kk)}</p>`;
  },
  async mount(id) {
    const d = await APP.cachedJSON("data/shezhire.json");
    if (!document.getElementById("clanSearch")) return;
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
    buttons.forEach(b => b.addEventListener("click", () => { document.getElementById("clanSearch").value = ""; document.getElementById("clanStatus").textContent = ""; document.querySelectorAll("[data-clan]").forEach(c => { c.hidden = false; }); select(b.dataset.zhuzToggle); }));
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
    return heading("Суреттер мен дереккөздер", "Мәтіндер мен суреттердің авторлығы және пайдалану шарттары.") + `<section><h2>Мәтін дереккөздері</h2><p>Қазақ Уикипедиясы мәтіндері CC BY-SA 4.0 лицензиясымен берілген. Редакциялық мәтіндердің шарттары төменде көрсетілген.</p><ul class="source-list">${[...APP.sources].map(([url,title])=>`<li>${esc(title)} — ${sourceLink(url,"Мақала URL-і")}</li>`).join("")}</ul>${articles.filter(a=>a.source_name!=="Қазақ Уикипедиясы").map(a=>`<p class="fine">${esc(a.title)}: ${esc(a.source_name)}, ${esc(a.license)}</p>`).join("")}</section><section><h2>Қаріп лицензиялары</h2><p>Piazzolla және Golos Text қаріптері SIL Open Font License (SIL OFL) лицензиясымен пайдаланылады.</p></section><section><h2>Суреттер</h2><div class="credits-grid">${APP.credits.map((c,i)=>`<article class="patch">${imageFigure(c.path,"",i===0)}<div class="patch-body">${sourceLink(c.source_url,"Сурет дереккөзі")} ${sourceLink(c.license_url,c.license)}</div></article>`).join("")}</div></section>`;
  }
};

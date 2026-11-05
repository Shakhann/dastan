/* ============ ДАСТАН — app.js ============ */
/* Router, progress (localStorage), speak (edge-tts mp3 + Web Speech API fallback),
   view-тер (home, dict, gram, read, voice, quiz, proverbs, jyr, twisters, culture, ornaments, encyclopedia, progress). */
"use strict";

const APP = {};

/* ============ PROGRESS (localStorage) ============ */
const PKEY = "dastan.v1";
APP.progress = {
  defaults(){ return {name:"", avatar:"🦁", xp:0, level:0, streak:0, lastDate:"", done:{}, badges:[], learned:{}}; },
  validate(d){
    const plain = x => x && typeof x === "object" && !Array.isArray(x);
    if(!plain(d)) throw new Error("Прогресс нысан болуы керек");
    const p = APP.progress.defaults();
    const fail = ()=>{ throw new Error("Прогресс пішімі жарамсыз"); };
    if(d.name !== undefined){ if(typeof d.name !== "string" || d.name.length > 24) fail(); p.name=d.name; }
    if(d.avatar !== undefined){ if(!["🦁","🦅","🐺","🦌","🐎","🐫","🐏","🦉"].includes(d.avatar)) fail(); p.avatar=d.avatar; }
    for(const k of ["xp","streak","level"]){
      if(d[k] !== undefined && (!Number.isSafeInteger(d[k]) || d[k]<0)) fail();
      if(d[k] !== undefined) p[k]=d[k];
    }
    p.level=APP.progress.levelFor(p.xp);
    if(d.lastDate !== undefined){ if(typeof d.lastDate!=="string" || (d.lastDate!=="" && !/^\d{4}-\d{2}-\d{2}$/.test(d.lastDate))) fail(); p.lastDate=d.lastDate; }
    for(const k of ["done","learned"]){
      if(d[k] === undefined) continue;
      if(!plain(d[k])) fail();
      for(const [key,value] of Object.entries(d[k])){
        if(k==="done"){
          if(!/^quiz_[123]$/.test(key) || !Number.isInteger(value) || value<0 || value>100) fail();
        }else if(!DICT.some(x=>String(x.id)===key) || typeof value!=="boolean") fail();
        p[k][key]=value;
      }
    }
    if(d.badges !== undefined){
      if(!Array.isArray(d.badges) || !d.badges.every(x=>typeof x==="string" && x.length<=100)) fail();
      p.badges=d.badges.slice();
    }
    return p;
  },
  load(){
    try{ const raw=localStorage.getItem(PKEY); if(raw) return APP.progress.validate(JSON.parse(raw)); }
    catch(e){ console.warn("progress load fail", e); }
    return APP.progress.defaults();
  },
  importText(text){
    const next=APP.progress.validate(JSON.parse(text));
    APP.p=next;
    APP.progress.saveProgress();
  },
  save(p){ try{ localStorage.setItem(PKEY, JSON.stringify(p)); }catch(e){ console.warn("save fail", e); } },
  addXP(p,n){ p.xp += n; const lv = APP.progress.levelFor(p.xp);
    if(lv > p.level){ p.level = lv; APP.toast(`Дәреже өсті! ${APP.LEVELS[lv]}`); }
    APP.progress.saveProgress();
  },
  levelFor(xp){ return Math.min(4, Math.floor(xp/100)); },
  saveProgress(){ APP.progress.save(APP.p); APP.updateSidebar(); }
};
APP.LEVELS = ["Бастаушы","Үйренуші","Білгір","Шебер","Дана"];
APP.p = APP.progress.load();

/* streak: бүгінгі дата соңғы датамен салыстырылып, streak жаңартылады */
APP.streak = {
  run(){
    const now = new Date();
    const dayKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    const today = dayKey(now);
    if(APP.p.lastDate === today) return;
    const previous = new Date(now); previous.setDate(previous.getDate()-1);
    const yest = dayKey(previous);
    if(APP.p.lastDate === yest) APP.p.streak += 1;
    else if(APP.p.lastDate !== today) APP.p.streak = 1;
    APP.p.lastDate = today;
    APP.progress.save(APP.p);
    APP.updateSidebar();
  }
};

/* ============ SPEAK ============ */
/* 1) дайын MP3 (edge-tts) 2) Web Speech API kk-KZ 3) fallback (русская транскрипция) */
const KK_MAP = {
  ә:"е", қ:"г", ғ:"г", ң:"нг", ө:"о", ұ:"у", ү:"ы", і:"и", һ:"х",
  Ә:"Е", Қ:"Г", Ғ:"Г", Ң:"Нг", Ө:"О", Ұ:"У", Ү:"Ы", І:"И", Һ:"Х"
};
function toRuKk(text){
  let out = "";
  for(const ch of text){
    out += KK_MAP[ch] || ch;
  }
  return out;
}
APP.audioCache = {};
async function speak(text, key){
  if(!text) return;
  const fallback = ()=>{
    try{
      if(!window.speechSynthesis) throw new Error("Дауыс жоқ");
      const u=new SpeechSynthesisUtterance(toRuKk(text));
      u.lang="ru-RU"; u.rate=0.9;
      const ru=window.speechSynthesis.getVoices().find(v=>/^ru/i.test(v.lang));
      if(ru) u.voice=ru;
      u.onerror=()=>APP.toast("Дыбыстау қолжетімсіз. Қайта басып көріңіз.");
      window.speechSynthesis.speak(u);
    }catch(e){ APP.toast("Дыбыстау қолжетімсіз. Қайта басып көріңіз."); }
  };
  const tts = ()=>{
    try{
      const kk=window.speechSynthesis.getVoices().find(v=>/^kk(?:[-_]|$)/i.test(v.lang));
      if(!kk){ fallback(); return; }
      const u=new SpeechSynthesisUtterance(text);
      u.lang="kk-KZ"; u.voice=kk; u.rate=0.92;
      u.onerror=fallback;
      window.speechSynthesis.speak(u);
    }catch(e){ fallback(); }
  };
  const k=key || text;
  try{
    let a=APP.audioCache[k];
    if(!a){
      const r=await fetch("audio/manifest.json");
      if(r.ok){
        const m=await r.json();
        if(typeof m[k]==="string") a=APP.audioCache[k]=new Audio("audio/"+m[k]);
      }
    }
    if(a){
      let failed=false;
      const onFailure=()=>{ if(!failed){ failed=true; a.onerror=null; tts(); } };
      a.onerror=onFailure; a.currentTime=0;
      try{ await a.play(); }catch(e){ onFailure(); }
      return;
    }
  }catch(e){}
  tts();
}
// voices cache
if("speechSynthesis" in window){
  window.speechSynthesis.onvoiceschanged = ()=>window.speechSynthesis.getVoices();
}

/* ============ TOAST ============ */
let _toastEl=null;
APP.toast = function(msg){
  if(!_toastEl){
    _toastEl = document.createElement("div");
    _toastEl.style.cssText = "position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:100;background:#0B1F3A;color:#fff;padding:12px 20px;border-radius:14px;font-weight:700;font-size:14px;box-shadow:0 8px 24px rgba(0,0,0,.18);opacity:0;pointer-events:none;transition:opacity .25s,transform .25s";
    document.body.appendChild(_toastEl);
  }
  _toastEl.textContent = msg;
  _toastEl.style.opacity = "1";
  _toastEl.style.transform = "translateX(-50%) translateY(-6px)";
  clearTimeout(_toastEl._t);
  _toastEl._t = setTimeout(()=>{ _toastEl.style.opacity="0"; _toastEl.style.transform="translateX(-50%)"; }, 2200);
};

/* ============ SIDEBAR ============ */
const NAV = [
  {grp:"ТІЛ", items:[
    {id:"home",ic:"🏠",t:"Басты бет"},
    {id:"dict",ic:"📖",t:"Сөздік"},
    {id:"gram",ic:"✏️",t:"Грамматика"},
    {id:"read",ic:"📄",t:"Оқу"},
    {id:"voice",ic:"🎙️",t:"Дауыс зертханасы"},
    {id:"quiz",ic:"✅",t:"Тест"},
  ]},
  {grp:"МӘДЕНИЕТ", items:[
    {id:"makan",ic:"🎭",t:"Мәдениет (бас)"},
    {id:"proverbs",ic:"📜",t:"Мақал-мәтел"},
    {id:"jyr",ic:"🎻",t:"Жыр-дастан"},
    {id:"twisters",ic:"🌀",t:"Жаңылтпаш"},
    {id:"culture",ic:"🍽️",t:"Мәдени мұра"},
    {id:"ornaments",ic:"🪡",t:"Ою-өрнек"},
  ]},
  {grp:"ҒЫЛЫМ", items:[
    {id:"encyclopedia",ic:"🔎",t:"Энциклопедия"},
  ]},
  {grp:"ЖЕКЕ", items:[
    {id:"progress",ic:"⭐",t:"Прогресс"},
  ]},
];

APP.renderNav = function(){
  const html = NAV.map(g=>`<div class="sb-grp">${g.grp}</div>` +
    g.items.map(it=>`<button class="sb-item" data-mod="${it.id}"><span class="ic">${it.ic}</span>${it.t}</button>`).join("")
  ).join("");
  document.getElementById("sbNav").innerHTML = html;
  document.getElementById("shNav").innerHTML = html;
  // events
  document.querySelectorAll(".sb-item[data-mod], .tb-btn[data-mod]").forEach(b=>{
    b.addEventListener("click",()=>{ APP.go(b.dataset.mod); closeSheet(); });
  });
};
APP.updateSidebar = function(){
  document.getElementById("sbName").textContent = APP.p.name || "Қонақ";
  document.getElementById("sbAvatar").textContent = APP.p.avatar || "🦁";
  document.getElementById("tbAvatar").textContent = APP.p.avatar || "🦁";
  document.getElementById("sbStreak").textContent = `🔥 ${APP.p.streak} күн · ${APP.LEVELS[APP.p.level]}`;
};

/* ============ SHEET (mobile) ============ */
let panelFocus=null;
function setPanel(id, open){
  const panel=document.getElementById(id);
  if(open){
    if(document.querySelector("#sheet.open, #profSheet.open")) return;
    panelFocus=document.activeElement;
  }
  panel.classList.toggle("open",open);
  panel.setAttribute("aria-hidden",String(!open));
  panel.inert=!open;
  document.getElementById("app").inert=open;
  document.getElementById("scrim").classList.toggle("on",open);
  if(open) panel.querySelector("button, input").focus();
  else if(panelFocus){ panelFocus.focus(); panelFocus=null; }
}
function openSheet(){ setPanel("sheet",true); }
function closeSheet(){ if(document.getElementById("sheet").classList.contains("open")) setPanel("sheet",false); }
function openProf(){
  document.getElementById("inpName").value=APP.p.name || "";
  renderAvatarOpts(); setPanel("profSheet",true);
}
function closeProf(){ if(document.getElementById("profSheet").classList.contains("open")) setPanel("profSheet",false); }
document.addEventListener("keydown",e=>{
  const panel=document.querySelector("#sheet.open, #profSheet.open");
  if(!panel) return;
  if(e.key==="Escape"){ closeSheet(); closeProf(); }
  if(e.key==="Tab"){
    const nodes=Array.from(panel.querySelectorAll("button, input, a[href]")).filter(x=>!x.disabled);
    const first=nodes[0], last=nodes[nodes.length-1];
    if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); }
  }
});
function renderAvatarOpts(){
  const opts = ["🦁","🦅","🐺","🦌","🐎","🐫","🐏","🦉"];
  const el = document.getElementById("avatarOpts");
  el.innerHTML = opts.map(a=>`<button data-a="${a}" class="${a===APP.p.avatar?'sel':''}">${a}</button>`).join("");
  el.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{
    APP.p.avatar = b.dataset.a; APP.progress.save(APP.p); APP.updateSidebar(); renderAvatarOpts();
  }));
}

/* ============ ROUTER ============ */
const VIEWS = {};
APP.currentView=null;
APP.navigation=0;
function go(id){
  id=Object.hasOwn(VIEWS,id)?id:"home";
  const hash="#"+id;
  if(location.hash!==hash) history.pushState(null,"",hash);
  if(APP.currentView && VIEWS[APP.currentView].unmount) VIEWS[APP.currentView].unmount();
  APP.currentView=id;
  const version=++APP.navigation;
  const v=VIEWS[id], main=document.getElementById("view");
  const draw=()=>{
    main.innerHTML=`<div class="view-anim">${v.render()}</div>`;
    if(v.mount) v.mount();
    APP.bindFlips(main);
    const retry=main.querySelector("[data-retry]");
    if(retry) retry.addEventListener("click",()=>{ APP.dataState[id]={status:"idle"}; go(id); });
  };
  if(v.load && !APP.dataState[id]) APP.dataState[id]={status:"idle"};
  draw();
  document.getElementById("main").scrollTop=0;
  document.querySelectorAll(".sb-item, .tb-btn").forEach(b=>b.classList.toggle("active",b.dataset.mod===id));
  if(v.load){
    const state=APP.dataState[id];
    if(state.status==="idle"){
      state.status="loading";
      state.promise=v.load().then(()=>{ state.status="ready"; },()=>{ state.status="error"; });
    }
    if(state.status==="loading") state.promise.then(()=>{
      if(APP.currentView===id && APP.navigation===version) draw();
    });
  }
}
APP.routeFromHash=()=>{
  const id=location.hash.slice(1);
  if(!Object.hasOwn(VIEWS,id)) history.replaceState(null,"","#home");
  go(Object.hasOwn(VIEWS,id)?id:"home");
};
window.addEventListener("hashchange",APP.routeFromHash);
APP.dataState={};
APP.fetchArticles=async paths=>Promise.all(paths.map(async path=>{
  const r=await fetch(path);
  if(!r.ok) throw new Error("Жүктеу қатесі");
  const d=await r.json();
  if(!d || typeof d.id!=="string" || typeof d.title!=="string" || typeof d.text!=="string") throw new Error("Дерек пішімі қате");
  return d;
}));
APP.loadMessage=id=>{
  const state=APP.dataState[id];
  if(state && state.status==="error") return `<div class="card" role="alert">Деректерді жүктеу мүмкін болмады. <button class="btn primary" data-retry>Қайта көру</button></div>`;
  return `<div class="card" role="status">Деректер жүктелуде…</div>`;
};
APP.bindFlips=root=>root.querySelectorAll(".flip-card").forEach(c=>{
  const button=document.createElement("button");
  button.className="btn flip-toggle"; button.textContent="Карточканы аудару";
  button.setAttribute("aria-pressed","false");
  const sync=()=>{
    const flipped=c.classList.contains("flipped");
    button.setAttribute("aria-pressed",String(flipped));
    c.querySelector(".fc-front").inert=flipped;
    c.querySelector(".fc-back").inert=!flipped;
  };
  const flip=()=>{ c.classList.toggle("flipped"); sync(); }; sync();
  button.addEventListener("click",flip); c.appendChild(button);
  c.addEventListener("click",e=>{ if(!e.target.closest("button")) flip(); });
});
APP.go = go;

/* ============ HELPERS ============ */
function el(html){ const d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstElementChild; }
function esc(s){ return String(s ?? "").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

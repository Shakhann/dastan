/* ============ ДАСТАН — app.js ============ */
/* Router, progress (localStorage), speak (edge-tts mp3 + Web Speech API fallback),
   view-тер (home, dict, gram, read, voice, quiz, proverbs, jyr, twisters, culture, ornaments, encyclopedia, progress). */
"use strict";

const APP = {};

/* ============ PROGRESS (localStorage) ============ */
const PKEY = "dastan.v1";
APP.progress = {
  load(){
    try{
      const raw = localStorage.getItem(PKEY);
      if(raw){ const d = JSON.parse(raw);
        return Object.assign({
          name:"", avatar:"🦁", xp:0, level:0, streak:0, lastDate:"",
          done:{}, badges:[], learned:{}
        }, d);
      }
    }catch(e){ console.warn("progress load fail", e); }
    return { name:"", avatar:"🦁", xp:0, level:0, streak:0, lastDate:"", done:{}, badges:[], learned:{} };
  },
  save(p){ try{ localStorage.setItem(PKEY, JSON.stringify(p)); }catch(e){ console.warn("save fail", e); } },
  addXP(p,n){ p.xp += n; const lv = APP.levelFor(p.xp);
    if(lv > p.level){ p.level = lv; APP.toast(`Дәреже өсті! ${APP.LEVELS[lv]}`); }
    APP.saveProgress();
  },
  levelFor(xp){ return Math.min(4, Math.floor(xp/100)); },
  saveProgress(){ APP.progress.save(APP.p); APP.updateSidebar(); }
};
APP.LEVELS = ["Бастаушы","Үйренуші","Білгір","Шебер","Дана"];
APP.p = APP.progress.load();

/* streak: бүгінгі дата соңғы датамен салыстырылып, streak жаңартылады */
APP.streak = {
  run(){
    const today = new Date().toISOString().slice(0,10);
    if(APP.p.lastDate === today) return;
    const yest = new Date(Date.now()-864e5).toISOString().slice(0,10);
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
  // 1) MP3
  const k = key || text;
  if(APP.audioCache[k]){ APP.audioCache[k].currentTime = 0; APP.audioCache[k].play().catch(()=>{}); return; }
  try{
    const r = await fetch("audio/manifest.json");
    if(r.ok){
      const m = await r.json();
      const file = (m[k] || m._) ? m[k] : null;
      if(file){
        const a = new Audio("audio/" + file);
        APP.audioCache[k] = a;
        a.play().catch(()=>{});
        return;
      }
    }
  }catch(e){}
  // 2) Web Speech API kk-KZ
  try{
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "kk-KZ";
    u.rate = 0.92;
    const voices = window.speechSynthesis.getVoices();
    const kk = voices.find(v=>/kk[-_]KZ/i.test(v.lang)) || voices.find(v=>/kk/i.test(v.lang));
    if(kk) u.voice = kk;
    window.speechSynthesis.speak(u);
    return;
  }catch(e){}
  // 3) Fallback: орыс транскрипция + орыс дауыс
  try{
    const u = new SpeechSynthesisUtterance(toRuKk(text));
    u.lang = "ru-RU";
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  }catch(e){ console.warn("speak fallback fail", e); }
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
  document.querySelectorAll(".sb-item[data-mod]").forEach(b=>{
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
function openSheet(){ document.getElementById("sheet").classList.add("open"); document.getElementById("scrim").classList.add("on"); }
function closeSheet(){ document.getElementById("sheet").classList.remove("open"); document.getElementById("scrim").classList.remove("on"); }
function openProf(){ document.getElementById("profSheet").classList.add("open"); document.getElementById("scrim").classList.add("on");
  document.getElementById("inpName").value = APP.p.name || "";
  renderAvatarOpts();
}
function closeProf(){ document.getElementById("profSheet").classList.remove("open"); document.getElementById("scrim").classList.remove("on"); }
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
function go(id){
  const v = VIEWS[id] || VIEWS.home;
  const main = document.getElementById("view");
  main.innerHTML = `<div class="view-anim">${v.render()}</div>`;
  v.mount && v.mount();
  document.getElementById("main").scrollTop = 0;
  // active nav
  document.querySelectorAll(".sb-item").forEach(b=>b.classList.toggle("active", b.dataset.mod === id));
  document.querySelectorAll(".tb-btn").forEach(b=>b.classList.toggle("active", b.dataset.mod === id));
  // async content: read/jyr/culture мәліметін жүктеп, қайта рендерлеу
  if(id === "read" && !_readData){ loadRead().then(()=>go("read")); }
  if(id === "jyr" && !_jyrData){ loadJyr().then(()=>go("jyr")); }
  if(id === "culture" && !_cultureData.taam.length){ loadCulture().then(()=>go("culture")); }
}
APP.go = go;

/* ============ HELPERS ============ */
function el(html){ const d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstElementChild; }
function esc(s){ return String(s||"").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

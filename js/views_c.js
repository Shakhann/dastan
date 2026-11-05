/* ==== views_c.js: jyr, twisters, culture, ornaments, encyclopedia, progress, makan ==== */

/* ---------- JYR (жырлар мен әдеби мұра) ---------- */
let _jyrData = null;
async function loadJyr(){
  if(_jyrData && _jyrData.length) return _jyrData;
  const ids = ["kobylandy","er_tostik","kozy_korpeshi","qyz_zhibek","abai_poeziya"];
  _jyrData=await APP.fetchArticles(ids.map(id=>`data/jyr/${id}.json`));
  return _jyrData;
}
VIEWS.jyr = {
  load:loadJyr,
  render(){
    if(!_jyrData) return APP.loadMessage("jyr");
    if(!_jyrData.length) return `<div class="card">Жырлар табылмады. <button class="btn" data-retry>Қайта көру</button></div>`;
    return `
      <div class="v-head">
        <div class="v-eyebrow">Мәдениет · Жыр-дастан</div>
        <h1 class="v-title">Жырлар мен әдеби мұра</h1>
        <p class="v-sub">${_jyrData.length} әдеби тақырып · Лицензиясы әр мәтінде көрсетілген</p>
      </div>
      <div class="grid grid-2" style="margin-bottom:16px">
        ${_jyrData.map((d,i)=>`
          <button class="card jyr-card" data-j="${i}">
            <div class="rc-cat">${esc(d.category||"jyr")}</div>
            <b>${esc(d.title)}</b>
            <p class="rc-prev">${esc((d.text||"").slice(0,140))}...</p>
          </button>
        `).join("")}
      </div>
      <div id="jyrBody"></div>
    `;
  },
  mount(){
    const el = document.getElementById("jyrBody");
    document.querySelectorAll("[data-j]").forEach(b=>b.addEventListener("click",async()=>{
      const d = _jyrData[+b.dataset.j];
      el.innerHTML = `
        <div class="card">
          <h2>${esc(d.title)}</h2>
          <p class="read-src">Дереккөз: ${esc(d.source_name)} · ${esc(d.license)}</p>
          <div class="read-text">${esc(d.text).replace(/\n/g,"<br/>")}</div>
          <div class="row" style="margin-top:14px">
            <a href="${esc(d.source_url)}" target="_blank" rel="noopener" class="btn">📎 Түпнұсқа</a>
            <button class="btn primary" data-listen>🔊 Тыңдау (басы)</button>
          </div>
        </div>`;
      el.querySelector("[data-listen]").addEventListener("click",()=>speak((d.text||"").slice(0,500)));
      el.querySelector(".card").scrollIntoView({behavior:"smooth",block:"start"});
    }));
  }
};

/* ---------- TWISTERS ---------- */
VIEWS.twisters = {
  render(){
    const lvs = [1,2,3];
    return `
      <div class="v-head">
        <div class="v-eyebrow">Мәдениет · Жаңылтпаш</div>
        <h1 class="v-title">Жаңылтпаш</h1>
        <p class="v-sub">${TWISTERS.length} жаңылтпаш, 3 деңгей</p>
      </div>
      <div class="row" style="gap:8px;margin-bottom:14px">
        ${lvs.map(l=>`<button class="btn tw-lv ${l===1?'primary':'ghost'}" data-lv="${l}">${["","Жеңіл","Орташа","Күрделі"][l]}</button>`).join("")}
      </div>
      <div class="grid">
        ${TWISTERS.map(t=>`
          <div class="card twist-card" data-lv="${t.lv}">
            <span class="tw-num">${t.lv}-деңгей</span>
            <p class="tw-text">${esc(t.kk).replace(/\n/g,"<br/>")}</p>
            <button class="btn" data-tw-listen="${t.id}">🔊 Тыңдау</button>
          </div>
        `).join("")}
      </div>
    `;
  },
  mount(){
    document.querySelectorAll("[data-tw-listen]").forEach(b=>b.addEventListener("click",()=>{
      speak(TWISTERS.find(t=>t.id===b.dataset.twListen).kk);
    }));
    let cur = 1;
    function apply(){ document.querySelectorAll(".twist-card").forEach(c=>c.style.display = (+c.dataset.lv===cur) ? "" : "none"); }
    document.querySelectorAll(".tw-lv").forEach(b=>b.addEventListener("click",()=>{
      cur = +b.dataset.lv;
      document.querySelectorAll(".tw-lv").forEach(x=>x.classList.remove("primary"));
      b.classList.add("primary");
      apply();
    }));
    apply();
  }
};

/* ---------- CULTURE (Мәдени мұра) ---------- */
let _cultureData = null;
async function loadCulture(){
  if(_cultureData) return _cultureData;
  const cats = {taam:["taam_baursak","taam_kumys","taam_shubat","taam_qurt","taam_qazy"],
                kijim:["kijim_shapan","kijim_ishik","kijim_saukele"],
                tarikh:["tarikh_ezhelgi","tarikh_khandyq_zhuzder","tarikh_kazakh_khanaty","tarikh_astana"],
                tulgalar:["tulgalar_aby_ai","tulgalar_magzhan","tulgalar_satbayev"]};
  const next={};
  await Promise.all(Object.entries(cats).map(async ([cat,ids])=>{
    next[cat]=await APP.fetchArticles(ids.map(id=>`data/${cat}/${id}.json`));
  }));
  _cultureData=next;
  return _cultureData;
}
VIEWS.culture = {
  load:loadCulture,
  render(){
    if(!_cultureData) return APP.loadMessage("culture");
    const c = _cultureData;
    return `
      <div class="v-head">
        <div class="v-eyebrow">Мәдениет · Мәдени мұра</div>
        <h1 class="v-title">Мәдени мұра</h1>
        <p class="v-sub">Тағам, Киім, Тарих, Тұлғалар</p>
      </div>
      <div class="row" style="gap:8px;margin-bottom:16px;flex-wrap:wrap">
        <button class="btn primary c-tab" data-t="taam">🍽️ Тағам (${c.taam.length})</button>
        <button class="btn ghost c-tab" data-t="kijim">👘 Киім (${c.kijim.length})</button>
        <button class="btn ghost c-tab" data-t="tarikh">📜 Тарих (${c.tarikh.length})</button>
        <button class="btn ghost c-tab" data-t="tulgalar">👤 Тұлғалар (${c.tulgalar.length})</button>
      </div>
      <div class="c-body" id="cBody"></div>
    `;
  },
  mount(){
    const body = document.getElementById("cBody");
    if(!body){ return; }
    let cur = "taam";
    function render(){
      const items = _cultureData[cur] || [];
      body.innerHTML = `<div class="grid grid-2">` +
        items.map((d,i)=>`
          <button class="card c-item" data-ci="${cur}_${i}">
            <div class="rc-cat">${cur}</div>
            <b>${esc(d.title)}</b>
            <p class="rc-prev">${esc((d.text||"").slice(0,120))}...</p>
          </button>
        `).join("") + `</div><div id="cDetail"></div>`;
      const det = document.getElementById("cDetail");
      body.querySelectorAll(".c-item").forEach(el=>el.addEventListener("click",async()=>{
        const [cat,idx] = el.dataset.ci.split("_");
        const d = _cultureData[cat][+idx];
        det.innerHTML = `
          <div class="card" style="margin-top:14px">
            <h2>${esc(d.title)}</h2>
            <p class="read-src">Дереккөз: ${esc(d.source_name)} · ${esc(d.license)}</p>
            <div class="read-text">${esc(d.text).replace(/\n/g,"<br/>")}</div>
            <a href="${esc(d.source_url)}" target="_blank" rel="noopener" class="btn" style="margin-top:12px">📎 Түпнұсқа</a>
          </div>`;
        det.querySelector(".card").scrollIntoView({behavior:"smooth",block:"start"});
      }));
    }
    document.querySelectorAll(".c-tab").forEach(b=>b.addEventListener("click",()=>{
      cur = b.dataset.t;
      document.querySelectorAll(".c-tab").forEach(x=>x.classList.remove("primary"));
      b.classList.add("primary");
      render();
    }));
    render();
  }
};

/* ---------- ORNAMENTS ---------- */
let _ornamentArticle = null;
VIEWS.ornaments = {
  async load(){
    [_ornamentArticle]=await APP.fetchArticles(["data/oyu/oyu_qoshqar_muiiz.json"]);
  },
  render(){
    return `
      <div class="v-head">
        <div class="v-eyebrow">Мәдениет · Ою-өрнек</div>
        <h1 class="v-title">Ою-өрнектер</h1>
        <p class="v-sub">${ORNAMENTS.length} дәстүрлі ою атауы мен сипаттамасы</p>
      </div>
      <div class="card" style="margin-bottom:16px">
        <b>Сызбалар туралы</b>
        <p>Төмендегі сақталған SVG сызбалары оюлардың дәл үлгісі емес. Оларды дәстүрлі ою пішінін жаттауға пайдаланбаңыз. Атаулар мен сипаттамалар зерттеу жинағынан берілген.</p>
      </div>
      <div class="grid grid-3">
        ${ORNAMENTS.map(o=>`
          <div class="card orna-card">
            <div class="orna-svg" aria-hidden="true">${o.svg}</div>
            <b>${esc(o.name)}</b>
            <p class="orna-mean">${esc(o.meaning)}</p>
          </div>
        `).join("")}
      </div>
      <div class="card" style="margin-top:16px;border-left:4px solid var(--gold)">
        ${_ornamentArticle ? `
          <h2>${esc(_ornamentArticle.title)}</h2>
          <p class="read-src">${esc(_ornamentArticle.source_name)} · ${esc(_ornamentArticle.license)}</p>
          <div class="read-text">${esc(_ornamentArticle.text).replace(/\n/g,"<br/>")}</div>
          <a class="btn" href="${esc(_ornamentArticle.source_url)}" target="_blank" rel="noopener">📎 Дереккөз</a>
        ` : APP.loadMessage("ornaments")}
      </div>`;
  }
};

/* ---------- ENCYCLOPEDIA ---------- */
VIEWS.encyclopedia = {
  state:{q:"", result:null},
  render(){
    const st = VIEWS.encyclopedia.state;
    return `
      <div class="v-head">
        <div class="v-eyebrow">Ғылым · Энциклопедия</div>
        <h1 class="v-title">Энциклопедия</h1>
        <p class="v-sub">Қазақ Уикипедиясынан кез келген тақырыпты алыңыз</p>
      </div>
      <div class="row" style="gap:10px;margin-bottom:16px">
        <input id="encq" type="search" placeholder="Мысалы: Алақозы, Көшпенділер, Қобланды..." value="${esc(st.q)}"
               style="flex:1;padding:14px 16px;border:1.5px solid var(--line);border-radius:14px;background:#fff;font-weight:600;font-size:16px"/>
        <button id="encBtn" class="btn primary" style="padding:14px 22px">🔎 Табу</button>
      </div>
      <div class="card" style="margin-bottom:16px;background:var(--line2);border-left:4px solid var(--gold)">
        <b>💡 Мысалдар:</b>
        <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:8px">
          ${["Абай Құнанбайұлы","Қазақ хандығы","Қобыланды батыр","Бауырсақ","Қымыз","Мағжан Жұмабаев"].map(s=>`<button class="btn ghost enc-example" data-s="${s}">${s}</button>`).join("")}
        </div>
      </div>
      <div id="encBody"></div>
    `;
  },
  mount(){
    const body = document.getElementById("encBody");
    const inp = document.getElementById("encq");
    let request=0;
    async function doSearch(){
      const version=++request;
      const q = inp.value.trim();
      if(!q){ body.innerHTML = `<div class="card" style="color:var(--ink3)">Тақырып жазыңыз</div>`; return; }
      VIEWS.encyclopedia.state.q=q;
      body.innerHTML = `<div class="card" role="status" style="text-align:center;color:var(--ink3)">Жүктелуде...</div>`;
      try{
        // кэш
        const ck = "enc_" + q.toLowerCase();
        try{
          const cached=JSON.parse(localStorage.getItem(ck));
          if(cached && typeof cached.title==="string" && typeof cached.text==="string"){
            cached.url="https://kk.wikipedia.org/wiki/"+encodeURIComponent(cached.title.replace(/ /g,"_"));
            renderResult(cached,true); return;
          }
        }catch(e){}
        const url = "https://kk.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&format=json&origin=*&titles=" + encodeURIComponent(q);
        const r = await fetch(url);
        if(!r.ok) throw new Error("Жүктеу қатесі");
        const data = await r.json();
        if(version!==request || !body.isConnected) return;
        const pages = data.query.pages;
        const pg = Object.values(pages)[0];
        if(!pg || Object.hasOwn(pg,"missing") || !pg.extract){
          body.innerHTML = `<div class="card" style="color:var(--warn)">Табылмады: «${esc(q)}». Басқа атаумен көріңіз.</div>`;
          return;
        }
        const rec = { title: pg.title, text: pg.extract, url: "https://kk.wikipedia.org/wiki/" + encodeURIComponent(pg.title.replace(/ /g,"_")), source:"Қазақ Уикипедиясы", license:"CC BY-SA 4.0" };
        try{ localStorage.setItem(ck, JSON.stringify(rec)); }catch(e){}
        renderResult(rec, false);
      }catch(e){
        if(version!==request || !body.isConnected) return;
        body.innerHTML=`<div class="card" role="alert">«${esc(q)}» тақырыбын жүктеу мүмкін болмады. Байланысты тексеріңіз.
          <button class="btn primary" id="encRetry">Қайта көру</button></div>`;
        document.getElementById("encRetry").addEventListener("click",doSearch);
      }
    }
    function renderResult(rec, fromCache, inWrap){
      const html = `
        <div class="card enc-result">
          <h2>${esc(rec.title)}</h2>
          <p class="read-src">Дереккөз: ${esc(rec.source)} · ${esc(rec.license)} ${fromCache?'· <b style="color:var(--warn)">кэшттен</b>':''}</p>
          <div class="read-text">${esc(rec.text).replace(/\n/g,"<br/>")}</div>
          <a href="${esc(rec.url)}" target="_blank" rel="noopener" class="btn" style="margin-top:14px">📎 Уикипедияда ашу</a>
        </div>`;
      return inWrap ? html : (body.innerHTML = html, body.querySelector(".enc-result").scrollIntoView({behavior:"smooth",block:"start"}), html);
    }
    document.getElementById("encBtn").addEventListener("click",doSearch);
    inp.addEventListener("keydown",e=>{ if(e.key==="Enter") doSearch(); });
    // мысал батырмалары
    document.querySelectorAll(".enc-example").forEach(b=>b.addEventListener("click",()=>{
      inp.value = b.dataset.s;
      doSearch();
    }));
  }
};

/* ---------- PROGRESS ---------- */
VIEWS.progress = {
  render(){
    const p = APP.p;
    const best = {};
    for(const k in p.done){ if(k.startsWith("quiz_")) best[k.slice(5)] = p.done[k]; }
    return `
      <div class="v-head">
        <div class="v-eyebrow">Жеке · Прогресс</div>
        <h1 class="v-title">Прогресіңіз</h1>
        <p class="v-sub">Есіміңізді және аватарыңызды баптау, прогресті экспорттау/импорттау</p>
      </div>
      <div class="grid grid-2" style="margin-bottom:16px">
        <div class="card" style="text-align:center">
          <div style="font-size:56px;margin-bottom:6px">${esc(p.avatar || "🦁")}</div>
          <b style="font-size:18px">${esc(p.name || "Қонақ")}</b>
          <div class="v-sub" style="margin-top:4px">${APP.LEVELS[p.level]}</div>
        </div>
        <div class="card" style="display:flex;flex-direction:column;justify-content:center;gap:10px">
          <div class="stat-row"><span>Жалпы XP</span><b>${esc(p.xp)}</b></div>
          <div class="stat-row"><span>Күндік 🔥</span><b>${esc(p.streak)}</b></div>
          <div class="stat-row"><span>Меңгерілген сөз</span><b>${Object.keys(p.learned).length}</b></div>
        </div>
      </div>
      <div class="card">
        <h3 style="margin-bottom:12px">Дәреже</h3>
        <div class="level-bar">
          ${APP.LEVELS.map((l,i)=>`<div class="lv-seg ${i<=p.level?'on':''}"><span>${l}</span></div>`).join("")}
        </div>
      </div>
      <div class="card" style="margin-top:14px">
        <h3 style="margin-bottom:12px">Тест нәтижелері</h3>
        ${Object.keys(best).length ? Object.entries(best).map(([k,v])=>`<div class="stat-row"><span>${esc(k)}-деңгей</span><b>${esc(v)} ұпай</b></div>`).join("") : `<p class="v-sub">Әлі тест тапсырылмады.</p>`}
      </div>
      <div class="card" style="margin-top:14px">
        <h3 style="margin-bottom:12px">Прогресті экспорттау / импорттау</h3>
        <div class="row" style="gap:8px;flex-wrap:wrap">
          <button id="progressExport" class="btn primary">⬇️ .json жүктеп алу</button>
          <label class="btn ghost">⬆️ Импорттау<input id="progressImport" type="file" accept=".json" style="display:none"/></label>
          <button id="btnReset" class="btn ghost" style="color:var(--err)">🗑 Барлығын тазалау</button>
        </div>
      </div>
    `;
  },
  mount(){
    document.getElementById("progressExport").addEventListener("click",()=>{
      const blob = new Blob([JSON.stringify(APP.p,null,2)],{type:"application/json"});
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "dastan-progress.json";
      a.click();
    });
    document.getElementById("progressImport").addEventListener("change",e=>{
      const f = e.target.files[0];
      if(!f) return;
      const rd = new FileReader();
      rd.onload = ()=>{
        try{
          APP.progress.importText(rd.result);
          APP.progress.save(APP.p);
          APP.updateSidebar();
          APP.toast("Импортталды!");
          go("progress");
        }catch(err){ APP.toast("Файл қате: " + err.message); }
      };
      rd.readAsText(f);
    });
    document.getElementById("btnReset").addEventListener("click",()=>{
      if(confirm("Барлық прогресті өшірмісіз? Бұл қайтарылмайды.")){
        APP.p = { name:"", avatar:"🦁", xp:0, level:0, streak:0, lastDate:"", done:{}, badges:[], learned:{} };
        APP.progress.save(APP.p);
        APP.updateSidebar();
        APP.toast("Тазаланды");
        go("progress");
      }
    });
  }
};

/* ---------- MAKAN (басты мәдениет) ---------- */
VIEWS.makan = {
  render(){
    return `
      <div class="v-head">
        <div class="v-eyebrow">Мәдениет</div>
        <h1 class="v-title">Мәдениет орталығы</h1>
        <p class="v-sub">Бағыт бойынша кіріңіз</p>
      </div>
      <div class="grid grid-2">
        <button class="card mod-card" onclick="go('proverbs')"><span class="mod-ic">📜</span><b>Мақал-мәтел</b><span class="mod-sub">12 мақал, 6 бағыт</span></button>
        <button class="card mod-card" onclick="go('jyr')"><span class="mod-ic">🎻</span><b>Жыр-дастан</b><span class="mod-sub">Қобланды, Ер Төстік, Қобыз Көпеш</span></button>
        <button class="card mod-card" onclick="go('twisters')"><span class="mod-ic">🌀</span><b>Жаңылтпаш</b><span class="mod-sub">15 жаңылтпаш, 3 деңгей</span></button>
        <button class="card mod-card" onclick="go('culture')"><span class="mod-ic">🍽️</span><b>Мәдени мұра</b><span class="mod-sub">Тағам, киім, тарих, тұлғалар</span></button>
        <button class="card mod-card" onclick="go('ornaments')"><span class="mod-ic">🪡</span><b>Ою-өрнек</b><span class="mod-sub">8 ұлттық ою + ойын</span></button>
      </div>
    `;
  }
};

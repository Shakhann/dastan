/* ==== views_b.js: read, voice, quiz, proverbs ==== */

/* ---------- READ (дереккөздері көрсетілген мәтіндер) ---------- */
let _readData = null;
async function loadRead(){
  if(_readData && _readData.length) return _readData;
  const ids = ["abai_poeziya","qyz_zhibek","kobylandy","er_tostik","kozy_korpeshi"];
  _readData=await APP.fetchArticles(ids.map(id=>`data/jyr/${id}.json`));
  return _readData;
}

VIEWS.read = {
  load:loadRead,
  render(){
    if(!_readData) return APP.loadMessage("read");
    if(!_readData.length) return `<div class="card">Оқу мәтіндері табылмады. <button class="btn" data-retry>Қайта көру</button></div>`;
    return `
      <div class="v-head">
        <div class="v-eyebrow">Тіл · Оқу</div>
        <h1 class="v-title">Оқу мәтіндері</h1>
        <p class="v-sub">${_readData.length} тақырып · Лицензиясы әр мәтінде көрсетілген</p>
      </div>
      <div class="grid grid-2" style="margin-bottom:16px">
        ${_readData.map((d,i)=>`
          <button class="card read-card" data-r="${i}">
            <div class="rc-cat">${esc(d.category||"jyr")}</div>
            <b>${esc(d.title)}</b>
            <p class="rc-prev">${esc((d.text||"").slice(0,120))}...</p>
          </button>
        `).join("")}
      </div>
      <div id="readBody"></div>
    `;
  },
  mount(){
    const el = document.getElementById("readBody");
    if(!el){ return; }
    document.querySelectorAll("[data-r]").forEach(b=>b.addEventListener("click",async()=>{
      const d = _readData[+b.dataset.r];
      el.innerHTML = `
        <div class="card read-body">
          <h2>${esc(d.title)}</h2>
          <p class="read-src">Дереккөз: ${esc(d.source_name)} · ${esc(d.license)}</p>
          <div class="read-text">${esc(d.text).replace(/\n/g,"<br/>")}</div>
          <a href="${esc(d.source_url)}" target="_blank" rel="noopener" class="btn" style="margin-top:14px">📎 Түпнұсқа</a>
          <button class="btn primary" data-listen>🔊 Тыңдау (басы)</button>
          <label style="display:flex;align-items:center;gap:8px;margin-top:14px"><input type="checkbox" id="fsz" /> Үлкен шрифт</label>
        </div>`;
      el.querySelector("[data-listen]").addEventListener("click",()=>speak((d.text||"").slice(0,500)));
      el.querySelector(".read-body").scrollIntoView({behavior:"smooth",block:"start"});
      const fsz = el.querySelector("#fsz");
      if(fsz) fsz.addEventListener("change",()=>{ el.querySelector(".read-text").style.fontSize = fsz.checked ? "18px" : "15px"; });
    }));
  }
};

/* ---------- VOICE (Тыңда + Айт) ---------- */
VIEWS.voice = {
  render(){
    const samples = DICT.slice(0, 12);
    return `
      <div class="v-head">
        <div class="v-eyebrow">Тіл · Дауыс зертханасы</div>
        <h1 class="v-title">Дауыс зертханасы</h1>
        <p class="v-sub">Екі режим: «Тыңда» (MP3) және «Айт» (микрофон, Web Speech API)</p>
      </div>
      <div class="grid grid-2" style="margin-bottom:16px">
        <div class="card">
          <h3>🎧 Тыңда</h3>
          <p class="v-sub" style="margin:8px 0 12px">Сөзді таңда, дауыс тыңда</p>
          <div class="voice-list">
            ${samples.map((d,i)=>`
              <button class="voice-item" data-v="${i}">
                <span>${esc(d.kk)}</span><span class="vi-sub">${esc(d.ru)}</span>
                <span aria-hidden="true">🔊</span>
              </button>
            `).join("")}
          </div>
        </div>
        <div class="card">
          <h3>🎤 Айт</h3>
          <p class="v-sub" style="margin:8px 0 12px">Сөзді айтып көр, танымалдылық тексеріледі</p>
          <div id="speakBox">
            <input id="speakTarget" type="text" placeholder="Сөз жаз (мысалы: үй)" style="width:100%;padding:12px;border:1.5px solid var(--line);border-radius:12px;margin-bottom:10px;font-weight:600"/>
            <button id="btnSpeak" class="btn primary" style="width:100%;justify-content:center">🎤 Жазуды бастау</button>
            <div id="speakResult" style="margin-top:14px"></div>
          </div>
        </div>
      </div>
      <div class="card" style="border-left:4px solid var(--warn);background:#FFF8E8">
        <b>Ескерту:</b> Егер браузерің қазақ тілін танымалдылықтан қолдамауы мүмкін болса, «Айт» орнына жазу тапсырмасы көрсетіледі. Chrome/Edge жақсы жұмыс істейді.
      </div>
    `;
  },
  mount(){
    document.querySelectorAll("[data-v]").forEach(b=>b.addEventListener("click",()=>{ const d=DICT[+b.dataset.v]; speak(d.kk,"d_"+d.id); }));
    // Айт режимі
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const resEl = document.getElementById("speakResult");
    if(!SR){
      resEl.innerHTML = `<p style="color:var(--warn)">Бұл браузерде микрофон танымалдылық қолдамайды. Орнына <b>жазу тапсырмасы</b> беріледі.</p>
        <div class="write-task">
          <p>Сөзді жазып, өзің дұрыс деп есептейтін сөйлем құрап жаз:</p>
          <input id="writeAns" type="text" placeholder="Сөйлем жаз..." style="width:100%;padding:11px;border:1.5px solid var(--line);border-radius:12px;margin:8px 0;font-weight:600"/>
          <button id="btnWrite" class="btn primary">Тексеру</button>
        </div><div id="writeFeedback" role="status"></div>`;
      document.getElementById("btnWrite").addEventListener("click",()=>{
        const v = document.getElementById("writeAns").value.trim();
        document.getElementById("writeFeedback").innerHTML = v ? `<p style="color:var(--ok);font-weight:700">Жақсы жауап! «${esc(v)}»</p>` : `<p style="color:var(--err)">Бос жауап</p>`;
      });
      document.getElementById("btnSpeak").disabled=true;
      return;
    }
    const rec = new SR();
    rec.lang = "kk-KZ";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    let target = "";
    const inp = document.getElementById("speakTarget");
    inp.addEventListener("input",()=>{ target = inp.value.trim(); });
    document.getElementById("btnSpeak").addEventListener("click",()=>{
      if(!target){ resEl.innerHTML = `<p style="color:var(--err)">Алдымен сөз жаз</p>`; return; }
      resEl.innerHTML = `<p style="color:var(--azure2)">Микрофон ашық, айтыңыз...</p>`;
      rec.onresult = (e)=>{
        const said = e.results[0][0].transcript.trim().toLowerCase();
        const match = said.toLowerCase() === target.toLowerCase();
        resEl.innerHTML = match
          ? `<p style="color:var(--ok);font-weight:700">✅ Дұрыс! "${esc(said)}"</p>`
          : `<p style="color:var(--err)">❌ Сен: "${esc(said)}" · Керек: "${esc(target)}"</p>`;
        APP.progress.addXP(APP.p, match?15:5);
      };
      rec.onerror = (e)=>{ resEl.innerHTML = `<p style="color:var(--err)">Қате: ${esc(e.error)}</p>`; };
      try{ rec.start(); }catch(e){ resEl.innerHTML = `<p style="color:var(--err)">${esc(e.message)}</p>`; }
    });
  }
};

/* ---------- QUIZ ---------- */
function quizQuestions(lv){
  const st = VIEWS.quiz.state;
  if(!st.questions || st.questionsLevel!==lv){
    st.questionsLevel=lv;
    st.questions=(QUIZ[lv] || []).map(q=>{
      const order=q.o.map((_,i)=>i);
      for(let i=order.length-1;i>0;i--){
        const j=Math.floor(Math.random()*(i+1));
        [order[i],order[j]]=[order[j],order[i]];
      }
      return {...q,o:order.map(i=>q.o[i]),a:order.indexOf(q.a)};
    });
  }
  return st.questions;
}
VIEWS.quiz = {
  state:{lv:1, idx:0, score:0, done:false, answer:null},
  render(){
    const st = VIEWS.quiz.state;
    if(st.done) return `<div class="v-head"><h1 class="v-title">Тест нәтижесі</h1><p class="v-sub">${st.lv}-деңгей аяқталды</p></div>
      <div class="card"><div class="stat-num">${st.score} / ${quizQuestions(st.lv).length*10}</div><p>Жинаған ұпайыңыз</p>
      <button class="btn primary" id="quizRetry">Қайта тапсыру</button>
      <button class="btn" id="quizNextLevel" ${QUIZ[st.lv+1]?"":"disabled"}>Келесі деңгей →</button>
      ${QUIZ[st.lv+1]?"":"<p>Барлық деңгей аяқталды!</p>"}</div>`;
    const q = quizQuestions(st.lv)[st.idx];
    if(!q) return `<div class="v-head"><div class="v-eyebrow">Тіл · Тест</div><h1 class="v-title">Тест</h1></div><p>Қазірде сұрақтар жоқ.</p>`;
    return `
      <div class="v-head">
        <div class="v-eyebrow">Тіл · Тест · ${st.lv}-деңгей · ${st.idx+1}/${quizQuestions(st.lv).length}</div>
        <h1 class="v-title">Сұрақ ${st.idx+1}</h1>
        <div class="row" style="margin-top:8px">
          <span class="chip">${st.score} ұпай</span>
          <button class="btn ghost" data-quizlv="1">1</button>
          <button class="btn ghost" data-quizlv="2">2</button>
          <button class="btn ghost" data-quizlv="3">3</button>
        </div>
      </div>
      <div class="card">
        <h2 class="q-text">${esc(q.q)}</h2>
        <div class="q-opts">
          ${q.o.map((o,i)=>`
            <button class="q-opt" data-a="${i}" ${st.answer!==null?"disabled":""}>${esc(o)}</button>
          `).join("")}
        </div>
        <div id="quizFx" role="status" style="margin-top:14px"></div>
      </div>
    `;
  },
  mount(){
    const st = VIEWS.quiz.state;
    const restart=lv=>{ Object.assign(st,{lv,idx:0,score:0,done:false,answer:null,questions:null}); go("quiz"); };
    if(st.done){
      document.getElementById("quizRetry").addEventListener("click",()=>restart(st.lv));
      document.getElementById("quizNextLevel").addEventListener("click",()=>{ if(QUIZ[st.lv+1]) restart(st.lv+1); });
      return;
    }
    const q=quizQuestions(st.lv)[st.idx];
    if(!q) return;
    const fx=document.getElementById("quizFx");
    document.querySelectorAll("[data-quizlv]").forEach(b=>b.addEventListener("click",()=>restart(+b.dataset.quizlv)));
    const feedback=()=>{
      const ok=st.answer===q.a;
      document.querySelectorAll(".q-opt").forEach((x,j)=>{
        x.disabled=true;
        x.style.background=j===q.a?"rgba(31,138,76,.12)":(st.answer===j&&!ok?"rgba(192,57,43,.10)":"");
        x.style.borderColor=j===q.a?"var(--ok)":(st.answer===j&&!ok?"var(--err)":"var(--line)");
      });
      fx.innerHTML=`<div class="q-fx ${ok?'ok':'err'}">${ok?'✅ Дұрыс!':'❌ Қате'}</div>
        ${q.x?`<p class="q-explain">${esc(q.x)}</p>`:""}
        <button class="btn primary" id="qNext" style="margin-top:10px">${st.idx<quizQuestions(st.lv).length-1?"Келесі сұрақ →":"Нәтижені көру"}</button>`;
      document.getElementById("qNext").addEventListener("click",e=>{
        e.currentTarget.disabled=true;
        if(st.idx<quizQuestions(st.lv).length-1){ st.idx++; st.answer=null; }
        else{
          st.done=true;
          const key="quiz_"+st.lv;
          APP.p.done[key]=Math.max(APP.p.done[key]||0,st.score);
          APP.progress.saveProgress();
        }
        go("quiz");
      });
    };
    document.querySelectorAll(".q-opt").forEach(b=>b.addEventListener("click",()=>{
      if(st.answer!==null) return;
      st.answer=+b.dataset.a;
      const ok=st.answer===q.a;
      if(ok) st.score+=10;
      APP.progress.addXP(APP.p,ok?20:5);
      // Refresh the score while preserving the answered question.
      go("quiz");
    }));
    if(st.answer!==null) feedback();
  }
};

/* ---------- PROVERBS ---------- */
VIEWS.proverbs = {
  render(){
    const cats = ["Барлығы", ...new Set(PROVERBS.map(p=>p.cat))];
    return `
      <div class="v-head">
        <div class="v-eyebrow">Мәдениет · Мақал-мәтел</div>
        <h1 class="v-title">Мақал-мәтелдер</h1>
        <p class="v-sub">${PROVERBS.length} мақал, бағыт бойынша</p>
      </div>
      <div class="row" style="flex-wrap:wrap;gap:8px;margin-bottom:14px">
        ${cats.map(c=>`<button class="btn prov-cat ${c==='Барлығы'?'primary':'ghost'}" data-cat="${c}">${c}</button>`).join("")}
      </div>
      <div class="grid grid-2">
        ${PROVERBS.map(p=>`
          <div class="card flip-card prov-card">
            <div class="fc-front">
              <div class="fc-eyebrow">${p.cat}</div>
              <div class="fc-word" style="font-size:17px">${esc(p.kk)}</div>
              <div class="fc-act"><button class="btn" data-prov-listen="${p.id}">🔊</button></div>
            </div>
            <div class="fc-back">
              <div class="fc-eyebrow">${p.cat}</div>
              <div class="fc-word" style="font-size:14px">${esc(p.ru || "")}</div>
              ${p.en ? `<div class="fc-sub" style="margin-top:6px">${esc(p.en)}</div>` : ""}
            </div>
          </div>
        `).join("")}
      </div>
    `;
  },
  mount(){
    const cur = VIEWS.proverbs._cat || "Барлығы";
    document.querySelectorAll("[data-prov-listen]").forEach(b=>b.addEventListener("click",()=>{
      speak(PROVERBS.find(p=>p.id===b.dataset.provListen).kk);
    }));
    document.querySelectorAll(".prov-cat").forEach(b=>b.addEventListener("click",()=>{
      VIEWS.proverbs._cat = b.dataset.cat;
      go("proverbs");
      document.querySelectorAll(".prov-card").forEach(c=>{
        const p = PROVERBS.find(x=>x.id===c.dataset.pid);
        c.style.display = (VIEWS.proverbs._cat==="Барлығы" || p.cat===VIEWS.proverbs._cat) ? "" : "none";
      });
    }));

    // қолдайтындағы data-pid (render-де жоқ, қосу)
    document.querySelectorAll(".prov-card").forEach((c,i)=>c.dataset.pid = PROVERBS[i].id);
  }
};

// ==== Қосымша view-тер (app.js-ке қосылады) ====

/* ---------- HOME ---------- */
VIEWS.home = {
  render(){
    const today = new Date();
    const dayWord = DICT[today.getDate() % DICT.length];
    const dayProv = PROVERBS[today.getDate() % PROVERBS.length];
    return `
      <div class="v-head">
        <div class="v-eyebrow">Басты бет</div>
        <h1 class="v-title">Сәлем, ${esc(APP.p.name || "Қонақ")}! 👋</h1>
        <p class="v-sub">Бүгін ${APP.LEVELS[APP.p.level]} деңгейі. Статистика: ${APP.p.xp} XP · ${APP.p.streak} 🔥</p>
      </div>
      <div class="grid grid-3" style="margin-bottom:16px">
        <div class="card"><div class="stat-num">${APP.p.xp}</div><div class="stat-lbl">Жалпы XP</div></div>
        <div class="card"><div class="stat-num">${APP.p.streak}</div><div class="stat-lbl">Күндік 🔥</div></div>
        <div class="card"><div class="stat-num">${APP.LEVELS[APP.p.level]}</div><div class="stat-lbl">Дәреже</div></div>
      </div>
      <div class="card" style="margin-bottom:16px;background:linear-gradient(135deg,var(--navy),var(--navy2));color:#fff">
        <div class="v-eyebrow" style="color:var(--gold)">Күнді сөзі</div>
        <h2 style="font-size:26px;margin:6px 0">${esc(dayWord.kk)}</h2>
        <p style="opacity:.85">${esc(dayWord.ru)} · ${esc(dayWord.en)}</p>
        <p style="margin-top:10px;font-style:italic;opacity:.75">"${esc(dayWord.ex)}"</p>
        <button class="btn gold" style="margin-top:14px" onclick="speak('${esc(dayWord.kk)}','d_${dayWord.id}')">🔊 Дыбыстату</button>
      </div>
      <div class="card" style="margin-bottom:16px;border-left:4px solid var(--gold)">
        <div class="v-eyebrow">Күнді мақалы</div>
        <h2 style="font-size:20px;margin:6px 0">${esc(dayProv.kk)}</h2>
        <p style="color:var(--ink2);font-size:14px">${esc(dayProv.ru || "")}</p>
      </div>
      <h3 style="margin:8px 0 12px;font-size:16px">Жалғастыру</h3>
      <div class="grid grid-3">
        <button class="card mod-card" onclick="go('dict')"><span class="mod-ic">📖</span><b>Сөздік</b><span class="mod-sub">30 сөз, тақырып бойынша</span></button>
        <button class="card mod-card" onclick="go('quiz')"><span class="mod-ic">✅</span><b>Тест</b><span class="mod-sub">3 деңгей × 10 сұрақ</span></button>
        <button class="card mod-card" onclick="go('proverbs')"><span class="mod-ic">📜</span><b>Мақал-мәтел</b><span class="mod-sub">12 мақал, 6 бағыт</span></button>
      </div>
    `;
  }
};

/* ---------- DICT ---------- */
VIEWS.dict = {
  state:{cat:"Барлығы", q:""},
  render(){
    const cats = ["Барлығы", ...new Set(DICT.map(d=>d.cat))];
    const st = VIEWS.dict.state;
    const items = DICT.filter(d => (st.cat==="Барлығы" || d.cat===st.cat) && (!st.q || d.kk.toLowerCase().includes(st.q.toLowerCase())));
    return `
      <div class="v-head">
        <div class="v-eyebrow">Тіл · Сөздік</div>
        <h1 class="v-title">Сөздік</h1>
        <p class="v-sub">${DICT.length} сөз, ${cats.length-1} тақырып</p>
      </div>
      <div class="row" style="flex-wrap:wrap;gap:8px;margin-bottom:12px">
        ${cats.map(c=>`<button class="btn ${c===st.cat?'primary':'ghost'}" data-cat="${c}">${c}</button>`).join("")}
      </div>
      <div class="row" style="margin-bottom:14px">
        <input id="dictSearch" type="search" placeholder="Сөз іздеу..." value="${esc(st.q)}" style="flex:1;padding:11px 14px;border:1.5px solid var(--line);border-radius:12px;background:#fff;font-weight:600"/>
      </div>
      <div class="grid grid-2">
        ${items.map(d=>`
          <div class="card flip-card" data-id="${d.id}">
            <div class="fc-front">
              <div class="fc-eyebrow">${d.cat}</div>
              <div class="fc-word">${esc(d.kk)}</div>
              <div class="fc-sub">${esc(d.ru)}</div>
              <div class="fc-act">
                <button class="btn" onclick="speak('${esc(d.kk)}','d_${d.id}')" aria-label="Дыбыстату">🔊</button>
                <button class="btn" data-learn="${d.id}" aria-label="Меңгерілді">✓</button>
              </div>
            </div>
            <div class="fc-back">
              <div class="fc-eyebrow">${d.cat}</div>
              <div class="fc-word">${esc(d.en)}</div>
              <div class="fc-sub">${esc(d.ru)}</div>
              <p class="fc-ex">"${esc(d.ex)}"</p>
            </div>
          </div>
        `).join("") || `<div class="card" style="grid-column:1/-1;text-align:center;color:var(--ink3);padding:40px">Сөз табылмады</div>`}
      </div>
    `;
  },
  mount(){
    const st = VIEWS.dict.state;
    document.querySelectorAll("[data-cat]").forEach(b=>b.addEventListener("click",()=>{ st.cat=b.dataset.cat; go("dict"); }));
    const s = document.getElementById("dictSearch");
    if(s) s.addEventListener("input",()=>{ st.q = s.value; const items = DICT.filter(d=>(st.cat==="Барлығы"||d.cat===st.cat)&&(!st.q||d.kk.toLowerCase().includes(st.q.toLowerCase())));
      // қайта рендер (тек торды)
      const g = s.closest(".view-anim").querySelectorAll(".grid")[1];
      g.innerHTML = items.map(d=>`
        <div class="card flip-card" data-id="${d.id}">
          <div class="fc-front"><div class="fc-eyebrow">${d.cat}</div><div class="fc-word">${esc(d.kk)}</div><div class="fc-sub">${esc(d.ru)}</div>
          <div class="fc-act"><button class="btn" onclick="speak('${esc(d.kk)}','d_${d.id}')">🔊</button><button class="btn" data-learn="${d.id}">✓</button></div></div>
          <div class="fc-back"><div class="fc-eyebrow">${d.cat}</div><div class="fc-word">${esc(d.en)}</div><div class="fc-sub">${esc(d.ru)}</div><p class="fc-ex">"${esc(d.ex)}"</p></div>
        </div>`).join("");
      bindLearn();
    });
    function bindLearn(){
      document.querySelectorAll("[data-learn]").forEach(b=>b.addEventListener("click",e=>{
        e.stopPropagation();
        const id = b.dataset.learn;
        if(APP.p.learned[id]){ delete APP.p.learned[id]; APP.toast("Алынды"); }
        else { APP.p.learned[id] = true; APP.progress.addXP(APP.p, 5); APP.toast("+5 XP"); }
        APP.progress.save(APP.p); go("dict");
      }));
    }
    bindLearn();
    // flip
    document.querySelectorAll(".flip-card").forEach(c=>{
      c.addEventListener("click",(e)=>{ if(!c.querySelector(".fc-act").contains(e.target)) c.classList.toggle("flipped"); });
    });
  }
};

/* ---------- GRAMMAR ---------- */
VIEWS.gram = {
  render(){
    return `
      <div class="v-head">
        <div class="v-eyebrow">Тіл · Грамматика</div>
        <h1 class="v-title">Грамматика сабақтары</h1>
        <p class="v-sub">${GRAMMAR.length} негізгі ереже</p>
      </div>
      <div class="grid" style="gap:14px">
        ${GRAMMAR.map((g,i)=>`
          <details class="card gram-card" ${i===0?"open":""}>
            <summary>
              <span class="gram-num">${i+1}</span>
              <b>${esc(g.title)}</b>
            </summary>
            <div class="gram-body">
              <p class="gram-rule"><b>Ереже:</b> ${esc(g.rule)}</p>
              <div class="gram-exs">
                ${g.examples.map(e=>`<span class="gram-chip">${esc(e)}</span>`).join("")}
              </div>
              <button class="btn" style="margin-top:12px" onclick="speak('${esc(g.title)}: ${esc(g.rule)}','gram_${i}')">🔊 Сабақты тыңдау</button>
            </div>
          </details>
        `).join("")}
      </div>
    `;
  }
};

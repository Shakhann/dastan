"use strict";
const LAB = (() => {
  const hard = /[пфқктсшщхцчһ]$/u, vowel = /[аәеёиіоөұүыэюя]$/u;
  const lower = s => String(s ?? "").toLocaleLowerCase("kk");
  function harmony(word) {
    const vowels = lower(word).match(/[аоұыяәеөүіэи]/gu) || [];
    while (vowels.at(-1) === "и" && vowels.length > 1) vowels.pop();
    return /[әеөүіэи]/u.test(vowels.at(-1) || "а");
  }
  function decline(input) {
    const word = String(input ?? "").trim();
    if (!word) return {error:"Зат есім жазыңыз."};
    if (word.length > 80) return {error:"Сөз 80 әріптен аспауы керек."};
    if (!/^[А-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі]+$/u.test(word)) return {error:"Бір зат есімді кирилл әріптерімен жазыңыз; сан мен таңба қоспаңыз."};
    const w = lower(word), soft = harmony(w), v = vowel.test(w), h = hard.test(w);
    const choose = (a,b) => soft ? b : a;
    const kind = v ? "дауысты" : h ? "қатаң" : "ұяң не үнді";
    const rule = `Соңғы дыбыс ${kind}, сөз ${soft ? "жіңішке" : "жуан"}.`;
    const make = (name,suffix,root=word,extra="") => ({name,root,suffix,text:root+suffix,rule:extra || rule});
    const plural = make("Көптік", /[йру]$/u.test(w) || v ? choose("лар","лер") : h ? choose("тар","тер") : choose("дар","дер"));
    const cases = [make("Атау","",word,"Атау септігінде жалғау жалғанбайды."),
      make("Ілік",v || /[мнң]$/u.test(w) ? choose("ның","нің") : h ? choose("тың","тің") : choose("дың","дің")),
      make("Барыс",h ? choose("қа","ке") : choose("ға","ге")),
      make("Табыс",v ? choose("ны","ні") : h ? choose("ты","ті") : choose("ды","ді")),
      make("Жатыс",h ? choose("та","те") : choose("да","де")),
      make("Шығыс",/[мнң]$/u.test(w) ? choose("нан","нен") : h ? choose("тан","тен") : choose("дан","ден")),
      make("Көмектес",h ? "пен" : /[зж]$/u.test(w) ? "бен" : "мен")];
    const changed = {п:"б",қ:"ғ",к:"г"}[w.at(-1)];
    const root = !v && changed ? word.slice(0,-1) + (word.at(-1) === word.at(-1).toUpperCase() ? changed.toUpperCase() : changed) : word;
    const suffixes = v ? ["м","ң",choose("ңыз","ңіз"),choose("сы","сі")] : [choose("ым","ім"),choose("ың","ің"),choose("ыңыз","іңіз"),choose("ы","і")];
    const possessives = suffixes.map((suffix,i) => make(["Менің","Сенің","Сіздің","Оның"][i],suffix,root,rule + (root !== word ? ` Дауысты жалғанғанда ${w.at(-1)} → ${changed}.` : "")));
    return {word,soft,plural,cases,possessives};
  }
  const latinMap = Object.fromEntries(Object.entries({а:"a",ә:"ä",б:"b",в:"v",г:"g",ғ:"ğ",д:"d",е:"e",ж:"j",з:"z",и:"i",й:"i",к:"k",қ:"q",л:"l",м:"m",н:"n",ң:"ñ",о:"o",ө:"ö",п:"p",р:"r",с:"s",т:"t",у:"u",ұ:"ū",ү:"ü",ф:"f",х:"h",һ:"h",ш:"ş",ы:"y",і:"ı",ё:"io",щ:"ş",ц:"ts",ч:"ç",ю:"iu",я:"ia",э:"e",ь:"",ъ:""}));
  function latin(text) { return String(text ?? "").replace(/[А-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі]/gu,c => { const x=latinMap[lower(c)]; return c === "И" ? "İ" : c === "І" ? "I" : c === c.toUpperCase() ? x.charAt(0).toUpperCase()+x.slice(1) : x; }); }
  const arab = {а:"ا",ә:"ا",б:"ب",в:"ۆ",г:"گ",ғ:"ع",д:"د",е:"ە",ж:"ج",з:"ز",и:"ي",й:"ي",к:"ك",қ:"ق",л:"ل",м:"م",н:"ن",ң:"ڭ",о:"و",ө:"و",п:"پ",р:"ر",с:"س",т:"ت",у:"ۋ",ұ:"ۇ",ү:"ۇ",ф:"ف",х:"ح",һ:"ھ",ч:"چ",ш:"ش",ы:"ى",і:"ى",ю:"يۋ",я:"يا",ё:"يو",э:"ە",щ:"ش",ц:"تس",ь:"",ъ:""};
  function tote(text) { return String(text ?? "").replace(/[А-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі]+/gu,word => { const w=lower(word); return (/[өүәі]/u.test(w) && !/[қғе]/u.test(w) ? "ٴ" : "") + [...w].map(c=>arab[c] ?? c).join(""); }); }
  function stems(input) {
    const word=lower(input).trim(), found=new Set([word]);
    const endings=["лар","лер","дар","дер","тар","тер","ның","нің","дың","дің","тың","тің","ға","ге","қа","ке","ны","ні","ды","ді","ты","ті","да","де","та","те","дан","ден","нан","нен","тан","тен","мен","бен","пен","ым","ім","ың","ің","ыңыз","іңіз","сы","сі","ы","і"];
    let frontier=[word];
    for(let depth=0;depth<3;depth++) { const next=[]; for(const w of frontier) for(const s of endings) if(w.endsWith(s)&&w.length-s.length>=2) { const base=w.slice(0,-s.length), unvoice={б:"п",ғ:"қ",г:"к"}[base.at(-1)];
      for(const r of [base,...(unvoice ? [base.slice(0,-1)+unvoice] : [])]) {
        const d=decline(r); if(d.error || ![d.plural,...d.cases,...d.possessives].some(f=>f.text===w)) continue;
        if(!found.has(r)){found.add(r);next.push(r);}
      } } frontier=next; }
    return [...found];
  }
  function keyboard(id) { id=String(id).replace(/[&<>"']/gu,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); return `<div class="kazakh-keys" role="group" aria-label="Қазақ әріптері">${[..."әғқңөұүһі"].map(c=>`<button type="button" data-kazakh-key="${c}" data-input="${id}">${c}</button>`).join("")}</div>`; }
  let keyboardID=0;
  function ensureKeyboards(root=document) {
    root.querySelectorAll('input[type="search"], [data-lab-input]').forEach(input=>{
      if(input.disabled || input.readOnly || input.id==="clanSearch") return;
      if(!input.id) { let id; do { id="kazakh-input-"+(++keyboardID); } while(document.getElementById(id)); input.id=id; }
      if([...root.querySelectorAll("[data-kazakh-key]")].some(key=>key.dataset.input===input.id)) return;
      input.insertAdjacentHTML("afterend",keyboard(input.id));
    });
  }
  return {decline,harmony,latin,tote,stems,keyboard,ensureKeyboards};
})();
if (typeof module !== "undefined" && module.exports) module.exports = LAB;
if (typeof document !== "undefined") {
  document.addEventListener("click",async e=>{
    const key=e.target.closest("[data-kazakh-key]");
    if(key) { const input=document.getElementById(key.dataset.input); if(!input || input.disabled || input.readOnly) return; const start=input.selectionStart ?? input.value.length,end=input.selectionEnd ?? start; if(input.maxLength>=0 && input.value.length-(end-start)+1>input.maxLength) { input.focus(); return; } input.setRangeText(key.dataset.kazakhKey,start,end,"end"); input.focus(); input.dispatchEvent(new Event("input",{bubbles:true})); }
    const copy=e.target.closest("[data-lab-copy]");
    if(copy) {
      const value=document.getElementById(copy.dataset.labCopy)?.textContent || "";
      const fallback=()=>{
        const t=document.createElement("textarea");t.value=value;t.style.position="fixed";t.style.opacity="0";t.setAttribute("aria-label","Көшірілетін мәтін");document.body.append(t);
        try { t.select();if(!document.execCommand("copy")) throw Error("copy"); } finally { t.remove();copy.focus(); }
      };
      try {
        try { if(!navigator.clipboard?.writeText) throw Error("clipboard"); await navigator.clipboard.writeText(value); } catch { fallback(); }
        APP.toast("Мәтін көшірілді.");
      } catch { APP.toast("Көшіру мүмкін болмады. Мәтінді белгілеп көшіріңіз."); }
    }
  });
}
if (typeof VIEWS !== "undefined") {
  function labForm(form) { return `<article class="lab-form"><h3>${esc(form.name)}</h3><p class="lab-word"><span class="word-root">${esc(form.root)}</span><strong class="word-suffix">${esc(form.suffix)}</strong></p><p class="fine">${esc(form.rule)}</p></article>`; }
  VIEWS.lab = {
    title:"Тіл зертханасы",
    render(id) { return heading("Тіл зертханасы","Сөзді түрлендіріңіз, үш әліпбиде жазыңыз. Құралдар тіркеусіз, браузерде жұмыс істейді.","assets/heritage/alash-trio.jpg") + `<section class="lab-section"><h2>Сөз түрлендіргіш</h2><label for="labWord">Зат есім жазыңыз</label><input id="labWord" maxlength="80" value="${esc(id || "бала")}" autocomplete="off">${LAB.keyboard("labWord")}<div id="labForms" aria-live="polite" aria-atomic="true"></div><p class="fine">Ереже бойынша жасалады, ерекше сөздерде айырмашылық болуы мүмкін</p></section><section class="lab-section"><h2>Үш әліпби</h2><label for="labText">Кирилл мәтінін жазыңыз</label><textarea id="labText" rows="3">${esc(id || "Дастан — қазақ тілі")}</textarea>${LAB.keyboard("labText")}<div class="alphabet-grid" aria-live="polite">${[["Cyr","Кирилл"],["Latin","Латын"],["Arab","Төте"]].map(([k,name])=>`<article><h3>${name}</h3><p id="lab${k}" ${k === "Arab" ? 'dir="rtl" lang="kk-Arab"' : k === "Latin" ? 'lang="kk-Latn"' : 'lang="kk"'}></p><button type="button" data-lab-copy="lab${k}">${name}: көшіру</button>${k === "Latin" ? '<p class="fine">2021 жылғы жоба, ресми қолданысқа енбеген</p>' : k === "Arab" ? '<p class="fine">Тәжірибелік нұсқа</p>' : ""}</article>`).join("")}</div></section>`; },
    mount() {
      const word=document.getElementById("labWord"),text=document.getElementById("labText");
      const update=()=>{ const d=LAB.decline(word.value); document.getElementById("labForms").innerHTML=d.error ? `<p role="status">${esc(d.error)}</p>` : `<h2>Көптік</h2><div class="lab-forms">${labForm(d.plural)}</div><h2>Жеті септік</h2><div class="lab-forms">${d.cases.map(labForm).join("")}</div><h2>Тәуелдік</h2><div class="lab-forms">${d.possessives.map(labForm).join("")}</div>`; };
      const alphabets=()=>{ document.getElementById("labCyr").textContent=text.value;document.getElementById("labLatin").textContent=LAB.latin(text.value);document.getElementById("labArab").textContent=LAB.tote(text.value); };
      word.addEventListener("input",update);text.addEventListener("input",alphabets);update();alphabets();
    }
  };
}

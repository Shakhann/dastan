"use strict";
// Coordinates and screen captions are fixed by the stage-16 brief.
const HISTORY = (() => {
  const place = (name, lon, lat) => ({name, lon, lat});
  const scene = (year, title, subtitle, camera, places = [], areas = [], arrows = []) => ({year, title, subtitle, camera, places, areas, arrows});
  const sections = [
    {id:"khanate", title:"Қазақ хандығы", years:"1465–1698", scenes:[
      scene(1465,"Қазақ хандығы","Керей мен Жәнібек",[71,45,1.35],[place("Қозыбасы",73.5,43.6)],[{bounds:[72,76,42.5,45.5]}],[{from:[66,46],to:[73.5,43.6]}]),
      scene(1698,"Жеті жарғы","Тәуке хан мен үш би",[68.3,44.5,1.35],[place("Күлтөбе",68.3,43.3)])]},
    {id:"zhongar",title:"Жоңғарға қарсы күрес",years:"1643–1730",scenes:[
      scene(1643,"Орбұлақ шайқасы","Жәңгір хан мен Жалаңтөс Баһадүр",[79,46,1.35],[place("Орбұлақ",78.4,44.7)],[],[{from:[83,46],to:[78.4,44.7],red:true}]),
      scene(1723,"Ақтабан шұбырынды","Алқакөл сұлама",[73,46,1.3],[place("Сырдария",66,44.5)],[],[-.45,0,0.45].map(d=>({from:[81,46+d],to:[66,44.5+d],red:true}))),
      scene(1730,"Аңырақай шайқасы","Үш жүздің біріккен жасағы",[74.6,45.5,1.35],[place("Аңырақай",74.6,44.6)],[{bounds:[74,75.2,44.2,45],flash:true}])]},
    {id:"freedom",title:"Отарлау және азаттық",years:"1801–1916",scenes:[
      scene(1801,"Бөкей Ордасы","Еділ мен Жайық аралығы",[50,49,1.35],[place("Бөкей Ордасы",48.6,48.6)],[{bounds:[46.5,51,46.5,50.5]}]),
      scene(1841,"Кенесары хан","Үш жүздің өкілдері",[66.5,48,1.0],[],[{land:true}]),
      scene(1916,"Ұлт-азаттық көтеріліс","Торғай мен Жетісу",[70,48,1.2],[place("Торғай",63.6,49.6),place("Жетісу",77.5,44.8)])]},
    {id:"alash",title:"Алаш",years:"1913–1917",scenes:[
      scene(1913,"Қазақ газеті","Орынбор",[56,51,1.35],[place("Орынбор",55.1,51.8)]),
      scene(1917,"Алаш автономиясы","Орынбор съезі",[66,49,1.0],[place("Орынбор",55.1,51.8)],[{land:true}])]},
    {id:"modern",title:"Кеңес дәуірі мен тәуелсіздік",years:"1930–1991",scenes:[
      {...scene(1930,"Түрксіб","Сібір мен Орта Азия",[75,47,1.3],[place("Семей",80.2,50.4),place("Алматы",76.9,43.25)]),rail:[[80.2,50.4],[80.4,47.9],[76.9,43.25],[73.4,42.9],[69.6,42.3]]},
      scene(1931,"Ашаршылық қасіреті","1930–1933",[66.5,48,1.0],[],[{land:true,dark:true}]),
      scene(1986,"Желтоқсан","Алматы",[76.9,44.6,1.35],[place("Алматы",76.9,43.25)]),
      scene(1991,"Тәуелсіздік","16 желтоқсан",[66.5,48,1.0],[place("Семей полигоны",78.4,50.4)],[{land:true,glow:true}])]} 
  ];
  const find = id => sections.find(s=>s.id === id);
  const event = s => APP.data.timeline.find(t=>Number(t.year) === s.year);
  const line = points => points.map((p,i)=>(i ? "L" : "M") + historyPoint(...p).join(" ")).join(" ");
  const ellipse = (bounds, attrs = "") => {
    const [l,r,b,t]=bounds, [x,y]=historyPoint((l+r)/2,(b+t)/2);
    return `<ellipse cx="${x}" cy="${y}" rx="${(r-l)*HISTORY_MAP.k/2}" ry="${(t-b)*HISTORY_MAP.ky/2}" ${attrs}/>`;
  };
  function map() {
    const rivers = [
      ["Сырдария",[[70,41],[68.5,42.5],[66,44.5],[61,46]]],
      ["Шу",[[77,42.5],[75,43],[73,44],[69,44.5]]],
      ["Іле",[[82,43.5],[79,43.8],[77,44.7],[75,45.5]]],
      ["Ертіс",[[85,47],[83,49],[80.2,50.4],[77,52],[74,54]]],
      ["Жайық",[[58,54],[54,51],[51,49],[51.5,47]]]
    ];
    return `<div class="history-map-wrap"><svg class="history-map" data-history-map viewBox="0 0 1000 620" role="img" aria-label="Тарихи оқиға картасы"><defs><radialGradient id="history-edge"><stop offset="55%" stop-color="white"/><stop offset="100%" stop-color="#555"/></radialGradient><mask id="history-fog"><rect x="-1000" y="-1000" width="3000" height="2600" fill="url(#history-edge)"/></mask><marker id="history-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="context-stroke"/></marker><pattern id="history-contours" width="150" height="100" patternUnits="userSpaceOnUse"><path d="M-40 80Q30 -40 110 40T220 25M-30 95Q30 -25 110 55T220 40M-20 110Q40 -10 120 70T230 55" fill="none" stroke="#806b3c" stroke-opacity=".12"/></pattern></defs><g mask="url(#history-fog)"><rect x="-1000" y="-1000" width="3000" height="2600" fill="#e5d1a2"/><g data-history-period></g><rect width="1000" height="620" fill="url(#history-contours)" pointer-events="none"/><g class="history-water"><g><title>Каспий</title>${ellipse([47,52,36.5,47])}</g><g><title>Арал</title>${ellipse([58.5,61.5,43.5,46.5])}</g><g><title>Балқаш</title>${ellipse([73.5,79,45.5,46.8])}</g></g><g class="history-rivers">${rivers.map(([name,points])=>`<path d="${line(points)}"><title>${name}</title></path>`).join("")}</g><g class="history-mountains">${[0,1,2,3].map(i=>`<path d="${line([[69+i,41.5],[73+i,43.4],[76+i,43],[80+i,46],[83+i,48]])}"/>`).join("")}</g><g data-history-scene></g></g></svg><div class="history-map-caption" data-history-caption></div><p class="history-map-note">Қазіргі шекара бағдар үшін көрсетілген, тарихи шекара емес.</p></div>`;
  }
  function sceneSVG(s) {
    return s.areas.map(a=> {
      const cls=`history-area${a.dark ? ' history-area-dark' : ''}${a.glow ? ' history-area-glow' : ''}${a.flash ? ' history-flash' : ''}`;
      return a.land ? "" : ellipse(a.bounds,`class="${cls}"`);
    }).join("") + s.arrows.map(a=>`<path class="history-route${a.red ? ' history-route-red' : ''}" d="${line([a.from,a.to])}" pathLength="1"/>`).join("") + (s.rail ? `<path class="history-route history-rail" pathLength="1" d="${line(s.rail)}"/>` : "") + s.places.map(p=> {
      const [x,y]=historyPoint(p.lon,p.lat),w=p.name.length*8+22;
      return `<g class="history-place" transform="translate(${x} ${y})"><circle class="history-pulse" r="10"/><circle r="4"/><rect x="${-w/2}" y="-32" width="${w}" height="22" rx="11"/><text text-anchor="middle" y="-17">${esc(p.name)}</text></g>`;
    }).join("");
  }
  function remember(section) {
    return `<section class="history-remember" data-history-remember hidden><h2>Есте сақта</h2><div class="history-table-scroll"><table><thead><tr><th scope="col">Жыл</th><th scope="col">Оқиға</th><th scope="col">Орын</th></tr></thead><tbody>${section.scenes.map(s=>`<tr><th scope="row">${s.year}</th><td>${esc(s.title)}</td><td>${esc(s.places.map(p=>p.name).join(", ") || "—")}</td></tr>`).join("")}</tbody></table></div></section>`;
  }
  function render(id) {
    if (!id) return `<header class="timeline-heading"><h1>Тарих жолы</h1></header>` + ATLAS.render() + `<section class="timeline-ribbon"><h2>Оқиғалар лентасы</h2>${timelineRail()}</section>`;
    const section=find(id);
    if (!section) return heading("Бөлім табылмады")+routeLink("timeline","Тарих жолына оралу");
    const next=sections[sections.indexOf(section)+1];
    return routeLink("timeline","Барлық бөлімдер","back")+`<header class="history-heading"><h1>${esc(section.title)}</h1><p>${section.years}</p></header><section class="history-player" data-history data-section="${section.id}" aria-label="${esc(section.title)}"><div class="history-stage"><div class="history-years" aria-label="Оқиға жылдары">${section.scenes.map((s,i)=>`<button type="button" data-history-index="${i}" aria-pressed="false">${s.year}</button>`).join("")}</div>${map()}<div class="history-controls"><button type="button" data-history-prev>Алдыңғы</button><button type="button" data-history-play aria-pressed="false">Ойнату</button><button type="button" data-history-next>Келесі</button></div></div><article class="history-reading" tabindex="0" aria-label="Оқиғаның толық мәтіні"><div data-history-text></div>${remember(section)}</article><p class="sr-only" role="status" aria-live="polite" data-history-status></p></section><nav class="history-next">${next ? routeLink("timeline/"+next.id,"Келесі бөлім: "+next.title,"button") : routeLink("timeline","Тарих жолына оралу","button")}</nav>`;
  }
  // Keep the whole modern outline and a small surrounding margin in every view.
  const outlinePoints = [...HISTORY_MAP.lands.kz.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map(m => [+m[1], +m[2]]);
  const outline = [Math.min(...outlinePoints.map(p=>p[0]))-24, Math.min(...outlinePoints.map(p=>p[1]))-24,
    Math.max(...outlinePoints.map(p=>p[0]))+24, Math.max(...outlinePoints.map(p=>p[1]))+24];
  function cameraBox(lon, lat, zoom=1) {
    const scale=Math.max(1,Math.min(1.35,zoom,1000/(outline[2]-outline[0]),620/(outline[3]-outline[1])));
    const w=1000/scale,h=620/scale,[x,y]=historyPoint(lon,lat);
    const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
    return [clamp(x-w/2,outline[2]-w,outline[0]),clamp(y-h/2,outline[3]-h,outline[1]),w,h];
  }
  function mount(id) {
    if (!find(id)) return () => {};
    const root=document.querySelector("[data-history]");
    if (!root) return () => {};
    const section=find(id), overview=!section, scenes=overview ? sections.map(s=>s.scenes[0]) : section.scenes;
    const svg=root.querySelector("[data-history-map]"), layer=root.querySelector("[data-history-scene]"), caption=root.querySelector("[data-history-caption]");
    const play=root.querySelector("[data-history-play]"), media=window.matchMedia("(prefers-reduced-motion: reduce)");
    let index=0, timer=null, frame=null, playing=false, disposed=false, box=[0,0,1000,620];
    function camera(s, initial) {
      cancelAnimationFrame(frame);
      const target=initial ? [0,0,1000,620] : cameraBox(...s.camera),start=box.slice();
      if (media.matches || initial) { box=target; svg.setAttribute("viewBox",box.join(" ")); return; }
      let began;
      function tick(time) {
        if (disposed) return;
        began ??= time; const t=Math.min(1,(time-began)/1200),ease=t*t*(3-2*t);
        box=start.map((n,i)=>n+(target[i]-n)*ease); svg.setAttribute("viewBox",box.join(" "));
        if (t<1) frame=requestAnimationFrame(tick);
      }
      frame=requestAnimationFrame(tick);
    }
    function update(initial=false) {
      const s=scenes[index], data=event(s);
      layer.innerHTML=sceneSVG(s); camera(s,initial);
      const periodLayer=root.querySelector("[data-history-period]");
      if (periodLayer && typeof ATLAS !== "undefined") ATLAS.loadPeriods().then(()=>{ if (!disposed) periodLayer.innerHTML=ATLAS.periodSVG(s.year); });
      svg.setAttribute("aria-label",`${s.year}: ${s.title}. ${s.subtitle}`);
      caption.innerHTML=`<span class="history-year">${s.year}</span><h2>${esc(s.title)}</h2><p>${esc(s.subtitle)}</p>`;
      root.querySelectorAll("[data-history-index]").forEach((b,i)=>b.setAttribute("aria-pressed",String(i===index)));
      root.querySelectorAll("[data-history-section]").forEach((card,i)=>card.classList.toggle("history-active",i===index));
      if (!overview) {
        const text=root.querySelector("[data-history-text]");
        text.innerHTML=`<p class="history-period">${s.year}</p><h2>${esc(s.title)}</h2><p class="history-full-text">${esc(data.text_kk)}</p>${attribution({title:data.title_kk,source_url:data.source_url})}${fullDetails("tl_"+s.year,"",{summary:"Толығырақ оқу"})}${s.year===1465 ? fullDetails("art_tarikh_kazakh_khanaty","",{summary:"Толығырақ оқу: Қазақ хандығы",fallback:articleFallback(s)}) : ""}`;
        if (!media.matches) text.animate?.([{opacity:.2,transform:"translateY(6px)"},{opacity:1,transform:"none"}],{duration:280});
        root.querySelector(".history-reading").scrollTop=0;
        root.querySelector("[data-history-prev]").disabled=index===0;
        root.querySelector("[data-history-next]").disabled=index===scenes.length-1;
        root.querySelector("[data-history-remember]").hidden=index!==scenes.length-1;
        root.querySelector("[data-history-status]").textContent=`${s.year}. ${s.title}. ${s.subtitle}`;
      }
    }
    function schedule() {
      clearTimeout(timer);
      if (!playing || disposed) return;
      timer=setTimeout(()=> {
        if (overview) index=(index+1)%scenes.length;
        else if (index===scenes.length-1) { setPlaying(false); return; }
        else index++;
        update(); if (!overview && index===scenes.length-1) setPlaying(false); else schedule();
      },7000);
    }
    function setPlaying(value) {
      playing=value; play.textContent=playing ? "Тоқтату" : "Ойнату";
      play.setAttribute("aria-pressed",String(playing)); schedule();
    }
    function select(n) { setPlaying(false); index=Math.max(0,Math.min(scenes.length-1,n)); update(); }
    function click(e) {
      const b=e.target.closest("button"); if (!b) return;
      if (b.matches("[data-history-play]")) setPlaying(!playing);
      else if (b.matches("[data-history-index]")) select(Number(b.dataset.historyIndex));
      else if (b.matches("[data-history-prev]")) select(index-1);
      else if (b.matches("[data-history-next]")) select(index+1);
    }
    function key(e) {
      if (overview || !root.isConnected || e.altKey || e.ctrlKey || e.metaKey || e.target.closest("input,textarea,select,[contenteditable],[role=dialog]")) return;
      if (e.key==="ArrowLeft" || e.key==="ArrowRight") { e.preventDefault(); select(index+(e.key==="ArrowRight" ? 1 : -1)); }
    }
    function motion() { if (media.matches) { setPlaying(false); camera(scenes[index],true); } }
    // Reading or opening a source should never race automatic scene changes.
    function reading(e) { if (e.target.closest(".history-reading")) setPlaying(false); }
    root.addEventListener("click",click); document.addEventListener("keydown",key); root.addEventListener("focusin",reading); root.addEventListener("pointerdown",reading); root.addEventListener("wheel",reading,{passive:true});
    media.addEventListener?.("change",motion);
    update(true); setPlaying(!media.matches);
    return () => { disposed=true; clearTimeout(timer); cancelAnimationFrame(frame); root.removeEventListener("click",click);document.removeEventListener("keydown",key);root.removeEventListener("focusin",reading);root.removeEventListener("pointerdown",reading);root.removeEventListener("wheel",reading);media.removeEventListener?.("change",motion); };
  }
  // Exact local article matches only; the other events use the existing tl_YEAR full text.
  let khanateArticle=null;
  function articleFallback(s) {
    return s.year===1465 && khanateArticle ? `<p>${esc(khanateArticle.text)}</p>${attribution(khanateArticle)}` : "";
  }
  async function prepare(id) {
    if ((!id || id==="khanate") && !khanateArticle) {
      try { khanateArticle=await APP.cachedJSON("data/tarikh/tarikh_kazakh_khanaty.json"); } catch { /* tl_1465 remains available via fullDetails. */ }
    }
    return render(id);
  }
  return {sections,find,event,sceneSVG,cameraBox,render:prepare,mount};
})();

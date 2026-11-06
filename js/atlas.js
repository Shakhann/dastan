"use strict";
// Local atlas context; the event selection is fixed by the stage-20 brief.
const ATLAS = (() => {
  const MIN = -700, PLAY_START = 1465, MAX = 2024, UNKNOWN = "Сенімді дерек жоқ";
  const regions = [
    [-700,-300,"Сақтар",72,45,10,5],[-300,400,"Үйсіндер",77,44,5,3],[-300,400,"Қаңлы",66,44,6,3],
    [552,603,"Түрік қағанаты",72,46,17,7],[603,704,"Батыс Түрік қағанаты",72,44,11,4],
    [704,756,"Түргеш қағанаты",74,44,7,3],[756,940,"Қарлұқ қағанаты",74,44,7,3],
    [766,1040,"Оғыз мемлекеті",62,45,9,4],[800,1050,"Қимақ қағанаты",76,50,9,4],
    [942,1212,"Қарахан мемлекеті",72,42,8,3],[1050,1219,"Қыпшақ хандығы",62,48,14,5],
    [1224,1360,"Алтын Орда",58,48,14,6],[1360,1428,"Ақ Орда",64,46,10,4],
    [1346,1462,"Моғолстан",77,44,6,3],[1428,1468,"Әбілқайыр хандығы",64,47,12,5],
    [1440,1600,"Ноғай Ордасы",52,47,6,4],[1465,1847,"Қазақ хандығы",68,46,16,6],
    [1635,1758,"Жоңғар хандығы",83,46,6,4],[1801,1845,"Бөкей Ордасы",49,48.5,2.5,2],
    [1847,1917,"Ресей империясы құрамы",68,48,18,7],[1917,1920,"Алаш автономиясы",68,48,18,7],
    [1920,1936,"Қазақ АКСР",68,48,18,7],[1936,1991,"Қазақ КСР"],[1991,2024,"Қазақстан Республикасы"]
  ].map(([start,end,name,lon,lat,rx,ry],id) => ({id,start,end,name,lon,lat,rx,ry}));
  const rulers = [
    [1465,1474,"Керей хан"],[1474,1480,"Жәнібек хан"],[1480,1511,"Бұрындық хан"],
    [1511,1521,"Қасым хан"],[1538,1580,"Хақназар хан"],[1582,1598,"Тәуекел хан"],
    [1598,1628,"Есім хан"],[1628,1652,"Жәңгір хан"],[1680,1715,"Тәуке хан"],
    [1718,1748,"Әбілқайыр хан (Кіші жүз)"],[1771,1781,"Абылай хан"],[1841,1847,"Кенесары хан"]
  ].map(([start,end,name]) => ({start,end,name}));
  const capitals = [
    [1465,1599,"Сығанақ"],[1599,1729,"Түркістан"],[1920,1925,"Орынбор"],
    [1925,1929,"Қызылорда"],[1929,1997,"Алматы"],[1997,2024,"Астана"]
  ].map(([start,end,name]) => ({start,end,name}));
  const cities = [
    [500,"Тараз",71.4,42.9],[500,"Отырар",68.3,42.85],[500,"Түркістан",68.25,43.3],
    [900,"Сауран",67.9,43.5],[1000,"Сығанақ",66.5,44.4],[1200,"Шымкент",69.6,42.3],
    [1613,"Орал",51.4,51.2],[1640,"Атырау",51.9,47.1],[1718,"Семей",80.2,50.4],
    [1720,"Өскемен",82.6,49.95],[1752,"Петропавл",69.15,54.9],[1820,"Қызылорда",65.5,44.85],
    [1830,"Астана",71.45,51.15],[1854,"Алматы",76.9,43.25],[1861,"Павлодар",76.95,52.3],
    [1869,"Ақтөбе",57.2,50.3],[1879,"Қостанай",63.6,53.2],[1934,"Қарағанды",73.1,49.8],
    [1961,"Ақтау",51.2,43.65]
  ].map(([start,name,lon,lat],id) => ({id,start,name,lon,lat}));
  const names = {
    "Астана":[[1830,"Ақмола"],[1961,"Целиноград"],[1992,"Ақмола"],[1997,"Астана"]],
    "Алматы":[[1854,"Верный"],[1921,"Алматы"]],"Қызылорда":[[1820,"Ақмешіт"],[1925,"Қызылорда"]],
    "Ақтау":[[1961,"Ақтау"],[1964,"Шевченко"],[1991,"Ақтау"]],
    "Атырау":[[1640,"Гурьев"],[1991,"Атырау"]],"Орал":[[1613,"Яицк"],[1775,"Уральск"],[1991,"Орал"]],
    "Семей":[[1718,"Семипалат"],[1991,"Семей"]]
  };
  const oldAfter = {"Отырар":1700,"Сауран":1800,"Сығанақ":1600};
  const censuses = [[1897,4.1,null],[1926,6.2,57],[1939,6.1,38],[1959,9.3,30],[1970,13,33],
    [1979,14.7,36],[1989,16.2,40],[1999,15,53],[2009,16,63],[2021,19.2,70]]
    .map(([year,million,kazakhPercent]) => ({year,million,kazakhPercent}));
  const contains = (item, year) => year >= item.start && (year < item.end || (item.end === MAX && year === MAX));
  const yearLabel = year => year < 0 ? `б.з.д. ${Math.abs(year)} жыл` : `${year} жыл`;
  function cityName(city, year) {
    const series = names[city.name];
    return series ? series.filter(([start]) => year >= start).at(-1)?.[1] || city.name : city.name;
  }
  function state(value) {
    const numeric = Number(value), year = Math.max(MIN,Math.min(MAX,Number.isFinite(numeric) ? Math.round(numeric) : 1465));
    return {
      year, regions:regions.filter(item => contains(item,year)),
      ruler:rulers.find(item => contains(item,year))?.name || null,
      capital:capitals.find(item => contains(item,year))?.name || null,
      cities:cities.filter(city => year >= city.start).map(city => ({...city,label:cityName(city,year),old:year > oldAfter[city.name]})),
      census:year < 1897 ? null : censuses.reduce((nearest,item) => Math.abs(item.year-year) < Math.abs(nearest.year-year) ? item : nearest)
    };
  }
  const eventTypes = {development:"Даму",harm:"Залал",struggle:"Күрес",turning:"Бетбұрыс"};
  const symbols = {development:"●",harm:"×",struggle:"↗",turning:"◆"};
  const supplied = [
    [1731,"turning","Кіші жүздің Ресей қарауына өтуі","Кіші жүз ханы Әбілқайыр Ресей бодандығын қабылдады. Қазақ жерінің Ресей құрамына ену кезеңі басталды.",56,48,"Абулхаир-хан"],
    [1822,"turning","Хан билігінің жойылуы","«Сібір қырғыздары туралы жарғы» бойынша Орта жүзде хан билігі жойылды.",72,50,"Устав_о_сибирских_киргизах"],
    [1836,"struggle","Исатай мен Махамбет көтерілісі","Бөкей Ордасында Исатай Тайманұлы мен Махамбет Өтемісұлы бастаған халық езгіге қарсы көтерілді.",49,48.5,"Восстание_Исатая_Тайманова"],
    [1936,"turning","Қазақ КСР","Қазақстан одақтас республика болды.",71,48,"Казахская_Советская_Социалистическая_Республика"],
    [1949,"harm","Семей полигонындағы алғашқы ядролық сынақ","29 тамызда Семей полигонында алғашқы ядролық сынақ жасалды. Сынақтар халықтың денсаулығына ауыр зиян келтірді.",78.4,50.4,"Семипалатинский_испытательный_полигон"],
    [1954,"development","Тың игеру","Солтүстік Қазақстанда тың жерлерді игеру басталды, елге көптеген жаңа тұрғындар келді.",69,52,"Освоение_целины"],
    [1997,"development","Астана ел астанасы","Ел астанасы Алматыдан Ақмолаға көшірілді.",71.45,51.15,"Астана"]
  ];
  const selectedYears = [[1465,"development"],[1643,"struggle"],[1698,"development"],[1723,"harm"],[1730,"struggle"],[1801,"turning"],[1841,"struggle"],[1913,"development"],[1916,"struggle"],[1917,"development"],[1930,"development"],[1931,"harm"],[1986,"struggle"],[1991,"turning"]];
  function allEvents() {
    const local=selectedYears.map(([year,type])=>{
      const data=APP.data.timeline.find(item=>Number(item.year)===year);
      const section=HISTORY.sections.find(section=>section.scenes.some(scene=>scene.year===year));
      const scene=section.scenes.find(scene=>scene.year===year),point=scene.places[0];
      return {id:String(year),year,type,title:data.title_kk,text:data.text_kk,source_url:data.source_url,section:section.id,scene,
        lon:point?.lon ?? scene.camera[0],lat:point?.lat ?? scene.camera[1]};
    });
    return local.concat(supplied.map(([year,type,title,text,lon,lat,source])=>({id:String(year),year,type,title,text,lon,lat,source_url:`https://ru.wikipedia.org/wiki/${source}`}))).sort((a,b)=>a.year-b.year);
  }
  const filterEvents=(types=Object.keys(eventTypes))=>allEvents().filter(event=>types.includes(event.type));
  function facts(s) {
    const rows=[s.capital&&["Астана",s.capital],s.ruler&&["Билеуші",s.ruler],s.census&&["Халық санағы",`${s.census.million.toFixed(1)} млн · ${s.census.year} санағы`],s.census?.kazakhPercent!=null&&["Қазақ үлесі",`${s.census.kazakhPercent}%`]].filter(Boolean);
    return rows.length ? `<dl class="atlas-facts">${rows.map(([label,value])=>`<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join("")}</dl>` : "";
  }
  const EXTRA_ROUTES={1730:[[[67,47],[74.6,44.6]],[[71,50],[74.6,44.6]],[[62,46],[74.6,44.6]]]};
  const curve=pts=>{const p=pts.map(q=>historyPoint(...q));if(p.length!==2)return "M"+p.map(q=>q.join(" ")).join("L");const [[a,b],[c,d]]=p,mx=(a+c)/2+(d-b)*.18,my=(b+d)/2-(c-a)*.18;return `M${a} ${b}Q${mx} ${my} ${c} ${d}`;};
  const line=points=>points.map((point,i)=>(i?"L":"M")+historyPoint(...point).join(" ")).join(" ");
  function eventSVG(e) {
    if(!e)return "";
    const [x,y]=historyPoint(e.lon,e.lat),scene=e.scene;
    const areas=(scene?.areas||[]).map(area=>{
      if(area.land)return "";
      const [l,r,b,t]=area.bounds,[cx,cy]=historyPoint((l+r)/2,(b+t)/2);
      return `<ellipse class="atlas-impact-area" cx="${cx}" cy="${cy}" rx="${(r-l)*HISTORY_MAP.k/2}" ry="${(t-b)*HISTORY_MAP.ky/2}"/>`;
    }).join("");
    const routes=[...(scene?.arrows||[]).map(a=>[a.from,a.to]),...(EXTRA_ROUTES[e.year]||[]),...(scene?.rail?[scene.rail]:[])].map((pts,i)=>{const d=curve(pts);return `<path class="atlas-route" style="--i:${i}" d="${d}" pathLength="1"/><circle class="atlas-route-dot" r="5"><animateMotion dur="3.2s" begin="${(.4+i*.25).toFixed(2)}s" repeatCount="indefinite" path="${d}"/></circle>`;}).join("");
    const points=scene?.places.length ? scene.places : [{lon:e.lon,lat:e.lat,name:e.title}];
    return `<g class="atlas-event-mark atlas-impact-${e.type}" data-type="${e.type}"><title>${esc(e.title)}</title>${areas}${routes}${points.map(point=>{const [px,py]=historyPoint(point.lon,point.lat);return `<g transform="translate(${px} ${py})"><circle class="atlas-impact-pulse" r="12"/><circle class="atlas-impact-dot" r="5"/><title>${esc(point.name)}</title></g>`;}).join("")}</g>`;
  }
  function eventCamera(e) { return HISTORY.cameraBox(e.lon,e.lat,1.2); }
  const PERIOD_OF={1465:1465,1643:1650,1698:1700,1723:1715,1730:1715,1731:1715,1801:1800,1822:1815,1836:1815,1841:1815,1913:1914,1916:1914,1917:1914,1930:1930,1931:1930,1936:1938,1949:1945,1954:1960,1986:1960,1991:1994,1997:1994};
  const FATES={"Қазан хандығы":"1552 жылы Ресей патшалығы жойды.","Астрахан хандығы":"1556 жылы Ресей патшалығы жойды.","Сібір хандығы":"1598 жылы Ресей патшалығы жойды.","Әбілқайыр хандығы":"1468 жылы Әбілқайыр өлген соң ыдырады.","Сефевид мемлекеті":"1736 жылы Надир шах құлатты.","Цин империясы":"1912 жылы Синьхай төңкерісі құлатты.","Ресей империясы":"1917 жылғы төңкерісте құлады.","Хиуа хандығы":"1920 жылы Қызыл Армия жойды.","Бұхар хандығы":"1920 жылы Қызыл Армия жойды.","Осман империясы":"1922 жылы тарады.","КСРО":"1991 жылы ыдырады."};
  const LABELS={"Моғолстан":[770,470],"Орта Азия хандықтары":[420,560],"Ноғай Ордасы":[270,290],"Ресей":[430,70],"Ресей империясы":[430,110],"КСРО":[470,250],"Мәскеу патшалығы":[150,110]};
  const OWN=new Set(["Қазақ хандығы","Қазақстан"]);
  const TINTS=["#d9b878","#c9a56b","#b9c08c","#cfa98a","#a9bfa6","#d6c08f","#bda98c"];
  let periods=null,periodsLoading=null;
  function loadPeriods(){periodsLoading??=Promise.resolve().then(()=>APP.cachedJSON("data/history-periods.json")).then(data=>{periods=data;return data;}).catch(()=>{periodsLoading=null;return null;});return periodsLoading;}
  const periodOf=year=>periods?.[PERIOD_OF[year]]||[];
  function periodSVG(year){
    return periodOf(year).map((f,i)=>`<path class="atlas-period${OWN.has(f.n)?" is-own":""}" data-state="${esc(f.n)}" d="${f.d}" fill="${OWN.has(f.n)?"#2f9e8f":TINTS[i%TINTS.length]}"><title>${esc(f.n)}</title></path>`).join("")+periodOf(year).filter(f=>f.c[0]>30&&f.c[0]<970&&f.c[1]>20&&f.c[1]<600).map(f=>{const c=f.n==="Қазақ хандығы"&&year>1465?[560,240]:LABELS[f.n]||f.c;return `<text class="atlas-period-label${OWN.has(f.n)?" is-own":""}" x="${c[0]}" y="${c[1]}" text-anchor="middle">${esc(f.n)}</text>`;}).join("");
  }
  function neighbours(year){
    const list=periodOf(year).filter(f=>!OWN.has(f.n));
    return list.length?`<section class="atlas-neighbours"><h3>Көршілері</h3><ul>${list.map(f=>`<li><b>${esc(f.n)}</b>${FATES[f.n]?` <span>${esc(FATES[f.n])}</span>`:""}</li>`).join("")}</ul></section>`:"";
  }
  const offsets={1:[-20,38],2:[-22,2],3:[-40,-27],4:[-15,-17],5:[12,30],0:[15,15],11:[-15,-25],8:[-15,-14],9:[15,20]};
  function citySVG(s) {
    return s.cities.map(city=>{
      const [x,y]=historyPoint(city.lon,city.lat),[dx,dy]=offsets[city.id]||[13,-12];
      return `<g class="atlas-city is-visible${city.old?" is-old":""}" transform="translate(${x} ${y})"><g class="atlas-city-pop"><title>${esc(city.label)}</title><circle class="atlas-city-dot" r="4"/><path class="atlas-city-leader" d="M0 0L${dx} ${dy}"/><text class="atlas-city-label" x="${dx}" y="${dy}" text-anchor="${dx<0?"end":"start"}">${esc(city.label)}</text></g></g>`;
    }).join("");
  }
  function eventCard(e) {
    return e ? `<p class="atlas-event-type" data-type="${e.type}"><span class="atlas-event-symbol" aria-hidden="true">${symbols[e.type]}</span> ${eventTypes[e.type]}</p><p class="atlas-year">${e.year}</p><h2>${esc(e.title)}</h2><p>${esc(e.text)}</p><p class="atlas-event-links">${sourceLink(e.source_url)}${e.section?` <a href="#timeline/${e.section}">Толығырақ</a>`:""}</p>${facts(state(e.year))}${neighbours(e.year)}` : `<h2>Оқиға таңдалмады</h2><p>Кемінде бір сүзгіні қосыңыз.</p>`;
  }
  function ticks(events,selected) {
    return events.map(e=>`<button type="button" data-event-index="${events.indexOf(e)}" data-type="${e.type}" aria-pressed="${e===selected}" aria-label="${e.year}: ${esc(e.title)}">${e.year}</button>`).join("");
  }
  function render() {
    const events=allEvents(),e=events[0],s=state(e.year);
    return `<section class="atlas-page atlas-journey" data-atlas-events aria-label="Маңызды оқиғалар картасы"><div class="atlas-event-layout"><div class="atlas-map-column"><div class="atlas-stage history-map-wrap"><svg class="atlas-map history-map" data-event-map="true" viewBox="0 0 1000 620" role="img" aria-label="${e.year}: ${esc(e.title)}"><rect x="-400" y="-400" width="1800" height="1420" fill="#efe3c4"/><g data-event-period-old="true"></g><g data-event-period="true"></g><g data-event-cities="true">${citySVG(s)}</g><g data-event-layer="true">${eventSVG(e)}</g></svg><p class="atlas-map-key">Шекаралар шамамен (historical-basemaps). 1800–1960 жылдардағы карталарда қазақ жері империя мен КСРО құрамында көрсетілген.</p></div><div class="atlas-event-slider"><label for="atlasEvent">Маңызды оқиға</label><output for="atlasEvent" data-event-year>${e.year}</output><input id="atlasEvent" data-event-slider type="range" min="0" max="20" step="1" value="0" aria-valuetext="${e.year}: ${esc(e.title)}" aria-describedby="atlasEventHelp"><div class="atlas-event-ticks" data-event-ticks aria-label="Оқиға жылдары">${ticks(events,e)}</div><div class="atlas-event-controls"><button type="button" data-event-prev disabled>Алдыңғы</button><span data-event-position>1 / 21</span><button type="button" data-event-next>Келесі</button></div><p id="atlasEventHelp" class="fine">← / → — алдыңғы немесе келесі оқиға.</p></div></div><article class="atlas-event-card" data-event-card aria-label="Оқиға туралы мәлімет">${eventCard(e)}</article></div><fieldset class="atlas-event-filters"><legend>Оқиғаның әсері</legend>${Object.entries(eventTypes).map(([type,label])=>`<label><input type="checkbox" value="${type}" data-event-filter checked><span class="atlas-event-symbol" data-type="${type}" aria-hidden="true">${symbols[type]}</span>${label}</label>`).join("")}</fieldset><p class="atlas-event-status sr-only" data-event-status role="status" aria-live="polite" aria-atomic="true"></p></section>`;
  }
  function mount() {
    const root=document.querySelector("[data-atlas-events]");if(!root)return()=>{};
    const q=selector=>root.querySelector(selector),svg=q("[data-event-map]"),slider=q("[data-event-slider]"),media=window.matchMedia("(prefers-reduced-motion: reduce)");
    let active=allEvents(),selected=active[0],frame=null,disposed=false,box=[0,0,1000,620];
    function camera(e,instant=false) {
      cancelAnimationFrame(frame);frame=null;
      const target=e?eventCamera(e):[0,0,1000,620],start=box.slice();
      if(instant||media.matches){box=target;svg.setAttribute("viewBox",box.join(" "));return;}
      let began;
      function tick(time){if(disposed)return;began??=time;const p=Math.min(1,(time-began)/900),ease=p*p*(3-2*p);box=start.map((n,i)=>n+(target[i]-n)*ease);svg.setAttribute("viewBox",box.join(" "));if(p<1)frame=requestAnimationFrame(tick);else frame=null;}
      frame=requestAnimationFrame(tick);
    }
    let yearFrame=null,shownYear=null;
    function countYear(year,instant){
      const out=q("[data-event-year]");
      if(year==null){out.textContent="—";return;}
      cancelAnimationFrame(yearFrame);out.textContent=String(year);
      if(instant||media.matches||shownYear==null){shownYear=year;return;}
      const from=shownYear,to=year;let began;shownYear=year;
      function step(t){if(disposed)return;began??=t;const p=Math.min(1,(t-began)/800),v=Math.round(from+(to-from)*(1-Math.pow(1-p,3)));const b=q(".atlas-year");if(b)b.textContent=String(v);if(p<1)yearFrame=requestAnimationFrame(step);}
      yearFrame=requestAnimationFrame(step);
    }
    function show(e,initial=false) {
      const tickFocused=document.activeElement?.closest?.("[data-event-index]");
      selected=e;const index=active.indexOf(e),empty=!e;
      const layer=q("[data-event-period]"),old=q("[data-event-period-old]"),nextMap=e?periodSVG(e.year):"";
      if(old&&!initial&&!media.matches&&layer.innerHTML!==nextMap){old.innerHTML=layer.innerHTML;old.classList.remove("is-leaving");void old.getBoundingClientRect?.();old.classList.add("is-leaving");}
      layer.innerHTML=nextMap;
      if(e&&layer.style){const [ox,oy]=historyPoint(e.lon,e.lat);layer.style.setProperty("--ox",ox+"px");layer.style.setProperty("--oy",oy+"px");layer.classList?.remove("is-spreading");void layer.getBoundingClientRect?.();if(!initial)layer.classList?.add("is-spreading");}
      q("[data-event-layer]").innerHTML=eventSVG(e);
      q("[data-event-cities]").innerHTML=e?citySVG(state(e.year)):"";
      q("[data-event-card]").innerHTML=eventCard(e);
      countYear(e?e.year:null,initial);
      q("[data-event-position]").textContent=empty?"0 / 0":`${index+1} / ${active.length}`;
      q("[data-event-prev]").disabled=index<=0;q("[data-event-next]").disabled=index<0||index===active.length-1;
      slider.disabled=empty;slider.max=String(Math.max(0,active.length-1));slider.value=String(Math.max(0,index));
      slider.setAttribute("aria-valuetext",e?`${e.year}: ${e.title}`:"Оқиға таңдалмады");
      q("[data-event-ticks]").innerHTML=ticks(active,e);
      if(tickFocused)q(`[data-event-index="${index}"]`)?.focus?.();
      svg.setAttribute("aria-label",e?`${e.year}: ${e.title}`:"Оқиға таңдалмады");
      q("[data-event-status]").textContent=e?`${e.year}. ${eventTypes[e.type]}. ${e.title}`:"Кемінде бір сүзгіні қосыңыз.";
      camera(e,initial);
    }
    function select(index){if(active.length)show(active[Math.max(0,Math.min(active.length-1,index))]);}
    function click(event){const target=event.target;if(target.closest("[data-event-prev]"))select(active.indexOf(selected)-1);else if(target.closest("[data-event-next]"))select(active.indexOf(selected)+1);else {const tick=target.closest("[data-event-index]");if(tick)select(Number(tick.dataset.eventIndex));}}
    function input(event){if(event.target===slider)select(Number(slider.value));}
    function change(event){if(event.target.closest("[data-event-filter]")){active=filterEvents([...root.querySelectorAll("[data-event-filter]")].filter(input=>input.checked).map(input=>input.value));show(active.find(e=>e.id===selected?.id)||active[0]||null);}}
    function key(event){if(event.altKey||event.ctrlKey||event.metaKey||event.target.closest("textarea,select,[contenteditable],a,input[type=checkbox]"))return;if(event.key==="ArrowLeft"||event.key==="ArrowRight"){event.preventDefault();select(active.indexOf(selected)+(event.key==="ArrowRight"?1:-1));}}
    function motion(){if(media.matches){cancelAnimationFrame(yearFrame);yearFrame=null;camera(selected,true);}}
    root.addEventListener("click",click);root.addEventListener("input",input);root.addEventListener("change",change);root.addEventListener("keydown",key);media.addEventListener?.("change",motion);show(selected,true);loadPeriods().then(()=>{if(!disposed)show(selected,true);});
    return()=>{disposed=true;cancelAnimationFrame(frame);cancelAnimationFrame(yearFrame);root.removeEventListener("click",click);root.removeEventListener("input",input);root.removeEventListener("change",change);root.removeEventListener("keydown",key);media.removeEventListener?.("change",motion);};
  }
  return {periodSVG,loadPeriods,periodOf,PERIOD_OF,FATES,MIN,MAX,PLAY_START,UNKNOWN,regions,rulers,capitals,cities,censuses,cityName,yearLabel,state,allEvents,get events(){return allEvents();},eventTypes,filterEvents,facts,eventSVG,eventCamera,eventCard,render,mount};
})();

"use strict";
const EXPERIENCE = (() => {
  const normalize = value => String(value ?? "").normalize("NFC").toLocaleLowerCase("kk");
  // Matching returns source offsets: the renderer never parses or replaces HTML.
  function wordIndex(words = [], dictionary = []) {
    const index = new Map();
    for (const row of words) if (row.kk && !index.has(normalize(row.kk))) index.set(normalize(row.kk), {word:row.kk,meaning:row.meaning_kk || "",example:row.example_kk || "",audio:row.audio || ""});
    for (const row of dictionary) if (row.kk && !index.has(normalize(row.kk))) index.set(normalize(row.kk), {word:row.kk,meaning:[row.ru,row.en].filter(Boolean).join(" / "),example:row.ex || "",audio:"d_" + row.id});
    return index;
  }
  const LAMP_SKIP = new Set(["басқа","басқаның","басқасы","басты","басым","басын","басы","жылы","қолы","ала","ана","оған","сол","кейін","бірақ"]);
  function textMatches(text, index, stems, seen = new Set()) {
    const matches = [];
    for (const token of String(text).matchAll(/[\p{L}\p{M}]+/gu)) {
      const normalized = normalize(token[0]);
      if (LAMP_SKIP.has(normalized)) continue;
      const candidates = [normalized, ...(stems ? stems(normalized) : [])];
      const key = candidates.find(candidate => index.has(candidate));
      if (!key || seen.has(key)) continue;
      seen.add(key);
      matches.push({start:token.index,end:token.index + token[0].length,text:token[0],key,entry:index.get(key)});
    }
    return matches;
  }
  function markTextNode(node, index, stems, seen, doc) {
    const matches = textMatches(node.nodeValue, index, stems, seen);
    if (!matches.length) return 0;
    const fragment = doc.createDocumentFragment(); let position = 0;
    for (const match of matches) {
      fragment.append(doc.createTextNode(node.nodeValue.slice(position,match.start)));
      const button = doc.createElement("button");
      button.type = "button"; button.className = "word-lamp-trigger"; button.textContent = match.text;
      button.dataset.wordLamp = match.key; button.setAttribute("aria-haspopup","dialog");
      button.setAttribute("aria-label", match.text + ": мағынасын ашу"); fragment.append(button);
      position = match.end;
    }
    fragment.append(doc.createTextNode(node.nodeValue.slice(position))); node.replaceWith(fragment);
    return matches.length;
  }
  function proseRoots(root) {
    return [...root.querySelectorAll(".prose")].filter(prose => !prose.parentElement?.closest(".prose"));
  }
  let initialized = false, pageCleanup = () => {}, closePalette = () => {}, closeLamp = () => {};
  function init() {
    if (initialized || typeof document === "undefined") return;
    initialized = true;
    const doc = document, html = doc.documentElement;
    try { html.dataset.theme = localStorage.getItem("dastan-theme") === "night" ? "night" : "day"; } catch { html.dataset.theme = "day"; }
    const updateTheme = () => doc.querySelectorAll("[data-theme-toggle]").forEach(button => {
      button.setAttribute("aria-label", html.dataset.theme === "night" ? "Күндізгі тақырып" : "Түнгі тақырып");
      button.setAttribute("aria-pressed", String(html.dataset.theme === "day"));
    }); updateTheme();
    const dialog = doc.createElement("dialog"); dialog.className = "command-palette";
    dialog.setAttribute("aria-labelledby","commandTitle");
    dialog.innerHTML = '<section class="command-dialog"><div class="command-heading"><h2 id="commandTitle">Қайда барамыз?</h2><button type="button" data-command-close aria-label="Іздеуді жабу">Жабу ×</button></div><label for="commandInput">Бөлім не сөз іздеу</label><input id="commandInput" type="search" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls="commandResults"><p class="fine" id="commandHint">↑ ↓ — таңдау, Enter — ашу, Esc — жабу</p><div id="commandResults" class="command-results" role="listbox" aria-label="Нәтижелер"></div><p data-command-status class="sr-only" role="status"></p></section>';
    doc.body.append(dialog);
    const input = dialog.querySelector("input"), results = dialog.querySelector(".command-results"), status = dialog.querySelector("[data-command-status]");
    let items = [], selected = 0, previousFocus = null, indexRows = [], request = 0;
    const focusables = box => [...box.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),[tabindex="0"]')].filter(el => !el.hidden && el.tabIndex >= 0);
    function trap(event, box) {
      if (event.key !== "Tab") return;
      const nodes = focusables(box), first = nodes[0], last = nodes.at(-1);
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (doc.activeElement === first || !box.contains(doc.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && doc.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    const select = next => {
      selected = items.length ? (next + items.length) % items.length : 0;
      results.querySelectorAll(".command-option").forEach((button,i) => button.setAttribute("aria-selected",String(i === selected)));
      if (items.length) { input.setAttribute("aria-activedescendant","command-option-" + selected); results.children[selected]?.scrollIntoView({block:"nearest"}); }
      else input.removeAttribute("aria-activedescendant");
    };
    function draw() {
      const query = input.value.trim();
      const sections = typeof NAV !== "undefined" ? NAV.map(([route,title]) => ({route,title,type:"Бөлім",text:""})) : [];
      items = query ? (rows => typeof SEARCH !== "undefined" ? SEARCH.sorted(rows,query) : rows)([...sections,...indexRows].filter(row => typeof SEARCH !== "undefined" ? SEARCH.matches(row,query) : normalize(row.title).includes(normalize(query)))).slice(0,30) : sections;
      results.replaceChildren();
      items.forEach((row,i) => {
        const button = doc.createElement("button"); button.type = "button"; button.className = "command-option";
        button.id = "command-option-" + i; button.setAttribute("role","option"); button.tabIndex = -1;
        const label = doc.createElement("span"), type = doc.createElement("small"); label.textContent = row.title; type.textContent = row.type;
        button.append(label,type); button.addEventListener("click",() => { closePalette(); location.hash = "#" + row.route; }); results.append(button);
      });
      if (!items.length) { const empty = doc.createElement("p"); empty.textContent = "Ештеңе табылмады. Басқа сөз жазыңыз."; results.append(empty); }
      status.textContent = items.length + " нәтиже"; select(0);
    }
    closePalette = () => { request++; if (!dialog.open) return; dialog.close(); doc.body.classList.remove("palette-open"); previousFocus?.focus?.(); previousFocus = null; };
    async function openPalette() {
      if (dialog.open) { input.focus(); return; }
      closeLamp(); previousFocus = doc.activeElement; input.value = ""; draw(); dialog.showModal(); doc.body.classList.add("palette-open"); input.focus();
      const ticket = ++request;
      try { const rows = await SEARCH.index(); if (request === ticket && dialog.open) { indexRows = rows; draw(); } } catch { if (dialog.open) status.textContent = "Бөлімдер қолжетімді. Іздеу деректері жүктелмеді."; }
    }
    input.addEventListener("input",draw);
    dialog.querySelector("[data-command-close]").addEventListener("click",closePalette);
    dialog.addEventListener("cancel",event => { event.preventDefault(); closePalette(); });
    dialog.addEventListener("click",event => { if (event.target === dialog) closePalette(); });
    dialog.addEventListener("keydown",event => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); select(selected + (event.key === "ArrowDown" ? 1 : -1)); }
      else if (event.key === "Enter" && doc.activeElement === input && items[selected]) { event.preventDefault(); const item = items[selected]; closePalette(); location.hash = "#" + item.route; }
      else trap(event,dialog);
    });
    doc.addEventListener("keydown",event => { if ((event.ctrlKey || event.metaKey) && normalize(event.key) === "k") { event.preventDefault(); if (dialog.open) closePalette(); else openPalette(); } });
    doc.addEventListener("click",event => {
      if (event.target.closest("[data-command-open]")) openPalette();
      if (event.target.closest("[data-theme-toggle]")) { html.dataset.theme = html.dataset.theme === "day" ? "night" : "day"; try { localStorage.setItem("dastan-theme",html.dataset.theme); } catch {} updateTheme(); window.dispatchEvent(new CustomEvent("skinchange", {detail:{skin:html.dataset.skin}})); }
      if (event.target.closest("[data-mobile-menu]")) doc.getElementById("menuToggle")?.click();
    });
    let progressFrame = 0;
    const progress = () => { progressFrame = 0; const max = html.scrollHeight - innerHeight; const value = max > 0 ? Math.min(1,Math.max(0,scrollY / max)) : 0; doc.querySelectorAll("[data-scroll-progress]").forEach(bar => { bar.style.transform = `scaleX(${value})`; }); };
    const queueProgress = () => { if (!progressFrame) progressFrame = requestAnimationFrame(progress); };
    addEventListener("scroll",queueProgress,{passive:true}); addEventListener("resize",queueProgress,{passive:true}); addEventListener("hashchange",() => { closePalette(); queueProgress(); }); progress();
  }
  function mount(root) {
    pageCleanup();
    if (!root || typeof document === "undefined") return () => {};
    init();
    const doc = root.ownerDocument || document, cleanups = [], frames = new Set(); let disposed = false;
    const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const later = callback => { const id = requestAnimationFrame(time => { frames.delete(id); if (!disposed) callback(time); }); frames.add(id); return id; };
    const listen = (target,type,fn,options) => { target.addEventListener(type,fn,options); cleanups.push(() => target.removeEventListener(type,fn,options)); };
    const index = wordIndex(typeof APP !== "undefined" ? APP.data?.words || [] : [],typeof DICT !== "undefined" ? DICT : []);
    const seenByProse = new WeakMap(); let lamp = null, trigger = null, manifest = {};
    if (typeof APP !== "undefined") APP.cachedJSON("audio/manifest.json").then(value => { if (!disposed) manifest = value; }).catch(() => {});
    closeLamp = () => { if (!lamp) return; lamp.close(); lamp.remove(); lamp = null; trigger?.focus?.(); trigger = null; };
    function showLamp(button) {
      const entry = index.get(button.dataset.wordLamp); if (!entry) return;
      closeLamp(); trigger = button; lamp = doc.createElement("dialog"); lamp.className = "word-lamp-dialog";
      lamp.setAttribute("aria-labelledby","wordLampTitle");
      const close = doc.createElement("button"); close.type = "button"; close.className = "word-lamp-close"; close.textContent = "Жабу ×"; close.setAttribute("aria-label","Сөз мағынасын жабу"); close.addEventListener("click",closeLamp);
      const title = doc.createElement("h2"); title.id = "wordLampTitle"; title.textContent = entry.word;
      const meaning = doc.createElement("p"); meaning.textContent = entry.meaning;
      lamp.append(close,title,meaning);
      if (entry.example) { const example = doc.createElement("blockquote"); example.textContent = entry.example; lamp.append(example); }
      if (entry.audio && typeof manifest[entry.audio] === "string" && /^[\w.-]+\.mp3$/.test(manifest[entry.audio])) { const audio = doc.createElement("button"); audio.type = "button"; audio.className = "listen"; audio.dataset.speak = entry.word; audio.dataset.audio = entry.audio; audio.textContent = "Тыңдау"; lamp.append(audio); }
      const link = doc.createElement("a"); link.href = "#lab/" + encodeURIComponent(entry.word); link.className = "button"; link.textContent = "Зертханада түрлендіру"; lamp.append(link); doc.body.append(lamp);
      lamp.addEventListener("cancel",event => { event.preventDefault(); closeLamp(); });
      lamp.addEventListener("click",event => { if (event.target === lamp) closeLamp(); });
      lamp.showModal();
      const rect = button.getBoundingClientRect(); lamp.style.setProperty("--lamp-top",Math.max(16,Math.min(innerHeight - lamp.offsetHeight - 16,rect.bottom + 10)) + "px"); lamp.style.setProperty("--lamp-left",Math.max(16,Math.min(innerWidth - lamp.offsetWidth - 16,rect.left)) + "px"); close.focus();
    }
    listen(root,"click",event => { const button = event.target.closest("[data-word-lamp]"); if (button) showLamp(button); });
    function markProse() {
      for (const prose of proseRoots(root)) {
        let seen = seenByProse.get(prose); if (!seen) { seen = new Set(); seenByProse.set(prose,seen); }
        const walker = doc.createTreeWalker(prose,4); const nodes = []; let node;
        while ((node = walker.nextNode())) if (node.parentElement && !node.parentElement.closest("a,button,script,style,textarea,code,pre,input,select,[contenteditable],[data-no-word-lamp]")) nodes.push(node);
        for (const text of nodes) markTextNode(text,index,typeof LAB !== "undefined" ? LAB.stems : null,seen,doc);
      }
    }
    markProse();
    if (typeof MutationObserver !== "undefined") {
      let queued = false;
      const observer = new MutationObserver(() => { if (!queued) { queued = true; queueMicrotask(() => { queued = false; if (disposed) return; observer.disconnect(); markProse(); observer.observe(root,{childList:true,subtree:true}); }); } });
      observer.observe(root,{childList:true,subtree:true}); cleanups.push(() => observer.disconnect());
    }
    root.querySelectorAll("[data-drag-rail]").forEach(rail => {
      if (!rail.hasAttribute("tabindex")) rail.tabIndex = 0;
      listen(rail,"dragstart",event => event.preventDefault());
      let pointer = null, start = 0, left = 0, moved = false;
      listen(rail,"pointerdown",event => { if (event.button !== 0 || event.pointerType === "touch" || event.target.closest("button,input")) return; pointer = event.pointerId; start = event.clientX; left = rail.scrollLeft; moved = false; });
      listen(rail,"pointermove",event => { if (pointer !== event.pointerId) return; const dx = event.clientX - start; if (Math.abs(dx) > 6) { moved = true; rail.classList.add("rail-dragging"); rail.setPointerCapture?.(pointer); rail.scrollLeft = left - dx; event.preventDefault(); } });
      const end = () => { pointer = null; rail.classList.remove("rail-dragging"); };
      listen(rail,"pointerup",end); listen(rail,"pointercancel",end); listen(rail,"lostpointercapture",end);
      listen(rail,"click",event => { if (moved) { event.preventDefault(); event.stopPropagation(); moved = false; } },true);
      listen(rail,"keydown",event => { if (event.target !== rail || !["ArrowRight","ArrowLeft","Home","End"].includes(event.key)) return; event.preventDefault(); rail.scrollTo({left:event.key === "Home" ? 0 : event.key === "End" ? rail.scrollWidth : rail.scrollLeft + (event.key === "ArrowRight" ? 1 : -1) * rail.clientWidth * .8,behavior:reduced ? "instant" : "smooth"}); });
    });
    const revealNodes = [...root.querySelectorAll(".image-frame,h1,h2,[data-count]")].filter(node => !node.closest(".yurt-info"));
    if (!reduced && typeof IntersectionObserver !== "undefined") {
      for (const heading of root.querySelectorAll("h1,h2")) {
        if (heading.children.length || heading.closest(".hero-signature,.yurt-info")) continue;
        const text = heading.textContent; heading.textContent = "";
        text.split(/(\s+)/u).forEach((word,i) => { if (!word.trim()) heading.append(doc.createTextNode(word)); else { const span = doc.createElement("span"); span.className = "reveal-word"; span.style.setProperty("--word-index",String(i)); span.textContent = word; heading.append(span); } });
      }
      const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (!entry.isIntersecting) return; const node = entry.target; node.classList.add("is-revealed"); observer.unobserve(node); if (node.hasAttribute("data-count")) { const target = Number(node.dataset.count); if (!Number.isFinite(target)) return; let start; const animate = time => { start ??= time; const fraction = Math.min(1,(time-start)/1000); node.textContent = String(Math.round(target*(1-Math.pow(1-fraction,3)))); if (fraction < 1) later(animate); }; later(animate); } }),{threshold:.12});
      revealNodes.forEach(node => { node.classList.add("reveal-pending"); observer.observe(node); }); cleanups.push(() => observer.disconnect());
      const parallax = [...root.querySelectorAll("[data-parallax]")]; let ticking = false;
      const updateParallax = () => { ticking = false; if (doc.hidden) return; for (const element of parallax) { const rect = element.getBoundingClientRect(); if (rect.bottom > 0 && rect.top < innerHeight) element.style.transform = `translate3d(0,${Math.max(-32,Math.min(32,(innerHeight/2 - rect.top - rect.height/2)*.06))}px,0)`; } };
      const schedule = () => { if (!ticking) { ticking = true; later(updateParallax); } }; listen(window,"scroll",schedule,{passive:true}); listen(window,"resize",schedule,{passive:true}); schedule();
    }
    pageCleanup = () => { if (disposed) return; disposed = true; closeLamp(); cleanups.forEach(fn => fn()); frames.forEach(id => cancelAnimationFrame(id)); frames.clear(); };
    return pageCleanup;
  }
  return {normalize,wordIndex,textMatches,markTextNode,proseRoots,init,mount,cleanup:() => pageCleanup()};
})();
if (typeof module !== "undefined" && module.exports) module.exports = EXPERIENCE;

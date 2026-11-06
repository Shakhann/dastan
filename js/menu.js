"use strict";
let menuBackground = [];
function closeMenu(restoreFocus = true) {
  const panel = document.getElementById("menuPanel");
  if (!panel || panel.hidden) return;
  panel.hidden = true;
  document.getElementById("menuOverlay").hidden = true;
  document.getElementById("menuToggle").setAttribute("aria-expanded", "false");
  document.body.classList.remove("menu-open");
  menuBackground.forEach(([node, inert]) => { node.inert = inert; });
  menuBackground = [];
  if (restoreFocus) (APP.menuReturnFocus || document.getElementById("menuToggle")).focus({preventScroll:true});
  return true;
}
function setupMenu() {
  const panel = document.getElementById("menuPanel");
  const toggle = document.getElementById("menuToggle");
  const overlay = document.getElementById("menuOverlay");
  toggle.addEventListener("click", () => {
    if (!panel.hidden) { closeMenu(); return; }
    APP.menuReturnFocus = document.activeElement?.matches?.("[data-mobile-menu]") ? document.activeElement : toggle;
    panel.hidden = false; overlay.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    document.body.classList.add("menu-open");
    menuBackground = [...document.querySelectorAll(".site-header, main, .site-footer, .skip, .mobile-nav")].map(node => [node, node.inert]);
    document.getElementById("menuClose").focus({preventScroll:true});
    menuBackground.forEach(([node]) => { node.inert = true; });
  });
  document.getElementById("menuClose").addEventListener("click", () => closeMenu());
  overlay.addEventListener("click", () => closeMenu());
  panel.addEventListener("click", event => {
    const link = event.target.closest("a");
    if (link) { APP.menuFocusAfterNavigation = link.getAttribute("href") !== location.hash; closeMenu(); }
  });
  document.addEventListener("keydown", event => {
    if (panel.hidden) return;
    if (event.key === "Escape") { event.preventDefault(); closeMenu(); }
    if (event.key !== "Tab") return;
    const items = [...panel.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), [tabindex="0"]')];
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
  });
  document.addEventListener("focusin", event => {
    if (!panel.hidden && !panel.contains(event.target)) document.getElementById("menuClose").focus();
  });
}

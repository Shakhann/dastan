"use strict";
// The brief is the sole source of these descriptions.
const YURT = (() => {
  const objects = [
    ["shanyrak", "Шаңырақ", "Киіз үйдің төбесіндегі дөңгелек күмбез. Осы жерден жарық түседі, түтін шығады. Қазақта шаңырақ әкеден балаға қалатын отбасы мұрасы."],
    ["kuldireuish", "Күлдіреуіш", "Шаңырақтың ішіндегі бір-бірімен айқасқан иілген ағаштар."],
    ["uyk", "Уық", "Шаңырақ пен керегені жалғайтын ұзын сырықтар. Киіз үйдің күмбезін осылар құрайды."],
    ["kerege", "Кереге", "Киіз үйдің жиналмалы торлы қабырғасы. Ол қанаттардан құралады."],
    ["tundik", "Түндік", "Шаңырақты жабатын киіз. Оны арқанмен ашып-жабады."],
    ["uzik", "Үзік", "Уықтардың үстін жабатын киіз."],
    ["tuyrlyk", "Туырлық", "Керегені сыртынан жабатын киіз."],
    ["baskur", "Басқұр", "Керегені айнала тартатын өрнекті тоқыма белдеу."],
    ["door", "Сықырлауық", "Киіз үйдің ағаш есігі. Ол ою-өрнекпен әшекейленеді."],
    ["batyr", "Батыр", "Елін жаудан қорғаған ер адам. Қазақ халқы батырларын жырға қосып, ұрпағына үлгі еткен."],
    ["helmet", "Дулыға", "Батырдың басын қорғайтын темір бас киім."],
    ["armor", "Сауыт", "Батырдың денесін қорғайтын темір киім."],
    ["spear", "Найза", "Ұзын сапты, ұшы үшкір қару."],
    ["shield", "Қалқан", "Соққыдан қорғанатын дөңгелек қорғаныш құрал."],
    ["bow", "Садақ", "Жебе ататын иілген қару."],
    ["horse", "Ат", "Көшпелі қазақтың сенімді серігі. Батырдың жорықтағы ең жақын досы."],
    ["dog", "Тазы", "Қазақтың аңшы иті. Жүйрік әрі сымбатты."],
    ["hearth", "Ошақ", "Ас пісіретін от орны. Қазақта ошақ қасы отбасының берекесін білдіреді."],
    ["cauldron", "Қазан", "Ас пісіретін үлкен темір ыдыс."],
    ["eagle", "Бүркіт", "Қазақтың аңға салатын қыраны."],
    ["saba", "Саба", "Қымыз ашытатын былғары ыдыс."]
  ].map(([id, name, text]) => Object.freeze({id, name, text}));
  Object.freeze(objects);
  const find = id => objects.find(object => object.id === id);
  function render() {
    const button = (object, point) => `<button type="button" data-yurt-object="${object.id}" aria-label="${esc(object.name)}: ақпаратты ашу" aria-controls="yurtInfo" aria-expanded="false">${point ? '<span class="yurt-point" aria-hidden="true"></span>' : ''}<span>${esc(object.name)}</span></button>`;
    return `<section class="yurt-world" data-yurt><header class="yurt-heading"><h1>Киіз үй әлемі</h1><p>Затты таңдаңыз. Айналдырып көріңіз.</p></header><div class="yurt-exhibit"><div class="yurt-stage" aria-label="Киіз үй мен дала көрінісі"><div class="yurt-fallback">${imageFigure("assets/heritage/yurt-assembling.jpg", "yurt-static plate-lg", true)}</div><div class="yurt-object-points" aria-label="Сахнадағы заттар">${objects.map(object => button(object, true)).join('')}</div><p class="yurt-world-hint">Айналдыру үшін сүйреңіз</p></div><aside id="yurtInfo" class="yurt-info" role="dialog" aria-labelledby="yurtInfoTitle" aria-describedby="yurtInfoText" hidden><h2 id="yurtInfoTitle" data-no-reveal></h2><p id="yurtInfoText"></p><div class="yurt-info-actions"><a class="button" data-yurt-lab>Түрлендіру</a><button type="button" data-yurt-close>Жабу</button></div></aside></div><p class="sr-only" data-yurt-status role="status" aria-live="polite" aria-atomic="true"></p><div class="yurt-object-list" role="group" aria-label="Киіз үй мен дала заттары">${objects.map(object => button(object, false)).join('')}</div></section>`;
  }
  function mount(root, initialId) {
    if (!root) return () => {};
    const doc = root.ownerDocument || document;
    const card = root.querySelector('#yurtInfo'), title = root.querySelector('#yurtInfoTitle'), text = root.querySelector('#yurtInfoText');
    const lab = root.querySelector('[data-yurt-lab]'), closeButton = root.querySelector('[data-yurt-close]'), status = root.querySelector('[data-yurt-status]');
    const buttons = [...root.querySelectorAll('[data-yurt-object]')];
    let trigger = null, selected = null;
    const notify = id => root.dispatchEvent(new CustomEvent('yurtselect', {detail:{id}}));
    function close(restore = true) {
      if (!selected) return;
      selected = null; card.hidden = true; root.classList.remove('yurt-info-open');
      buttons.forEach(button => button.setAttribute('aria-expanded', 'false'));
      status.textContent = 'Ақпарат жабылды.'; notify(null);
      if (restore && trigger?.isConnected) trigger.focus({preventScroll:true});
      trigger = null;
    }
    function open(id, button) {
      const object = find(id); if (!object) return;
      selected = object; trigger = button || null;
      title.textContent = object.name; text.textContent = object.text;
      lab.setAttribute('href', '#lab/' + encodeURIComponent(object.name));
      card.hidden = false; root.classList.add('yurt-info-open');
      buttons.forEach(item => item.setAttribute('aria-expanded', String(item.dataset.yurtObject === id)));
      status.textContent = object.name + '. ' + object.text; notify(id);
      closeButton.focus({preventScroll:true});
    }
    function click(event) {
      const button = event.target.closest('[data-yurt-object]');
      if (button && root.contains(button)) open(button.dataset.yurtObject, button);
      if (event.target.closest('[data-yurt-close]')) close();
    }
    function keydown(event) {
      if (event.key === 'Escape' && selected) { event.preventDefault(); event.stopPropagation(); close(); }
      // On mobile the bottom sheet stays keyboard-contained while open.
      if (event.key === 'Tab' && selected && card.contains(doc.activeElement)) {
        if (event.shiftKey && doc.activeElement === lab) { event.preventDefault(); closeButton.focus(); }
        else if (!event.shiftKey && doc.activeElement === closeButton) { event.preventDefault(); lab.focus(); }
      }
    }
    root.addEventListener('click', click); doc.addEventListener('keydown', keydown);
    const initial = buttons.find(button => button.dataset.yurtObject === initialId && !button.closest('.yurt-stage'));
    if (initial) open(initialId, initial);
    return () => { close(false); root.removeEventListener('click', click); doc.removeEventListener('keydown', keydown); };
  }
  return {objects, find, render, mount};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = YURT;

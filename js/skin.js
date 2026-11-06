/* Applied synchronously in <head>, before any stylesheet can paint. */
(function () {
  'use strict';
  const root = document.documentElement;
  const names = { ak: '1 Ақ', altyn: '2 Алтын', shuaq: '3 Шуақ' };
  const params = new URLSearchParams(location.search);
  const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const write = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
  const valid = value => Object.prototype.hasOwnProperty.call(names, value);
  const requested = params.get('skin');
  const saved = read('dastan-skin');
  root.dataset.skin = valid(requested) ? requested : valid(saved) ? saved : 'ak';
  if (valid(requested)) write('dastan-skin', requested);
  // Ақ always opens as the light product; its optional night mode is explicit.
  root.dataset.theme = read('dastan-theme') === 'night' ? 'night' : 'day';
  const choose = params.has('choose') || read('dastan-choose') === '1';
  if (params.has('choose')) write('dastan-choose', '1');
  function mount() {
    let chooser;
    const update = () => {
      document.querySelectorAll('[data-theme-toggle]').forEach(button => { button.hidden = root.dataset.skin !== 'ak'; });
      chooser?.querySelectorAll('[data-skin-choice]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.skinChoice === root.dataset.skin)));
    };
    if (choose) {
      chooser = document.createElement('nav');
      chooser.className = 'skin-chooser';
      chooser.setAttribute('aria-label', 'Дизайн таңдау');
      const label = document.createElement('span'); label.textContent = 'Дизайн:'; chooser.append(label);
      Object.entries(names).forEach(([skin, name]) => {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = name; button.dataset.skinChoice = skin;
        button.addEventListener('click', () => {
          root.dataset.skin = skin; write('dastan-skin', skin);
          // Keep shareable URLs in sync so reload does not restore a stale query.
          const url = new URL(location.href); url.searchParams.set('skin', skin);
          try { history.replaceState(history.state, '', url); } catch {}
          update(); window.dispatchEvent(new CustomEvent('skinchange', { detail: { skin } }));
        });
        chooser.append(button);
      });
      document.body.append(chooser);
    }
    update();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();

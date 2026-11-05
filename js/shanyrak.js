"use strict";
// Шеңбер, екі бағыттағы үш күлдіреуіш және шеңберден тараған уықтар.
function shanyrakSVG({rays = 24, extended = false, cls = ""} = {}) {
  const count = Math.max(8, Math.min(48, Math.trunc(Number(rays) || 24)));
  const lines = Array.from({length:count}, (_, i) => {
    const angle = i * Math.PI * 2 / count;
    const point = radius => [500 + Math.cos(angle) * radius, 500 + Math.sin(angle) * radius].map(n => n.toFixed(2));
    const [x1,y1] = point(250), [x2,y2] = point(extended ? 1500 : 450);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" pathLength="1"/>`;
  }).join("");
  const arches = [-90,0,90].map(offset => {
    const half = Math.sqrt(250 * 250 - offset * offset);
    // Сыртқы күлдіреуіштер ортаға қарай иіледі, сондықтан сурет екі ось бойынша симметриялы.
    const bow = 500 + offset * .62;
    return `<path d="M ${500-half} ${500+offset} Q 500 ${bow} ${500+half} ${500+offset}"/><path d="M ${500+offset} ${500-half} Q ${bow} 500 ${500+offset} ${500+half}"/>`;
  }).join("");
  const className = String(cls).replace(/[^a-zA-Z0-9 _-]/g, "");
  return `<svg class="shanyrak-svg ${className}" viewBox="0 0 1000 1000" fill="none" stroke="currentColor" stroke-width="7" aria-hidden="true" focusable="false"><g class="shanyrak-rays">${lines}</g><g class="shanyrak-ring"><circle cx="500" cy="500" r="250"/>${arches}</g></svg>`;
}

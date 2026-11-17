// Both renderers use a four-part botanical kit. All labels live in the host UI.
let drawingId = 0;

const kindFor = (id) => id < 3 ? 'tulip' : 'calendula';
const isTulip = (kind) => kind === 'tulip' || kind === 'purple-tulip';
const safeStage = (stage) => Math.max(0, Math.min(4, Number(stage) || 0));
const escapeMarkup = (value) => String(value || '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

function definitions(id) {
  return `<defs>
    <linearGradient id="${id}-stem" x1="0" x2="1"><stop stop-color="#315344"/><stop offset=".36" stop-color="#7b9e62"/><stop offset=".62" stop-color="#63864f"/><stop offset="1" stop-color="#355a43"/></linearGradient>
    <linearGradient id="${id}-leaf" x1="0" y1="0" x2="1" y2=".8"><stop stop-color="#aec58a"/><stop offset=".3" stop-color="#759a60"/><stop offset=".72" stop-color="#557c4b"/><stop offset="1" stop-color="#365d40"/></linearGradient>
    <linearGradient id="${id}-leaf-back" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#779668"/><stop offset=".6" stop-color="#426749"/><stop offset="1" stop-color="#284e3e"/></linearGradient>
    <linearGradient id="${id}-purple-back" x1=".12" y1="0" x2=".83" y2="1"><stop stop-color="#c3a7e1"/><stop offset=".35" stop-color="#9374bf"/><stop offset=".8" stop-color="#715294"/><stop offset="1" stop-color="#4d3b6b"/></linearGradient>
    <linearGradient id="${id}-purple-left" x1="0" y1=".3" x2="1" y2=".75"><stop stop-color="#bfa0db"/><stop offset=".36" stop-color="#9e7ac7"/><stop offset=".8" stop-color="#8060a6"/><stop offset="1" stop-color="#5b427d"/></linearGradient>
    <linearGradient id="${id}-purple-right" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#a78bc8"/><stop offset=".48" stop-color="#8867ad"/><stop offset="1" stop-color="#5f457f"/></linearGradient>
    <linearGradient id="${id}-purple-front" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#d2b8e7"/><stop offset=".25" stop-color="#b798d3"/><stop offset=".68" stop-color="#9470ba"/><stop offset="1" stop-color="#71508f"/></linearGradient>
    <linearGradient id="${id}-orange-back" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#ffc36b"/><stop offset=".38" stop-color="#f49b3b"/><stop offset=".82" stop-color="#db711d"/><stop offset="1" stop-color="#b7581c"/></linearGradient>
    <linearGradient id="${id}-orange-front" x1=".1" y1="0" x2=".65" y2="1"><stop stop-color="#ffcd7f"/><stop offset=".33" stop-color="#ffae4d"/><stop offset=".76" stop-color="#eb8626"/><stop offset="1" stop-color="#ca651c"/></linearGradient>
    <radialGradient id="${id}-center" cx=".37" cy=".25" r=".8"><stop stop-color="#f2b253"/><stop offset=".48" stop-color="#d68b32"/><stop offset="1" stop-color="#a76224"/></radialGradient>
    <linearGradient id="${id}-paper-back" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f3edf4"/><stop offset=".55" stop-color="#e1d5e9"/><stop offset="1" stop-color="#c4b4d0"/></linearGradient>
    <linearGradient id="${id}-paper-front" x1="0" y1="0" x2="1" y2=".8"><stop stop-color="#f9f3ed"/><stop offset=".5" stop-color="#eae0e9"/><stop offset="1" stop-color="#d4c4df"/></linearGradient>
    <linearGradient id="${id}-ribbon" x1="0" y1="0" x2=".25" y2="1"><stop stop-color="#c4afe1"/><stop offset=".22" stop-color="#ad92cf"/><stop offset=".52" stop-color="#c3aade"/><stop offset=".7" stop-color="#a286c3"/><stop offset="1" stop-color="#9273b3"/></linearGradient>
    <linearGradient id="${id}-ribbon-light" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#dbc9ed"/><stop offset=".42" stop-color="#bba1d6"/><stop offset="1" stop-color="#9478b4"/></linearGradient>
    <radialGradient id="${id}-halo"><stop stop-color="#e8dfec" stop-opacity=".4"/><stop offset="1" stop-color="#e8dfec" stop-opacity="0"/></radialGradient>
    <filter id="${id}-shadow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8"/></filter>
    <filter id="${id}-soft-shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="1" dy="3" stdDeviation="2" flood-color="#4b3b47" flood-opacity=".12"/></filter>
  </defs>`;
}

function stem(kind, id) {
  const top = isTulip(kind) ? 75 : 12;
  return `<g>
    <path d="M-6 ${top} C-9 171 2 267 -8 393 Q-8 401 0 402 Q8 403 9 394 C17 275 6 169 8 ${top}Z" fill="url(#${id}-stem)"/>
    <path d="M-2 ${top + 12} C-5 173 7 279 -3 389" fill="none" stroke="#b5c99a" stroke-opacity=".36" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M-7 349 Q0 353 11 349 M-7 355 Q1 359 10 355" fill="none" stroke="#2f5742" stroke-opacity=".26" stroke-width="1.2"/>
    ${isTulip(kind) ? `<path d="M-20 74 Q-6 84 0 99 Q7 83 22 75 L13 108 Q1 116-12 108Z" fill="url(#${id}-leaf-back)"/><ellipse cx="1" cy="108" rx="12" ry="4" fill="#8ba76d"/><path d="M-10 108 Q1 111 12 108" fill="none" stroke="#bbcca2" stroke-opacity=".6"/>` : `<path d="M-18 4 Q0-7 18 4 L10 31 Q0 40-10 31Z" fill="url(#${id}-leaf-back)"/><ellipse cy="29" rx="10" ry="3.5" fill="#8fa772"/>`}
  </g>`;
}

function leaves(kind, id) {
  if (isTulip(kind)) {
    return `<g>
      <path d="M0 340 C-56 326-104 254-108 151 C-109 136-104 103-104 103 C-91 127-66 156-46 179 C-9 222 5 282 0 340Z" fill="url(#${id}-leaf-back)"/>
      <path d="M-101 114 C-84 177-28 233-3 330" fill="none" stroke="#9eb58b" stroke-opacity=".5" stroke-width="1.8"/>
      <path d="M-4 371 C-11 306 4 260 33 222 C57 191 84 168 104 123 C110 171 90 237 59 281 C30 322 16 353-4 371Z" fill="url(#${id}-leaf)"/>
      <path d="M99 135 C76 219 24 264 0 360" fill="none" stroke="#c3d3a6" stroke-opacity=".67" stroke-width="2"/>
      <path d="M-5 369 C11 319 35 282 61 248" fill="none" stroke="#2e5640" stroke-opacity=".2" stroke-width="1.2"/>
      <path d="M-13 245 C-25 234-34 223-42 209 M34 260 L46 249" fill="none" stroke="#cad9b5" stroke-opacity=".2" stroke-width="1.2"/>
      <ellipse cx="2" cy="328" rx="7" ry="3" fill="#7c9c63" stroke="#3f674b" stroke-opacity=".3"/>
    </g>`;
  }
  return `<g>
    <path d="M1 221 C-26 216-59 192-79 153 C-89 135-91 117-97 103 C-69 116-42 133-21 159 C-7 178 0 200 1 221Z" fill="url(#${id}-leaf-back)"/>
    <path d="M-91 111 C-54 145-24 175-2 215" fill="none" stroke="#a8bf90" stroke-opacity=".56" stroke-width="1.5"/>
    <path d="M5 302 C16 261 35 234 66 207 C82 193 91 180 99 160 C105 187 86 223 69 242 C43 271 26 289 5 302Z" fill="url(#${id}-leaf)"/>
    <path d="M96 170 C77 221 36 249 10 293" fill="none" stroke="#c0d0a4" stroke-opacity=".66" stroke-width="1.8"/>
    <path d="M-2 352 C-25 337-47 319-61 293 C-69 279-73 266-76 254 C-46 266-16 289-7 314 Q1 335-2 352Z" fill="url(#${id}-leaf)"/>
    <path d="M-71 261 Q-28 296-5 343" fill="none" stroke="#b4ca96" stroke-opacity=".55" stroke-width="1.4"/>
    <ellipse cx="3" cy="285" rx="6" ry="2.5" fill="#809f67" stroke="#41634a" stroke-opacity=".3"/>
  </g>`;
}

function tulipOuter(id) {
  return `<g filter="url(#${id}-soft-shadow)">
    <path d="M-56-64 C-41-86-21-99 0-111 C20-95 39-76 52-52 C72-16 55 61 1 94 C-49 80-76 5-56-64Z" fill="url(#${id}-purple-back)" stroke="#684b89" stroke-opacity=".24" stroke-width="1.1"/>
    <path d="M-80-76 C-61-84-28-53-6-11 C12 25 14 68 0 98 C-48 95-80 63-87 17 C-92-19-91-56-80-76Z" fill="url(#${id}-purple-left)" stroke="#63487f" stroke-opacity=".32" stroke-width="1.1"/>
    <path d="M80-78 C63-83 27-52 8-14 C-13 27-14 69 0 98 C46 94 77 61 86 16 C93-19 92-56 80-78Z" fill="url(#${id}-purple-right)" stroke="#5c427a" stroke-opacity=".3" stroke-width="1.1"/>
    <path d="M-78-70 C-87-29-77 31-52 61" fill="none" stroke="#e5cef3" stroke-opacity=".52" stroke-width="3" stroke-linecap="round"/>
    <path d="M76-69 C80-38 78-7 70 19" fill="none" stroke="#d9c2eb" stroke-opacity=".35" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M-6-10 Q7 33 0 89" fill="none" stroke="#503965" stroke-opacity=".18" stroke-width="2"/>
  </g>`;
}

function tulipInner(id) {
  return `<g>
    <path d="M-46-48 C-34-62-17-75 0-88 C18-75 36-61 49-43 C64-13 54 57 1 99 C-49 78-67 12-46-48Z" fill="url(#${id}-purple-front)" stroke="#805c9f" stroke-opacity=".28" stroke-width="1.1"/>
    <path d="M-45-46 C-59-6-48 39-22 68 C-18 27-14-6 0-83 C-19-67-33-56-45-46Z" fill="#c1a0dc" fill-opacity=".37"/>
    <path d="M1-83 C19-39 33 10 26 55 Q18 81 1 96 C35 77 54 44 56 12 C58-9 52-31 48-42 C36-58 18-74 1-83Z" fill="#8c65af" fill-opacity=".24"/>
    <path d="M-40-43 C-49-4-37 38-18 62" fill="none" stroke="#efdcf8" stroke-opacity=".6" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M0-77 C-10-24-10 40 1 92" fill="none" stroke="#e1c7ed" stroke-opacity=".32" stroke-width="1.3"/>
    <path d="M49-32 Q58 27 25 72" fill="none" stroke="#73518e" stroke-opacity=".28" stroke-width="1.5"/>
    <path d="M-7 97 Q0 101 8 96" fill="none" stroke="#634681" stroke-opacity=".5" stroke-width="1.5"/>
  </g>`;
}

function calendulaRing(id, inner = false) {
  const count = inner ? 14 : 18;
  const petals = [];
  for (let i = 0; i < count; i += 1) {
    const rotation = i * 360 / count + (inner ? 11 : 0);
    const variation = 1 + Math.sin(i * 2.1) * .045;
    const d = inner
      ? 'M-5-13 C-10-30-13-49-9-64 Q-6-73-1-73 Q6-72 10-64 C15-47 9-27 5-13Z'
      : 'M-6-18 C-12-39-15-65-11-85 Q-8-99-1-101 Q7-99 11-87 C17-66 12-39 6-18Z';
    petals.push(`<g transform="rotate(${rotation.toFixed(2)}) scale(1 ${variation.toFixed(3)})"><path d="${d}" fill="url(#${id}-${inner ? 'orange-front' : 'orange-back'})" stroke="#b96320" stroke-opacity=".23" stroke-width=".85"/><path d="M-3 ${inner ? '-62' : '-88'} Q-6 ${inner ? '-43' : '-62'} 0 ${inner ? '-18' : '-24'}" fill="none" stroke="#ffe0a0" stroke-opacity="${inner ? '.57' : '.4'}" stroke-width="1.2" stroke-linecap="round"/></g>`);
  }
  return `<g transform="scale(1 .88)" ${inner ? '' : `filter="url(#${id}-soft-shadow)"`}>${petals.join('')}</g>`;
}

function calendulaOuter(id) {
  return `<g><path d="M-24 4 Q-17-25 6-26 Q28-19 28 6 Q17 28-6 25Z" fill="#d67c26"/>${calendulaRing(id)}</g>`;
}

function calendulaInner(id) {
  let seeds = '';
  for (let ring = 0; ring < 3; ring += 1) {
    const n = [1, 9, 15][ring];
    const radius = [0, 8, 16][ring];
    for (let i = 0; i < n; i += 1) {
      const a = i * Math.PI * 2 / n + ring * .7;
      seeds += `<ellipse cx="${(Math.cos(a) * radius).toFixed(2)}" cy="${(Math.sin(a) * radius * .85).toFixed(2)}" rx="1.9" ry="2.2" fill="${i % 3 === 0 ? '#f7c46f' : '#b7742b'}" opacity=".7" transform="rotate(${(a * 180 / Math.PI).toFixed(2)} ${(Math.cos(a) * radius).toFixed(2)} ${(Math.sin(a) * radius * .85).toFixed(2)})"/>`;
    }
  }
  return `<g>${calendulaRing(id, true)}<ellipse cy="2" rx="24" ry="21" fill="#a96123" fill-opacity=".23"/><ellipse rx="22" ry="19" fill="url(#${id}-center)"/><ellipse cx="-5" cy="-6" rx="13" ry="8" fill="#ffd68d" fill-opacity=".16"/>${seeds}</g>`;
}

function component(kind, stage, id) {
  if (stage === 0) return stem(kind, id);
  if (stage === 1) return leaves(kind, id);
  if (stage === 2) return isTulip(kind) ? tulipOuter(id) : calendulaOuter(id);
  return isTulip(kind) ? tulipInner(id) : calendulaInner(id);
}

function flower(kind, stage, id) {
  return Array.from({ length: safeStage(stage) }, (_, i) => component(kind, i, id)).join('');
}

function bouquetFlowers(ids, id, { x = 500, y = 590, scale = 1, stages = null, selected = -1 } = {}) {
  const slots = [
    { angle: -22, scale: .98 },
    { angle: -2, scale: 1.08 },
    { angle: 21, scale: .99 },
    { angle: -32, scale: .75 },
    { angle: 30, scale: .78 },
  ];
  return `<g transform="translate(${x} ${y}) scale(${scale})">${ids.map((flowerId, slot) => {
    const geometry = slots[slot % slots.length];
    const stage = stages ? safeStage(stages[flowerId]) : 4;
    if (stage < 4) return '';
    return `<g transform="rotate(${geometry.angle}) scale(${geometry.scale}) translate(0 -400)" data-select="${flowerId}" style="cursor:pointer">
      ${flower(kindFor(flowerId), stage, id)}
      ${selected === flowerId ? `<ellipse cy="-4" rx="${isTulip(kindFor(flowerId)) ? 106 : 116}" ry="112" fill="none" stroke="#a78bc1" stroke-opacity=".46" stroke-width="1.6" stroke-dasharray="3 7"/>` : ''}
      <ellipse cy="-1" rx="108" ry="112" fill="transparent"/>
    </g>`;
  }).join('')}</g>`;
}

function rearPaper(id) {
  return `<g>
    <path d="M305 326 L459 393 L665 306 L718 364 L570 659 Q509 682 439 648Z" fill="url(#${id}-paper-back)" stroke="#d2c4dc" stroke-width="1"/>
    <path d="M305 326 L459 393 L442 624Z" fill="#fcf9f7" fill-opacity=".45"/>
    <path d="M665 306 L610 475 L718 364Z" fill="#f8f2f6" fill-opacity=".68"/>
    <path d="M459 393 L487 645 M611 407 L545 644" fill="none" stroke="#bba9c8" stroke-opacity=".26" stroke-width="1.2"/>
  </g>`;
}

function frontPaperAndRibbon(id, signature = '') {
  return `<g>
    <path d="M354 432 Q435 466 502 485 Q576 453 656 414 L565 643 Q511 675 449 640Z" fill="url(#${id}-paper-front)" stroke="#d7c9dd" stroke-width="1.2"/>
    <path d="M354 432 Q434 470 501 485 L453 630Z" fill="#fffaf3" fill-opacity=".43"/>
    <path d="M502 486 L565 643 L656 414Z" fill="#bcacce" fill-opacity=".12"/>
    <path d="M375 461 L450 625 M631 442 L562 626" fill="none" stroke="#fffaf6" stroke-opacity=".4" stroke-width="1.5"/>
    <path d="M423 548 Q504 571 594 537 L585 561 Q501 595 433 573Z" fill="url(#${id}-ribbon)"/>
    <path d="M426 551 Q505 573 590 541" fill="none" stroke="#e6d8f2" stroke-opacity=".58" stroke-width="2"/>
    <path d="M501 568 C469 546 433 531 430 552 C427 572 461 590 501 574Z" fill="url(#${id}-ribbon-light)" stroke="#a38abf" stroke-width="1"/>
    <path d="M501 568 C528 536 565 522 572 544 C579 565 545 584 504 576Z" fill="url(#${id}-ribbon)" stroke="#a38abf" stroke-width="1"/>
    <path d="M499 575 Q482 611 457 635 L476 631 L485 647 Q503 615 509 580Z" fill="url(#${id}-ribbon-light)" stroke="#a38abf" stroke-opacity=".4"/>
    <path d="M510 572 Q523 606 552 626 L533 630 L528 645 Q504 613 503 581Z" fill="url(#${id}-ribbon)" stroke="#a38abf" stroke-opacity=".4"/>
    <path d="M492 562 Q502 555 514 563 L515 578 Q504 584 494 578Z" fill="url(#${id}-ribbon-light)" stroke="#a38abf" stroke-width="1"/>
    <path d="M496 564 Q506 562 511 565" fill="none" stroke="#eadcf5" stroke-opacity=".7" stroke-width="2" stroke-linecap="round"/>
    <path d="M514 572 Q551 581 560 605" fill="none" stroke="#a98c70" stroke-width="1.3"/>
    <g transform="translate(559 607) rotate(12)" filter="url(#${id}-soft-shadow)"><path d="M-8-16 L79-16 Q83-16 83-12 L83 61 Q83 65 79 65 L-8 65 Q-12 65-12 61 L-12-12Z" fill="#fffbf3" stroke="#dfd3c6" stroke-width="1"/><circle cx="1" cy="-6" r="2.5" fill="#e3d7c9"/><circle cx="1" cy="-6" r="1.3" fill="#b5a289"/>${signature ? `<text x="35.5" y="29" text-anchor="middle" fill="#6b526e" font-family="Georgia, 'Times New Roman', serif" font-size="14.5" font-style="italic">${escapeMarkup(signature)}</text>` : ''}</g>
  </g>`;
}

function emptySleeve(id) {
  return `<g transform="translate(225 514)">
    <path d="M-52-33 Q0-46 52-33 L35 70 Q0 88-35 70Z" fill="url(#${id}-paper-back)" stroke="#ded3e3" stroke-width="1"/>
    <path d="M-52-33 Q-3-10 52-33 Q0-48-52-33Z" fill="#f9f5f4" stroke="#ded3e3" stroke-width="1"/>
    <path d="M-42-26 L-24 65 M40-26 L23 66" fill="none" stroke="#fffaf7" stroke-opacity=".7" stroke-width="1.5"/>
    <path d="M-36 47 Q1 58 38 46 L36 56 Q0 69-35 57Z" fill="url(#${id}-ribbon-light)"/>
  </g>`;
}

function scene(state, id) {
  const stages = (state.stages || [0, 0, 0, 0, 0]).map(safeStage);
  const active = Math.max(0, Math.min(4, Number(state.active) || 0));
  const order = Array.isArray(state.order) && state.order.length === 5 ? state.order : [0, 1, 2, 3, 4];
  if (state.wrapped) {
    return `<ellipse cx="510" cy="670" rx="204" ry="19" fill="#8c7b91" fill-opacity=".11" filter="url(#${id}-shadow)"/>
      <ellipse cx="505" cy="385" rx="365" ry="320" fill="url(#${id}-halo)"/>
      ${rearPaper(id)}
      ${bouquetFlowers(order, id, { selected: -1 })}
      ${frontPaperAndRibbon(id, state.signature)}`;
  }
  const kind = kindFor(active);
  const stage = stages[active];
  const targetY = stage < 2 ? 237 : -4;
  const mini = bouquetFlowers(order, id, { x: 225, y: 587, scale: .53, stages, selected: stage === 4 ? active : -1 });
  return `<g class="completed-bouquet"><ellipse cx="235" cy="615" rx="158" ry="15" fill="#928195" fill-opacity=".1" filter="url(#${id}-shadow)"/>
    <path d="M84 610 Q235 588 386 610 Q372 629 235 631 Q102 628 84 610Z" fill="#ece4e8" fill-opacity=".53"/>
    ${mini}
    ${emptySleeve(id)}</g>
    <ellipse cx="662" cy="620" rx="112" ry="12" fill="#7c6d7c" fill-opacity=".1" filter="url(#${id}-shadow)"/>
    <g transform="translate(653 180) scale(1.08)">
      ${stage < 4 ? `<g opacity=".09" class="unbuilt-flower-silhouette">${flower(kind, 4, id)}</g><g opacity=".22" class="next-piece-ghost">${component(kind, stage, id)}</g>` : ''}
      ${flower(kind, stage, id)}
      ${stage < 4 ? `<g class="assembly-target" transform="translate(0 ${targetY})" pointer-events="none"><circle r="22" fill="#fffaf4" fill-opacity=".7"/><circle r="16" fill="none" stroke="#a993bd" stroke-width="1.5"/><circle r="4" fill="#ab91c5"/><path d="M-4 0 H4 M0-4 V4" stroke="#fffaf7" stroke-width="1.1" stroke-linecap="round"/></g>` : ''}
      <rect x="-145" y="-126" width="290" height="543" rx="40" fill="transparent" ${stage < 4 ? `data-place="${active}" style="cursor:pointer"` : `data-select="${active}" style="cursor:pointer"`}/>
    </g>`;
}

export function create2DView({ container, onPlace = () => {}, onSelect = () => {} }) {
  const id = `botanical-${++drawingId}`;
  let state = { active: 0, stages: [0, 0, 0, 0, 0], wrapped: false, order: [0, 1, 2, 3, 4] };
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 1000 720');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.classList.add('bouquet-art', 'bouquet-art-2d');
  svg.style.display = 'block';
  svg.style.overflow = 'hidden';
  container.append(svg);

  function resize() {
    const narrow = container.getBoundingClientRect().width < 600;
    svg.setAttribute('viewBox', narrow
      ? (state.wrapped ? '215 25 590 680' : '480 40 350 640')
      : '0 0 1000 720');
    const completed = svg.querySelector('.completed-bouquet');
    if (completed) completed.style.display = narrow ? 'none' : '';
  }
  const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  if (resizeObserver) resizeObserver.observe(container);
  else window.addEventListener('resize', resize);

  function click(event) {
    const place = event.target.closest('[data-place]');
    if (place && svg.contains(place)) {
      onPlace(Number(place.dataset.place));
      return;
    }
    const select = event.target.closest('[data-select]');
    if (select && svg.contains(select)) onSelect(Number(select.dataset.select));
  }
  svg.addEventListener('click', click);

  function render() {
    svg.innerHTML = definitions(id) + scene(state, id);
    resize();
  }
  render();

  return {
    handlesSignature: true,
    update(nextState) {
      state = nextState;
      render();
    },
    setActive(active) {
      svg.style.display = active ? 'block' : 'none';
    },
    destroy() {
      svg.removeEventListener('click', click);
      if (resizeObserver) resizeObserver.disconnect();
      else window.removeEventListener('resize', resize);
      svg.remove();
    },
  };
}

export function pieceSVG(kind, stage) {
  const id = `botanical-piece-${++drawingId}`;
  const part = Math.max(0, Math.min(3, Number(stage) || 0));
  let art;
  if (part === 0) {
    art = `<g transform="translate(91 24) rotate(25) scale(.23)">${stem(kind, id)}</g>`;
  } else if (part === 1) {
    art = `<g transform="translate(88 -34) scale(.45)">${leaves(kind, id)}</g>`;
  } else {
    art = `<g transform="translate(90 ${isTulip(kind) ? 71 : 70}) scale(${isTulip(kind) ? '.5' : '.55'})">${component(kind, part, id)}</g>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 140" width="100%" height="100%" aria-hidden="true">${definitions(id)}${art}</svg>`;
}

export function flowerIcon(kind) {
  const id = `botanical-icon-${++drawingId}`;
  const head = isTulip(kind) ? tulipOuter(id) + tulipInner(id) : calendulaOuter(id) + calendulaInner(id);
  const shortStem = `<path d="M-5 ${isTulip(kind) ? 78 : 10} L-5 143 Q0 149 6 143 L6 ${isTulip(kind) ? 78 : 10}Z" fill="url(#${id}-stem)"/><path d="M0 133 Q-29 123-36 94 Q-9 102 0 133Z" fill="url(#${id}-leaf)"/><path d="M1 123 Q24 113 35 88 Q9 96 1 123Z" fill="url(#${id}-leaf-back)"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 140" width="100%" height="100%" aria-hidden="true" style="display:block;overflow:hidden">${definitions(id)}<g transform="translate(60 59) scale(.47)">${shortStem}${head}</g></svg>`;
}

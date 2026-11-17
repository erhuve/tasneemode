import { content } from './content.js';
import { FLOWERS, PARTS, initialState, loadState, saveState, transition } from './state.js';
import { create2DView, flowerIcon, pieceSVG } from './view-2d.js';

const $ = selector => document.querySelector(selector);
let storage;
try { storage = window.localStorage; } catch { /* A private browsing window can still build the bouquet. */ }
let state = storage ? loadState(storage) : initialState();
let selectedPart = null;
let view3D = null;
let loading3D = null;
let modeRequest = 0;
let unavailable3D = false;
let soundEnabled = false;
let audio;
let placing = false;
let drag = null;
let suppressClickUntil = 0;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const title = $('#page-title');
const picker = $('#flower-picker');
const tray = $('#parts-tray');
const desk = $('.desk');
const placeButton = $('#place');
const signature = $('#gift-signature');
const view2D = create2DView({ container: $('#scene-2d'), onPlace: place, onSelect: selectFlower });

function completed() { return state.stages.every(stage => stage === PARTS); }
function persist() { if (storage) saveState(storage, state); }

function announce() {
  $('.status').textContent = state.wrapped ? `${content.birthday} ${content.signature}` : `${state.stages.reduce((sum, stage) => sum + stage, 0)} / 20`;
}

function apply(action) {
  const next = transition(state, action);
  if (next === state) return;
  state = next;
  if (action.type !== 'mode' && action.type !== 'arrange') selectedPart = null;
  persist();
  render();
  announce();
}

function selectFlower(id) {
  if (drag) return;
  apply({ type: 'select', id });
}

function snapSound(final = false) {
  if (!soundEnabled) return;
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume().catch(() => {});
    const now = audio.currentTime;
    const frequencies = final ? [523.25, 659.25, 783.99] : [440, 880];
    frequencies.forEach((frequency, index) => {
      const tone = audio.createOscillator();
      const envelope = audio.createGain();
      tone.type = 'sine';
      tone.frequency.value = frequency;
      const start = now + index * (final ? .1 : .018);
      envelope.gain.setValueAtTime(0, start);
      envelope.gain.linearRampToValueAtTime(.045, start + .006);
      envelope.gain.exponentialRampToValueAtTime(.0001, start + (final ? .35 : .1));
      tone.connect(envelope).connect(audio.destination);
      tone.start(start);
      tone.stop(start + .4);
    });
  } catch { /* Sound is optional; model interaction is independent of audio support. */ }
}

function place(id = state.active) {
  if (placing || drag || state.wrapped || id !== state.active || state.stages[id] >= PARTS) return;
  if (selectedPart !== state.stages[id]) {
    selectedPart = state.stages[id];
    renderTray();
    renderPlacement();
    return;
  }
  // One pointer gesture is one attachment, even if a renderer also receives its click.
  placing = true;
  snapSound(state.stages[id] === PARTS - 1);
  apply({ type: 'place', id });
  if (state.stages[id] < PARTS) tray.querySelector('.available')?.focus({ preventScroll: true });
  else (completed() ? $('#wrap') : $('#next-flower')).focus({ preventScroll: true });
  document.body.classList.remove('just-placed');
  requestAnimationFrame(() => document.body.classList.add('just-placed'));
  setTimeout(() => { placing = false; }, reducedMotion.matches ? 40 : 220);
}

function renderPicker() {
  const focused = document.activeElement?.getAttribute('data-flower');
  picker.innerHTML = FLOWERS.map((kind, id) => {
    const name = kind === 'tulip' ? 'purple tulips' : 'orange calendula';
    const dots = Array.from({ length: PARTS }, (_, stage) => `<i class="${stage < state.stages[id] ? 'done' : ''}"></i>`).join('');
    return `<button type="button" class="flower-choice" data-flower="${id}" data-kind="${kind}" aria-label="${name} ${id + 1} · ${state.stages[id]} / 4" aria-pressed="${state.active === id}">${flowerIcon(kind)}<span class="flower-dots" aria-hidden="true">${dots}</span></button>`;
  }).join('');
  $('.progress-thread').querySelectorAll('i').forEach((dot, id) => dot.classList.toggle('done', state.stages[id] === PARTS));
  if (focused !== null) picker.querySelector(`[data-flower="${focused}"]`)?.focus({ preventScroll: true });
}

function renderTray() {
  const focused = document.activeElement?.getAttribute('data-part');
  const kind = FLOWERS[state.active];
  const current = state.stages[state.active];
  tray.innerHTML = Array.from({ length: PARTS }, (_, stage) => {
    const done = stage < current;
    const available = stage === current;
    return `<button type="button" class="part-button ${done ? 'done' : ''} ${available ? 'available' : ''} ${selectedPart === stage ? 'selected' : ''}" data-part="${stage}" aria-label="${stage + 1} / 4" aria-pressed="${selectedPart === stage}" ${available ? '' : 'disabled'}><span class="part-number" aria-hidden="true">${stage + 1}</span>${pieceSVG(kind, stage)}${done ? '<span class="part-done" aria-hidden="true">✓</span>' : ''}</button>`;
  }).join('');
  if (focused !== null) tray.querySelector('.available')?.focus({ preventScroll: true });
}

function renderPlacement() {
  placeButton.hidden = state.wrapped || state.stages[state.active] === PARTS || selectedPart === null;
  placeButton.classList.toggle('ready', selectedPart !== null);
  placeButton.setAttribute('aria-label', `${content.title} ${state.stages[state.active] + 1} / 4`);
}

function render() {
  const show3D = state.mode === '3d' && view3D !== null;
  document.body.classList.toggle('is-wrapped', state.wrapped);
  document.body.dataset.mode = show3D ? '3d' : '2d';
  title.textContent = state.wrapped ? content.birthday : content.title;
  signature.textContent = content.signature;
  $('.gift-tag').hidden = !state.wrapped || !content.signature || (show3D ? view3D.handlesSignature : view2D.handlesSignature);
  $('.camera-tools').hidden = !show3D;
  $('.gesture-cue').hidden = !show3D;
  $('#scene-2d').hidden = show3D;
  $('#scene-3d').hidden = !show3D;
  view2D.setActive(!show3D);
  const viewState = { ...state, signature: content.signature };
  view2D.update(viewState);
  if (view3D) {
    view3D.setActive(show3D);
    view3D.update(viewState);
  }
  document.querySelectorAll('.mode-switch [data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === (show3D ? '3d' : '2d'))));
  $('#undo').disabled = !state.wrapped && state.stages[state.active] === 0;
  $('#wrap').hidden = state.wrapped || !completed();
  $('#next-flower').hidden = state.wrapped || completed() || state.stages[state.active] !== PARTS;
  $('.arrange-tools').hidden = !state.wrapped;
  tray.hidden = state.wrapped;
  const note = state.stages[state.active] === PARTS ? content.notes[state.active] : '';
  $('#personal-note').textContent = note || '';
  $('#personal-note').hidden = !note;
  $('#footer-count').textContent = `${state.stages.reduce((sum, stage) => sum + stage, 0)} / 20`;
  renderPicker();
  renderTray();
  renderPlacement();
}

async function changeMode(mode) {
  const request = ++modeRequest;
  if (mode === '2d') { apply({ type: 'mode', mode }); return; }
  if (unavailable3D) return;
  const modeButton = document.querySelector('.mode-switch [data-mode="3d"]');
  modeButton.setAttribute('aria-busy', 'true');
  try {
    loading3D ||= import('./view-3d.js').then(module => {
      // Construct while it has dimensions; render() restores the selected surface.
      $('#scene-3d').hidden = false;
      view3D = module.create3DView({
        container: $('#scene-3d'), onPlace: place, onSelect: selectFlower,
        onError: fail3D,
      });
      return view3D;
    });
    await loading3D;
    if (request === modeRequest) apply({ type: 'mode', mode: '3d' });
    else render();
  } catch (error) { fail3D(error); }
  finally { modeButton.removeAttribute('aria-busy'); }
}

function fail3D(error) {
  console.error('Bouquet WebGL:', error);
  unavailable3D = true;
  const button = document.querySelector('.mode-switch [data-mode="3d"]');
  button.dataset.unavailable = 'true';
  button.disabled = true;
  button.removeAttribute('aria-busy');
  if (view3D) { view3D.destroy(); view3D = null; }
  state = transition(state, { type: 'mode', mode: '2d' });
  persist();
  render();
}

document.querySelectorAll('.mode-switch [data-mode]').forEach(button => button.addEventListener('click', () => changeMode(button.dataset.mode)));
picker.addEventListener('click', event => {
  const button = event.target.closest('[data-flower]');
  if (button) selectFlower(Number(button.dataset.flower));
});
tray.addEventListener('click', event => {
  if (performance.now() < suppressClickUntil) return;
  const button = event.target.closest('[data-part]');
  if (!button || button.disabled) return;
  const part = Number(button.dataset.part);
  if (selectedPart === part) { place(); return; }
  selectedPart = part;
  renderTray();
  renderPlacement();
});
placeButton.addEventListener('click', () => place());
$('#undo').addEventListener('click', () => apply({ type: 'undo' }));
$('#next-flower').addEventListener('click', () => {
  for (let offset = 1; offset <= FLOWERS.length; offset++) {
    const id = (state.active + offset) % FLOWERS.length;
    if (state.stages[id] < PARTS) { selectFlower(id); tray.querySelector('.available')?.focus({ preventScroll: true }); break; }
  }
});
$('#wrap').addEventListener('click', () => {
  snapSound(true);
  apply({ type: 'wrap' });
  $('#arrange-left').focus({ preventScroll: true });
});
$('#arrange-left').addEventListener('click', () => apply({ type: 'arrange', direction: -1 }));
$('#arrange-right').addEventListener('click', () => apply({ type: 'arrange', direction: 1 }));
$('#camera-reset').addEventListener('click', () => view3D?.resetView());
$('#camera-spin').addEventListener('click', event => {
  const on = view3D?.toggleRotate();
  event.currentTarget.setAttribute('aria-pressed', String(Boolean(on)));
});
$('#sound').addEventListener('click', event => {
  soundEnabled = !soundEnabled;
  event.currentTarget.setAttribute('aria-pressed', String(soundEnabled));
  if (soundEnabled) snapSound();
});

// Tap-to-select / tap-to-attach is always available. Dragging is a second path.
tray.addEventListener('pointerdown', event => {
  const button = event.target.closest('[data-part]');
  if (!button || button.disabled || event.button !== 0) return;
  drag = { id: event.pointerId, x: event.clientX, y: event.clientY, part: Number(button.dataset.part), moving: false, node: null };
});
window.addEventListener('pointermove', event => {
  if (!drag || drag.id !== event.pointerId) return;
  if (!drag.moving && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 9) {
    drag.moving = true;
    selectedPart = drag.part;
    drag.node = document.createElement('div');
    drag.node.className = 'drag-piece';
    drag.node.setAttribute('aria-hidden', 'true');
    drag.node.innerHTML = pieceSVG(FLOWERS[state.active], drag.part);
    document.body.append(drag.node);
    renderPlacement();
  }
  if (!drag.moving) return;
  event.preventDefault();
  drag.node.style.left = `${event.clientX}px`;
  drag.node.style.top = `${event.clientY}px`;
  const box = desk.getBoundingClientRect();
  desk.classList.toggle('drag-over', event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom);
}, { passive: false });

function finishDrag(event, cancelled = false) {
  if (!drag || drag.id !== event.pointerId) return;
  const moved = drag.moving;
  const canPlace = moved && desk.classList.contains('drag-over') && !cancelled;
  drag.node?.remove();
  drag = null;
  desk.classList.remove('drag-over');
  if (moved) suppressClickUntil = performance.now() + 350;
  if (canPlace) place();
  else if (moved) { renderTray(); renderPlacement(); }
}
window.addEventListener('pointerup', event => finishDrag(event));
window.addEventListener('pointercancel', event => finishDrag(event, true));
window.addEventListener('blur', () => {
  if (drag) finishDrag({ pointerId: drag.id }, true);
});
document.addEventListener('visibilitychange', () => view3D?.setActive(!document.hidden && state.mode === '3d'));
window.addEventListener('pagehide', () => { persist(); view3D?.setActive(false); });
window.addEventListener('pageshow', () => view3D?.setActive(state.mode === '3d'));

render();
announce();
if (state.mode === '3d') changeMode('3d');

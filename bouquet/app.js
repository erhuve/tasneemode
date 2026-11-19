import { content } from './content.js';
import { FLOWERS, TOTAL_PARTS, partCount, initialState, loadState, saveState, transition } from './state.js';
import { flowerIcon } from './icons.js';

const $ = selector => document.querySelector(selector);
let storage;
try { storage = window.localStorage; } catch { /* Saving is optional. */ }
let state = storage ? loadState(storage) : initialState();
let view = null;
let loading = null;
let keyboardDragging = false;
let transitionBusy = false;
let focusAfterTransition = false;
let soundEnabled = false;
let audio;
const title = $('#page-title');
const picker = $('#flower-picker');
const partControls = $('#parts-tray');
const scene = $('#scene-3d');

function completed() { return state.stages.every((stage, id) => stage === partCount(id)); }
function busy() { return transitionBusy || Boolean(view?.busy); }
function revealed() { return state.wrapped && !busy(); }
function persist() { if (storage) saveState(storage, state); }
function announce() {
  $('.status').textContent = revealed() ? `${content.birthday} ${content.signature}` : `${state.stages.reduce((sum, stage) => sum + stage, 0)} / ${TOTAL_PARTS}`;
}

function apply(action) {
  if (busy()) return;
  if (action.type !== 'place') { view?.cancelDrag(); keyboardDragging = false; }
  const next = transition(state, action);
  if (next === state) return;
  state = next;
  persist();
  render();
  announce();
}

function selectFlower(id) {
  if (view?.dragging || busy()) return;
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
  } catch { /* The assembly does not depend on sound. */ }
}

// Only the model's successful, current-stage drop can commit an attachment.
function place(id, part) {
  if (state.wrapped || id !== state.active || part !== state.stages[id] || part >= partCount(id)) return;
  keyboardDragging = false;
  focusAfterTransition = part === partCount(id) - 1;
  snapSound(part === partCount(id) - 1);
  apply({ type: 'place', id });
  if (state.stages[id] < partCount(id)) {
    if (partControls.contains(document.activeElement)) partControls.querySelector('.available')?.focus({ preventScroll: true });
  } else if (!busy()) focusNextAction();
  document.body.classList.remove('just-placed');
  requestAnimationFrame(() => document.body.classList.add('just-placed'));
}

function renderPicker() {
  const focused = document.activeElement?.getAttribute('data-flower');
  picker.innerHTML = FLOWERS.map((kind, id) => {
    const name = kind === 'tulip' ? 'purple tulips' : 'orange calendula';
    const dots = Array.from({ length: partCount(id) }, (_, stage) => `<i class="${stage < state.stages[id] ? 'done' : ''}"></i>`).join('');
    return `<button type="button" class="flower-choice" data-flower="${id}" data-kind="${kind}" aria-label="${name} ${id + 1} · ${state.stages[id]} / ${partCount(id)}" aria-pressed="${state.active === id}" ${view ? '' : 'disabled'}>${flowerIcon(kind)}<span class="flower-dots" aria-hidden="true">${dots}</span></button>`;
  }).join('');
  $('.progress-thread').querySelectorAll('i').forEach((dot, id) => dot.classList.toggle('done', state.stages[id] === partCount(id)));
  if (focused !== null) picker.querySelector(`[data-flower="${focused}"]`)?.focus({ preventScroll: true });
}

function renderParts() {
  const focused = partControls.contains(document.activeElement);
  const current = state.stages[state.active];
  const count = partCount(state.active);
  partControls.setAttribute('aria-label', `${Math.min(count, current + 1)} / ${count}`);
  partControls.innerHTML = current < count ? `<button type="button" class="keyboard-part available" data-part="${current}" aria-label="${current + 1} / ${count}" ${view && !busy() ? '' : 'disabled'}>${current + 1} / ${count}</button>` : '';
  if (focused) partControls.querySelector('.available')?.focus({ preventScroll: true });
}

function focusNextAction() {
  focusAfterTransition = false;
  const target = revealed() ? $('#arrange-left') : completed() ? $('#wrap') : $('#next-flower');
  if (!target.hidden && !target.disabled) target.focus({ preventScroll: true });
}

function transitionChanged(value) {
  transitionBusy = value;
  document.body.classList.toggle('is-transitioning', value);
  scene.setAttribute('aria-busy', String(value));
  renderUI();
  announce();
  if (!value && focusAfterTransition) focusNextAction();
}

function dragChanged(dragging) {
  if (!dragging) keyboardDragging = false;
  document.body.classList.toggle('is-dragging', dragging);
  const locked = !view || dragging || busy();
  picker.querySelectorAll('button').forEach(button => { button.disabled = locked; });
  $('#undo').disabled = locked || (!state.wrapped && state.stages[state.active] === 0);
  $('#camera-reset').disabled = locked;
  $('#camera-spin').disabled = locked;
  $('#next-flower').disabled = locked;
  $('#wrap').disabled = locked;
  $('.arrange-tools').querySelectorAll('button').forEach(button => { button.disabled = locked; });
}

function render() {
  view?.update({ ...state, signature: content.signature });
  renderUI();
}

function renderUI() {
  document.body.classList.toggle('is-wrapped', revealed());
  title.textContent = revealed() ? content.birthday : content.title;
  $('.camera-tools').hidden = !view;
  $('.gesture-cue').hidden = !view;
  $('#wrap').hidden = state.wrapped || !completed() || !view;
  $('#next-flower').hidden = state.wrapped || completed() || state.stages[state.active] !== partCount(state.active) || !view;
  $('.arrange-tools').hidden = !revealed() || !view;
  partControls.hidden = state.wrapped || !view || state.stages[state.active] === partCount(state.active);
  const note = state.stages[state.active] === partCount(state.active) ? content.notes[state.active] : '';
  $('#personal-note').textContent = note || '';
  $('#personal-note').hidden = !note;
  $('#footer-count').textContent = `${state.stages.reduce((sum, stage) => sum + stage, 0)} / ${TOTAL_PARTS}`;
  renderPicker();
  renderParts();
  dragChanged(Boolean(view?.dragging));
}

async function startView() {
  if (loading) return loading;
  scene.setAttribute('aria-busy', 'true');
  $('.scene-loading').hidden = false;
  $('#retry-view').hidden = true;
  loading = import('./view-3d.js').then(module => {
    scene.replaceChildren();
    view = module.create3DView({ container: scene, onPlace: place, onSelect: selectFlower, onError: failView, onDragChange: dragChanged, onTransitionChange: transitionChanged });
    view.update({ ...state, signature: content.signature });
    view.setActive(!document.hidden);
    render();
  }).catch(failView).finally(() => {
    loading = null;
    scene.removeAttribute('aria-busy');
    $('.scene-loading').hidden = true;
  });
  return loading;
}

function failView(error) {
  console.error('Bouquet WebGL:', error);
  keyboardDragging = false;
  transitionBusy = false;
  document.body.classList.remove('is-transitioning');
  view?.destroy();
  view = null;
  scene.replaceChildren();
  $('#retry-view').hidden = false;
  render();
}

picker.addEventListener('click', event => {
  const button = event.target.closest('[data-flower]');
  if (button && !button.disabled) selectFlower(Number(button.dataset.flower));
});

// Keyboard users also move a piece into the snap zone. No activation attaches it by itself.
partControls.addEventListener('keydown', event => {
  if (!view || busy() || !event.target.closest('.available')) return;
  const deltas = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    if (keyboardDragging) { view.finishKeyboardDrag(); keyboardDragging = false; }
    else keyboardDragging = Boolean(view.beginKeyboardDrag());
  } else if (keyboardDragging && deltas[event.key]) {
    event.preventDefault();
    const step = event.shiftKey ? 36 : 12;
    view.moveKeyboardDrag(deltas[event.key][0] * step, deltas[event.key][1] * step);
  } else if (event.key === 'Escape') {
    event.preventDefault();
    view.cancelDrag();
    keyboardDragging = false;
  }
});
partControls.addEventListener('focusout', event => {
  if (keyboardDragging && !partControls.contains(event.relatedTarget)) { view?.cancelDrag(); keyboardDragging = false; }
});
window.addEventListener('keydown', event => { if (event.key === 'Escape') { view?.cancelDrag(); keyboardDragging = false; } });
$('#undo').addEventListener('click', () => apply({ type: 'undo' }));
$('#next-flower').addEventListener('click', () => {
  for (let offset = 1; offset <= FLOWERS.length; offset++) {
    const id = (state.active + offset) % FLOWERS.length;
    if (state.stages[id] < partCount(id)) { selectFlower(id); picker.querySelector(`[data-flower="${id}"]`)?.focus({ preventScroll: true }); break; }
  }
});
$('#wrap').addEventListener('click', () => {
  focusAfterTransition = true;
  snapSound(true);
  apply({ type: 'wrap' });
  if (!busy()) focusNextAction();
});
$('#arrange-left').addEventListener('click', () => apply({ type: 'arrange', direction: -1 }));
$('#arrange-right').addEventListener('click', () => apply({ type: 'arrange', direction: 1 }));
$('#camera-reset').addEventListener('click', () => view?.resetView());
$('#camera-spin').addEventListener('click', event => { event.currentTarget.setAttribute('aria-pressed', String(Boolean(view?.toggleRotate()))); });
$('#sound').addEventListener('click', event => { soundEnabled = !soundEnabled; event.currentTarget.setAttribute('aria-pressed', String(soundEnabled)); if (soundEnabled) snapSound(); });
$('#retry-view').addEventListener('click', startView);
document.addEventListener('visibilitychange', () => { if (document.hidden) view?.cancelDrag(); view?.setActive(!document.hidden); });
window.addEventListener('pagehide', () => { persist(); view?.cancelDrag(); view?.setActive(false); });
window.addEventListener('pageshow', () => view?.setActive(!document.hidden));

render();
announce();
startView();

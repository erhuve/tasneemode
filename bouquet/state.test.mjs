import test from 'node:test';
import assert from 'node:assert/strict';
import { FLOWERS, PART_COUNTS, TOTAL_PARTS, partCount, STORAGE_KEY, initialState, sanitizeState, loadState, saveState, transition } from './state.js';

function completedState() {
  let state = initialState();
  for (let id = 0; id < FLOWERS.length; id += 1) {
    state = transition(state, { type: 'select', id });
    for (let part = 0; part < partCount(id); part += 1) state = transition(state, { type: 'place', id });
  }
  return state;
}

function invariant(state) {
  assert.equal(state.stages.length, FLOWERS.length);
  assert.ok(state.stages.every((stage, id) => Number.isInteger(stage) && stage >= 0 && stage <= partCount(id)));
  assert.deepEqual([...state.order].sort(), [0, 1, 2, 3, 4]);
  assert.ok(Number.isInteger(state.active) && state.active >= 0 && state.active < FLOWERS.length);
  assert.equal(state.mode, '3d');
  assert.equal(state.version, 2);
  if (state.wrapped) assert.ok(state.stages.every((stage, id) => stage === partCount(id)));
}

test('the kit counts every individual placement for both flower types', () => {
  assert.deepEqual(PART_COUNTS, [7, 7, 7, 10, 10]);
  assert.equal(TOTAL_PARTS, 41);
  assert.equal(completedState().stages.reduce((sum, count) => sum + count, 0), TOTAL_PARTS);
  for (const id of [-1, 5, 2.5, '0', null, undefined, NaN]) assert.equal(partCount(id), 0);
});

test('persisted values are bounded and cannot wrap an incomplete bouquet', () => {
  for (const value of [null, undefined, true, [], 'bad', { version: 3 }]) {
    assert.deepEqual(sanitizeState(value), initialState());
  }
  const restored = sanitizeState({ version: 2, mode: '3d', active: 99, stages: [-2, 18, 2.5, null, 3], order: [0, 0, 2, 3, 4], wrapped: true });
  assert.equal(restored.mode, '3d');
  assert.equal(restored.active, 0);
  assert.deepEqual(restored.stages, [0, 7, 0, 0, 3]);
  assert.deepEqual(restored.order, [0, 1, 2, 3, 4]);
  assert.equal(restored.wrapped, false);
  invariant(restored);
});

test('valid saved progress restores independently of its original object', () => {
  const saved = { version: 2, mode: '3d', active: 3, stages: [7, 2, 1, 0, 10], order: [4, 3, 2, 1, 0], wrapped: false };
  const restored = sanitizeState(saved);
  assert.deepEqual(restored, saved);
  restored.order.reverse();
  restored.stages[0] = 0;
  assert.deepEqual(saved.order, [4, 3, 2, 1, 0]);
  assert.equal(saved.stages[0], 7);
});

test('storage errors and malformed data preserve a working fresh experience', () => {
  assert.deepEqual(loadState({ getItem() { throw new Error('denied'); } }), initialState());
  assert.deepEqual(loadState({ getItem() { return '{'; } }), initialState());
  assert.deepEqual(loadState({ getItem() { return null; } }), initialState());
  assert.equal(saveState({ setItem() { throw new Error('full'); } }, initialState()), false);
  const entries = new Map();
  const storage = { getItem: key => entries.get(key), setItem: (key, value) => entries.set(key, value) };
  const progress = completedState();
  assert.equal(saveState(storage, progress), true);
  assert.ok(entries.has(STORAGE_KEY));
  assert.deepEqual(loadState(storage), progress);
});

test('only the active flower gains one piece, without mutating prior progress', () => {
  const state = initialState();
  assert.equal(transition(state, { type: 'place', id: 1 }), state);
  const next = transition(state, { type: 'place', id: 0 });
  assert.deepEqual(state.stages, [0, 0, 0, 0, 0]);
  assert.deepEqual(next.stages, [1, 0, 0, 0, 0]);
  let full = next;
  for (let part = 0; part < TOTAL_PARTS; part += 1) full = transition(full, { type: 'place', id: 0 });
  assert.equal(full.stages[0], partCount(0));
  assert.equal(transition(full, { type: 'place', id: 0 }), full);
  assert.equal(transition(initialState(), { type: 'undo' }).stages[0], 0);
});

test('legacy 2D saves migrate to 3D without losing any bouquet progress', () => {
  const legacy = { version: 1, mode: '2d', active: 3, stages: [4, 2, 1, 0, 4], order: [4, 3, 2, 1, 0], wrapped: false };
  const restored = loadState({ getItem(key) { assert.equal(key, STORAGE_KEY); return JSON.stringify(legacy); } });
  assert.deepEqual(restored, { ...legacy, version: 2, mode: '3d', stages: [7, 3, 1, 0, 10] });
  const finished = transition(completedState(), { type: 'wrap' });
  const restoredFinished = sanitizeState({ ...finished, mode: '2d' });
  assert.deepEqual(restoredFinished, finished);
  assert.equal(restoredFinished.wrapped, true);
  invariant(restored);
  invariant(restoredFinished);
});

test('every legacy assembly checkpoint maps to its matching granular checkpoint', () => {
  const tulip = [0, 1, 3, 6, 7];
  const calendula = [0, 1, 3, 7, 10];
  for (let checkpoint = 0; checkpoint <= 4; checkpoint++) {
    const restored = sanitizeState({ version: 1, stages: Array(5).fill(checkpoint), wrapped: true });
    assert.deepEqual(restored.stages, [tulip[checkpoint], tulip[checkpoint], tulip[checkpoint], calendula[checkpoint], calendula[checkpoint]]);
    assert.equal(restored.wrapped, checkpoint === 4);
    invariant(restored);
  }
  const legacyWrapped = sanitizeState({ version: 1, mode: '2d', stages: [4, 4, 4, 4, 4], wrapped: true, order: [4, 3, 2, 1, 0], active: 3 });
  assert.deepEqual(legacyWrapped.stages, PART_COUNTS);
  assert.equal(legacyWrapped.wrapped, true);
  assert.deepEqual(legacyWrapped.order, [4, 3, 2, 1, 0]);
  assert.equal(legacyWrapped.active, 3);
});

test('new granular saves preserve each partial flower and reject sparse or invalid steps', () => {
  const saved = { ...initialState(), active: 4, stages: [6, 7, 5, 8, 9], order: [3, 0, 4, 1, 2] };
  assert.deepEqual(sanitizeState(saved), saved);
  assert.deepEqual(sanitizeState({ version: 2, stages: [99, -1, Infinity, 99, NaN], wrapped: true }).stages, [7, 0, 0, 10, 0]);
  assert.deepEqual(sanitizeState({ version: 2, stages: Array(5), wrapped: true }).stages, [0, 0, 0, 0, 0]);
  assert.deepEqual(sanitizeState({ version: 2, order: [0, , 2, 3, 4] }).order, [0, 1, 2, 3, 4]);
});

test('the 3D-only experience ignores obsolete render-mode actions', () => {
  const state = transition(completedState(), { type: 'wrap' });
  for (const mode of ['2d', '3d', 'unknown']) {
    assert.equal(transition(state, { type: 'mode', mode }), state);
  }
  assert.equal(initialState().mode, '3d');
});

test('wrapping requires all flowers; undo unwraps before removing a piece', () => {
  assert.equal(transition(initialState(), { type: 'wrap' }).wrapped, false);
  const completed = completedState();
  const wrapped = transition(completed, { type: 'wrap' });
  assert.equal(wrapped.wrapped, true);
  assert.equal(transition(wrapped, { type: 'place', id: wrapped.active }), wrapped);
  const unwrapped = transition(wrapped, { type: 'undo' });
  assert.equal(unwrapped.wrapped, false);
  assert.deepEqual(unwrapped.stages, PART_COUNTS);
  const removed = transition(unwrapped, { type: 'undo' });
  assert.equal(removed.stages[removed.active], partCount(removed.active) - 1);
  assert.equal(transition(removed, { type: 'wrap' }), removed);
  assert.deepEqual(wrapped.stages, PART_COUNTS);
});

test('arranging wraps at bouquet edges and keeps the selected flower selected', () => {
  let state = transition(completedState(), { type: 'wrap' });
  state = transition(state, { type: 'select', id: 0 });
  const moved = transition(state, { type: 'arrange', direction: -1 });
  assert.deepEqual(moved.order, [4, 1, 2, 3, 0]);
  assert.equal(moved.active, 0);
  assert.deepEqual(transition(moved, { type: 'arrange', direction: 1 }).order, state.order);
  assert.equal(transition(state, { type: 'arrange', direction: 2 }), state);
  const open = initialState();
  assert.equal(transition(open, { type: 'arrange', direction: 1 }), open);
});

test('mixed and invalid action sequences keep all bouquet invariants', () => {
  let state = initialState();
  const actions = [
    { type: 'select', id: -1 }, { type: 'select', id: 9 }, { type: 'select', id: 1.1 },
    { type: 'select', id: '2' }, { type: 'wrap' }, { type: 'undo' }, { type: 'unknown' },
    { type: 'mode', mode: '3d' }, { type: 'mode', mode: '2d' },
    ...FLOWERS.flatMap((_, id) => [{ type: 'select', id }, { type: 'place', id }]),
    { type: 'arrange', direction: 1 }, { type: 'arrange', direction: -1 },
  ];
  let seed = 21727;
  for (let step = 0; step < 1500; step += 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const before = JSON.stringify(state);
    const previous = state;
    state = transition(state, actions[seed % actions.length]);
    assert.equal(JSON.stringify(previous), before);
    invariant(state);
  }
});

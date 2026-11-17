import test from 'node:test';
import assert from 'node:assert/strict';
import { FLOWERS, PARTS, STORAGE_KEY, initialState, sanitizeState, loadState, saveState, transition } from './state.js';

function completedState() {
  let state = initialState();
  for (let id = 0; id < FLOWERS.length; id += 1) {
    state = transition(state, { type: 'select', id });
    for (let part = 0; part < PARTS; part += 1) state = transition(state, { type: 'place', id });
  }
  return state;
}

function invariant(state) {
  assert.equal(state.stages.length, FLOWERS.length);
  assert.ok(state.stages.every(stage => Number.isInteger(stage) && stage >= 0 && stage <= PARTS));
  assert.deepEqual([...state.order].sort(), [0, 1, 2, 3, 4]);
  assert.ok(Number.isInteger(state.active) && state.active >= 0 && state.active < FLOWERS.length);
  assert.ok(state.mode === '2d' || state.mode === '3d');
  if (state.wrapped) assert.ok(state.stages.every(stage => stage === PARTS));
}

test('persisted values are bounded and cannot wrap an incomplete bouquet', () => {
  for (const value of [null, undefined, true, [], 'bad', { version: 2 }]) {
    assert.deepEqual(sanitizeState(value), initialState());
  }
  const restored = sanitizeState({ version: 1, mode: '3d', active: 99, stages: [-2, 8, 2.5, null, 3], order: [0, 0, 2, 3, 4], wrapped: true });
  assert.equal(restored.mode, '3d');
  assert.equal(restored.active, 0);
  assert.deepEqual(restored.stages, [0, 4, 0, 0, 3]);
  assert.deepEqual(restored.order, [0, 1, 2, 3, 4]);
  assert.equal(restored.wrapped, false);
  invariant(restored);
});

test('valid saved progress restores independently of its original object', () => {
  const saved = { version: 1, mode: '3d', active: 3, stages: [4, 2, 1, 0, 4], order: [4, 3, 2, 1, 0], wrapped: false };
  const restored = sanitizeState(saved);
  assert.deepEqual(restored, saved);
  restored.order.reverse();
  restored.stages[0] = 0;
  assert.deepEqual(saved.order, [4, 3, 2, 1, 0]);
  assert.equal(saved.stages[0], 4);
});

test('storage errors and malformed data preserve a working fresh experience', () => {
  assert.deepEqual(loadState({ getItem() { throw new Error('denied'); } }), initialState());
  assert.deepEqual(loadState({ getItem() { return '{'; } }), initialState());
  assert.deepEqual(loadState({ getItem() { return null; } }), initialState());
  assert.equal(saveState({ setItem() { throw new Error('full'); } }, initialState()), false);
  const entries = new Map();
  const storage = { getItem: key => entries.get(key), setItem: (key, value) => entries.set(key, value) };
  const progress = transition(completedState(), { type: 'mode', mode: '3d' });
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
  for (let part = 0; part < 10; part += 1) full = transition(full, { type: 'place', id: 0 });
  assert.equal(full.stages[0], PARTS);
  assert.equal(transition(full, { type: 'place', id: 0 }), full);
  assert.equal(transition(initialState(), { type: 'undo' }).stages[0], 0);
});

test('switching render modes preserves assembly, selection, and arrangement', () => {
  const state = transition(completedState(), { type: 'wrap' });
  const switched = transition(state, { type: 'mode', mode: '3d' });
  assert.equal(switched.mode, '3d');
  assert.deepEqual(switched.stages, state.stages);
  assert.deepEqual(switched.order, state.order);
  assert.equal(switched.active, state.active);
  assert.equal(switched.wrapped, true);
  assert.equal(transition(switched, { type: 'mode', mode: 'unknown' }), switched);
});

test('wrapping requires all flowers; undo unwraps before removing a piece', () => {
  assert.equal(transition(initialState(), { type: 'wrap' }).wrapped, false);
  const completed = completedState();
  const wrapped = transition(completed, { type: 'wrap' });
  assert.equal(wrapped.wrapped, true);
  assert.equal(transition(wrapped, { type: 'place', id: wrapped.active }), wrapped);
  const unwrapped = transition(wrapped, { type: 'undo' });
  assert.equal(unwrapped.wrapped, false);
  assert.deepEqual(unwrapped.stages, [4, 4, 4, 4, 4]);
  const removed = transition(unwrapped, { type: 'undo' });
  assert.equal(removed.stages[removed.active], PARTS - 1);
  assert.equal(transition(removed, { type: 'wrap' }), removed);
  assert.deepEqual(wrapped.stages, [4, 4, 4, 4, 4]);
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

import test from 'node:test';
import assert from 'node:assert/strict';
import { canSnapDrop } from './drag-math.js';

const drop = (changes = {}) => ({
  pieceScreen: { x: 200, y: 200 }, targetScreen: { x: 200, y: 200 },
  pieceWorld: { x: 0, y: 2, z: 0 }, targetWorld: { x: 0, y: 2, z: 0 },
  screenRadius: 72, worldRadius: 0.8, moved: true, valid: true,
  ...changes,
});

test('a genuine drag snaps within both spatial tolerances, including their boundaries', () => {
  assert.equal(canSnapDrop(drop()), true);
  assert.equal(canSnapDrop(drop({ pieceScreen: { x: 272, y: 200 }, pieceWorld: { x: 0.8, y: 2, z: 0 } })), true);
  assert.equal(canSnapDrop(drop({ pieceScreen: { x: 242, y: 239 }, pieceWorld: { x: 0.25, y: 2.25, z: 0.25 } })), true);
});

test('screen-near pieces at the wrong world depth cannot attach', () => {
  assert.equal(canSnapDrop(drop({ pieceWorld: { x: 0, y: 2, z: 0.81 } })), false);
  assert.equal(canSnapDrop(drop({ pieceWorld: { x: 0, y: 2, z: 50 } })), false);
});

test('world-near pieces released outside the screen target cannot attach', () => {
  assert.equal(canSnapDrop(drop({ pieceScreen: { x: 272.01, y: 200 } })), false);
  assert.equal(canSnapDrop(drop({ pieceScreen: { x: 260, y: 260 } })), false);
});

test('clicks, cancelled gestures and stale invalid targets never become placements', () => {
  for (const changes of [{ moved: false }, { valid: false }, { moved: 1 }, { valid: 'true' }, { moved: undefined }, { valid: undefined }]) {
    assert.equal(canSnapDrop(drop(changes)), false);
  }
});

test('missing and nonfinite coordinates or radii fail closed', () => {
  for (const value of [undefined, null, {}, { moved: true, valid: true }]) assert.equal(canSnapDrop(value), false);
  for (const field of ['pieceScreen', 'targetScreen', 'pieceWorld', 'targetWorld']) {
    for (const point of [null, undefined, {}, { x: NaN, y: 2, z: 0 }, { x: 0, y: Infinity, z: 0 }, { x: '0', y: 2, z: 0 }]) {
      assert.equal(canSnapDrop(drop({ [field]: point })), false);
    }
  }
  for (const field of ['pieceWorld', 'targetWorld']) assert.equal(canSnapDrop(drop({ [field]: { x: 0, y: 2 } })), false);
  for (const field of ['screenRadius', 'worldRadius']) {
    for (const radius of [NaN, Infinity, -1, undefined, null, '72']) assert.equal(canSnapDrop(drop({ [field]: radius })), false);
  }
});

test('touch tolerance is explicit and does not enlarge world-depth tolerance', () => {
  const pointerAt80 = { x: 280, y: 200 };
  assert.equal(canSnapDrop(drop({ pieceScreen: pointerAt80 })), false);
  assert.equal(canSnapDrop(drop({ pieceScreen: pointerAt80, screenRadius: 84 })), true);
  assert.equal(canSnapDrop(drop({ pieceScreen: pointerAt80, screenRadius: 84, pieceWorld: { x: 0, y: 2, z: 0.9 } })), false);
});

test('zero tolerances allow exact placement only, with immutable inputs', () => {
  const exact = drop({ screenRadius: 0, worldRadius: 0 });
  const before = JSON.stringify(exact);
  assert.equal(canSnapDrop(exact), true);
  assert.equal(JSON.stringify(exact), before);
  assert.equal(canSnapDrop({ ...exact, pieceWorld: { x: 0.000001, y: 2, z: 0 } }), false);
});

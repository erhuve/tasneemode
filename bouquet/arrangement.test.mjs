import test from 'node:test';
import assert from 'node:assert/strict';
import { Euler, Vector3 } from './vendor/three.module.min.js';
import { WRAPPER, STEM_RADIUS, CLEARANCE, LEAF_CLEARANCE, BLOOM_BOTTOM_CLEARANCE, WRAP_DURATION_MS, wrapperTopAtAngle, wrapperRadiusAt, wrapperPoint, insideWrapper, transformLeafPoint, getBouquetArrangement, wrappingProgress, wrappingSurfacePoint } from './arrangement.js';

const EPSILON = 1e-9;
const distance = (a, b) => Math.hypot(...a.map((value, axis) => value - b[axis]));
const dot = (a, b) => a.reduce((sum, value, axis) => sum + value * b[axis], 0);
const permutations = values => values.length === 0 ? [[]] : values.flatMap((value, index) =>
  permutations(values.filter((_, otherIndex) => index !== otherIndex)).map(tail => [value, ...tail]));
const orders = permutations([0, 1, 2, 3, 4]);

test('every arrangement keeps complete stem thickness inside the actual wrapper envelope', () => {
  assert.equal(orders.length, 120);
  for (const order of orders) {
    const flowers = getBouquetArrangement(order);
    assert.deepEqual(flowers.map(flower => flower.id), order);
    for (const { id, slot, stem, head, connectors } of flowers) {
      assert.equal(order[slot], id);
      assert.equal(stem.radius, STEM_RADIUS);
      assert.ok(stem.base[1] - stem.radius >= WRAPPER.baseY - EPSILON);
      assert.ok(distance(stem.sample(0), stem.base) <= EPSILON);
      assert.ok(distance(stem.sample(1), head) <= EPSILON);
      // A cubic Bezier stays in the convex hull of its control points. The
      // narrow lower paper envelope is convex, so this also excludes hidden
      // between-sample excursions through the wrapper.
      for (const point of stem.controlPoints.lower) assert.ok(insideWrapper(point), `lower control ${id}/${slot}`);
      let previousY = -Infinity;
      for (let sample = 0; sample <= 1000; sample++) {
        const t = sample / 1000;
        const point = stem.sample(t);
        assert.ok(point.every(Number.isFinite));
        assert.ok(point[1] >= previousY - EPSILON);
        previousY = point[1];
        if (point[1] <= WRAPPER.rimMaxY) {
          assert.ok(Math.hypot(point[0], point[2]) + stem.radius + CLEARANCE <= wrapperRadiusAt(point[1]) + EPSILON,
            `shaft clips ${id}/${slot} at ${t}`);
        }
      }
      const beforeJoin = stem.tangent(stem.split - 1e-7);
      const afterJoin = stem.tangent(stem.split + 1e-7);
      assert.ok(dot(beforeJoin, afterJoin) > 0.999999);
      for (const connector of connectors) {
        for (const direction of [-1, 0, 1]) {
          const point = connector.position.map((value, axis) => value + direction * connector.tangent[axis] * connector.length / 2);
          assert.ok(insideWrapper(point, connector.radius), `connector clips ${id}/${slot}`);
        }
      }
    }
  }
});

test('all transformed leaf volumes start above the highest paper rim in every arrangement', () => {
  for (const order of orders) {
    for (const { id, slot, leaves } of getBouquetArrangement(order)) {
      assert.equal(leaves.length, 2);
      for (const leaf of leaves) {
        assert.ok(leaf.bounds.min[1] >= WRAPPER.rimMaxY + LEAF_CLEARANCE - EPSILON, `leaf clips ${id}/${slot}`);
        for (const x of [-0.205, 0.205]) for (const y of [-0.01, 1.11]) for (const z of [-0.025, 0.35]) {
          const local = [x, y, z];
          const rendered = new Vector3(...local).multiply(new Vector3(...leaf.scale))
            .applyEuler(new Euler(...leaf.rotation, 'XYZ')).add(new Vector3(...leaf.position)).toArray();
          assert.ok(distance(transformLeafPoint(leaf, local), rendered) <= EPSILON);
          assert.ok(rendered[1] >= WRAPPER.rimMaxY + LEAF_CLEARANCE - EPSILON);
        }
      }
    }
  }
});

test('the containment envelope is conservative for the actual asymmetric paper geometry', () => {
  for (let angle = 0; angle <= 360; angle++) {
    const u = angle / 360;
    assert.ok(wrapperTopAtAngle(u * Math.PI * 2) <= WRAPPER.rimMaxY);
    for (let depth = 0; depth <= 20; depth++) {
      const point = wrapperPoint(u, depth / 20);
      assert.ok(point.every(Number.isFinite));
      assert.ok(wrapperRadiusAt(point[1]) <= Math.hypot(point[0], point[2]) + EPSILON);
    }
  }
  assert.ok(distance(wrapperPoint(0, 0.5), wrapperPoint(1, 0.5)) <= EPSILON);
  assert.ok(WRAPPER.baseY + WRAPPER.groundOffsetY > -0.09);
});

test('every complete flower head stays above the paper rim after rearranging', () => {
  for (const order of orders) {
    for (const flower of getBouquetArrangement(order)) {
      assert.ok(Number.isFinite(flower.bloomMinY));
      assert.ok(flower.bloomMinY >= WRAPPER.rimMaxY + BLOOM_BOTTOM_CLEARANCE - EPSILON,
        `bloom clips ${flower.id}/${flower.slot}`);
    }
  }
});

test('the paper deforms from a flat sheet into exactly the bounded resting wrapper', () => {
  for (let angle = 0; angle <= 24; angle++) {
    const u = angle / 24;
    for (let depth = 0; depth <= 10; depth++) {
      const v = depth / 10;
      const flat = wrappingSurfacePoint(u, v, 0);
      assert.ok(Math.abs(flat[1] - WRAPPER.baseY) <= EPSILON);
      assert.ok(distance(wrappingSurfacePoint(u, v, 1), wrapperPoint(u, v)) <= EPSILON);
      let previous = flat;
      for (let frame = 1; frame <= 100; frame++) {
        const next = wrappingSurfacePoint(u, v, frame / 100);
        assert.ok(next.every(Number.isFinite));
        assert.ok(next[1] >= previous[1] - EPSILON);
        assert.ok(next[1] <= wrapperTopAtAngle(u * Math.PI * 2) + EPSILON);
        assert.ok(Math.hypot(next[0], next[2]) <= Math.hypot(previous[0], previous[2]) + EPSILON);
        previous = next;
      }
    }
  }
});

test('arrangement changes cannot mutate previously calculated geometry or caller order', () => {
  const order = [4, 3, 2, 1, 0];
  const first = getBouquetArrangement(order);
  const originalHead = [...first[0].head];
  const second = getBouquetArrangement(order);
  second[0].head[0] += 5;
  second[0].leaves[0].position[1] -= 5;
  assert.deepEqual(first[0].head, originalHead);
  assert.deepEqual(order, [4, 3, 2, 1, 0]);
  assert.deepEqual(getBouquetArrangement([0, 0, 0, 0, 0]).map(flower => flower.id), [0, 1, 2, 3, 4]);
});

test('the finish clock gathers, folds, ties, then reveals the tag without reversing a phase', () => {
  assert.ok(WRAP_DURATION_MS > 0);
  const channels = ['gather', 'paperLift', 'leftFold', 'rightFold', 'band', 'bow', 'tag'];
  assert.deepEqual(Object.values(wrappingProgress(0)), channels.map(() => 0));
  assert.deepEqual(Object.values(wrappingProgress(1)), channels.map(() => 1));
  assert.deepEqual(wrappingProgress(-1), wrappingProgress(0));
  assert.deepEqual(wrappingProgress(2), wrappingProgress(1));
  let previous = wrappingProgress(0);
  for (let step = 1; step <= 1000; step++) {
    const next = wrappingProgress(step / 1000);
    for (const channel of channels) {
      assert.ok(Number.isFinite(next[channel]) && next[channel] >= 0 && next[channel] <= 1);
      assert.ok(next[channel] >= previous[channel]);
    }
    previous = next;
  }
  assert.equal(wrappingProgress(0.25).gather, 1);
  assert.equal(wrappingProgress(0.60).band, 0);
  assert.equal(wrappingProgress(0.74).bow, 0);
  assert.equal(wrappingProgress(0.88).tag, 0);
});

// Bouquet-local geometry. The lower stem curves live inside a convex inner
// envelope of the actual wavy paper cone; no clipping or renderer is involved.
export const WRAPPER = Object.freeze({
  baseY: 0.10,
  radiusBottom: 0.23,
  radiusTop: 0.92,
  rimBaseY: 1.54,
  rimWave: 0.16,
  rimSecondWave: 0.055,
  rimMaxY: 1.77,
  thickness: 0.022,
  groundOffsetY: -0.17,
});
export const STEM_RADIUS = 0.028;
export const CLEARANCE = 0.055;
export const LEAF_CLEARANCE = 0.045;
export const BLOOM_BOTTOM_CLEARANCE = 0.03;

const TAU = Math.PI * 2;
const clamp = (value, lower = 0, upper = 1) => Math.max(lower, Math.min(upper, value));
const add = (a, b) => a.map((value, i) => value + b[i]);
const subtract = (a, b) => a.map((value, i) => value - b[i]);
const multiply = (a, scale) => a.map(value => value * scale);
const length = (a) => Math.hypot(...a);
const normalize = (a) => multiply(a, 1 / (length(a) || 1));

export function wrapperTopAtAngle(angle) {
  return WRAPPER.rimBaseY + WRAPPER.rimWave * Math.cos(angle + 0.4)
    + WRAPPER.rimSecondWave * Math.sin(angle * 2);
}

// The tallest possible rim gives the narrowest radius at any fixed y. Using
// this envelope is conservative for every azimuth of the asymmetric wrapper.
export function wrapperRadiusAt(y) {
  const fraction = clamp((y - WRAPPER.baseY) / (WRAPPER.rimMaxY - WRAPPER.baseY));
  return WRAPPER.radiusBottom + (WRAPPER.radiusTop - WRAPPER.radiusBottom) * fraction;
}

export function wrapperPoint(u, v) {
  const angle = u * TAU;
  const fraction = clamp(v);
  const radius = WRAPPER.radiusBottom + (WRAPPER.radiusTop - WRAPPER.radiusBottom) * fraction;
  return [Math.sin(angle) * radius,
    WRAPPER.baseY + fraction * (wrapperTopAtAngle(angle) - WRAPPER.baseY),
    Math.cos(angle) * radius];
}

export function insideWrapper(point, radius = STEM_RADIUS, clearance = CLEARANCE) {
  if (point[1] > WRAPPER.rimMaxY) return true;
  if (point[1] < WRAPPER.baseY) return false;
  return Math.hypot(point[0], point[2]) + radius + clearance <= wrapperRadiusAt(point[1]) + 1e-10;
}

function bezier(points, t) {
  const s = 1 - t;
  return [0, 1, 2].map(axis => s ** 3 * points[0][axis]
    + 3 * s * s * t * points[1][axis]
    + 3 * s * t * t * points[2][axis] + t ** 3 * points[3][axis]);
}

function bezierTangent(points, t) {
  const s = 1 - t;
  return [0, 1, 2].map(axis => 3 * s * s * (points[1][axis] - points[0][axis])
    + 6 * s * t * (points[2][axis] - points[1][axis])
    + 3 * t * t * (points[3][axis] - points[2][axis]));
}

function curveLength(points) {
  let total = 0;
  let previous = points[0];
  for (let i = 1; i <= 40; i += 1) {
    const current = bezier(points, i / 40);
    total += length(subtract(current, previous));
    previous = current;
  }
  return total;
}

function createStem(id, head) {
  const bundleAngle = id * TAU / 5 + 0.3;
  const base = [Math.cos(bundleAngle) * 0.052, WRAPPER.baseY + 0.038, Math.sin(bundleAngle) * 0.052];
  const exit = [head[0] * 0.48, WRAPPER.rimMaxY, head[2] * 0.48];
  const lower = [base, [base[0], 0.53, base[2]], [head[0] * 0.22, 1.24, head[2] * 0.22], exit];
  const upperRise = head[1] - exit[1];
  const joinScale = upperRise * 0.35 / (exit[1] - lower[2][1]);
  const upper = [exit, add(exit, multiply(subtract(exit, lower[2]), joinScale)),
    [head[0] - (head[0] - exit[0]) * 0.05, head[1] - 0.14, head[2] - (head[2] - exit[2]) * 0.05], head];
  const lowerLength = curveLength(lower);
  const split = lowerLength / (lowerLength + curveLength(upper));
  const sample = (value) => {
    const t = clamp(value);
    return t <= split ? bezier(lower, t / split) : bezier(upper, (t - split) / (1 - split));
  };
  const tangent = (value) => {
    const t = clamp(value);
    return normalize(t <= split ? bezierTangent(lower, t / split) : bezierTangent(upper, (t - split) / (1 - split)));
  };
  return {
    sample, tangent, split, radius: STEM_RADIUS,
    // These points are samples for inspection; use sample() directly in a
    // THREE.Curve. Catmull-Rom interpolation can overshoot the containment bound.
    points: Array.from({ length: 81 }, (_, index) => sample(index / 80)),
    controlPoints: { lower, upper },
    base: [...base], head: [...head],
  };
}

export function pointOnStemAtY(stem, y) {
  let low = 0;
  let high = 1;
  const target = clamp(y, stem.base[1], stem.head[1]);
  for (let i = 0; i < 45; i += 1) {
    const t = (low + high) / 2;
    if (stem.sample(t)[1] < target) low = t;
    else high = t;
  }
  const t = (low + high) / 2;
  return { t, position: stem.sample(t), tangent: stem.tangent(t) };
}

// This matches THREE's Euler XYZ convention and keeps the leaf bounds testable
// without importing Three.js. Bounds include surface thickness and edge padding.
export function transformLeafPoint(leaf, localPoint) {
  let [x, y, z] = localPoint.map((value, i) => value * leaf.scale[i]);
  const [rx, ry, rz] = leaf.rotation;
  const cx = Math.cos(rx), sx = Math.sin(rx);
  const cy = Math.cos(ry), sy = Math.sin(ry);
  const cz = Math.cos(rz), sz = Math.sin(rz);
  [x, y] = [x * cz - y * sz, x * sz + y * cz];
  [x, z] = [x * cy + z * sy, -x * sy + z * cy];
  [y, z] = [y * cx - z * sx, y * sx + z * cx];
  return [x + leaf.position[0], y + leaf.position[1], z + leaf.position[2]];
}

function leafBounds(leaf) {
  const points = [];
  for (const x of [-0.205, 0.205]) {
    for (const y of [-0.01, 1.11]) {
      for (const z of [-0.025, 0.35]) points.push(transformLeafPoint(leaf, [x, y, z]));
    }
  }
  return { min: [0, 1, 2].map(axis => Math.min(...points.map(point => point[axis]))),
    max: [0, 1, 2].map(axis => Math.max(...points.map(point => point[axis]))) };
}

function createLeaf(stem, id, slot, index) {
  const tulip = id < 3;
  const azimuth = Math.atan2(stem.head[0], stem.head[2]);
  const leaf = {
    position: [0, 0, 0],
    rotation: [index ? 0.055 : -0.065, azimuth + (index ? Math.PI + 0.2 : -0.15), index ? 0.36 : -0.40],
    scale: tulip ? [0.82, index ? 0.72 : 0.83, 0.85] : [0.68, index ? 0.61 : 0.67, 0.72],
    index, slot,
  };
  const offsetMinY = leafBounds(leaf).min[1];
  const safeBaseY = WRAPPER.rimMaxY + LEAF_CLEARANCE - offsetMinY;
  const desiredY = Math.min(WRAPPER.rimMaxY + 0.14 + index * 0.10, stem.head[1] - 0.065);
  const frame = pointOnStemAtY(stem, Math.max(desiredY, safeBaseY));
  leaf.position = frame.position;
  leaf.stemT = frame.t;
  leaf.bounds = leafBounds(leaf);
  return leaf;
}

function normalizeOrder(order) {
  return Array.isArray(order) && order.length === 5 && new Set(order).size === 5
    && Array.from(order).every(id => Number.isInteger(id) && id >= 0 && id < 5) ? [...order] : [0, 1, 2, 3, 4];
}

export function getBouquetArrangement(order = [0, 1, 2, 3, 4]) {
  const heads = [[-0.66, 2.37, -0.14], [0, 2.65, -0.27], [0.66, 2.35, -0.12], [-0.43, 2.08, 0.48], [0.43, 2.10, 0.49]];
  const calendulaHeights = [2.58, 2.75, 2.56, 2.47, 2.49];
  return normalizeOrder(order).map((id, slot) => {
    const head = [...heads[slot]];
    if (id >= 3) head[1] = calendulaHeights[slot];
    const stem = createStem(id, head);
    const leaves = [createLeaf(stem, id, slot, 0), createLeaf(stem, id, slot, 1)];
    const connectors = [0.26, 0.82, head[1] - 0.075].map(y => ({
      ...pointOnStemAtY(stem, y), radius: 0.039, length: 0.052,
    }));
    const headRotation = [id < 3 ? -0.04 : 0.10,
      id < 3 ? slot * 0.45 : (slot - 2) * 0.12, -head[0] * 0.10];
    // Bound the complete radial petal disk after its canonical .9-radian tilt
    // and the head's Euler XYZ rotation, including surface thickness. Keeping
    // this lower bound above the rim prevents petals intersecting the paper too.
    const [rx, ry, rz] = headRotation;
    const rowY = [Math.cos(rx) * Math.sin(rz) + Math.sin(rx) * Math.sin(ry) * Math.cos(rz),
      Math.cos(rx) * Math.cos(rz) - Math.sin(rx) * Math.sin(ry) * Math.sin(rz),
      -Math.sin(rx) * Math.cos(ry)];
    const radialY = Math.hypot(rowY[0], rowY[2] * Math.cos(0.9) - rowY[1] * Math.sin(0.9));
    const bloomMinY = id >= 3 ? head[1] - 0.76 * radialY - 0.02 : head[1] - 0.16;
    return { id, slot, head, headRotation, bloomMinY, stem, leaves, connectors };
  });
}

// A shared choreography clock lets the renderer fold physical paper panels,
// tighten the band, then form the bow and settle the tag. At completion every
// transform is exactly the resting arrangement; reduced motion may jump to 1.
export const WRAP_DURATION_MS = 2600;
export function wrappingProgress(progress) {
  const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
  const phase = (start, end) => smooth((clamp(progress) - start) / (end - start));
  return { gather: phase(0, 0.25), paperLift: phase(0.12, 0.43),
    leftFold: phase(0.27, 0.61), rightFold: phase(0.40, 0.73),
    band: phase(0.60, 0.81), bow: phase(0.74, 0.94), tag: phase(0.88, 1) };
}

// Deform actual thick paper from a sheet resting on the desk into its final
// cone. Side-dependent timing reads as left/right folds, while every p=1 vertex
// is exactly wrapperPoint(u,v). Normals/thickness should be regenerated by the
// renderer when it updates these points; opacity is not the wrapping effect.
export function wrappingSurfacePoint(u, v, progress) {
  const phase = wrappingProgress(progress);
  const angle = u * TAU;
  const fraction = clamp(v);
  const height = wrapperTopAtAngle(angle) - WRAPPER.baseY;
  const radialRise = WRAPPER.radiusTop - WRAPPER.radiusBottom;
  const slant = Math.hypot(radialRise, height);
  const side = (Math.sin(angle) + 1) / 2;
  const fold = phase.leftFold * (1 - side) + phase.rightFold * side;
  const lift = 0.28 * phase.paperLift + 0.72 * fold;
  const slope = Math.atan2(height, radialRise) * lift;
  const radius = WRAPPER.radiusBottom + slant * fraction * Math.cos(slope);
  return [Math.sin(angle) * radius, WRAPPER.baseY + slant * fraction * Math.sin(slope), Math.cos(angle) * radius];
}

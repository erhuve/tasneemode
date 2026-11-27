const finitePoint = (point, axes) => point !== null && typeof point === 'object' &&
  axes.every(axis => Number.isFinite(point[axis]));

// A nearby projection alone cannot attach a piece that is at the wrong depth.
export function canSnapDrop(options = {}) {
  if (!options || options.moved !== true || options.valid !== true) return false;
  const { pieceScreen, targetScreen, pieceWorld, targetWorld, screenRadius, worldRadius } = options;
  if (!Number.isFinite(screenRadius) || screenRadius < 0 || !Number.isFinite(worldRadius) || worldRadius < 0) return false;
  if (!finitePoint(pieceScreen, ['x', 'y']) || !finitePoint(targetScreen, ['x', 'y']) ||
      !finitePoint(pieceWorld, ['x', 'y', 'z']) || !finitePoint(targetWorld, ['x', 'y', 'z'])) return false;
  const screenDistance = Math.hypot(pieceScreen.x - targetScreen.x, pieceScreen.y - targetScreen.y);
  const worldDistance = Math.hypot(pieceWorld.x - targetWorld.x, pieceWorld.y - targetWorld.y, pieceWorld.z - targetWorld.z);
  return screenDistance <= screenRadius && worldDistance <= worldRadius;
}

export const STORAGE_KEY = 'tasneemode.bouquet.v1';
export const FLOWERS = Object.freeze(['tulip', 'tulip', 'tulip', 'calendula', 'calendula']);
export const PARTS = 4;

export function initialState() {
  return { version: 1, mode: '2d', active: 0, stages: [0, 0, 0, 0, 0], order: [0, 1, 2, 3, 4], wrapped: false };
}

export function sanitizeState(value) {
  const clean = initialState();
  if (!value || value.version !== 1) return clean;
  if (value.mode === '3d') clean.mode = '3d';
  if (Number.isInteger(value.active) && value.active >= 0 && value.active < FLOWERS.length) clean.active = value.active;
  if (Array.isArray(value.stages) && value.stages.length === FLOWERS.length) {
    clean.stages = value.stages.map(stage => Number.isInteger(stage) ? Math.max(0, Math.min(PARTS, stage)) : 0);
  }
  if (Array.isArray(value.order) && value.order.length === FLOWERS.length &&
      new Set(value.order).size === FLOWERS.length && value.order.every(id => Number.isInteger(id) && id >= 0 && id < FLOWERS.length)) {
    clean.order = [...value.order];
  }
  clean.wrapped = value.wrapped === true && clean.stages.every(stage => stage === PARTS);
  return clean;
}

export function loadState(storage) {
  try { return sanitizeState(JSON.parse(storage.getItem(STORAGE_KEY))); }
  catch { return initialState(); }
}

export function saveState(storage, state) {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; }
  catch { return false; }
}

export function transition(state, action) {
  const next = { ...state, stages: [...state.stages], order: [...state.order] };
  switch (action.type) {
    case 'mode':
      if (action.mode !== '2d' && action.mode !== '3d') return state;
      next.mode = action.mode;
      break;
    case 'select':
      if (!Number.isInteger(action.id) || action.id < 0 || action.id >= FLOWERS.length) return state;
      next.active = action.id;
      break;
    case 'place': {
      if (state.wrapped || action.id !== state.active || next.stages[state.active] >= PARTS) return state;
      next.stages[state.active] += 1;
      // Keep a completed flower on the desk until she chooses another stem.
      break;
    }
    case 'undo':
      if (state.wrapped) { next.wrapped = false; break; }
      if (next.stages[state.active] === 0) return state;
      next.stages[state.active] -= 1;
      break;
    case 'wrap':
      if (!next.stages.every(stage => stage === PARTS)) return state;
      next.wrapped = true;
      break;
    case 'arrange': {
      if (!state.wrapped || !Number.isInteger(action.direction) || Math.abs(action.direction) !== 1) return state;
      const from = next.order.indexOf(state.active);
      const to = (from + action.direction + FLOWERS.length) % FLOWERS.length;
      [next.order[from], next.order[to]] = [next.order[to], next.order[from]];
      break;
    }
    default: return state;
  }
  return next;
}

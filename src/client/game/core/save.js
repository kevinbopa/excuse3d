const STORAGE_KEY = "alae-journey-professional-save";

const defaultState = {
  auth: {
    nameAccepted: false,
    authenticated: false,
    failures: 0
  },
  characterId: null,
  started: false,
  worldIndex: 0,
  inventory: [],
  worldStates: {},
  player: { x: 0, y: 0 }
};

export function createDefaultState() {
  return structuredClone(defaultState);
}

export function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      ...defaultState,
      ...parsed,
      auth: {
        ...defaultState.auth,
        ...(parsed.auth || {})
      },
      player: {
        ...defaultState.player,
        ...(parsed.player || {})
      },
      worldStates: parsed.worldStates || {},
      inventory: parsed.inventory || []
    };
  } catch {
    return createDefaultState();
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState() {
  localStorage.removeItem(STORAGE_KEY);
}

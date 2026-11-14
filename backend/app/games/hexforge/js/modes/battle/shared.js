export const $ = (id) => document.getElementById(id);

const STORAGE_KEY = 'hexforge.attack';
const DEFAULT_SETUP = { mode: 'outposts', side: 'south', priority: 'core', tactic: 'compact', outpost: 1, heroIds: [] };

export const EMPTY_CITY = { grid: 18, buildings: [] };

export const TAIL_SECONDS = 1.5;   // keep the last frame on screen before the report

/** Remember the plan on this device. */
export function saveSetup(setup) {
    try {
        globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(setup));
    } catch {
        // private mode: choices last for this visit
    }
}

/** The last attack plan saved on this device, or the default one. */
export function loadSetup() {
    try {
        const saved = JSON.parse(globalThis.localStorage.getItem(STORAGE_KEY));
        if (saved && typeof saved === 'object') return { ...DEFAULT_SETUP, ...saved };
    } catch {
        // storage blocked or empty
    }
    return structuredClone(DEFAULT_SETUP);
}

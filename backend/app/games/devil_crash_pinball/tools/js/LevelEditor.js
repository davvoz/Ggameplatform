import { EntityDefs } from './EntityDefs.js';
import { HistoryManager } from './HistoryManager.js';
import { validateLevels } from './LevelValidator.js';

/**
 * Central model and event hub for the level editor.
 * All state mutations go through this class; views subscribe to events.
 */
export class LevelEditor {
    /** @type {Record<string, object>} level key → config object (mutable clones) */
    #configs;
    /** @type {string[]} */
    #levelKeys;
    /** @type {string} */
    #currentLevel;
    /** @type {{ type: string, index: number } | null} */
    #selection = null;
    /** @type {'select'|'add'|'delete'} */
    #activeTool = 'select';
    /** @type {string} entity type name for add mode */
    #activeEntityType = 'bumper';
    /** @type {boolean} */
    #snapEnabled = true;
    /** @type {number} */
    #snapGrid = 10;

    /** @type {HistoryManager} */
    #history = new HistoryManager();
    /** @type {{ type: string, data: object } | null} */
    #clipboard = null;
    /** @type {Map<string, Array<Function>>} */
    #listeners = new Map();

    /**
     * @param {{ configs: Record<string, object>, levelKeys: string[] }} opts
     */
    constructor({ configs, levelKeys }) {
        // Deep-clone so we never mutate the originals
        this.#configs = Object.fromEntries(
            Object.entries(configs).map(([k, v]) => [k, structuredClone(v)])
        );
        this.#levelKeys = levelKeys;
        this.#currentLevel = levelKeys.at(-1);
    }

    // ─── Getters ──────────────────────────────────────────────────────────────

    get currentLevel() { return this.#currentLevel; }
    get levelKeys() { return this.#levelKeys; }
    get selection() { return this.#selection; }
    get activeTool() { return this.#activeTool; }
    get activeEntityType() { return this.#activeEntityType; }
    get snapEnabled() { return this.#snapEnabled; }
    get snapGrid() { return this.#snapGrid; }
    get canUndo() { return this.#history.canUndo; }
    get canRedo() { return this.#history.canRedo; }
    get hasClipboard() { return this.#clipboard !== null; }

    /** Returns the live config object for the current level. */
    getConfig(key = this.#currentLevel) {
        return this.#configs[key];
    }

    /** Returns selected entity object, or null. */
    getSelectedEntity() {
        if (!this.#selection) return null;
        const { type, index } = this.#selection;
        const def = EntityDefs[type];
        if (!def) return null;
        const arr = this.#configs[this.#currentLevel][def.key];
        return arr?.[index] ?? null;
    }

    // ─── Mutations ────────────────────────────────────────────────────────────

    setLevel(key) {
        if (!this.#levelKeys.includes(key)) return;
        this.#currentLevel = key;
        this.#selection = null;
        this.#emit('levelChange', key);
        this.#emit('selectionChange', null);
    }

    setTool(tool) {
        this.#activeTool = tool;
        if (tool !== 'select') this.#selection = null;
        this.#emit('toolChange', tool);
        this.#emit('selectionChange', this.#selection);
    }

    setActiveEntityType(type) {
        this.#activeEntityType = type;
        this.#emit('toolChange', type);
    }

    setSnap(enabled, grid) {
        this.#snapEnabled = enabled;
        if (grid !== undefined) this.#snapGrid = grid;
        this.#emit('snapChange', { enabled, grid: this.#snapGrid });
    }

    select(type, index) {
        this.#selection = type === null ? null : { type, index };
        this.#emit('selectionChange', this.#selection);
    }

    deselect() {
        this.#selection = null;
        this.#emit('selectionChange', null);
    }

    /**
     * Adds a new entity of the given type at position (x, y).
     * Records history.
     */
    addEntity(type, x, y) {
        const def = EntityDefs[type];
        if (!def) return;
        const cfg = this.#configs[this.#currentLevel];
        if (!cfg[def.key]) cfg[def.key] = [];

        this.#history.push(this.#snapshot());
        const entity = def.defaults();
        const g = this.#snapEnabled ? this.#snapGrid : 1;
        def.setCenter(entity, x, y, g);
        cfg[def.key].push(entity);

        const index = cfg[def.key].length - 1;
        this.#selection = { type, index };
        this.#emit('entityChange', { action: 'add', type, index });
        this.#emit('selectionChange', this.#selection);
        this.#emit('historyChange');
    }

    /**
     * Deletes the selected entity. Records history.
     */
    deleteSelected() {
        if (!this.#selection) return;
        const { type, index } = this.#selection;
        const def = EntityDefs[type];
        if (!def) return;
        const cfg = this.#configs[this.#currentLevel];
        const arr = cfg[def.key];
        if (!arr || index >= arr.length) return;

        this.#history.push(this.#snapshot());
        arr.splice(index, 1);
        this.#selection = null;
        this.#emit('entityChange', { action: 'delete', type, index });
        this.#emit('selectionChange', null);
        this.#emit('historyChange');
    }

    /**
     * Updates a single field on the selected entity. Records history only once
     * per "session" (caller is responsible for calling #history.push before
     * a drag, then calling commitDrag after).
     * @param {string} field
     * @param {*} value
     */
    updateField(field, value) {
        const entity = this.getSelectedEntity();
        if (!entity) return;
        this.#history.push(this.#snapshot());
        entity[field] = value;
        this.#emit('entityChange', { action: 'update', field, value });
        this.#emit('historyChange');
    }

    /**
     * Moves selected entity to (x, y). Does NOT record history (caller should
     * call snapshotBeforeDrag before drag starts, then commitDrag when done).
     */
    moveSelected(x, y) {
        const entity = this.getSelectedEntity();
        if (!entity) return;
        const def = EntityDefs[this.#selection.type];
        const g = this.#snapEnabled ? this.#snapGrid : 1;
        def.setCenter(entity, x, y, g);
        this.#emit('entityChange', { action: 'move' });
    }

    /**
     * Move a specific line endpoint (ax/ay or bx/by).
     * @param {'a'|'b'} endpoint
     * @param {number} x
     * @param {number} y
     */
    moveEndpoint(endpoint, x, y) {
        const entity = this.getSelectedEntity();
        if (!entity) return;
        const g = this.#snapEnabled ? this.#snapGrid : 1;
        const sx = Math.round(x / g) * g;
        const sy = Math.round(y / g) * g;
        if (endpoint === 'a') { entity.ax = sx; entity.ay = sy; }
        else { entity.bx = sx; entity.by = sy; }
        this.#emit('entityChange', { action: 'move' });
    }

    /**
     * Moves a named handle on the selected entity (corridor, curvedCorridor, …).
     * @param {string} handleId
     * @param {number} x
     * @param {number} y
     */
    moveHandle(handleId, x, y) {
        const entity = this.getSelectedEntity();
        if (!entity) return;
        const def = EntityDefs[this.#selection.type];
        if (!def?.handles) return;
        const g = this.#snapEnabled ? this.#snapGrid : 1;
        def.handles.move(entity, handleId, x, y, g);
        this.#emit('entityChange', { action: 'move' });
    }

    // ─── Pre-snapped ("Raw") variants ─────────────────────────────────────────
    // Called by LevelCanvas when SmartGuides has already applied all snapping,
    // so no additional grid snap should be applied.

    /** Move selected entity to pre-computed (x, y) — no internal grid snap. */
    moveSelectedRaw(x, y) {
        const entity = this.getSelectedEntity();
        if (!entity) return;
        const def = EntityDefs[this.#selection.type];
        def.setCenter(entity, x, y, 1);
        this.#emit('entityChange', { action: 'move' });
    }

    /** Move a line endpoint to pre-computed coordinates — no internal grid snap. */
    moveEndpointRaw(endpoint, x, y) {
        const entity = this.getSelectedEntity();
        if (!entity) return;
        if (endpoint === 'a') { entity.ax = Math.round(x); entity.ay = Math.round(y); }
        else                  { entity.bx = Math.round(x); entity.by = Math.round(y); }
        this.#emit('entityChange', { action: 'move' });
    }

    /** Move a named handle to pre-computed coordinates — no internal grid snap. */
    moveHandleRaw(handleId, x, y) {
        const entity = this.getSelectedEntity();
        if (!entity) return;
        const def = EntityDefs[this.#selection.type];
        if (!def?.handles) return;
        def.handles.move(entity, handleId, x, y, 1);
        this.#emit('entityChange', { action: 'move' });
    }

    /** Snapshot current config before a drag. */
    snapshotBeforeDrag() {
        this.#history.push(this.#snapshot());
        this.#emit('historyChange');
    }

    undo() {
        const prev = this.#history.undo(this.#snapshot());
        if (!prev) return;
        this.#restoreSnapshot(prev);
        this.#selection = null;
        this.#emit('entityChange', { action: 'undo' });
        this.#emit('selectionChange', null);
        this.#emit('historyChange');
    }

    redo() {
        const next = this.#history.redo(this.#snapshot());
        if (!next) return;
        this.#restoreSnapshot(next);
        this.#selection = null;
        this.#emit('entityChange', { action: 'redo' });
        this.#emit('selectionChange', null);
        this.#emit('historyChange');
    }

    /**
     * Copies the currently selected entity into the internal clipboard.
     * The clipboard survives section changes so you can paste across sections.
     */
    copy() {
        const entity = this.getSelectedEntity();
        if (!entity || !this.#selection) return;
        this.#clipboard = { type: this.#selection.type, data: structuredClone(entity) };
        this.#emit('clipboardChange', this.#clipboard);
    }

    /**
     * Pastes the clipboard entity into the current section, offset by +20px
     * on both axes so it does not land exactly on top of the original.
     * Records history.
     */
    paste() {
        if (!this.#clipboard) return;
        const { type, data } = this.#clipboard;
        const def = EntityDefs[type];
        if (!def) return;
        const cfg = this.#configs[this.#currentLevel];
        if (!cfg[def.key]) cfg[def.key] = [];

        this.#history.push(this.#snapshot());
        const entity = structuredClone(data);
        const g = this.#snapEnabled ? this.#snapGrid : 1;

        if (def.isLine) {
            const snap = v => Math.round(v / g) * g;
            entity.ax = snap(entity.ax + 20);
            entity.ay = snap(entity.ay + 20);
            entity.bx = snap(entity.bx + 20);
            entity.by = snap(entity.by + 20);
        } else {
            const c = def.getCenter(entity);
            def.setCenter(entity, c.x + 20, c.y + 20, g);
        }

        cfg[def.key].push(entity);
        const index = cfg[def.key].length - 1;
        this.#selection = { type, index };
        this.#emit('entityChange', { action: 'paste', type, index });
        this.#emit('selectionChange', this.#selection);
        this.#emit('historyChange');
    }

    /**
     * Returns the current config as a formatted JSON string for download.
     * Strips the internal `_comment` and strips undefined optional fields.
     */
    exportJson(levelKey = this.#currentLevel) {
        const cfg = this.#configs[levelKey];
        const out = structuredClone(cfg);
        // floorIndex is derived from board.json order at runtime — strip it from section files.
        delete out.floorIndex;
        // Remove empty arrays to keep JSON clean
        for (const [k, v] of Object.entries(out)) {
            if (Array.isArray(v) && v.length === 0) delete out[k];
        }
        return JSON.stringify(out, null, 2);
    }

    /**
     * Run every validation rule against the current editor state.
     * Mirror of BoardManager.validate() — JSON files that fail this check
     * will crash the runtime on load.
     * @returns {{ errors: {code:string,msg:string}[], warnings: {code:string,msg:string}[] }}
     */
    validate() {
        return validateLevels({
            configs:   this.#configs,
            levelKeys: this.#levelKeys,
        });
    }

    // ─── Events ───────────────────────────────────────────────────────────────

    on(event, cb) {
        if (!this.#listeners.has(event)) this.#listeners.set(event, []);
        this.#listeners.get(event).push(cb);
    }

    #emit(event, data) {
        this.#listeners.get(event)?.forEach(cb => cb(data));
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    // ─── Cross-section warpExit helpers ─────────────────────────────────────

    /**
     * Returns the single warpExit entry (from any section) that references the
     * given source section. Each source section has at most one exit.
     * @param {string} sectionName
     * @returns {{ levelKey: string, exitIndex: number, exit: object }[]}
     */
    getExitsForSection(sectionName) {
        const result = [];
        for (const [key, cfg] of Object.entries(this.#configs)) {
            if (!Array.isArray(cfg.warpExits)) continue;
            cfg.warpExits.forEach((exit, i) => {
                if (exit.fromSection === sectionName) {
                    result.push({ levelKey: key, exitIndex: i, exit: { ...exit } });
                }
            });
        }
        return result;
    }

    /**
     * Adds a warpExit to the target level. Enforces single-exit per source section:
     * if an entry for the same fromSection already exists, it is replaced.
     */
    addWarpExit(targetLevelKey, exit) {
        const cfg = this.#configs[targetLevelKey];
        if (!cfg) return;
        this.#history.push(this.#snapshot());
        if (!Array.isArray(cfg.warpExits)) cfg.warpExits = [];
        const existing = cfg.warpExits.findIndex(e => e.fromSection === exit.fromSection);
        if (existing >= 0) {
            cfg.warpExits[existing] = structuredClone(exit);
        } else {
            cfg.warpExits.push(structuredClone(exit));
        }
        this.#emit('entityChange', { action: 'add_warp_exit' });
        this.#emit('historyChange');
    }

    /** Updates one field on a specific warpExit in a target level. Records history. */
    updateWarpExit(targetLevelKey, exitIndex, field, value) {
        const arr = this.#configs[targetLevelKey]?.warpExits;
        if (!arr?.[exitIndex]) return;
        this.#history.push(this.#snapshot());
        arr[exitIndex][field] = value;
        this.#emit('entityChange', { action: 'update_warp_exit' });
        this.#emit('historyChange');
    }

    /** Deletes a warpExit from a target level. Records history. */
    deleteWarpExit(targetLevelKey, exitIndex) {
        const arr = this.#configs[targetLevelKey]?.warpExits;
        if (!arr) return;
        this.#history.push(this.#snapshot());
        arr.splice(exitIndex, 1);
        this.#emit('entityChange', { action: 'delete_warp_exit' });
        this.#emit('historyChange');
    }

    #snapshot() {
        return { level: this.#currentLevel, configs: structuredClone(this.#configs) };
    }

    #restoreSnapshot({ configs }) {
        this.#configs = configs;
    }

    /**
     * Set (or replace) the boss config for the current level.
     * @param {object} bossCfg
     */
    setBoss(bossCfg) {
        const cfg = this.#configs[this.#currentLevel];
        this.#history.push(this.#snapshot());
        cfg.boss = structuredClone(bossCfg);
        this.#emit('entityChange', { action: 'update_boss' });
        this.#emit('historyChange');
    }

    /** Remove the boss from the current level. */
    removeBoss() {
        const cfg = this.#configs[this.#currentLevel];
        if (!cfg.boss) return;
        this.#history.push(this.#snapshot());
        delete cfg.boss;
        this.#emit('entityChange', { action: 'remove_boss' });
        this.#emit('historyChange');
    }

    /**
     * Update a single field on the current level's boss config.
     * Pass `undefined` as value to delete the field.
     * @param {string} field
     * @param {*}      value
     */
    updateBossField(field, value) {
        const cfg = this.#configs[this.#currentLevel];
        if (!cfg.boss) return;
        this.#history.push(this.#snapshot());
        if (value === undefined) {
            delete cfg.boss[field];
        } else {
            cfg.boss[field] = value;
        }
        this.#emit('entityChange', { action: 'update_boss' });
        this.#emit('historyChange');
    }

    /**
     * Add a brand-new section to the editor model.
     * Emits 'sectionAdd' with the new key.
     * @param {string} key   snake_case identifier, e.g. 'hell_vault'
     * @param {object} cfg   full section config object
     */
    addSection(key, cfg) {
        if (this.#levelKeys.includes(key)) {
            throw new Error(`Section '${key}' already exists.`);
        }
        this.#configs[key] = structuredClone(cfg);
        this.#levelKeys.push(key);
        this.#emit('sectionAdd', key);
        this.setLevel(key);
    }

    /**
     * Move a section from one board position to another.
     * Emits 'boardOrderChange' with the new ordered key array.
     * @param {number} fromIdx  current index in levelKeys
     * @param {number} toIdx    target index
     */
    reorderSection(fromIdx, toIdx) {
        if (fromIdx === toIdx) return;
        if (fromIdx < 0 || fromIdx >= this.#levelKeys.length) return;
        if (toIdx   < 0 || toIdx   >= this.#levelKeys.length) return;
        this.#history.push(this.#snapshot());
        const keys = [...this.#levelKeys];
        const [moved] = keys.splice(fromIdx, 1);
        keys.splice(toIdx, 0, moved);
        this.#levelKeys = keys;
        this.#emit('boardOrderChange', [...this.#levelKeys]);
        this.#emit('historyChange');
    }

    /**
     * Serialise only board.json — use this when only the section order changed.
     * No need to re-download all section files.
     * @returns {string}  JSON string
     */
    exportBoardJson() {
        return JSON.stringify({ sections: [...this.#levelKeys] }, null, 2);
    }

    /**
     * Serialise every loaded section as a zip of JSON strings keyed by filename,
     * plus board.json. floorIndex is NOT written into section files — the order
     * in board.json is the single source of truth.
     * @returns {Record<string, string>}  filename → JSON string
     */
    exportAllJson() {
        const files = {};
        for (const key of this.#levelKeys) {
            files[`${key}.json`] = this.exportJson(key);
        }
        files['board.json'] = this.exportBoardJson();
        return files;
    }
}

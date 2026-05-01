import { LevelEditor }      from './LevelEditor.js';
import { LevelCanvas }      from './LevelCanvas.js';
import { EntityInspector }  from './EntityInspector.js';
import { Toolbar }          from './Toolbar.js';
import { setLevelKeys }     from './EntityDefs.js';
import { EditorBoardApi }   from './EditorBoardApi.js';
import { TestRunner }       from './TestRunner.js';
import { MyBoardsPanel }    from './MyBoardsPanel.js';
import { PlatformIdentity } from '../../js/platform/PlatformIdentity.js';

// ── Platform identity wiring ────────────────────────────────────────────────
// The editor is opened as target="_blank" by BoardShell, which appends
// ?user_id=<uid> to the URL before navigating. We simply read that param here.
// No postMessage, no localStorage.
(function _bootstrapIdentityFromUrl() {
    const uid = new URLSearchParams(globalThis.location?.search ?? '').get('user_id');
    if (uid) PlatformIdentity.set({ userId: uid, username: null });
}());

// ── Security helpers ──────────────────────────────────────────────────────────
const VALID_LEVEL_KEY_RE = /^[a-zA-Z0-9_-]+$/;
function validateKey(key) {
    if (typeof key !== 'string' || !VALID_LEVEL_KEY_RE.test(key)) {
        throw new Error('Invalid level key');
    }
    return key;
}

const BASE_URL = '../data/levels';

// ── Load board.json + sections, OR a remote community board ──────────────────
let LEVEL_KEYS, configs, REMOTE_BOARD_ID = null;

async function _loadDefaultBoard() {
    const boardRes = await fetch(`${BASE_URL}/board.json`);
    if (!boardRes.ok) throw new Error(`HTTP ${boardRes.status} for board.json`);
    const board = await boardRes.json();
    const keys = board.sections ?? [];
    const entries = await Promise.all(
        keys.map(async key => {
            const res = await fetch(`${BASE_URL}/${encodeURIComponent(validateKey(key))}.json`);
            if (!res.ok) throw new Error(`HTTP ${res.status} for ${key}.json`);
            return [key, await res.json()];
        })
    );
    return { keys, configs: Object.fromEntries(entries) };
}

async function _loadRemoteBoard(boardId) {
    const res = await fetch(`/games/devil_crash_pinball/boards/${encodeURIComponent(boardId)}`, {
        credentials: 'same-origin',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} loading remote board ${boardId}`);
    const detail = await res.json();
    const keys = detail?.payload?.board?.sections ?? [];
    const cfgs = detail?.payload?.sections ?? {};
    for (const k of keys) validateKey(k);
    return { keys, configs: cfgs, remoteId: detail.board_id };
}

try {
    const params = new URLSearchParams(globalThis.location?.search ?? '');
    const remoteId = params.get('boardId');
    const loaded = remoteId ? await _loadRemoteBoard(remoteId) : await _loadDefaultBoard();
    LEVEL_KEYS = loaded.keys;
    configs    = loaded.configs;
    REMOTE_BOARD_ID = loaded.remoteId ?? null;
    setLevelKeys(LEVEL_KEYS);
} catch (err) {
    const errDiv = document.createElement('div');
    errDiv.style.cssText = 'color:#f88;font:16px monospace;padding:40px';
    const bold = document.createElement('b');
    bold.textContent = 'Failed to load level configs.';
    const code = document.createElement('code');
    code.textContent = 'http://localhost:PORT/games/devil_crash_pinball/tools/level-editor.html';
    errDiv.append(
        bold, document.createElement('br'), document.createElement('br'),
        err.message, document.createElement('br'), document.createElement('br'),
        'Open this tool through the game server:', document.createElement('br'),
        code
    );
    document.body.replaceChildren(errDiv);
    throw err;
}

// ── Bootstrap editor ────────────────────────────────────────────────────────
const editor = new LevelEditor({ configs, levelKeys: LEVEL_KEYS });

// ── Level tabs (labels auto-generated from key if not overridden) ─────────────
const tabContainer = document.getElementById('level-tabs');
for (const key of LEVEL_KEYS) {
    const label = configs[key]?.section ?? key;
    const btn = document.createElement('button');
    btn.className = 'level-tab';
    btn.dataset.level = key;
    btn.textContent = label.replaceAll('_', ' ').replaceAll(/\b\w/g, c => c.toUpperCase());
    btn.classList.toggle('active', key === editor.currentLevel);
    btn.addEventListener('click', () => editor.setLevel(key));
    tabContainer.appendChild(btn);
}
editor.on('levelChange', key => {
    tabContainer.querySelectorAll('.level-tab').forEach(t =>
        t.classList.toggle('active', t.dataset.level === key)
    );
});

// ── Undo / redo buttons ───────────────────────────────────────────────────────
const undoBtn = document.getElementById('btn-undo');
const redoBtn = document.getElementById('btn-redo');
undoBtn.disabled = true;
redoBtn.disabled = true;
undoBtn.addEventListener('click', () => editor.undo());
redoBtn.addEventListener('click', () => editor.redo());

// ── Export buttons ────────────────────────────────────────────────────────────

/**
 * Validates editor state before any export. On hard errors, blocks the action
 * unless the user explicitly confirms an override. On warnings, logs and
 * proceeds. Returns true if the caller may continue with the download.
 * @param {string} actionLabel  human-readable label for the confirm dialog
 */
async function gateExport(actionLabel) {
    const { errors, warnings } = editor.validate();
    if (warnings.length > 0) {
        console.warn(`[LevelValidator] ${warnings.length} warning(s):`, warnings);
    }
    if (errors.length === 0) return true;
    const lines = errors.map(e => `  • ${e.msg}`).join('\n');
    const msg =
        `⚠ ${errors.length} validation error(s) — runtime will crash on load:\n\n${lines}\n\n` +
        `${actionLabel} anyway? (NOT recommended)`;
    return _confirm(msg);
}

document.getElementById('btn-export').addEventListener('click', async () => {
    if (!await gateExport('Export current section')) return;
    const json = editor.exportJson();
    const key  = editor.currentLevel;
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: `${key}.json` });
    a.click();
    URL.revokeObjectURL(url);
});

document.getElementById('btn-copy').addEventListener('click', async () => {
    if (!await gateExport('Copy current section JSON')) return;
    const json = editor.exportJson();
    await navigator.clipboard.writeText(json);
    const copyBtn = document.getElementById('btn-copy');
    const orig = copyBtn.textContent;
    copyBtn.textContent = '✓ Copied!';
    setTimeout(() => { copyBtn.textContent = orig; }, 1500);
});

// ── Export All (every section + board.json) ───────────────────────────────────
document.getElementById('btn-export-board').addEventListener('click', async () => {
    if (!await gateExport('Export ALL sections + board.json')) return;
    const files = editor.exportAllJson();
    for (const [filename, json] of Object.entries(files)) {
        const blob = new Blob([json], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
        a.click();
        URL.revokeObjectURL(url);
    }
});

// ── New Section dialog ────────────────────────────────────────────────────────
const newSectionDialog = document.getElementById('new-section-dialog');
const newSectionForm   = document.getElementById('new-section-form');

document.getElementById('btn-new-section').addEventListener('click', () => {
    newSectionDialog.showModal();
});
document.getElementById('ns-cancel').addEventListener('click', () => {
    newSectionDialog.close();
});

newSectionForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const key          = document.getElementById('ns-key').value.trim();
    const name         = document.getElementById('ns-name').value.trim();
    const audioProfile = document.getElementById('ns-audio-profile').value;
    const palette    = {
        bg:        document.getElementById('ns-bg').value,
        bgTop:     document.getElementById('ns-bgTop').value,
        wall:      document.getElementById('ns-wall').value,
        wallGlow:  document.getElementById('ns-wallGlow').value,
        accent:    document.getElementById('ns-accent').value,
        accent2:   document.getElementById('ns-accent2').value,
        ink:       'rgba(255,26,26,0.20)',
        name,
        ambientKey: 'INFERNO',
    };

    // Validate key uniqueness
    if (editor.levelKeys.includes(key)) {
        _toast(`Section '${key}' already exists.`);
        return;
    }

    // Minimal config: border walls only
    const cfg = {
        section: key,
        audioProfile,
        palette,
        walls: [
            { ax: 20,  ay: 0, bx: 20,  by: 720 },
            { ax: 460, ay: 0, bx: 460, by: 720 },
        ],
    };

    try {
        editor.addSection(key, cfg);
    } catch (err) {
        _toast(err.message);
        return;
    }

    // Update warpExit select options
    setLevelKeys(editor.levelKeys);

    // Add tab
    const label = key.replaceAll('_', ' ').replaceAll(/\b\w/g, c => c.toUpperCase());
    const btn = document.createElement('button');
    btn.className = 'level-tab active';
    btn.dataset.level = key;
    btn.textContent = label;
    btn.addEventListener('click', () => editor.setLevel(key));
    tabContainer.querySelectorAll('.level-tab').forEach(t => t.classList.remove('active'));
    tabContainer.appendChild(btn);

    newSectionForm.reset();
    newSectionDialog.close();
});

// ── Views ─────────────────────────────────────────────────────────────────────
new Toolbar(document.getElementById('toolbar-panel'), editor);
new LevelCanvas(document.getElementById('level-canvas'), editor);
new EntityInspector(document.getElementById('inspector-panel'), editor);

// ── Board Order dialog ─────────────────────────────────────────────────────────
const boardOrderDialog = document.getElementById('board-order-dialog');
const boardOrderList   = document.getElementById('board-order-list');
let _dragSrcIdx = null;

function _rebuildBoardOrderList() {
    boardOrderList.innerHTML = '';
    const lastIdx = editor.levelKeys.length - 1;
    editor.levelKeys.forEach((key, i) => {
        const cfg      = editor.getConfig(key);
        const label    = (cfg?.section ?? key).replaceAll('_', ' ').toUpperCase();
        const hasBall  = Array.isArray(cfg?.ballStarts) && cfg.ballStarts.length > 0;
        const li = document.createElement('li');
        li.className = 'board-order-row' + (hasBall ? ' bo-ballstart' : '');
        li.draggable = true;
        li.dataset.idx = i;

        const handleSpan = document.createElement('span');
        handleSpan.className = 'bo-handle';
        handleSpan.title = 'Trascina per riordinare';
        handleSpan.textContent = '⠿';

        const idxSpan = document.createElement('span');
        idxSpan.className = 'bo-index';
        idxSpan.textContent = `[${i}]`;

        const nameSpan = document.createElement('span');
        nameSpan.className = 'bo-name';
        nameSpan.textContent = label;
        if (hasBall) {
            const badge = document.createElement('span');
            badge.className = 'bo-badge bo-badge-ball';
            badge.title = 'Ball Start qui';
            badge.textContent = '🎯 BALL START';
            nameSpan.appendChild(badge);
        }

        const ySpan = document.createElement('span');
        ySpan.className = 'bo-y';
        ySpan.textContent = `Y ${i * 720}–${(i + 1) * 720}`;

        const arrowsSpan = document.createElement('span');
        arrowsSpan.className = 'bo-arrows';
        const upBtn = document.createElement('button');
        upBtn.type = 'button'; upBtn.className = 'bo-up'; upBtn.dataset.idx = i;
        upBtn.title = 'Sposta su'; upBtn.textContent = '▲'; upBtn.disabled = (i === 0);
        const downBtn = document.createElement('button');
        downBtn.type = 'button'; downBtn.className = 'bo-down'; downBtn.dataset.idx = i;
        downBtn.title = 'Sposta giù'; downBtn.textContent = '▼'; downBtn.disabled = (i === lastIdx);
        arrowsSpan.append(upBtn, downBtn);

        li.append(handleSpan, idxSpan, nameSpan, ySpan, arrowsSpan);

        li.addEventListener('dragstart', e => {
            _dragSrcIdx = i;
            li.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });
        li.addEventListener('dragend', () => {
            li.classList.remove('dragging');
            boardOrderList.querySelectorAll('.board-order-row').forEach(r => r.classList.remove('drag-over'));
        });
        li.addEventListener('dragover', e => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            boardOrderList.querySelectorAll('.board-order-row').forEach(r => r.classList.remove('drag-over'));
            li.classList.add('drag-over');
        });
        li.addEventListener('drop', e => {
            e.preventDefault();
            const toIdx = Number(li.dataset.idx);
            if (_dragSrcIdx !== null && _dragSrcIdx !== toIdx) {
                editor.reorderSection(_dragSrcIdx, toIdx);
                _rebuildBoardOrderList();
            }
            _dragSrcIdx = null;
        });

        boardOrderList.appendChild(li);
    });

    // Arrow buttons
    boardOrderList.querySelectorAll('.bo-up').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = Number(btn.dataset.idx);
            editor.reorderSection(idx, idx - 1);
            _rebuildBoardOrderList();
        });
    });
    boardOrderList.querySelectorAll('.bo-down').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = Number(btn.dataset.idx);
            editor.reorderSection(idx, idx + 1);
            _rebuildBoardOrderList();
        });
    });
}

document.getElementById('btn-board-order').addEventListener('click', () => {
    _rebuildBoardOrderList();
    boardOrderDialog.showModal();
});

document.getElementById('btn-board-save').addEventListener('click', async () => {
    if (!await gateExport('Save board.json')) return;
    const json = editor.exportBoardJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: 'board.json' });
    a.click();
    URL.revokeObjectURL(url);
    const btn = document.getElementById('btn-board-save');
    const orig = btn.textContent;
    btn.textContent = '✓ Saved!';
    setTimeout(() => { btn.textContent = orig; }, 1500);
});

// ── Keyboard shortcuts ────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

    const keyBindings = {
        'ctrl+z': () => editor.undo(),
        'ctrl+y': () => editor.redo(),
        'ctrl+shift+z': () => editor.redo(),
        'Delete': () => editor.deleteSelected(),
        'Backspace': () => editor.deleteSelected(),
        'Escape': () => {
            editor.deselect();
            editor.setTool('select');
        },
        'a': () => editor.setTool('add'),
        's': () => editor.setTool('select'),
        'd': () => editor.setTool('delete'),
        'ctrl+c': () => editor.copy(),
        'ctrl+v': () => editor.paste(),
        'ctrl+d': () => {
            editor.copy();
            editor.paste();
        },
    };

    const isCtrl = e.ctrlKey || e.metaKey;
    const calculatedKey = `ctrl+${e.shiftKey ? 'shift+' : ''}${e.key.toLowerCase()}`;
    const key = isCtrl ? calculatedKey : e.key;
    const handler = keyBindings[key];

    if (handler) {
        e.preventDefault();
        handler();
    }
});

// ── Online integration: Test, Save Online, My Boards ─────────────────────────

/**
 * Build the BoardPayload (matching backend schema) from the current editor state.
 * Validates first; throws if invalid (caller should catch).
 */
function buildPayloadFromEditor() {
    const result = editor.validate();
    if (result.errors.length > 0) {
        const lines = result.errors.map(e => `  • ${e.msg}`).join('\n');
        throw new Error(`Validation failed:\n${lines}`);
    }
    const sections = {};
    for (const key of editor.levelKeys) {
        sections[key] = JSON.parse(editor.exportJson(key));
    }
    return {
        board: { sections: [...editor.levelKeys] },
        sections,
    };
}

// ── UI helpers (replace sandboxed alert/confirm) ─────────────────────────────

/**
 * Show a non-blocking toast message (error or success).
 * @param {string} msg
 * @param {'error'|'success'|'info'} [kind='error']
 */
function _toast(msg, kind = 'error') {
    const el = document.createElement('div');
    el.className = `editor-toast editor-toast--${kind}`;
    el.textContent = msg;
    document.body.appendChild(el);
    // Force reflow for the CSS transition
    // eslint-disable-next-line no-unused-expressions
    el.getBoundingClientRect();
    el.classList.add('editor-toast--visible');
    setTimeout(() => {
        el.classList.remove('editor-toast--visible');
        el.addEventListener('transitionend', () => el.remove(), { once: true });
    }, 4000);
}

/**
 * Promise-based confirm dialog using <dialog>, sandboxing-safe.
 * @param {string} msg
 * @returns {Promise<boolean>}
 */
function _confirm(msg) {
    return new Promise(resolve => {
        const dlg = document.createElement('dialog');
        dlg.className = 'editor-confirm-dialog';
        const p = document.createElement('p');
        p.textContent = msg;
        const actions = document.createElement('div');
        actions.className = 'editor-confirm-actions';
        const ok  = document.createElement('button');
        ok.textContent  = 'OK';
        ok.className    = 'editor-confirm-ok';
        const cancel = document.createElement('button');
        cancel.textContent = 'Cancel';
        cancel.className   = 'editor-confirm-cancel';
        actions.append(ok, cancel);
        dlg.append(p, actions);
        document.body.appendChild(dlg);
        dlg.showModal();
        ok.addEventListener('click', () => { dlg.close(); dlg.remove(); resolve(true); });
        cancel.addEventListener('click', () => { dlg.close(); dlg.remove(); resolve(false); });
        dlg.addEventListener('cancel', () => { dlg.remove(); resolve(false); });
    });
}

const _testRunner = new TestRunner();
const _api = new EditorBoardApi();

document.getElementById('btn-test-online').addEventListener('click', () => {
    try {
        const payload = buildPayloadFromEditor();
        _testRunner.open(payload);
    } catch (err) {
        _toast(err.message);
    }
});

document.getElementById('btn-my-boards').addEventListener('click', async () => {
    const panel = new MyBoardsPanel();
    const picked = await panel.open();
    if (!picked) return;
    const ok = await _confirm(
        `Load "${picked.name}" into the editor? Unsaved local changes will be lost.`
    );
    if (!ok) return;
    // Hard reload with a hash so we could enrich UX later; simplest path:
    const url = new URL(globalThis.location.href);
    url.searchParams.set('boardId', String(picked.board_id));
    globalThis.location.assign(url.toString());
});

// ── Save Online dialog ───────────────────────────────────────────────────────
const saveDialog   = document.getElementById('save-online-dialog');
const saveForm     = document.getElementById('save-online-form');
const saveName     = document.getElementById('so-name');
const saveMode     = document.getElementById('so-mode');
const saveExisting = document.getElementById('so-existing');
const saveExistingLabel = document.getElementById('so-existing-label');

async function _populateExisting() {
    saveExisting.replaceChildren();
    try {
        const items = await _api.listMine();
        if (!items?.length) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = '(no saved boards)';
            saveExisting.append(opt);
            return;
        }
        for (const it of items) {
            const opt = document.createElement('option');
            opt.value = String(it.board_id);
            opt.textContent = `${it.name} (♥ ${it.like_count ?? 0})`;
            saveExisting.append(opt);
        }
    } catch (err) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = err.status === 401 ? '(login required)' : `(error: ${err.message})`;
        saveExisting.append(opt);
    }
}

document.getElementById('btn-save-online').addEventListener('click', async () => {
    try {
        buildPayloadFromEditor();  // early validation
    } catch (err) {
        _toast(err.message);
        return;
    }
    saveName.value = '';
    if (REMOTE_BOARD_ID === null) {
        saveMode.value = 'new';
        saveExisting.hidden = true;
        saveExistingLabel.hidden = true;
    } else {
        saveMode.value = 'overwrite';
        saveExisting.hidden = false;
        saveExistingLabel.hidden = false;
        await _populateExisting();
        // Pre-select the currently-loaded remote board
        if ([...saveExisting.options].some(o => o.value === String(REMOTE_BOARD_ID))) {
            saveExisting.value = String(REMOTE_BOARD_ID);
        }
    }
    saveDialog.showModal();
});

saveMode.addEventListener('change', async () => {
    const overwrite = saveMode.value === 'overwrite';
    saveExisting.hidden = !overwrite;
    saveExistingLabel.hidden = !overwrite;
    if (overwrite) await _populateExisting();
});

document.getElementById('so-cancel').addEventListener('click', () => saveDialog.close());

saveForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    let payload;
    try { payload = buildPayloadFromEditor(); }
    catch (err) { _toast(err.message); return; }

    const name = saveName.value.trim();
    if (!name) return;

    const submitBtn = document.getElementById('so-save');
    submitBtn.disabled = true;
    try {
        if (saveMode.value === 'overwrite' && saveExisting.value) {
            await _api.updateBoard(saveExisting.value, name, payload);
        } else {
            await _api.createBoard(name, payload);
        }
        saveDialog.close();
        const btn = document.getElementById('btn-save-online');
        const orig = btn.textContent;
        btn.textContent = '✓ Saved!';
        setTimeout(() => { btn.textContent = orig; }, 1500);
    } catch (err) {
        const hint = _saveErrorHint(err);
        _toast(`Save failed: ${err.message}${hint}`);
    } finally {
        submitBtn.disabled = false;
    }
});

function _saveErrorHint(err) {
    if (err.status === 401) return ' (login required)';
    if (err.status === 409) return ' (max 10 boards reached — overwrite one instead)';
    return '';
}

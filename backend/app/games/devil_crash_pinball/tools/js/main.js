import { LevelEditor }      from './LevelEditor.js';
import { LevelCanvas }      from './LevelCanvas.js';
import { EntityInspector }  from './EntityInspector.js';
import { Toolbar }          from './Toolbar.js';
import { setLevelKeys }     from './EntityDefs.js';

// ── Security helpers ──────────────────────────────────────────────────────────
const VALID_LEVEL_KEY_RE = /^[a-zA-Z0-9_-]+$/;
function validateKey(key) {
    if (typeof key !== 'string' || !VALID_LEVEL_KEY_RE.test(key)) {
        throw new Error('Invalid level key');
    }
    return key;
}

const BASE_URL = '../data/levels';

// ── Load board.json, then all section configs ────────────────────────────────
let LEVEL_KEYS, configs;
try {
    const boardRes = await fetch(`${BASE_URL}/board.json`);
    if (!boardRes.ok) throw new Error(`HTTP ${boardRes.status} for board.json`);
    const board = await boardRes.json();
    LEVEL_KEYS = board.sections ?? [];

    const entries = await Promise.all(
        LEVEL_KEYS.map(async key => {
            const res = await fetch(`${BASE_URL}/${encodeURIComponent(validateKey(key))}.json`);
            if (!res.ok) throw new Error(`HTTP ${res.status} for ${key}.json`);
            return [key, await res.json()];
        })
    );
    configs = Object.fromEntries(entries);
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
document.getElementById('btn-export').addEventListener('click', () => {
    const json = editor.exportJson();
    const key  = editor.currentLevel;
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: `${key}.json` });
    a.click();
    URL.revokeObjectURL(url);
});

document.getElementById('btn-copy').addEventListener('click', async () => {
    const json = editor.exportJson();
    await navigator.clipboard.writeText(json);
    const copyBtn = document.getElementById('btn-copy');
    const orig = copyBtn.textContent;
    copyBtn.textContent = '✓ Copied!';
    setTimeout(() => { copyBtn.textContent = orig; }, 1500);
});

// ── Export All (every section + board.json) ───────────────────────────────────
document.getElementById('btn-export-board').addEventListener('click', () => {
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
        alert(`Section '${key}' already exists.`);
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
        alert(err.message);
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

document.getElementById('btn-board-save').addEventListener('click', () => {
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

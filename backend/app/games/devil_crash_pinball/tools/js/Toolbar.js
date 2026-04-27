import { EntityDefs, ENTITY_TYPE_ORDER } from './EntityDefs.js';

/**
 * Toolbar: level tabs, tool mode buttons, entity type palette, snap controls,
 * undo/redo buttons, and export actions.
 */
export class Toolbar {
    /** @type {HTMLElement} */
    #panel;
    /** @type {import('./LevelEditor.js').LevelEditor} */
    #editor;

    constructor(panel, editor) {
        this.#panel = panel;
        this.#editor = editor;

        this.#build();
        editor.on('toolChange',      () => this.#syncToolButtons());
        editor.on('levelChange',     () => this.#syncLevelTabs());
        editor.on('historyChange',   () => this.#syncHistoryButtons());
        editor.on('selectionChange', () => this.#syncClipboardButtons());
        editor.on('clipboardChange', () => this.#syncClipboardButtons());
    }

    // ─── Build ────────────────────────────────────────────────────────────────

    #build() {
        this.#panel.innerHTML = '';

        // ── Tools ──────────────────────────────────────────────────────────
        const toolSection = this.#section('Tools');
        for (const { id, label, title } of [
            { id: 'select', label: '↖ Select',  title: 'Select & drag entities' },
            { id: 'add',    label: '＋ Add',    title: 'Click canvas to add entity' },
            { id: 'delete', label: '✕ Delete',  title: 'Click entity to delete' },
        ]) {
            const btn = document.createElement('button');
            btn.className = 'tool-btn';
            btn.dataset.tool = id;
            btn.textContent = label;
            btn.title = title;
            btn.addEventListener('click', () => this.#editor.setTool(id));
            toolSection.appendChild(btn);
        }
        this.#panel.appendChild(toolSection);

        // ── Entity palette ─────────────────────────────────────────────────
        const paletteSection = this.#section('Add Entity');
        paletteSection.id = 'entity-palette';
        for (const typeName of ENTITY_TYPE_ORDER) {
            const def = EntityDefs[typeName];
            const btn = document.createElement('button');
            btn.className = 'entity-btn';
            btn.dataset.entityType = typeName;
            btn.title = def.label;
            btn.innerHTML = `<span class="dot" style="background:${def.color}"></span>${def.label}`;
            btn.addEventListener('click', () => {
                this.#editor.setActiveEntityType(typeName);
                this.#editor.setTool('add');
                this.#syncEntityButtons();
            });
            paletteSection.appendChild(btn);
        }
        this.#panel.appendChild(paletteSection);

        // ── Snap ───────────────────────────────────────────────────────────
        const snapSection = this.#section('Snap');
        const snapRow = document.createElement('div');
        snapRow.className = 'snap-row';
        const snapCheck = document.createElement('input');
        snapCheck.type = 'checkbox';
        snapCheck.id = 'snap-enable';
        snapCheck.checked = this.#editor.snapEnabled;
        const snapLabel = document.createElement('label');
        snapLabel.htmlFor = 'snap-enable';
        snapLabel.textContent = 'Enable';
        const gridInput = document.createElement('input');
        gridInput.type = 'number';
        gridInput.id = 'snap-grid';
        gridInput.value = this.#editor.snapGrid;
        gridInput.min = 1;
        gridInput.max = 50;
        gridInput.title = 'Grid size (px)';
        gridInput.className = 'snap-grid-input';
        const gridLabel = document.createElement('label');
        gridLabel.htmlFor = 'snap-grid';
        gridLabel.textContent = 'px';

        snapCheck.addEventListener('change', () => {
            this.#editor.setSnap(snapCheck.checked, Number(gridInput.value));
        });
        gridInput.addEventListener('change', () => {
            this.#editor.setSnap(snapCheck.checked, Number(gridInput.value));
        });

        snapRow.appendChild(snapCheck);
        snapRow.appendChild(snapLabel);
        snapRow.appendChild(gridInput);
        snapRow.appendChild(gridLabel);
        snapSection.appendChild(snapRow);
        this.#panel.appendChild(snapSection);

        // ── Clipboard ─────────────────────────────────────────────────────────
        const clipSection = this.#section('Clipboard');
        const copyBtn = document.createElement('button');
        copyBtn.id        = 'tb-copy-entity';
        copyBtn.className = 'tool-btn';
        copyBtn.textContent = '⎘ Copy';
        copyBtn.title     = 'Copy selected entity (Ctrl+C)';
        copyBtn.disabled  = true;
        copyBtn.addEventListener('click', () => this.#editor.copy());
        const pasteBtn = document.createElement('button');
        pasteBtn.id        = 'tb-paste-entity';
        pasteBtn.className = 'tool-btn';
        pasteBtn.textContent = '⎙ Paste';
        pasteBtn.title     = 'Paste entity (+20px offset) (Ctrl+V)';
        pasteBtn.disabled  = true;
        pasteBtn.addEventListener('click', () => this.#editor.paste());
        clipSection.appendChild(copyBtn);
        clipSection.appendChild(pasteBtn);
        this.#panel.appendChild(clipSection);

        this.#syncToolButtons();
        this.#syncEntityButtons();
        this.#syncClipboardButtons();
    }

    #section(title) {
        const div = document.createElement('div');
        div.className = 'toolbar-section';
        const h = document.createElement('div');
        h.className = 'toolbar-section-title';
        h.textContent = title;
        div.appendChild(h);
        return div;
    }

    // ─── Sync helpers ─────────────────────────────────────────────────────────

    #syncToolButtons() {
        const tool = this.#editor.activeTool;
        this.#panel.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === tool);
        });
        this.#syncEntityButtons();
    }

    #syncEntityButtons() {
        const tool = this.#editor.activeTool;
        const active = this.#editor.activeEntityType;
        const palette = this.#panel.querySelector('#entity-palette');
        if (!palette) return;
        palette.querySelectorAll('.entity-btn').forEach(btn => {
            btn.classList.toggle('active', tool === 'add' && btn.dataset.entityType === active);
        });
    }

    #syncLevelTabs() {
        document.querySelectorAll('.level-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.level === this.#editor.currentLevel);
        });
    }

    #syncHistoryButtons() {
        const undoBtn = document.getElementById('btn-undo');
        const redoBtn = document.getElementById('btn-redo');
        if (undoBtn) undoBtn.disabled = !this.#editor.canUndo;
        if (redoBtn) redoBtn.disabled = !this.#editor.canRedo;
    }

    #syncClipboardButtons() {
        const copyBtn  = this.#panel.querySelector('#tb-copy-entity');
        const pasteBtn = this.#panel.querySelector('#tb-paste-entity');
        if (copyBtn)  copyBtn.disabled  = !this.#editor.selection;
        if (pasteBtn) pasteBtn.disabled = !this.#editor.hasClipboard;
    }
}

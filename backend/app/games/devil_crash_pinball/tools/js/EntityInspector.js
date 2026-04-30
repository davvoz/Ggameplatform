import { EntityDefs } from './EntityDefs.js';

/** Ordered list of available audio profile IDs — mirrors SoundManager.PROFILES keys. */
const AUDIO_PROFILE_IDS = [
    'inferno',
    'abyss',
    'crystal_vault',
    'ritual_chamber',
    'demon_forge',
];

/**
 * Right-side panel: shows and edits the properties of the selected entity.
 */
export class EntityInspector {
    /** @type {HTMLElement} */
    #panel;
    /** @type {import('./LevelEditor.js').LevelEditor} */
    #editor;

    constructor(panel, editor) {
        this.#panel = panel;
        this.#editor = editor;

        editor.on('selectionChange', () => this.refresh());
        editor.on('entityChange', (e) => {
            // Only re-render the form on undo/redo or add; on drag 'move' just update number inputs
            if (e.action === 'move') {
                this.#updatePositionInputs();
            } else {
                this.refresh();
            }
        });
        editor.on('levelChange', () => this.refresh());
    }

    refresh() {
        const sel = this.#editor.selection;
        if (!sel) {
            this.#renderEmpty();
            return;
        }
        const entity = this.#editor.getSelectedEntity();
        if (!entity) { this.#renderEmpty(); return; }
        const def = EntityDefs[sel.type];
        this.#renderEntityForm(def, entity, sel);
    }

    // ─── Rendering ────────────────────────────────────────────────────────────

    #renderEmpty() {
        this.#panel.innerHTML = `
            <div class="inspector-header">Inspector</div>
            <div class="inspector-empty">Select an entity on the canvas.<br><br>
            <span class="hint">
              • Click to select<br>
              • Drag to move<br>
              • DEL to delete<br>
              • Right-click to deselect
            </span></div>`;
        this.#renderLevelMeta();
    }

    #renderLevelMeta() {
        const cfg      = this.#editor.getConfig();
        const boardPos = this.#editor.levelKeys.indexOf(this.#editor.currentLevel);
        const meta = document.createElement('div');
        meta.className = 'inspector-meta';
        meta.innerHTML = `
            <div class="meta-title">Level Info</div>
            <div class="meta-row"><span>section</span><span>${cfg.section ?? '—'}</span></div>
            <div class="meta-row"><span>board pos</span><span>[${boardPos}] Y ${boardPos * 720}–${(boardPos + 1) * 720}</span></div>
        `;
        meta.appendChild(this.#buildAudioProfileRow(cfg));
        this.#panel.appendChild(meta);

        // Boss editor
        this.#panel.appendChild(this.#buildBossSection(cfg));

        // Palette editor (inline object since refactor)
        if (cfg.palette && typeof cfg.palette === 'object') {
            this.#panel.appendChild(this.#buildPaletteSection(cfg));
        }
    }

    /** Builds the boss configuration sub-section for the Level Info panel. */
    #buildBossSection(cfg) {
        const BOSS_TYPES = ['none', 'DemonBoss', 'DragonBoss', 'GolemBoss', 'WitchBoss'];
        const KILL_EVENTS = {
            DemonBoss:  'demon_kill',
            DragonBoss: 'dragon_kill',
            GolemBoss:  'golem_kill',
            WitchBoss:  'witch_kill',
        };

        const section = document.createElement('div');
        section.className = 'inspector-meta';
        section.innerHTML = '<div class="meta-title">Boss</div>';

        const boss = cfg.boss ?? null;
        const currentType = boss?.type ?? 'none';

        // ── Type selector ──
        const typeRow = document.createElement('div');
        typeRow.className = 'meta-row brick-row';
        typeRow.innerHTML = '<label for="boss-type">type</label>';
        const typeSel = document.createElement('select');
        typeSel.id = 'boss-type';
        typeSel.style.width = '120px';
        for (const t of BOSS_TYPES) {
            const opt = document.createElement('option');
            opt.value = t;
            opt.textContent = t === 'none' ? '— none —' : t.replace('Boss', '');
            if (t === currentType) opt.selected = true;
            typeSel.appendChild(opt);
        }
        typeRow.appendChild(typeSel);
        section.appendChild(typeRow);

        // ── Dynamic fields (rebuilt when type changes) ──
        const dynamicArea = document.createElement('div');
        section.appendChild(dynamicArea);

        const rebuildDynamic = () => {
            dynamicArea.innerHTML = '';
            const t = typeSel.value;
            if (t === 'none') return;

            const b = cfg.boss ?? {};

            // enabled toggle
            const enabledRow = document.createElement('div');
            enabledRow.className = 'meta-row brick-row';
            enabledRow.innerHTML = '<label for="boss-enabled">enabled</label>';
            const enabledCb = document.createElement('input');
            enabledCb.type = 'checkbox';
            enabledCb.id = 'boss-enabled';
            enabledCb.checked = b.enabled !== false;
            enabledCb.addEventListener('change', () => {
                this.#editor.updateBossField('enabled', enabledCb.checked ? undefined : false);
            });
            enabledRow.appendChild(enabledCb);
            dynamicArea.appendChild(enabledRow);

            // killEvent
            const killRow = document.createElement('div');
            killRow.className = 'meta-row brick-row';
            killRow.innerHTML = '<label for="boss-killevent">killEvent</label>';
            const killInp = document.createElement('input');
            killInp.type = 'text';
            killInp.id = 'boss-killevent';
            killInp.style.width = '110px';
            killInp.value = b.killEvent ?? KILL_EVENTS[t] ?? '';
            killInp.addEventListener('change', () => {
                this.#editor.updateBossField('killEvent', killInp.value.trim() || undefined);
            });
            killRow.appendChild(killInp);
            dynamicArea.appendChild(killRow);

            // x / y
            for (const coord of ['x', 'y']) {
                const row = document.createElement('div');
                row.className = 'meta-row brick-row';
                row.innerHTML = `<label for="boss-${coord}">${coord}</label>`;
                const inp = document.createElement('input');
                inp.type = 'number';
                inp.id = `boss-${coord}`;
                inp.value = b[coord] ?? 240;
                inp.step = 1;
                inp.style.width = '70px';
                inp.addEventListener('change', () => {
                    this.#editor.updateBossField(coord, Number(inp.value));
                });
                row.appendChild(inp);
                dynamicArea.appendChild(row);
            }

            // radius (DragonBoss only)
            if (t === 'DragonBoss') {
                const rRow = document.createElement('div');
                rRow.className = 'meta-row brick-row';
                rRow.innerHTML = '<label for="boss-radius">radius</label>';
                const rInp = document.createElement('input');
                rInp.type = 'number';
                rInp.id = 'boss-radius';
                rInp.value = b.radius ?? 130;
                rInp.step = 1;
                rInp.style.width = '70px';
                rInp.addEventListener('change', () => {
                    this.#editor.updateBossField('radius', Number(rInp.value));
                });
                rRow.appendChild(rInp);
                dynamicArea.appendChild(rRow);
            }
        };

        typeSel.addEventListener('change', () => {
            const t = typeSel.value;
            this.#editor.snapshotBeforeDrag();
            if (t === 'none') {
                this.#editor.removeBoss();
            } else {
                const KILL_EVENTS_MAP = { DemonBoss: 'demon_kill', DragonBoss: 'dragon_kill', GolemBoss: 'golem_kill', WitchBoss: 'witch_kill' };
                const existing = cfg.boss ?? {};
                this.#editor.setBoss({
                    ...( existing.type === t ? existing : {} ),
                    type: t,
                    killEvent: existing.killEvent ?? KILL_EVENTS_MAP[t],
                    x: existing.x ?? 240,
                    y: existing.y ?? 240,
                    ...(t === 'DragonBoss' ? { radius: existing.radius ?? 130 } : {}),
                    ...(t === 'WitchBoss'  ? { anchors: existing.anchors ?? [{ x: 240, y: 120 }, { x: 120, y: 220 }, { x: 360, y: 220 }, { x: 240, y: 320 }] } : {}),
                });
            }
            rebuildDynamic();
        });

        rebuildDynamic();
        return section;
    }

    /** Builds the audio-profile selector row for the Level Info panel. */
    #buildAudioProfileRow(cfg) {
        const row = document.createElement('div');
        row.className = 'meta-row brick-row';

        const label = document.createElement('label');
        label.htmlFor = 'meta-audio-profile';
        label.textContent = 'audio profile';

        const sel = document.createElement('select');
        sel.id    = 'meta-audio-profile';
        sel.style.width = '130px';
        const current = cfg.audioProfile ?? 'inferno';
        for (const id of AUDIO_PROFILE_IDS) {
            const opt = document.createElement('option');
            opt.value       = id;
            opt.textContent = id;
            if (id === current) opt.selected = true;
            sel.appendChild(opt);
        }
        sel.addEventListener('change', () => {
            cfg.audioProfile = sel.value;
            this.#editor.snapshotBeforeDrag();
        });

        row.appendChild(label);
        row.appendChild(sel);
        return row;
    }

    /** Build an editable palette sub-section for the Level Info panel. */
    #buildPaletteSection(cfg) {
        const COLOR_KEYS = new Set(['bg', 'bgTop', 'wall', 'wallGlow', 'accent', 'accent2']);
        const section = document.createElement('div');
        section.className = 'inspector-meta';
        section.innerHTML = `<div class="meta-title">Palette</div>`;
        for (const [k, v] of Object.entries(cfg.palette)) {
            const isColor = COLOR_KEYS.has(k);
            const row = document.createElement('div');
            row.className = 'meta-row brick-row';
            row.innerHTML = `<label for="pal_${k}">${k}</label>
                <input id="pal_${k}" type="${isColor ? 'color' : 'text'}" value="${v}"
                    style="width:${isColor ? '42px' : '90px'}">`;  
            section.appendChild(row);
        }
        section.querySelectorAll('input').forEach(input => {
            input.addEventListener('change', () => {
                cfg.palette[input.id.replace('pal_', '')] = input.value;
                this.#editor.snapshotBeforeDrag();
            });
        });
        return section;
    }

    #renderEntityForm(def, entity, sel) {
        this.#panel.innerHTML = '';
        const header = document.createElement('div');
        header.className = 'inspector-header';
        header.innerHTML = `
            <span class="dot" style="background:${def.color}"></span>
            ${def.label} <span class="index">#${sel.index}</span>
            <button class="btn-delete-sel" title="Delete (Del)">✕</button>`;
        header.querySelector('.btn-delete-sel').addEventListener('click', () => {
            this.#editor.deleteSelected();
        });
        this.#panel.appendChild(header);

        const form = document.createElement('div');
        form.className = 'inspector-form';
        form.id = 'inspector-form';

        // Fallback values for fields missing on legacy entities (e.g. radius
        // added after the JSON was authored). We read them from the def's
        // defaults() so the inspector always shows an editable value.
        const defaults = (typeof def.defaults === 'function') ? def.defaults() : {};

        for (const fieldDef of def.fields) {
            const { name, type, step, options } = fieldDef;
            let value = entity[name];
            if (value === undefined) value = defaults[name];
            if (value === undefined) continue;

            const row = document.createElement('div');
            row.className = 'field-row';
            row.dataset.field = name;

            const label = document.createElement('label');
            label.textContent = name;
            label.htmlFor = `f_${name}`;
            row.appendChild(label);

            let input;
            if (type === 'checkbox') {
                input = document.createElement('input');
                input.type = 'checkbox';
                input.id = `f_${name}`;
                input.checked = Boolean(value);
                input.addEventListener('change', () => {
                    this.#editor.updateField(name, input.checked);
                });
            } else if (type === 'select') {
                input = document.createElement('select');
                input.id = `f_${name}`;
                (options ?? []).forEach(opt => {
                    const o = document.createElement('option');
                    o.value = opt;
                    o.textContent = opt;
                    if (String(value) === String(opt)) o.selected = true;
                    input.appendChild(o);
                });
                input.addEventListener('change', () => {
                    // Preserve original type (number vs string)
                    const raw = input.value;
                    const parsed = Number(raw);
                    const coerced = Number.isNaN(parsed) ? raw : parsed;
                    this.#editor.updateField(name, coerced);
                });
            } else {
                input = document.createElement('input');
                input.type = 'number';
                input.id = `f_${name}`;
                input.value = value;
                input.step = step ?? 1;
                input.addEventListener('change', () => {
                    this.#editor.updateField(name, Number(input.value));
                });
            }

            row.appendChild(input);
            form.appendChild(row);
        }

        this.#panel.appendChild(form);
        if (sel.type === 'warp') {
            const cfg      = this.#editor.getConfig();
            const warpCfg  = cfg.warps?.[sel.index];
            const warpName = warpCfg?.name ?? sel.index;
            this.#renderWarpExitsPanel(warpName, cfg.section ?? this.#editor.currentLevel);
        }
        this.#renderLevelMeta();
    }

    /**
     * Renders the cross-section "Warp Destination" panel below the warp form.
     * Each warp has exactly one exit. Shows the exit's fields (if configured)
     * or an Add button (if not yet configured).
     */
    #renderWarpExitsPanel(warpName, sectionName) {
        const exits   = this.#editor.getExitsForSection(sectionName);
        const matched = exits[0] ?? null;   // at most one
        const allKeys = this.#editor.levelKeys;

        const panel = document.createElement('div');
        panel.className = 'inspector-meta warp-exits-panel';

        const title = document.createElement('div');
        title.className = 'meta-title';
        title.textContent = `Warp "${warpName}" — destination`;
        panel.appendChild(title);

        if (matched) {
            const { levelKey, exitIndex, exit } = matched;

            const block = document.createElement('div');
            block.className = 'warp-exit-block';

            const hdr = document.createElement('div');
            hdr.className = 'warp-exit-block-header';
            const lbl = document.createElement('span');
            lbl.className = 'warp-exit-target';
            lbl.textContent = `→ ${levelKey}`;
            const btnDel = document.createElement('button');
            btnDel.className = 'btn-del-exit';
            btnDel.title = 'Delete exit';
            btnDel.textContent = '✕';
            btnDel.addEventListener('click', () => this.#editor.deleteWarpExit(levelKey, exitIndex));
            hdr.appendChild(lbl);
            hdr.appendChild(btnDel);
            block.appendChild(hdr);

            for (const f of ['x', 'y', 'vx', 'vy']) {
                const row = document.createElement('div');
                row.className = 'field-row';
                const fl = document.createElement('label');
                fl.textContent = f;
                const inp = document.createElement('input');
                inp.type  = 'number';
                inp.value = exit[f];
                inp.step  = 1;
                inp.addEventListener('change', () =>
                    this.#editor.updateWarpExit(levelKey, exitIndex, f, Number(inp.value)));
                row.appendChild(fl);
                row.appendChild(inp);
                block.appendChild(row);
            }
            panel.appendChild(block);
        } else {
            // No exit yet — show the Add control.
            const addBlock = document.createElement('div');
            addBlock.className = 'warp-exit-add';

            const targetSel = document.createElement('select');
            targetSel.className = 'warp-exit-target-sel';
            const srcBoardIdx  = allKeys.indexOf(sectionName);
            const defaultTarget = srcBoardIdx > 0 ? allKeys[srcBoardIdx - 1] : allKeys[0];
            for (const key of allKeys) {
                const opt = document.createElement('option');
                opt.value = key;
                opt.textContent = key;
                if (key === defaultTarget) opt.selected = true;
                targetSel.appendChild(opt);
            }
            const addBtn = document.createElement('button');
            addBtn.className = 'btn-add-exit';
            addBtn.textContent = '+ Add Exit';
            addBtn.addEventListener('click', () => {
                const exitData = { fromSection: sectionName, x: 240, y: 360, vx: 0, vy: -650 };
                this.#editor.addWarpExit(targetSel.value, exitData);
            });
            addBlock.appendChild(targetSel);
            addBlock.appendChild(addBtn);
            panel.appendChild(addBlock);
        }

        this.#panel.appendChild(panel);
    }

    // Updates only x/y inputs during drag to avoid rebuilding the entire form
    #updatePositionInputs() {
        const sel = this.#editor.selection;
        if (!sel) return;
        const entity = this.#editor.getSelectedEntity();
        if (!entity) return;

        const posFields = ['x', 'y', 'ax', 'ay', 'bx', 'by', 'cx', 'cy', 'x1', 'x2',
                           'angleDeg', 'length', 'width', 'radius',
                           'midRadius', 'startAngleDeg', 'angularSpanDeg',
                           'startAngle', 'endAngle'];
        for (const field of posFields) {
            if (entity[field] === undefined) continue;
            const input = this.#panel.querySelector(`#f_${field}`);
            if (input && document.activeElement !== input) {
                input.value = entity[field];
            }
        }
    }
}

import { EntityDefs, ENTITY_TYPE_ORDER } from './EntityDefs.js';

const BOSS_COLORS = {
    DemonBoss:  '#ff2222',
    DragonBoss: '#ff8800',
    GolemBoss:  '#888888',
    WitchBoss:  '#ff44ff',
};

const EP_RADIUS = 10; // px — endpoint hit test radius

/**
 * Manages the canvas: rendering + mouse interaction.
 * Calls back into LevelEditor for all state mutations.
 */
export class LevelCanvas {
    /** @type {HTMLCanvasElement} */
    #canvas;
    /** @type {CanvasRenderingContext2D} */
    #ctx;
    /** @type {import('./LevelEditor.js').LevelEditor} */
    #editor;
    /** @type {HTMLElement} */
    #posLabel;

    // Drag state
    #drag = null;
    // { mode: 'move'|'ep_a'|'ep_b', snapshotted: boolean }

    // Hover state for endpoint / generic handle highlighting
    #hoverEndpoint = null; // 'a' | 'b' | null
    #hoverHandle   = null; // handle id string | null

    constructor(canvas, editor) {
        this.#canvas = canvas;
        this.#ctx = canvas.getContext('2d');
        this.#editor = editor;
        this.#posLabel = document.getElementById('cursor-pos');
        this.#bindEvents();

        editor.on('entityChange', () => this.render());
        editor.on('levelChange', () => this.render());
        editor.on('selectionChange', () => this.render());
    }

    render() {
        const ctx = this.#ctx;
        const cfg = this.#editor.getConfig();
        ctx.clearRect(0, 0, 480, 720);

        // Background
        ctx.fillStyle = '#100010';
        ctx.fillRect(0, 0, 480, 720);

        // Optional grid
        if (this.#editor.snapEnabled) {
            this.#drawGrid(ctx);
        }

        this.#renderAllEntities(ctx, cfg);
        this.#renderBoss(ctx, cfg);
    }

    // ─── Rendering ────────────────────────────────────────────────────────────

    #drawGrid(ctx) {
        const g = this.#editor.snapGrid;
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= 480; x += g) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 720); ctx.stroke();
        }
        for (let y = 0; y <= 720; y += g) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(480, y); ctx.stroke();
        }
    }

    #renderAllEntities(ctx, cfg) {
        const sel = this.#editor.selection;
        for (const typeName of ENTITY_TYPE_ORDER) {
            const def = EntityDefs[typeName];
            const arr = cfg[def.key];
            if (!Array.isArray(arr)) continue;
            arr.forEach((entity, i) => {
                const isSelected = sel?.type === typeName && sel?.index === i;
                def.render(ctx, entity, isSelected);
                if (isSelected) this.#drawSelectionOverlay(ctx, def, entity);
            });
        }
    }

    /** Draws endpoint hover highlight and generic handle circles for the selected entity. */
    #drawSelectionOverlay(ctx, def, entity) {
        // Endpoint hover highlight for line entities
        if (def.isLine && this.#hoverEndpoint) {
            const hep = this.#hoverEndpoint;
            ctx.beginPath();
            ctx.arc(
                hep === 'a' ? entity.ax : entity.bx,
                hep === 'a' ? entity.ay : entity.by,
                EP_RADIUS, 0, Math.PI * 2
            );
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        // Generic handles (corridor endpoints, curvedCorridor arc handles, …)
        if (def.handles) {
            for (const h of def.handles.get(entity)) {
                ctx.beginPath();
                ctx.arc(h.x, h.y, EP_RADIUS, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0,0,0,0.55)';
                ctx.fill();
                ctx.strokeStyle = this.#hoverHandle === h.id ? '#ffff00' : def.color;
                ctx.lineWidth   = this.#hoverHandle === h.id ? 2.5 : 1.5;
                ctx.stroke();
            }
        }
    }

    #renderBoss(ctx, cfg) {
        const boss = cfg.boss;
        if (!boss) return;
        const disabled = boss.enabled === false;
        const baseColor = BOSS_COLORS[boss.type] ?? '#ff0000';
        const color = disabled ? '#555555' : baseColor;
        const sel = this.#editor.selection;
        const isSel = sel?.type === '_boss';

        if (boss.anchors) {
            this.#renderWitchBoss(ctx, boss, color, disabled, isSel, sel);
        } else {
            this.#renderSimpleBoss(ctx, boss, color, disabled, isSel);
        }
    }

    #renderWitchBoss(ctx, boss, color, disabled, isSel, sel) {
        boss.anchors.forEach((a, i) => {
            const isAnchorSel = isSel && sel.index === i;
            const stroke = (disabled || !isAnchorSel) ? color : '#ffffff';
            const fill   = (disabled || !isAnchorSel) ? color : '#ffffff';
            ctx.beginPath();
            ctx.arc(a.x, a.y, 14, 0, Math.PI * 2);
            ctx.strokeStyle = stroke;
            ctx.lineWidth = 1.5;
            ctx.setLineDash(disabled ? [4, 3] : []);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = `${color}44`;
            ctx.fill();
            ctx.fillStyle = fill;
            ctx.font = '9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`A${i}`, a.x, a.y + 4);
        });
    }

    #renderSimpleBoss(ctx, boss, color, disabled, isSel) {
        const x = boss.x ?? 240, y = boss.y ?? 240;
        const r = boss.radius ?? 18;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.setLineDash(disabled ? [5, 4] : []);
        ctx.strokeStyle = isSel ? '#ffffff' : color;
        ctx.lineWidth = isSel ? 2.5 : 1.5;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = isSel ? 'rgba(255,255,255,0.1)' : `${color}22`;
        ctx.fill();
        ctx.fillStyle = isSel ? '#ffffff' : color;
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(boss.type?.replace('Boss', '') ?? 'Boss', x, y + 4);
        if (disabled) {
            ctx.fillStyle = '#888888';
            ctx.font = '8px monospace';
            ctx.fillText('DISABLED', x, y + r + 11);
        }
    }

    // ─── Mouse events ─────────────────────────────────────────────────────────

    #bindEvents() {
        this.#canvas.addEventListener('mousedown', e => this.#onMouseDown(e));
        this.#canvas.addEventListener('mousemove', e => this.#onMouseMove(e));
        this.#canvas.addEventListener('mouseup',   e => this.#onMouseUp(e));
        this.#canvas.addEventListener('mouseleave', () => {
            this.#drag = null;
            this.#hoverEndpoint = null;
        });
        this.#canvas.addEventListener('contextmenu', e => {
            e.preventDefault();
            this.#editor.deselect();
        });
    }

    #canvasPos(e) {
        const rect = this.#canvas.getBoundingClientRect();
        const scaleX = 480 / rect.width;
        const scaleY = 720 / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top)  * scaleY,
        };
    }

    #onMouseDown(e) {
        if (e.button !== 0) return;
        const { x, y } = this.#canvasPos(e);
        const tool = this.#editor.activeTool;

        if (tool === 'add') {
            this.#editor.addEntity(this.#editor.activeEntityType, x, y);
            return;
        }
        if (this.#tryStartEndpointDrag(x, y, tool)) return;
        this.#handleHitOrDeselect(x, y, tool);
    }

    /** Starts endpoint or handle drag if pointer is near a handle of the selected entity. */
    #tryStartEndpointDrag(x, y, tool) {
        if (tool !== 'select') return false;
        const sel = this.#editor.selection;
        if (!sel) return false;
        const def = EntityDefs[sel.type];
        if (!def) return false;
        const entity = this.#editor.getSelectedEntity();
        if (!entity) return false;

        // isLine — classic ax/ay bx/by endpoint drag
        if (def.isLine) {
            if (Math.hypot(x - entity.ax, y - entity.ay) <= EP_RADIUS) {
                this.#editor.snapshotBeforeDrag();
                this.#drag = { mode: 'ep_a', snapshotted: true };
                return true;
            }
            if (Math.hypot(x - entity.bx, y - entity.by) <= EP_RADIUS) {
                this.#editor.snapshotBeforeDrag();
                this.#drag = { mode: 'ep_b', snapshotted: true };
                return true;
            }
        }

        // Generic handles (corridor, curvedCorridor, …)
        if (def.handles) {
            for (const h of def.handles.get(entity)) {
                if (Math.hypot(x - h.x, y - h.y) <= EP_RADIUS) {
                    this.#editor.snapshotBeforeDrag();
                    this.#drag = { mode: 'handle', handleId: h.id, snapshotted: true };
                    return true;
                }
            }
        }

        return false;
    }

    /** Hit-tests canvas and either selects/deletes the entity or deselects. */
    #handleHitOrDeselect(x, y, tool) {
        const hit = this.#hitTest(x, y);
        if (!hit) {
            this.#editor.deselect();
            return;
        }
        if (tool === 'delete') {
            this.#editor.select(hit.type, hit.index);
            this.#editor.deleteSelected();
            return;
        }
        this.#editor.select(hit.type, hit.index);
        this.#editor.snapshotBeforeDrag();
        this.#drag = { mode: 'move', snapshotted: true };
    }

    #onMouseMove(e) {
        const { x, y } = this.#canvasPos(e);

        // Update cursor position label
        if (this.#posLabel) {
            this.#posLabel.textContent = `${Math.round(x)}, ${Math.round(y)}`;
        }

        // Update cursor style
        this.#updateCursor(x, y);

        if (!this.#drag) return;

        if (this.#drag.mode === 'ep_a') {
            this.#editor.moveEndpoint('a', x, y);
        } else if (this.#drag.mode === 'ep_b') {
            this.#editor.moveEndpoint('b', x, y);
        } else if (this.#drag.mode === 'handle') {
            this.#editor.moveHandle(this.#drag.handleId, x, y);
        } else {
            this.#editor.moveSelected(x, y);
        }
    }

    #onMouseUp() {
        this.#drag = null;
    }

    #updateCursor(x, y) {
        const tool = this.#editor.activeTool;

        if (tool === 'add') { this.#canvas.style.cursor = 'crosshair'; return; }
        if (tool === 'delete') { this.#canvas.style.cursor = 'not-allowed'; return; }

        if (this.#updateEndpointHover(x, y)) return;
        this.#clearEndpointHoverIfNeeded();

        const hit = this.#hitTest(x, y);
        this.#canvas.style.cursor = hit ? 'grab' : 'default';
    }

    /** Checks endpoint / handle hover for the selected entity. Returns true if cursor was set. */
    #updateEndpointHover(x, y) {
        const sel = this.#editor.selection;
        const def = sel ? EntityDefs[sel.type] : null;
        if (!def) return false;
        const entity = this.#editor.getSelectedEntity();
        if (!entity) return false;

        // isLine endpoints
        if (def.isLine) {
            let ep = null;
            if (Math.hypot(x - entity.ax, y - entity.ay) <= EP_RADIUS) ep = 'a';
            else if (Math.hypot(x - entity.bx, y - entity.by) <= EP_RADIUS) ep = 'b';
            if (ep) {
                this.#hoverEndpoint = ep;
                this.#hoverHandle   = null;
                this.#canvas.style.cursor = 'move';
                this.render();
                return true;
            }
        }

        // Generic handles
        if (def.handles) {
            for (const h of def.handles.get(entity)) {
                if (Math.hypot(x - h.x, y - h.y) <= EP_RADIUS) {
                    this.#hoverHandle   = h.id;
                    this.#hoverEndpoint = null;
                    this.#canvas.style.cursor = 'move';
                    this.render();
                    return true;
                }
            }
        }

        return false;
    }

    #clearEndpointHoverIfNeeded() {
        if (this.#hoverEndpoint !== null || this.#hoverHandle !== null) {
            this.#hoverEndpoint = null;
            this.#hoverHandle   = null;
            this.render();
        }
    }

    // ─── Hit testing ──────────────────────────────────────────────────────────

    /**
     * Returns { type, index } for the topmost entity under (x, y), or null.
     * Tests in reverse-render order so topmost visually = topmost logically.
     */
    #hitTest(x, y) {
        const cfg = this.#editor.getConfig();
        // Test in reverse order of ENTITY_TYPE_ORDER for z-ordering
        for (let i = ENTITY_TYPE_ORDER.length - 1; i >= 0; i--) {
            const typeName = ENTITY_TYPE_ORDER[i];
            const def = EntityDefs[typeName];
            const arr = cfg[def.key];
            if (!Array.isArray(arr)) continue;
            for (let j = arr.length - 1; j >= 0; j--) {
                if (def.hitTest(arr[j], x, y)) {
                    return { type: typeName, index: j };
                }
            }
        }
        return null;
    }
}

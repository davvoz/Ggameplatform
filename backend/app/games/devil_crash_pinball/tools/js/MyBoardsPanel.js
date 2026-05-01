import { EditorBoardApi } from './EditorBoardApi.js';

/**
 * Modal panel listing the user's saved community boards.
 *
 * Lets the user pick one to load into the editor (replacing the working set)
 * or delete one. A click on a row resolves the panel with the selected board.
 *
 * The panel never mutates the editor model directly — it returns the chosen
 * board to the caller, which decides what to do.
 */
export class MyBoardsPanel {
    constructor() {
        this._api = new EditorBoardApi();
        this._dialog = null;
        this._resolve = null;
    }

    /**
     * @returns {Promise<{ board_id: number, name: string, payload: object }|null>}
     *          resolves with a full board (incl. payload) or null if cancelled
     */
    open() {
        this.#mount();
        this._dialog.showModal();
        this.#load();
        return new Promise((resolve) => { this._resolve = resolve; });
    }

    #mount() {
        const dlg = document.createElement('dialog');
        dlg.id = 'my-boards-dialog';
        dlg.className = 'editor-online-dialog';

        const form = document.createElement('form');
        form.method = 'dialog';

        const h = document.createElement('h2');
        h.textContent = 'My Boards';

        const list = document.createElement('div');
        list.className = 'mb-list';
        list.textContent = 'Loading…';

        const actions = document.createElement('div');
        actions.className = 'ns-actions';
        const close = document.createElement('button');
        close.type = 'button';
        close.textContent = 'Close';
        close.addEventListener('click', () => this.#finish(null));
        actions.append(close);

        form.append(h, list, actions);
        dlg.append(form);
        document.body.appendChild(dlg);

        this._dialog = dlg;
        this._listEl = list;
        dlg.addEventListener('close', () => {
            if (this._resolve) this.#finish(null);
        });
    }

    async #load() {
        try {
            const items = await this._api.listMine();
            this.#renderList(items);
        } catch (err) {
            this._listEl.textContent = err.status === 401
                ? 'Login required to list your boards.'
                : `Error: ${err.message}`;
        }
    }

    #renderList(items) {
        this._listEl.replaceChildren();
        if (!items?.length) {
            const p = document.createElement('p');
            p.textContent = 'You have no saved boards yet.';
            p.style.opacity = '0.7';
            this._listEl.append(p);
            return;
        }
        for (const item of items) {
            this._listEl.append(this.#row(item));
        }
    }

    #row(item) {
        const row = document.createElement('div');
        row.className = 'mb-row';

        const info = document.createElement('div');
        info.className = 'mb-info';
        const name = document.createElement('div');
        name.className = 'mb-name';
        name.textContent = item.name;
        const meta = document.createElement('div');
        meta.className = 'mb-meta';
        meta.textContent = `♥ ${item.like_count ?? 0} · ${item.play_count ?? 0} plays · updated ${item.updated_at?.slice(0, 10) ?? ''}`;
        info.append(name, meta);

        const loadBtn = document.createElement('button');
        loadBtn.type = 'button';
        loadBtn.textContent = '📂 Load';
        loadBtn.addEventListener('click', () => this.#pick(item));

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'mb-danger';
        delBtn.textContent = '🗑';
        delBtn.title = 'Delete';
        delBtn.addEventListener('click', () => this.#confirmDelete(item, row));

        row.append(info, loadBtn, delBtn);
        return row;
    }

    async #pick(item) {
        try {
            const full = await this._api.getBoard(item.board_id);
            this.#finish(full);
        } catch (err) {
            globalThis.alert(`Failed to load board: ${err.message}`);
        }
    }

    async #confirmDelete(item, row) {
        if (!globalThis.confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
        try {
            await this._api.deleteBoard(item.board_id);
            row.remove();
        } catch (err) {
            globalThis.alert(`Delete failed: ${err.message}`);
        }
    }

    #finish(result) {
        const r = this._resolve;
        this._resolve = null;
        if (this._dialog?.open) this._dialog.close();
        this._dialog?.remove();
        this._dialog = null;
        if (r) r(result);
    }
}

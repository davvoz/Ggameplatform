import { BoardApiClient } from './BoardApiClient.js';
import { DefaultBoardSource } from '../../core/sources/DefaultBoardSource.js';
import { RemoteBoardSource } from '../../core/sources/RemoteBoardSource.js';
import { GameConfig as C } from '../../config/GameConfig.js';
import { PlatformIdentity } from '../../platform/PlatformIdentity.js';

/**
 * Pre-game shell UI.
 *
 * Two top-level sections:
 *   1. Original Campaign  → resolves with a {@link DefaultBoardSource}
 *   2. Community Boards   → list of UGC boards (sorted by likes), each
 *      selectable to play; resolves with a {@link RemoteBoardSource}.
 *
 * The shell is intentionally decoupled from the game (it never touches the
 * canvas or LevelConfigStore directly). It just builds DOM, talks to the API,
 * and resolves with `{ source, kind, meta }` once the user has picked.
 *
 * The game / SDK remains agnostic of likes / boards / users — this UI lives
 * outside the game loop.
 */
export class BoardShell {
    /** @param {HTMLElement} host */
    constructor(host) {
        this.host = host;
        this.api = new BoardApiClient();
        this._resolve = null;
        this._boards = [];
        this._sort = 'likes';
    }

    /**
     * Mount the shell, return a Promise that resolves when the user picks.
     * @returns {Promise<{ source: import('../../core/sources/BoardSource.js').BoardSource, kind: string, meta?: object }>}
     */
    show() {
        this.host.classList.add('visible');
        this.#renderRoot();
        return new Promise((resolve) => { this._resolve = resolve; });
    }

    #close(result) {
        this.host.classList.remove('visible');
        // detach DOM but keep host so a future call can re-show
        this.host.replaceChildren();
        if (this._resolve) {
            const r = this._resolve;
            this._resolve = null;
            r(result);
        }
    }

    // ─── Rendering ───────────────────────────────────────────────────────────

    #renderRoot() {
        const root = document.createElement('div');
        root.className = 'shell-root';

        const title = document.createElement('h1');
        title.className = 'shell-title';
        title.textContent = 'DEVIL CRASH';
        const subtitle = document.createElement('p');
        subtitle.className = 'shell-subtitle';
        subtitle.textContent = 'Pick how you want to play';

        const cards = document.createElement('div');
        cards.className = 'shell-cards';
        cards.append(this.#buildModeCard({
            title: 'Original Campaign',
            desc: 'The hand-crafted official board, all sections.',
            cta: '▶ Play',
            onPick: () => this.#close({
                source: new DefaultBoardSource(),
                kind: 'default',
            }),
        }), this.#buildModeCard({
            title: 'Community Boards',
            desc: 'Boards built by other players, sorted by likes. Standalone — no XP awarded.',
            cta: '🌐 Browse',
            onPick: () => this.#renderCommunity(),
        }));

        const editorLink = C.IS_TOUCH_DEVICE
            ? this.#buildEditorDisabled()
            : this.#buildEditorLink();

        root.append(title, subtitle, cards, editorLink);
        this.host.replaceChildren(root);
    }

    /** Returns a functional anchor to the level editor (desktop only). */
    #buildEditorLink() {
        const a = document.createElement('a');
        a.className = 'shell-editor-link';
        const uid = PlatformIdentity.getUserId();
        a.href = uid
            ? `tools/level-editor.html?user_id=${encodeURIComponent(uid)}`
            : 'tools/level-editor.html';
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = '🛠  Open Level Editor — build & publish your own board';
        return a;
    }

    /** Returns a disabled placeholder shown on touch/mobile devices. */
    #buildEditorDisabled() {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'shell-editor-link shell-editor-link--disabled';
        btn.disabled = true;
        btn.textContent = '🛠  Level Editor — Desktop only';
        return btn;
    }

    #buildModeCard({ title, desc, cta, onPick }) {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'shell-card';
        const h = document.createElement('h2');
        h.textContent = title;
        const p = document.createElement('p');
        p.textContent = desc;
        const span = document.createElement('span');
        span.className = 'shell-card-cta';
        span.textContent = cta;
        card.append(h, p, span);
        card.addEventListener('click', onPick);
        return card;
    }

    async #renderCommunity() {
        const root = document.createElement('div');
        root.className = 'shell-root shell-community';

        const header = document.createElement('div');
        header.className = 'shell-community-header';

        const back = document.createElement('button');
        back.type = 'button';
        back.className = 'shell-back';
        back.textContent = '← Back';
        back.addEventListener('click', () => this.#renderRoot());

        const title = document.createElement('h1');
        title.className = 'shell-title shell-community-title';
        title.textContent = 'Community Boards';

        const notice = document.createElement('p');
        notice.className = 'shell-community-notice';
        notice.textContent = 'Standalone mode — no XP awarded for community boards.';

        const sortGroup = document.createElement('div');
        sortGroup.className = 'shell-sort';
        const sortLikes = this.#sortButton('Top Liked', 'likes');
        const sortRecent = this.#sortButton('Newest', 'recent');
        sortGroup.append(sortLikes, sortRecent);

        header.append(back, title, sortGroup);

        const list = document.createElement('div');
        list.className = 'shell-board-list';
        list.textContent = 'Loading…';

        root.append(header, notice, list);
        this.host.replaceChildren(root);

        await this.#loadList(list);
    }

    #sortButton(label, value) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'shell-sort-btn';
        btn.textContent = label;
        if (this._sort === value) btn.classList.add('active');
        btn.addEventListener('click', async () => {
            if (this._sort === value) return;
            this._sort = value;
            await this.#renderCommunity();
        });
        return btn;
    }

    async #loadList(listEl) {
        try {
            const data = await this.api.listCommunity({ sort: this._sort, page: 1, pageSize: 30 });
            this._boards = data.items ?? [];
            this.#renderBoardList(listEl);
        } catch (err) {
            listEl.textContent = `Failed to load boards: ${err.message}`;
        }
    }

    #renderBoardList(listEl) {
        listEl.replaceChildren();
        if (this._boards.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'shell-empty';
            empty.textContent = 'No community boards yet. Be the first to publish one from the level editor!';
            const link = C.IS_TOUCH_DEVICE
                ? this.#buildEditorDisabled()
                : this.#buildEditorLink();
            listEl.append(empty, link);
            return;
        }
        for (const board of this._boards) {
            listEl.append(this.#buildBoardRow(board));
        }
    }

    #buildBoardRow(board) {
        const row = document.createElement('div');
        row.className = 'shell-board-row';

        const info = document.createElement('div');
        info.className = 'shell-board-info';
        const name = document.createElement('div');
        name.className = 'shell-board-name';
        name.textContent = board.name;
        const meta = document.createElement('div');
        meta.className = 'shell-board-meta';
        meta.textContent = `by ${board.owner_username || 'anon'} · ${board.play_count ?? 0} plays`;
        info.append(name, meta);

        const likeBtn = this.#buildLikeButton(board);
        const playBtn = document.createElement('button');
        playBtn.type = 'button';
        playBtn.className = 'shell-play-btn';
        playBtn.textContent = '▶ Play';
        playBtn.addEventListener('click', () => this.#close({
            source: new RemoteBoardSource(board.board_id),
            kind: 'community',
            meta: { boardId: board.board_id, name: board.name },
        }));

        row.append(info, likeBtn, playBtn);
        return row;
    }

    #buildLikeButton(board) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'shell-like-btn';
        const renderState = () => {
            btn.classList.toggle('liked', !!board.liked_by_me);
            btn.textContent = `${board.liked_by_me ? '♥' : '♡'} ${board.like_count ?? 0}`;
        };
        renderState();
        btn.addEventListener('click', async () => {
            btn.disabled = true;
            try {
                const r = await this.api.toggleLike(board.board_id);
                board.liked_by_me = !!r.liked;
                board.like_count = r.like_count;
                renderState();
            } catch (err) {
                if (err.status === 401) {
                    btn.title = 'Login required to like';
                } else {
                    console.warn('[BoardShell] like failed', err);
                }
            } finally {
                btn.disabled = false;
            }
        });
        return btn;
    }
}

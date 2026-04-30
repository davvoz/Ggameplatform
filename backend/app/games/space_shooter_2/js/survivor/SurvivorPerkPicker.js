import { PERK_CATALOG } from '../PerkSystem.js';
import { MAX_PICKS } from './SurvivorConfig.js';

/**
 * SurvivorPerkPicker — Pre-run perk selection for World 5.
 *
 * REUSES the existing #perk-select-screen DOM (no separate screen). It
 * augments that screen at mount-time with:
 *   - Title/subtitle override
 *   - A toolbar (category filters + pick counter)
 *   - Stack badges on perk cards (renders the FULL catalog)
 *   - Survivor action buttons (BACK / ENTER ARENA)
 *
 * On unmount() the screen is restored to its original state so the
 * regular in-game perk-pick flow keeps working.
 *
 * Cards are built using the EXISTING `.perk-card.rarity-*` markup so the
 * survivor screen looks identical to the in-game shop. Click handlers are
 * overridden: left-click +1 stack, right-click −1 stack.
 *
 * Source of truth = `this.picks` (Map<perkId, stacks>). DOM is presentational.
 */
export default class SurvivorPerkPicker {
    constructor(game) {
        this.game = game;
        this.picks = new Map();
        this._mounted = false;
        this._categoryFilter = 'all';
        this._cardEls = new Map();

        // Saved state for unmount restoration
        this._origTitle = null;
        this._origSubtitle = null;
        this._origCoinHidden = null;

        // Injected DOM nodes (removed on unmount)
        this._toolbarEl = null;
        this._actionsEl = null;
        this._onStartCb = null;
        this._onBackCb = null;
    }

    // ───────────────────────────────────────────────
    //  Public API
    // ───────────────────────────────────────────────

    /**
     * Take over #perk-select-screen.
     * @param {{ onBack: () => void, onStart: () => void }} callbacks
     */
    mount(callbacks = {}) {
        if (this._mounted) {
            this._render();
            this._updateCounter();
            return;
        }

        const screen = document.getElementById('perk-select-screen');
        const panel = screen?.querySelector('.screen-content');
        const titleEl = panel?.querySelector('.perk-title');
        const subEl = panel?.querySelector('.perk-subtitle');
        const grid = document.getElementById('perk-cards-container');
        const coinActions = document.getElementById('perk-coin-actions');
        if (!panel || !titleEl || !subEl || !grid) return;

        this._onBackCb = callbacks.onBack;
        this._onStartCb = callbacks.onStart;

        this._origTitle = titleEl.textContent;
        this._origSubtitle = subEl.textContent;
        this._origCoinHidden = coinActions?.classList.contains('hidden') ?? true;

        titleEl.textContent = '◈ ADAPTIVE ARENA — BUILD YOUR LOADOUT ◈';
        titleEl.classList.add('perk-title--survivor');
        subEl.textContent = `Pick up to ${MAX_PICKS} perks · click to add a stack · click again at max to clear · right-click to remove one`;
        subEl.classList.add('perk-subtitle--survivor');

        if (coinActions) coinActions.classList.add('hidden');

        // Inject toolbar before the cards grid
        this._toolbarEl = this._buildToolbar();
        panel.insertBefore(this._toolbarEl, grid);

        // Keep the original flex grid layout (`.perk-cards`) — only add the
        // survivor flavour class so we get the scroll container + hidden
        // scrollbar without overriding the layout itself.
        grid.classList.add('perk-cards--survivor');

        // Inject action buttons after the grid
        this._actionsEl = this._buildActions();
        panel.appendChild(this._actionsEl);

        this._mounted = true;
        this._render();
        this._updateCounter();
    }

    /** Restore the screen to its original state. */
    unmount() {
        if (!this._mounted) return;
        const screen = document.getElementById('perk-select-screen');
        const panel = screen?.querySelector('.screen-content');
        const titleEl = panel?.querySelector('.perk-title');
        const subEl = panel?.querySelector('.perk-subtitle');
        const grid = document.getElementById('perk-cards-container');
        const coinActions = document.getElementById('perk-coin-actions');

        if (titleEl) {
            titleEl.textContent = this._origTitle ?? 'CHOOSE YOUR UPGRADE';
            titleEl.classList.remove('perk-title--survivor');
        }
        if (subEl) {
            subEl.textContent = this._origSubtitle ?? 'Select one perk to enhance your build';
            subEl.classList.remove('perk-subtitle--survivor');
        }
        if (grid) {
            grid.innerHTML = '';
            grid.classList.remove('perk-cards--survivor');
        }
        if (coinActions && this._origCoinHidden === false) {
            coinActions.classList.remove('hidden');
        }

        this._toolbarEl?.remove();
        this._actionsEl?.remove();
        this._toolbarEl = null;
        this._actionsEl = null;
        this._cardEls.clear();
        this._mounted = false;
    }

    /** Reset all picks (call when entering for a fresh run). */
    reset() {
        this.picks.clear();
        if (this._mounted) {
            this._render();
            this._updateCounter();
        }
    }

    /** Apply current picks to PerkSystem. */
    commitPicks() {
        const ps = this.game.perkSystem;
        ps.reset();
        for (const [perkId, stacks] of this.picks) {
            for (let i = 0; i < stacks; i++) ps.activatePerk(perkId);
        }
    }

    getTotalPicks() {
        let total = 0;
        for (const n of this.picks.values()) total += n;
        return total;
    }

    // ───────────────────────────────────────────────
    //  Internal — DOM builders
    // ───────────────────────────────────────────────

    _buildToolbar() {
        const bar = document.createElement('div');
        bar.className = 'survivor-toolbar';
        bar.innerHTML = `
            <div class="survivor-filters">
                <button class="survivor-filter-btn active" data-filter="all">ALL</button>
                <button class="survivor-filter-btn" data-filter="offensive">OFFENSE</button>
                <button class="survivor-filter-btn" data-filter="defensive">DEFENSE</button>
                <button class="survivor-filter-btn" data-filter="utility">UTILITY</button>
            </div>
            <div class="survivor-pick-counter" data-counter>
                Picks: <span data-current>0</span> / <span data-max>${MAX_PICKS}</span>
            </div>
        `;
        bar.querySelectorAll('.survivor-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                bar.querySelectorAll('.survivor-filter-btn')
                    .forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this._categoryFilter = btn.dataset.filter || 'all';
                this._render();
            });
        });
        return bar;
    }

    _buildActions() {
        const wrap = document.createElement('div');
        wrap.className = 'screen-actions survivor-screen-actions';
        wrap.innerHTML = `
            <button type="button" class="btn-secondary" data-action="back">← BACK</button>
            <button type="button" class="btn-primary" data-action="start">ENTER ARENA →</button>
        `;
        wrap.querySelector('[data-action="back"]').addEventListener('click', () => {
            this.game.sound?.playMenuClick?.();
            this._onBackCb?.();
        });
        wrap.querySelector('[data-action="start"]').addEventListener('click', () => {
            this.game.sound?.playMenuClick?.();
            this._onStartCb?.();
        });
        return wrap;
    }

    // ───────────────────────────────────────────────
    //  Internal — render
    // ───────────────────────────────────────────────

    _render() {
        const grid = document.getElementById('perk-cards-container');
        if (!grid) return;
        grid.innerHTML = '';
        this._cardEls.clear();

        const visible = this._visiblePerks();
        for (const perk of visible) {
            const card = this._buildCard(perk);
            grid.appendChild(card);
            this._cardEls.set(perk.id, card);
        }
    }

    _visiblePerks() {
        if (this._categoryFilter === 'all') return PERK_CATALOG;
        return PERK_CATALOG.filter(p => p.category === this._categoryFilter);
    }

    _buildCard(perk) {
        // Mirrors UIManager._renderPerkCards markup so global .perk-card CSS applies.
        const rarityData = perk.rarityData || { color: '#fff', label: perk.rarity, border: '#888' };
        const catData = perk.categoryData || { color: '#aaa', icon: '•', label: perk.category };

        const card = document.createElement('div');
        card.className = `perk-card perk-card--survivor rarity-${perk.rarity}`;
        card.dataset.perkId = perk.id;

        card.innerHTML = `
            <div class="perk-rarity-label" style="color:${rarityData.color}">${rarityData.label}</div>
            <div class="perk-icon-wrap" style="border-color:${rarityData.border}">
                <span class="perk-icon">${perk.icon || catData.icon}</span>
            </div>
            <div class="perk-name">${perk.name}</div>
            <div class="perk-category" style="color:${catData.color}">${catData.icon} ${catData.label}</div>
            <div class="perk-desc">${perk.description}</div>
            <div class="perk-survivor-stack">x<span data-stack-num>0</span> / ${perk.maxStacks}</div>
        `;

        card.addEventListener('click', () => this._onCardClick(perk));
        card.addEventListener('contextmenu', (ev) => {
            ev.preventDefault();
            this._onCardRightClick(perk);
        });

        this._refreshCardVisual(card, perk);
        return card;
    }

    _onCardClick(perk) {
        // Click cycles stacks: 0 → 1 → ... → max → 0.
        // This guarantees that any picked perk is always reachable for deselect
        // with the same input device, and avoids relying on right-click discoverability.
        const cur = this.picks.get(perk.id) || 0;
        const totalOthers = this.getTotalPicks() - cur;

        if (cur >= perk.maxStacks) {
            // Already maxed → wrap to 0 (full deselect)
            this.picks.delete(perk.id);
        } else if (totalOthers + cur + 1 > MAX_PICKS) {
            // Adding one more would exceed the global cap → wrap to 0
            this.picks.delete(perk.id);
        } else {
            this.picks.set(perk.id, cur + 1);
        }
        this.game.sound?.playMenuClick?.();
        this._refreshCardVisual(this._cardEls.get(perk.id), perk);
        this._updateCounter();
    }

    _onCardRightClick(perk) {
        // Right-click: decrement by 1 (kept as a power-user shortcut).
        const cur = this.picks.get(perk.id) || 0;
        if (cur === 0) return;
        if (cur === 1) this.picks.delete(perk.id);
        else this.picks.set(perk.id, cur - 1);
        this.game.sound?.playMenuClick?.();
        this._refreshCardVisual(this._cardEls.get(perk.id), perk);
        this._updateCounter();
    }

    _refreshCardVisual(card, perk) {
        if (!card) return;
        const stacks = this.picks.get(perk.id) || 0;
        card.classList.toggle('survivor-picked', stacks > 0);
        card.classList.toggle('survivor-maxed', stacks >= perk.maxStacks);
        const num = card.querySelector('[data-stack-num]');
        if (num) num.textContent = String(stacks);
    }

    _updateCounter() {
        const counter = this._toolbarEl?.querySelector('[data-counter]');
        if (!counter) return;
        const total = this.getTotalPicks();
        const cur = counter.querySelector('[data-current]');
        if (cur) cur.textContent = String(total);
        counter.classList.toggle('full', total >= MAX_PICKS);
    }
}

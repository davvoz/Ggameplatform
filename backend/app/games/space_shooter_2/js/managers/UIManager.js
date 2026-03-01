class UIManager {
    constructor(game) {
        this.game = game;
        /** Currently displayed perk cards (so coin actions can replace them). */
        this._currentPerkCards = [];
    }

    // ══════════════════════════════════════════════
    //  COIN ACTIONS — definitions for the perk screen
    // ══════════════════════════════════════════════

    /** Coin action config: id, cost, label, icon, handler key */
    static get COIN_ACTIONS() {
        return [
            { id: 'reroll',     cost: 5,  label: 'Reroll',       icon: '🔄', desc: '3 new random perks' },
            { id: 'rare',       cost: 10, label: 'Rare pack',    icon: '💎', desc: '3 rare+ perks' },
            { id: 'epic',       cost: 20, label: 'Epic pack',    icon: '🔮', desc: '3 epic+ perks' },
            { id: 'choose_any', cost: 40, label: 'Free pick',    icon: '⭐', desc: 'Choose any perk' }
        ];
    }

    showLevelCompleteScreen() {
        const g = this.game;
        const screen = document.getElementById('level-complete-screen');
        if (!screen) return;

        g.sound.playIntroMusic();

        const data = g.levelManager.summaryData;

        document.getElementById('lc-level-name').textContent = `LEVEL ${data.level} - ${data.levelName}`;
        document.getElementById('lc-enemies-killed').textContent = data.enemiesKilled;
        document.getElementById('lc-damage-taken').textContent = data.damageTaken;
        document.getElementById('lc-max-combo').textContent = `${data.maxCombo}x`;
        document.getElementById('lc-points-earned').textContent = data.pointsEarned.toLocaleString();
        document.getElementById('lc-bonus').textContent = `+${data.bonusPoints.toLocaleString()}`;
        document.getElementById('lc-time').textContent = `${data.time.toFixed(1)}s`;
        document.getElementById('lc-total-score').textContent = data.totalScore.toLocaleString();
        document.getElementById('lc-hp-status').textContent = `${data.playerHP}/${data.playerMaxHP}`;

        let stars = 1;
        if (data.damageTaken === 0) stars = 3;
        else if (data.damageTaken <= 2) stars = 2;

        const starsEl = document.getElementById('lc-stars');
        starsEl.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const star = document.createElement('span');
            star.className = i < stars ? 'star filled' : 'star empty';
            star.textContent = '⭐';
            starsEl.appendChild(star);
        }

        screen.classList.remove('hidden');
        if (window.audioViz) window.audioViz.start(screen);
    }

    hideLevelCompleteScreen() {
        const screen = document.getElementById('level-complete-screen');
        if (screen) {
            screen.classList.add('hidden');
            if (window.audioViz && window.audioViz.canvas.parentNode === screen) window.audioViz.stop();
        }
    }

    showPerkScreen() {
        const g = this.game;
        const screen = document.getElementById('perk-select-screen');
        if (!screen) return;

        g.state = 'perkSelect';
        const currentWorld = g.levelManager ? g.levelManager.getCurrentWorld() : 1;
        const perks = g.perkSystem.getRandomSelection(3, currentWorld);

        this._renderPerkCards(perks);
        this._renderCoinActions();

        screen.classList.remove('hidden');
        if (window.audioViz) window.audioViz.start(screen);
    }

    // ──────────────────────────────────────────
    //  Perk card rendering (shared by all flows)
    // ──────────────────────────────────────────

    /** Render an array of perks into #perk-cards-container */
    _renderPerkCards(perks) {
        const container = document.getElementById('perk-cards-container');
        if (!container) return;
        container.innerHTML = '';
        this._currentPerkCards = perks;

        for (const perk of perks) {
            const card = document.createElement('div');
            card.className = `perk-card rarity-${perk.rarity}`;
            card.dataset.perkId = perk.id;

            const stackInfo = perk.currentStacks > 0
                ? `<div class="perk-stack">Level ${perk.currentStacks} → ${perk.currentStacks + 1}</div>`
                : '';
            const tradeoffHtml = perk.tradeoff
                ? `<div class="perk-tradeoff">! ${perk.tradeoff}</div>`
                : '';
            const stackDescHtml = perk.stackDesc && perk.currentStacks > 0
                ? `<div class="perk-stack-desc">${perk.stackDesc}</div>`
                : '';

            card.innerHTML = `
                <div class="perk-rarity-label" style="color:${perk.rarityData.color}">${perk.rarityData.label}</div>
                <div class="perk-icon-wrap" style="border-color:${perk.rarityData.border}">
                    <span class="perk-icon">${perk.icon}</span>
                </div>
                <div class="perk-name">${perk.name}</div>
                <div class="perk-category" style="color:${perk.categoryData.color}">${perk.categoryData.icon} ${perk.categoryData.label}</div>
                <div class="perk-desc">${perk.description}</div>
                ${stackDescHtml}
                ${tradeoffHtml}
                ${stackInfo}
            `;

            card.addEventListener('click', () => this.handlePerkChoice(perk.id));
            container.appendChild(card);
        }
    }

    // ──────────────────────────────────────────
    //  Coin action bar
    // ──────────────────────────────────────────

    /** Render coin action buttons + balance badge into #perk-coin-actions */
    async _renderCoinActions() {
        const wrapper = document.getElementById('perk-coin-actions');
        if (!wrapper) return;

        const coinService = this.game.coinService;
        if (!coinService || !coinService.isAvailable()) {
            wrapper.classList.add('hidden');
            return;
        }

        wrapper.classList.remove('hidden');
        wrapper.innerHTML = '';

        // Balance badge
        const balance = await coinService.fetchBalance();
        const balEl = document.createElement('div');
        balEl.className = 'coin-balance-badge';
        balEl.id = 'perk-coin-balance';
        balEl.innerHTML = `<span class="coin-icon">🪙</span> <span class="coin-amount">${balance}</span>`;
        wrapper.appendChild(balEl);

        // Action buttons
        const btnRow = document.createElement('div');
        btnRow.className = 'coin-action-row';

        for (const action of UIManager.COIN_ACTIONS) {
            const btn = document.createElement('button');
            btn.className = 'coin-action-btn';
            btn.disabled = balance < action.cost;
            btn.dataset.actionId = action.id;
            btn.innerHTML = `
                <span class="coin-action-icon">${action.icon}</span>
                <span class="coin-action-label">${action.label}</span>
                <span class="coin-action-cost">🪙 ${action.cost}</span>
            `;
            btn.title = action.desc;
            btn.addEventListener('click', () => this._handleCoinAction(action));
            btnRow.appendChild(btn);
        }

        wrapper.appendChild(btnRow);
    }

    /** Update the balance display and button states in-place. */
    _refreshCoinUI(newBalance) {
        const amountEl = document.querySelector('#perk-coin-balance .coin-amount');
        if (amountEl) amountEl.textContent = newBalance;

        for (const action of UIManager.COIN_ACTIONS) {
            const btn = document.querySelector(`.coin-action-btn[data-action-id="${action.id}"]`);
            if (btn) btn.disabled = newBalance < action.cost;
        }
    }

    // ──────────────────────────────────────────
    //  Coin action handlers
    // ──────────────────────────────────────────

    async _handleCoinAction(action) {
        const g = this.game;
        const coinService = g.coinService;
        if (!coinService) return;

        const ok = await coinService.spendCoins(action.cost, `Perk ${action.id}`);
        if (!ok) return;

        g.sound.playPowerUp();
        g.postProcessing.flash({ r: 255, g: 215, b: 0 }, 0.12);

        const currentWorld = g.levelManager ? g.levelManager.getCurrentWorld() : 1;

        switch (action.id) {
            case 'reroll':
                this._renderPerkCards(g.perkSystem.getRandomSelection(3, currentWorld));
                break;
            case 'rare':
                this._renderPerkCards(g.perkSystem.getSelectionByMinRarity('rare', 3, currentWorld));
                break;
            case 'epic':
                this._renderPerkCards(g.perkSystem.getSelectionByMinRarity('epic', 3, currentWorld));
                break;
            case 'choose_any':
                this._showFullCatalog(currentWorld);
                break;
        }

        this._refreshCoinUI(coinService.balance);
    }

    // ──────────────────────────────────────────
    //  Full catalog (Choose Any)
    // ──────────────────────────────────────────

    _showFullCatalog(currentWorld) {
        const g = this.game;
        const allPerks = g.perkSystem.getAllAvailablePerks(currentWorld);
        const container = document.getElementById('perk-cards-container');
        if (!container) return;
        container.innerHTML = '';
        container.classList.add('perk-cards--catalog');

        // Group by category
        const groups = {};
        for (const p of allPerks) {
            (groups[p.category] = groups[p.category] || []).push(p);
        }

        for (const [cat, perks] of Object.entries(groups)) {
            const catData = perks[0]?.categoryData;
            const header = document.createElement('div');
            header.className = 'perk-catalog-header';
            header.innerHTML = `<span style="color:${catData?.color || '#fff'}">${catData?.icon || ''} ${catData?.label || cat}</span>`;
            container.appendChild(header);

            const row = document.createElement('div');
            row.className = 'perk-cards perk-catalog-row';

            for (const perk of perks) {
                const card = document.createElement('div');
                card.className = `perk-card perk-card--mini rarity-${perk.rarity}`;
                card.dataset.perkId = perk.id;

                card.innerHTML = `
                    <div class="perk-rarity-label" style="color:${perk.rarityData.color}">${perk.rarityData.label}</div>
                    <div class="perk-icon-wrap" style="border-color:${perk.rarityData.border}">
                        <span class="perk-icon">${perk.icon}</span>
                    </div>
                    <div class="perk-name">${perk.name}</div>
                    <div class="perk-desc">${perk.description}</div>
                    ${perk.currentStacks > 0 ? `<div class="perk-stack">Lv ${perk.currentStacks} → ${perk.currentStacks + 1}</div>` : ''}
                `;

                card.addEventListener('click', () => {
                    container.classList.remove('perk-cards--catalog');
                    this._detachScrollFade();
                    this.handlePerkChoice(perk.id);
                });
                row.appendChild(card);
            }
            container.appendChild(row);
        }

        // Activate gradient fade hint at bottom of the scrollable area
        this._attachScrollFade();
    }

    // ──────────────────────────────────────────
    //  Scroll fade hint (replaces scrollbar)
    // ──────────────────────────────────────────

    /** Show/hide a bottom gradient fade based on scroll position. */
    _attachScrollFade() {
        const panel = document.querySelector('#perk-select-screen .screen-content');
        if (!panel) return;

        // Initial check
        this._updateScrollFade(panel);

        // Store ref so we can remove later
        this._scrollFadeHandler = () => this._updateScrollFade(panel);
        panel.addEventListener('scroll', this._scrollFadeHandler, { passive: true });
    }

    _detachScrollFade() {
        const panel = document.querySelector('#perk-select-screen .screen-content');
        if (panel && this._scrollFadeHandler) {
            panel.removeEventListener('scroll', this._scrollFadeHandler);
            panel.style.setProperty('--fade-hint', '0');
        }
        this._scrollFadeHandler = null;
    }

    _updateScrollFade(panel) {
        const distFromBottom = panel.scrollHeight - panel.scrollTop - panel.clientHeight;
        panel.style.setProperty('--fade-hint', distFromBottom > 16 ? '1' : '0');
    }

    hidePerkScreen() {
        this._detachScrollFade();
        const screen = document.getElementById('perk-select-screen');
        if (screen) {
            screen.classList.add('hidden');
            if (window.audioViz && window.audioViz.canvas.parentNode === screen) window.audioViz.stop();
        }
    }

    handlePerkChoice(perkId) {
        const g = this.game;
        const statChanges = g.perkSystem.activatePerk(perkId);

        if (statChanges && g.entityManager.player) {
            g.entityManager.player.applyBonusStats(statChanges);
        }

        g.perkEffectsManager.applyPerkModifiersToPlayer();

        g.sound.playPowerUp();
        g.postProcessing.flash({ r: 100, g: 255, b: 200 }, 0.15);

        this.hidePerkScreen();
        g.levelManager.startNextLevel();
    }

    showGameOverScreen() {
        const g = this.game;
        const screen = document.getElementById('game-over-screen');
        if (!screen) return;

        g.sound.playIntroMusic();

        document.getElementById('go-final-score').textContent = g.scoreManager.score.toLocaleString();
        document.getElementById('go-level-reached').textContent = g.levelManager.currentLevel;
        document.getElementById('go-enemies-killed').textContent = g.scoreManager.totalEnemiesKilled;

        // Continue button
        this._updateContinueUI();

        screen.classList.remove('hidden');
        if (window.audioViz) window.audioViz.start(screen);
    }

    // ──────────────────────────────────────────
    //  Continue UI (game-over screen)
    // ──────────────────────────────────────────

    async _updateContinueUI() {
        const section = document.getElementById('go-continue-section');
        if (!section) return;

        const coinService = this.game.coinService;
        if (!coinService || !coinService.isAvailable()) {
            section.classList.add('hidden');
            return;
        }

        section.classList.remove('hidden');

        const balance = await coinService.fetchBalance();
        const g = this.game;
        const canAffordContinue = balance >= g.CONTINUE_COST;
        const canAffordBuild = balance >= g.CONTINUE_CHANGE_BUILD_COST;
        const hasPerks = g.perkSystem.getActivePerks().length > 0;

        const btn = document.getElementById('go-continue-btn');
        const buildBtn = document.getElementById('go-continue-build-btn');
        const balEl = document.getElementById('go-continue-balance');

        if (btn) {
            btn.disabled = !canAffordContinue;
            btn.classList.toggle('disabled', !canAffordContinue);
        }
        if (buildBtn) {
            const disabled = !canAffordBuild || !hasPerks;
            buildBtn.disabled = disabled;
            buildBtn.classList.toggle('disabled', disabled);
            buildBtn.style.display = hasPerks ? '' : 'none';
        }
        if (balEl) {
            balEl.textContent = `Your balance: ${balance} coins`;
            balEl.className = canAffordContinue ? 'continue-balance' : 'continue-balance insufficient';
        }
    }

    async handleContinue() {
        const g = this.game;
        const coinService = g.coinService;
        if (!coinService) return;

        const ok = await coinService.spendCoins(
            g.CONTINUE_COST,
            `Space Shooter 2 continue: ${g.CONTINUE_COST} coins`
        );
        if (!ok) return;

        g.resumeAfterContinue();
    }

    // ──────────────────────────────────────────
    //  Continue & Change Build (70 coins)
    // ──────────────────────────────────────────

    async handleContinueChangeBuild() {
        const g = this.game;
        const coinService = g.coinService;
        if (!coinService) return;

        const ok = await coinService.spendCoins(
            g.CONTINUE_CHANGE_BUILD_COST,
            `Space Shooter 2 continue + change build: ${g.CONTINUE_CHANGE_BUILD_COST} coins`
        );
        if (!ok) return;

        g.sound.playPowerUp();
        this._showPerkSwapUI();
    }

    _showPerkSwapUI() {
        const screen = document.getElementById('perk-swap-screen');
        if (!screen) return;

        // State
        this._swapRemoveIds = new Set();
        this._swapAddIds = [];
        this._swapMaxRemove = 3;

        // Render current build (compact chips)
        this._renderSwapCurrentPerks();
        // Render catalog using the same card style as the shop
        this._renderSwapCatalog();
        this._updateSwapState();

        // Hide game-over, show swap screen
        document.getElementById('game-over-screen')?.classList.add('hidden');
        if (window.audioViz) window.audioViz.stop();
        screen.classList.remove('hidden');
    }

    _renderSwapCurrentPerks() {
        const container = document.getElementById('perk-swap-current');
        if (!container) return;
        container.innerHTML = '';

        const activePerks = this.game.perkSystem.getActivePerks();
        if (activePerks.length === 0) {
            container.innerHTML = '<p style="color:#667;">No active perks</p>';
            return;
        }

        for (const perk of activePerks) {
            const chip = document.createElement('div');
            chip.className = 'swap-chip';
            chip.dataset.perkId = perk.id;
            chip.innerHTML = `
                <span class="swap-chip-icon" style="border-color:${perk.rarityData.border}">${perk.icon}</span>
                <span class="swap-chip-name">${perk.name}</span>
                <span class="swap-chip-lv">Lv${perk.stacks}</span>
                <span class="swap-chip-x">✕</span>
            `;
            chip.addEventListener('click', () => this._toggleSwapRemove(perk.id, chip));
            container.appendChild(chip);
        }
    }

    _toggleSwapRemove(perkId, chip) {
        if (this._swapRemoveIds.has(perkId)) {
            this._swapRemoveIds.delete(perkId);
            chip.classList.remove('swap-chip--remove');
        } else {
            if (this._swapRemoveIds.size >= this._swapMaxRemove) return;
            this._swapRemoveIds.add(perkId);
            chip.classList.add('swap-chip--remove');
        }
        // If a removed perk was also in addIds, drop it
        this._swapAddIds = this._swapAddIds.filter(id => !this._swapRemoveIds.has(id));
        this._refreshSwapCatalogSelection();
        this._updateSwapState();
    }

    /** Render the replacement catalog using the same perk-card--mini layout as the shop. */
    _renderSwapCatalog() {
        const container = document.getElementById('perk-swap-catalog');
        if (!container) return;
        container.innerHTML = '';

        const currentWorld = this.game.levelManager ? this.game.levelManager.getCurrentWorld() : 1;
        const allPerks = this.game.perkSystem.getAllAvailablePerks(currentWorld);

        const groups = {};
        for (const p of allPerks) {
            (groups[p.category] = groups[p.category] || []).push(p);
        }

        for (const [cat, perks] of Object.entries(groups)) {
            const catData = perks[0]?.categoryData;
            const header = document.createElement('div');
            header.className = 'perk-catalog-header';
            header.innerHTML = `<span style="color:${catData?.color || '#fff'}">${catData?.icon || ''} ${catData?.label || cat}</span>`;
            container.appendChild(header);

            const row = document.createElement('div');
            row.className = 'perk-cards perk-catalog-row';

            for (const perk of perks) {
                const card = document.createElement('div');
                card.className = `perk-card perk-card--mini rarity-${perk.rarity}`;
                card.dataset.perkId = perk.id;
                card.innerHTML = `
                    <div class="perk-rarity-label" style="color:${perk.rarityData.color}">${perk.rarityData.label}</div>
                    <div class="perk-icon-wrap" style="border-color:${perk.rarityData.border}">
                        <span class="perk-icon">${perk.icon}</span>
                    </div>
                    <div class="perk-name">${perk.name}</div>
                    <div class="perk-desc">${perk.description}</div>
                    ${perk.currentStacks > 0 ? `<div class="perk-stack">Lv ${perk.currentStacks}</div>` : ''}
                `;
                card.addEventListener('click', () => this._toggleSwapAdd(perk.id, card));
                row.appendChild(card);
            }
            container.appendChild(row);
        }
    }

    _toggleSwapAdd(perkId, card) {
        const idx = this._swapAddIds.indexOf(perkId);
        if (idx >= 0) {
            this._swapAddIds.splice(idx, 1);
            card.classList.remove('swap-pick');
        } else {
            if (this._swapAddIds.length >= this._swapRemoveIds.size) return;
            this._swapAddIds.push(perkId);
            card.classList.add('swap-pick');
        }
        this._updateSwapState();
    }

    _refreshSwapCatalogSelection() {
        const catalogEl = document.getElementById('perk-swap-catalog');
        if (!catalogEl) return;
        for (const card of catalogEl.querySelectorAll('.perk-card--mini')) {
            const id = card.dataset.perkId;
            card.classList.toggle('swap-pick', this._swapAddIds.includes(id));
        }
    }

    _updateSwapState() {
        const removeCount = this._swapRemoveIds.size;
        const addCount = this._swapAddIds.length;

        const hint = document.getElementById('perk-swap-hint');
        if (hint) {
            if (removeCount === 0) hint.textContent = 'Tap perks to mark for removal (max 3)';
            else if (addCount < removeCount) hint.textContent = `Now pick ${removeCount - addCount} replacement${removeCount - addCount > 1 ? 's' : ''} from the catalog`;
            else hint.textContent = 'Ready! Confirm to continue with new build';
        }

        const counter = document.getElementById('perk-swap-replace-count');
        if (counter) counter.textContent = `${addCount} / ${removeCount}`;

        const catalogSection = document.getElementById('swap-catalog-section');
        const divider = document.getElementById('swap-divider');
        if (catalogSection) catalogSection.style.display = removeCount > 0 ? '' : 'none';
        if (divider) divider.style.display = removeCount > 0 ? '' : 'none';

        const confirmBtn = document.getElementById('perk-swap-confirm');
        if (confirmBtn) {
            confirmBtn.disabled = !(removeCount > 0 && addCount === removeCount);
        }

        const catalogEl = document.getElementById('perk-swap-catalog');
        if (catalogEl) {
            for (const card of catalogEl.querySelectorAll('.perk-card--mini')) {
                const id = card.dataset.perkId;
                const isPicked = this._swapAddIds.includes(id);
                const atLimit = addCount >= removeCount && !isPicked;
                card.classList.toggle('swap-off', atLimit);
            }
        }
    }

    confirmPerkSwap() {
        const g = this.game;
        const player = g.entityManager.player;

        // 1. Remove selected perks
        for (const id of this._swapRemoveIds) {
            const inverseDelta = g.perkSystem.removePerk(id);
            if (inverseDelta && player) {
                player.applyBonusStats(inverseDelta);
            }
        }

        // 2. Activate new perks
        for (const id of this._swapAddIds) {
            const statDelta = g.perkSystem.activatePerk(id);
            if (statDelta && player) {
                player.applyBonusStats(statDelta);
            }
        }

        // 3. Recalculate all perk modifiers
        g.perkEffectsManager.applyPerkModifiersToPlayer();

        // 4. Hide overlay & resume (mark as confirming so game-over doesn't re-show)
        this._swapConfirming = true;
        this.hidePerkSwapOverlay();
        g.resumeAfterContinue();
    }

    hidePerkSwapOverlay() {
        const screen = document.getElementById('perk-swap-screen');
        if (screen) screen.classList.add('hidden');
        // If cancelling (not confirming), re-show game-over
        if (!this._swapConfirming) {
            document.getElementById('game-over-screen')?.classList.remove('hidden');
        }
        this._swapRemoveIds = null;
        this._swapAddIds = null;
        this._swapConfirming = false;
    }

    showVictoryScreen() {
        const g = this.game;
        const screen = document.getElementById('victory-screen');
        if (!screen) return;

        g.sound.playIntroMusic();

        document.getElementById('vic-score').textContent = g.scoreManager.score.toLocaleString();
        document.getElementById('vic-enemies').textContent = g.scoreManager.totalEnemiesKilled;

        if (window.sendScoreToPlatform) {
            window.sendScoreToPlatform(g.scoreManager.score, {
                level: g.levelManager.currentLevel,
                enemiesKilled: g.scoreManager.totalEnemiesKilled,
                maxCombo: g.scoreManager.maxCombo,
                ship: g.selectedShipId,
                ultimate: g.selectedUltimateId,
                victory: true,
                difficulty: g.difficulty.id
            });
        }

        screen.classList.remove('hidden');
        if (window.audioViz) window.audioViz.start(screen);
    }

    populateShipPreviews() {
        const g = this.game;
        const shipIds = ['vanguard', 'interceptor', 'fortress', 'striker', 'titan'];
        for (const id of shipIds) {
            const container = document.getElementById(`preview-${id}`);
            if (!container) continue;
            const cv = container.querySelector('canvas');
            if (!cv) continue;
            const ctx = cv.getContext('2d');
            ctx.clearRect(0, 0, cv.width, cv.height);
            const sprite = g.assets.getSprite(`ship_${id}`);
            if (sprite) {
                ctx.drawImage(sprite, 0, 0, cv.width, cv.height);
            }
        }
    }

    populateShipDetail() {
        const g = this.game;
        const player = g.entityManager.player;
        if (!player) return;
        const ship = player.shipData;
        const base = ship.stats;
        const bonus = player.bonusStats;

        document.getElementById('detail-ship-name').textContent = ship.name;
        document.getElementById('detail-ship-desc').textContent = ship.description;

        const previewCanvas = document.getElementById('ship-detail-preview');
        if (previewCanvas) {
            const pCtx = previewCanvas.getContext('2d');
            pCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
            const sprite = g.assets.getSprite?.(`ship_${player.shipId}`);
            if (sprite) {
                const size = 72;
                const x = (previewCanvas.width - size) / 2;
                const y = (previewCanvas.height - size) / 2;
                pCtx.drawImage(sprite, x, y, size, size);
            } else {
                pCtx.fillStyle = ship.color;
                pCtx.beginPath();
                pCtx.arc(previewCanvas.width / 2, previewCanvas.height / 2, 30, 0, Math.PI * 2);
                pCtx.fill();
            }
        }

        const buildStatBars = (containerId, stats, bonusMap) => {
            const container = document.getElementById(containerId);
            if (!container) return;
            container.innerHTML = '';
            const labels = { hp: 'HP', speed: 'SPD', resist: 'RES', fireRate: 'ROF' };
            const classes = { hp: 'hp', speed: 'spd', resist: 'res', fireRate: 'rof' };
            for (const [key, label] of Object.entries(labels)) {
                const baseVal = stats[key] || 0;
                const bonusVal = bonusMap?.[key] || 0;
                const total = Math.min(baseVal + bonusVal, 10);
                const row = document.createElement('div');
                row.className = 'detail-stat-row';
                row.innerHTML = `
                    <span class="detail-stat-label">${label}</span>
                    <div class="detail-stat-bar-bg">
                        <div class="detail-stat-bar-fill ${classes[key]}" style="width:${total * 10}%"></div>
                    </div>
                    <span class="detail-stat-value">${total}${bonusVal > 0 ? ` <span class="detail-stat-bonus">+${bonusVal}</span>` : ''}</span>
                `;
                container.appendChild(row);
            }
        };

        buildStatBars('detail-base-stats', base, null);
        buildStatBars('detail-effective-stats', base, bonus);

        const weaponEl = document.getElementById('detail-weapon-info');
        if (weaponEl) {
            const wl = player.weaponLevel || 1;
            const weaponNames = ['Single Shot', 'Dual Cannon', 'Triple Spread', 'Quad Barrage', 'Nova Storm'];
            weaponEl.innerHTML = `
                <span class="detail-weapon-icon">🔫</span>
                <div class="detail-weapon-text">
                    <div class="detail-weapon-name">${weaponNames[wl - 1] || 'Unknown'}</div>
                    <div class="detail-weapon-desc">Level ${wl} / 5${g.perkSystem.hasDoubleBarrel() ? ' • Double Barrel active' : ''}</div>
                </div>
            `;
        }

        const ultEl = document.getElementById('detail-ultimate-info');
        if (ultEl && player.ultimateData) {
            const ud = player.ultimateData;
            const charge = Math.floor(player.ultimateCharge);
            ultEl.innerHTML = `
                <span class="detail-ult-icon">${ud.icon}</span>
                <div class="detail-ult-text">
                    <div class="detail-ult-name">${ud.name}</div>
                    <div class="detail-ult-desc">${ud.description} • Charge: ${charge}%</div>
                </div>
            `;
        }

        const perksSection = document.getElementById('detail-perks-section');
        const perksList = document.getElementById('detail-perks-list');
        const activePerks = g.perkSystem.getActivePerks();
        if (activePerks.length > 0 && perksSection && perksList) {
            perksSection.style.display = '';
            perksList.innerHTML = '';
            for (const perk of activePerks) {
                const row = document.createElement('div');
                row.className = 'detail-perk-row';
                row.innerHTML = `
                    <div class="detail-perk-icon-wrap" style="border-color:${perk.rarityData.color}; background:${perk.rarityData.color}15">
                        ${perk.icon}
                    </div>
                    <div class="detail-perk-info">
                        <div class="detail-perk-name" style="color:${perk.rarityData.color}">${perk.name}</div>
                        <div class="detail-perk-desc">${perk.description}</div>
                    </div>
                    ${perk.stacks > 1 ? `<span class="detail-perk-stacks">×${perk.stacks}</span>` : ''}
                `;
                perksList.appendChild(row);
            }
        } else if (perksSection) {
            perksSection.style.display = 'none';
        }
    }

    showShipDetail() {
        const g = this.game;
        if (g.state !== 'playing') return;
        g.state = 'paused';
        g.sound.pauseMusic();
        this.hideHudButtons();
        this.populateShipDetail();
        document.getElementById('ship-detail-popup')?.classList.remove('hidden');
    }

    closeShipDetail() {
        const g = this.game;
        g.state = 'playing';
        document.getElementById('ship-detail-popup')?.classList.add('hidden');
        g.sound.resumeMusic();
        this.showHudButtons();
    }

    showHudButtons() {
        document.getElementById('hud-settings-btn')?.classList.remove('hidden');
        document.getElementById('hud-ship-btn')?.classList.remove('hidden');
    }

    hideHudButtons() {
        document.getElementById('hud-settings-btn')?.classList.add('hidden');
        document.getElementById('hud-ship-btn')?.classList.add('hidden');
    }
}

export default UIManager;

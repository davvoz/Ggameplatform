class UIManager {
    constructor(game) {
        this.game = game;
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
        const container = document.getElementById('perk-cards-container');
        if (!container) return;
        container.innerHTML = '';

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

        screen.classList.remove('hidden');
        if (window.audioViz) window.audioViz.start(screen);
    }

    hidePerkScreen() {
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

        screen.classList.remove('hidden');
        if (window.audioViz) window.audioViz.start(screen);
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

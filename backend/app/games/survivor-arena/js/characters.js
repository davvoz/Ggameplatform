/**
 * Survivor Arena - Character System
 * Unlockable playable characters purchased with coins
 * Each character has unique visuals, animations, and gameplay stats
 */

export const CHARACTERS = {
    cyber_soldier: {
        id: 'cyber_soldier',
        name: 'Cyber Soldier',
        price: 0,
        unlocked: true,
        description: 'Balanced combat unit',
        spriteType: 'player_cyber',
        // Colors
        bodyColor: '#1a237e',
        armorColor: '#3949ab',
        accentColor: '#00e5ff',
        headColor: '#283593',
        gradientColors: ['#00e5ff', '#1a237e'],
        // Stats (base = 1.0, values are multipliers)
        stats: {
            health: 1.0,        // 150 HP
            speed: 1.0,         // 220
            damage: 1.0,        // 1x
            armor: 0,           // 0
            healthRegen: 1.0,   // 1 HP/s
            critChance: 0.05,
            xpMultiplier: 1.0,
            pickupRadius: 1.0   // 100
        }
    },
    fire_warrior: {
        id: 'fire_warrior',
        name: 'Fire Warrior',
        price: 150,
        unlocked: false,
        description: 'High damage, low defense',
        spriteType: 'player_fire',
        bodyColor: '#7f1d1d',
        armorColor: '#b91c1c',
        accentColor: '#f97316',
        headColor: '#991b1b',
        gradientColors: ['#f97316', '#7f1d1d'],
        stats: {
            health: 0.8,        // 120 HP
            speed: 0.95,        // 209
            damage: 1.4,        // +40% damage
            armor: 0,
            healthRegen: 0.5,   // 0.5 HP/s
            critChance: 0.12,   // high crit
            xpMultiplier: 1.1,
            pickupRadius: 0.9
        }
    },
    ice_sentinel: {
        id: 'ice_sentinel',
        name: 'Ice Sentinel',
        price: 150,
        unlocked: false,
        description: 'Tanky, slow, resilient',
        spriteType: 'player_ice',
        bodyColor: '#1e3a5f',
        armorColor: '#3b82f6',
        accentColor: '#a5f3fc',
        headColor: '#1e40af',
        gradientColors: ['#a5f3fc', '#1e3a5f'],
        stats: {
            health: 1.5,        // 225 HP
            speed: 0.8,         // 176
            damage: 0.85,       // -15% damage
            armor: 0.2,         // 20% damage reduction
            healthRegen: 2.0,   // 2 HP/s
            critChance: 0.03,
            xpMultiplier: 1.1,
            pickupRadius: 1.0
        }
    },
    shadow_assassin: {
        id: 'shadow_assassin',
        name: 'Shadow Assassin',
        price: 200,
        unlocked: false,
        description: 'Fast, fragile, lethal',
        spriteType: 'player_shadow',
        bodyColor: '#1a1a2e',
        armorColor: '#4a1a6b',
        accentColor: '#c084fc',
        headColor: '#2d1b4e',
        gradientColors: ['#c084fc', '#1a1a2e'],
        stats: {
            health: 0.65,       // 97 HP
            speed: 1.35,        // 297
            damage: 1.25,       // +25% damage
            armor: 0,
            healthRegen: 0.5,
            critChance: 0.2,    // very high crit
            xpMultiplier: 1.2,
            pickupRadius: 1.3
        }
    },
    neon_hacker: {
        id: 'neon_hacker',
        name: 'Neon Hacker',
        price: 250,
        unlocked: false,
        description: 'XP king, wide pickup',
        spriteType: 'player_neon',
        bodyColor: '#064e3b',
        armorColor: '#047857',
        accentColor: '#34d399',
        headColor: '#065f46',
        gradientColors: ['#34d399', '#064e3b'],
        stats: {
            health: 0.9,        // 135 HP
            speed: 1.1,         // 242
            damage: 0.9,        // -10% damage
            armor: 0.05,
            healthRegen: 1.5,
            critChance: 0.08,
            xpMultiplier: 1.5,  // huge XP bonus
            pickupRadius: 1.8   // massive pickup radius
        }
    },
    void_walker: {
        id: 'void_walker',
        name: 'Void Walker',
        price: 300,
        unlocked: false,
        description: 'All-round elite fighter',
        spriteType: 'player_void',
        bodyColor: '#1e1b4b',
        armorColor: '#4338ca',
        accentColor: '#e879f9',
        headColor: '#312e81',
        gradientColors: ['#e879f9', '#1e1b4b'],
        stats: {
            health: 1.2,        // 180 HP
            speed: 1.15,        // 253
            damage: 1.2,        // +20% damage
            armor: 0.1,         // 10% reduction
            healthRegen: 1.5,
            critChance: 0.1,
            xpMultiplier: 1.3,
            pickupRadius: 1.2
        }
    }
};

/**
 * CharacterManager - handles unlocking, purchasing, syncing with backend
 */
export class CharacterManager {
    constructor() {
        this.currentCharacter = CHARACTERS.cyber_soldier;
        this.unlockedCharacters = ['cyber_soldier'];
        this.coinBalance = 0;
        this._syncRetries = 0;
        this._maxRetries = 30;
        this.syncPurchasesFromBackend();
    }

    async syncPurchasesFromBackend() {
        const userId = this._getUserId();
        if (!userId) {
            if (this._syncRetries < this._maxRetries) {
                this._syncRetries++;
                setTimeout(() => this.syncPurchasesFromBackend(), 1000);
            }
            return;
        }
        try {
            const response = await fetch(`/api/coins/${encodeURIComponent(userId)}/purchases/survivorarena`);
            if (response.ok) {
                const data = await response.json();
                this.unlockedCharacters = ['cyber_soldier'];
                if (data.purchased_themes && Array.isArray(data.purchased_themes)) {
                    for (const charId of data.purchased_themes) {
                        if (CHARACTERS[charId] && !this.unlockedCharacters.includes(charId)) {
                            this.unlockedCharacters.push(charId);
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('[CharacterManager] Failed to sync purchases:', e);
        }
    }

    async fetchBalance() {
        const userId = this._getUserId();
        if (!userId) return 0;
        try {
            const response = await fetch(`/api/coins/${encodeURIComponent(userId)}/balance`);
            if (response.ok) {
                const data = await response.json();
                this.coinBalance = data.balance || 0;
                return this.coinBalance;
            }
        } catch (e) {
            console.warn('[CharacterManager] Failed to fetch balance:', e);
        }
        return 0;
    }

    async purchaseCharacter(charId) {
        const char = CHARACTERS[charId];
        if (!char || this.isUnlocked(charId)) return { success: false, reason: 'already_owned' };

        const userId = this._getUserId();
        if (!userId) return { success: false, reason: 'no_user' };

        // Double-check not already purchased
        try {
            const checkResp = await fetch(`/api/coins/${encodeURIComponent(userId)}/purchases/survivorarena`);
            if (checkResp.ok) {
                const checkData = await checkResp.json();
                if (checkData.purchased_themes && checkData.purchased_themes.includes(charId)) {
                    this.unlockCharacter(charId);
                    return { success: true, reason: 'already_owned_server' };
                }
            }
        } catch (e) { /* continue */ }

        // Spend coins
        try {
            const response = await fetch(`/api/coins/${encodeURIComponent(userId)}/spend`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: char.price,
                    transaction_type: 'shop_purchase',
                    source_id: `survivorarena_theme_${charId}`,
                    description: `Purchased Survivor Arena character: ${char.name}`,
                    extra_data: { game: 'survivor-arena', character_id: charId }
                })
            });

            if (response.ok) {
                const data = await response.json();
                this.unlockCharacter(charId);
                this.coinBalance = data.balance_after ?? this.coinBalance - char.price;
                return { success: true, balance: this.coinBalance };
            } else if (response.status === 400) {
                return { success: false, reason: 'insufficient' };
            }
        } catch (e) {
            console.error('[CharacterManager] Purchase failed:', e);
        }
        return { success: false, reason: 'error' };
    }

    unlockCharacter(charId) {
        if (!this.unlockedCharacters.includes(charId)) {
            this.unlockedCharacters.push(charId);
        }
    }

    selectCharacter(charId) {
        if (CHARACTERS[charId] && this.isUnlocked(charId)) {
            this.currentCharacter = CHARACTERS[charId];
            localStorage.setItem('survivorarena_selected_character', charId);
            return true;
        }
        return false;
    }

    isUnlocked(charId) {
        return this.unlockedCharacters.includes(charId);
    }

    getSelected() {
        return this.currentCharacter;
    }

    getAllCharacters() {
        return Object.values(CHARACTERS);
    }

    _getUserId() {
        if (typeof window !== 'undefined' && window.platformConfig && window.platformConfig.userId) {
            return window.platformConfig.userId;
        }
        return null;
    }

    // ===== UI Methods =====

    async openSelector(containerId) {
        const balance = await this.fetchBalance();
        this.renderGrid(containerId, balance);
        const overlay = document.getElementById('characterSelector');
        if (overlay) overlay.classList.remove('hidden');
    }

    closeSelector() {
        const overlay = document.getElementById('characterSelector');
        if (overlay) overlay.classList.add('hidden');
    }

    renderGrid(containerId, balance) {
        const grid = document.getElementById(containerId);
        if (!grid) return;
        grid.innerHTML = '';

        const balanceEl = document.getElementById('charCoinBalance');
        if (balanceEl) balanceEl.textContent = `${balance}`;

        const characters = this.getAllCharacters();
        for (const char of characters) {
            const isOwned = this.isUnlocked(char.id);
            const isSelected = this.currentCharacter.id === char.id;
            const canAfford = balance >= char.price;

            const card = document.createElement('div');
            card.className = 'char-card' + (isSelected ? ' selected' : '') + (!isOwned ? ' locked' : '');

            // Preview canvas - larger
            const previewSize = 110;
            const preview = document.createElement('canvas');
            preview.width = previewSize;
            preview.height = previewSize;
            preview.className = 'char-preview';
            this.drawCharacterPreview(preview, char);

            // Right side container
            const rightSide = document.createElement('div');
            rightSide.className = 'char-card-right';

            // Info
            const info = document.createElement('div');
            info.className = 'char-info';

            // Stats bar helper
            const statBar = (label, value, max, color) => {
                const pct = Math.min(100, Math.round((value / max) * 100));
                return `<div class="char-stat-row"><span class="char-stat-label">${label}</span><div class="char-stat-bar"><div class="char-stat-fill" style="width:${pct}%;background:${color}"></div></div></div>`;
            };
            const s = char.stats;
            info.innerHTML = `
                <span class="char-name">${char.name}</span>
                <span class="char-desc">${char.description}</span>
                <div class="char-stats">
                    ${statBar('HP', s.health, 1.5, '#4ade80')}
                    ${statBar('SPD', s.speed, 1.35, '#60a5fa')}
                    ${statBar('ATK', s.damage, 1.4, '#f87171')}
                    ${statBar('DEF', s.armor, 0.2, '#fbbf24')}
                </div>
                ${s.xpMultiplier > 1 ? `<span class="char-bonus">${s.xpMultiplier}x XP</span>` : ''}
            `;

            // Badge
            const badge = document.createElement('div');
            badge.className = 'char-badge';
            if (isSelected) {
                badge.textContent = 'SELECTED';
                badge.classList.add('badge-selected');
            } else if (isOwned) {
                badge.textContent = 'OWNED';
                badge.classList.add('badge-owned');
            } else if (char.price === 0) {
                badge.textContent = 'FREE';
                badge.classList.add('badge-free');
            } else {
                badge.innerHTML = `<span class="coin-icon">&#x1FA99;</span> ${char.price}`;
                badge.classList.add(canAfford ? 'badge-price' : 'badge-locked');
            }

            rightSide.appendChild(info);
            rightSide.appendChild(badge);

            card.appendChild(preview);
            card.appendChild(rightSide);

            card.addEventListener('click', () => this.onCardClick(char, isOwned, canAfford, containerId, balance));
            grid.appendChild(card);
        }
    }

    async onCardClick(char, isOwned, canAfford, containerId, balance) {
        if (isOwned) {
            this.selectCharacter(char.id);
            this.renderGrid(containerId, balance);
            return;
        }
        if (!canAfford) {
            this.showMessage('Not enough coins!', 'error');
            return;
        }
        // Show purchase confirmation
        this.showPurchaseConfirm(char, containerId);
    }

    showPurchaseConfirm(char, containerId) {
        // Remove any existing confirm
        const existing = document.querySelector('.char-confirm-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.className = 'char-confirm-overlay';
        overlay.innerHTML = `
            <div class="char-confirm-box">
                <p>Buy <strong>${char.name}</strong>?</p>
                <p class="char-confirm-price"><span class="coin-icon">&#x1FA99;</span> ${char.price}</p>
                <div class="char-confirm-buttons">
                    <button class="char-confirm-buy">BUY</button>
                    <button class="char-confirm-cancel">CANCEL</button>
                </div>
            </div>
        `;

        const selector = document.getElementById('characterSelector');
        if (selector) selector.appendChild(overlay);

        overlay.querySelector('.char-confirm-cancel').addEventListener('click', () => overlay.remove());
        overlay.querySelector('.char-confirm-buy').addEventListener('click', async () => {
            overlay.querySelector('.char-confirm-buy').disabled = true;
            overlay.querySelector('.char-confirm-buy').textContent = '...';
            const result = await this.purchaseCharacter(char.id);
            overlay.remove();
            if (result.success) {
                this.selectCharacter(char.id);
                this.showMessage(`${char.name} unlocked!`, 'success');
                const newBalance = await this.fetchBalance();
                this.renderGrid(containerId, newBalance);
            } else if (result.reason === 'insufficient') {
                this.showMessage('Not enough coins!', 'error');
            } else {
                this.showMessage('Purchase failed', 'error');
            }
        });
    }

    showMessage(text, type) {
        const existing = document.querySelector('.char-message');
        if (existing) existing.remove();

        const msg = document.createElement('div');
        msg.className = `char-message char-message-${type}`;
        msg.textContent = text;

        const selector = document.getElementById('characterSelector');
        if (selector) {
            selector.querySelector('.char-selector-content').appendChild(msg);
            setTimeout(() => msg.remove(), 2500);
        }
    }

    drawCharacterPreview(canvas, char) {
        const ctx = canvas.getContext('2d');
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const s = canvas.width * 0.35;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Background glow
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 1.5);
        glow.addColorStop(0, char.gradientColors[0] + '33');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, s * 1.5, 0, Math.PI * 2);
        ctx.fill();

        switch (char.id) {
            case 'cyber_soldier': this._drawCyberSoldier(ctx, cx, cy, s, char); break;
            case 'fire_warrior': this._drawFireWarrior(ctx, cx, cy, s, char); break;
            case 'ice_sentinel': this._drawIceSentinel(ctx, cx, cy, s, char); break;
            case 'shadow_assassin': this._drawShadowAssassin(ctx, cx, cy, s, char); break;
            case 'neon_hacker': this._drawNeonHacker(ctx, cx, cy, s, char); break;
            case 'void_walker': this._drawVoidWalker(ctx, cx, cy, s, char); break;
        }
    }

    // --- Cyber Soldier: standard armored humanoid with visor + antenna ---
    _drawCyberSoldier(ctx, cx, cy, s, c) {
        // Legs
        ctx.fillStyle = c.bodyColor;
        ctx.beginPath(); ctx.ellipse(cx - s*0.15, cy + s*0.55, s*0.1, s*0.22, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + s*0.15, cy + s*0.55, s*0.1, s*0.22, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = c.accentColor;
        ctx.fillRect(cx - s*0.19, cy + s*0.7, s*0.08, s*0.06);
        ctx.fillRect(cx + s*0.11, cy + s*0.7, s*0.08, s*0.06);
        // Arms
        ctx.fillStyle = c.armorColor;
        ctx.beginPath(); ctx.ellipse(cx - s*0.35, cy + s*0.05, s*0.1, s*0.22, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + s*0.35, cy + s*0.05, s*0.1, s*0.22, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = c.accentColor;
        ctx.beginPath(); ctx.arc(cx - s*0.35, cy + s*0.15, s*0.04, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + s*0.35, cy + s*0.15, s*0.04, 0, Math.PI*2); ctx.fill();
        // Jet thrusters (behind body)
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = c.accentColor;
        ctx.beginPath(); ctx.ellipse(cx - s*0.15, cy + s*0.18, s*0.04, s*0.1, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + s*0.15, cy + s*0.18, s*0.04, s*0.1, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.ellipse(cx - s*0.15, cy + s*0.16, s*0.02, s*0.05, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + s*0.15, cy + s*0.16, s*0.02, s*0.05, 0, 0, Math.PI*2); ctx.fill();
        ctx.restore();
        // Body
        ctx.fillStyle = c.bodyColor;
        ctx.beginPath(); ctx.ellipse(cx, cy, s*0.28, s*0.35, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = c.armorColor;
        ctx.beginPath(); ctx.moveTo(cx - s*0.18, cy - s*0.15); ctx.lineTo(cx + s*0.18, cy - s*0.15);
        ctx.lineTo(cx + s*0.13, cy + s*0.15); ctx.lineTo(cx - s*0.13, cy + s*0.15); ctx.closePath(); ctx.fill();
        ctx.fillStyle = c.accentColor;
        ctx.beginPath(); ctx.arc(cx, cy, s*0.08, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(cx, cy, s*0.04, 0, Math.PI*2); ctx.fill();
        // Head
        ctx.fillStyle = c.headColor;
        ctx.beginPath(); ctx.arc(cx, cy - s*0.42, s*0.17, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = c.accentColor; ctx.lineWidth = s*0.06;
        ctx.beginPath(); ctx.arc(cx, cy - s*0.42, s*0.13, -0.7, 0.7); ctx.stroke();
        ctx.lineWidth = s*0.02;
        ctx.beginPath(); ctx.moveTo(cx + s*0.1, cy - s*0.52); ctx.lineTo(cx + s*0.14, cy - s*0.65); ctx.stroke();
        ctx.fillStyle = c.accentColor;
        ctx.beginPath(); ctx.arc(cx + s*0.14, cy - s*0.65, s*0.025, 0, Math.PI*2); ctx.fill();
    }

    // --- Fire Warrior: bulky, flame horns, shoulder pads, fist weapons ---
    _drawFireWarrior(ctx, cx, cy, s, c) {
        // Legs - thick
        ctx.fillStyle = c.bodyColor;
        ctx.beginPath(); ctx.ellipse(cx - s*0.18, cy + s*0.5, s*0.13, s*0.25, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + s*0.18, cy + s*0.5, s*0.13, s*0.25, 0, 0, Math.PI*2); ctx.fill();
        // Flame boots
        ctx.fillStyle = '#ff6600';
        ctx.beginPath(); ctx.ellipse(cx - s*0.18, cy + s*0.72, s*0.12, s*0.06, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + s*0.18, cy + s*0.72, s*0.12, s*0.06, 0, 0, Math.PI*2); ctx.fill();
        // Arms - muscular with spikes
        ctx.fillStyle = c.armorColor;
        ctx.beginPath(); ctx.ellipse(cx - s*0.38, cy, s*0.14, s*0.26, -0.1, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + s*0.38, cy, s*0.14, s*0.26, 0.1, 0, Math.PI*2); ctx.fill();
        // Shoulder pads (spiky)
        ctx.fillStyle = c.accentColor;
        ctx.beginPath(); ctx.moveTo(cx - s*0.3, cy - s*0.2); ctx.lineTo(cx - s*0.48, cy - s*0.3);
        ctx.lineTo(cx - s*0.35, cy - s*0.05); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx + s*0.3, cy - s*0.2); ctx.lineTo(cx + s*0.48, cy - s*0.3);
        ctx.lineTo(cx + s*0.35, cy - s*0.05); ctx.closePath(); ctx.fill();
        // Fist glow
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath(); ctx.arc(cx - s*0.38, cy + s*0.2, s*0.06, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + s*0.38, cy + s*0.2, s*0.06, 0, Math.PI*2); ctx.fill();
        // Flame aura (behind body)
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#ff4400';
        ctx.beginPath();
        ctx.moveTo(cx - s*0.15, cy + s*0.1); ctx.lineTo(cx - s*0.25, cy - s*0.35);
        ctx.lineTo(cx - s*0.05, cy - s*0.1); ctx.lineTo(cx, cy - s*0.4);
        ctx.lineTo(cx + s*0.05, cy - s*0.1); ctx.lineTo(cx + s*0.25, cy - s*0.35);
        ctx.lineTo(cx + s*0.15, cy + s*0.1);
        ctx.closePath(); ctx.fill();
        ctx.restore();
        // Body - broad torso
        ctx.fillStyle = c.bodyColor;
        ctx.beginPath(); ctx.ellipse(cx, cy, s*0.32, s*0.38, 0, 0, Math.PI*2); ctx.fill();
        // Chest plate with flame emblem
        ctx.fillStyle = c.armorColor;
        ctx.beginPath(); ctx.moveTo(cx - s*0.22, cy - s*0.2); ctx.lineTo(cx + s*0.22, cy - s*0.2);
        ctx.lineTo(cx + s*0.15, cy + s*0.2); ctx.lineTo(cx - s*0.15, cy + s*0.2); ctx.closePath(); ctx.fill();
        // Flame emblem
        ctx.fillStyle = c.accentColor;
        ctx.beginPath(); ctx.moveTo(cx, cy - s*0.12); ctx.lineTo(cx - s*0.08, cy + s*0.08);
        ctx.quadraticCurveTo(cx, cy + s*0.02, cx + s*0.08, cy + s*0.08); ctx.closePath(); ctx.fill();
        // Head - angular helmet
        ctx.fillStyle = c.headColor;
        ctx.beginPath();
        ctx.moveTo(cx - s*0.18, cy - s*0.25); ctx.lineTo(cx + s*0.18, cy - s*0.25);
        ctx.lineTo(cx + s*0.14, cy - s*0.55); ctx.lineTo(cx - s*0.14, cy - s*0.55);
        ctx.closePath(); ctx.fill();
        // Flame horns
        ctx.fillStyle = c.accentColor;
        ctx.beginPath(); ctx.moveTo(cx - s*0.14, cy - s*0.55); ctx.lineTo(cx - s*0.22, cy - s*0.75);
        ctx.lineTo(cx - s*0.06, cy - s*0.5); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx + s*0.14, cy - s*0.55); ctx.lineTo(cx + s*0.22, cy - s*0.75);
        ctx.lineTo(cx + s*0.06, cy - s*0.5); ctx.closePath(); ctx.fill();
        // Eyes - angry slits
        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(cx - s*0.1, cy - s*0.42, s*0.07, s*0.03);
        ctx.fillRect(cx + s*0.03, cy - s*0.42, s*0.07, s*0.03);
    }

    // --- Ice Sentinel: wide, chunky, shield, crystal visor ---
    _drawIceSentinel(ctx, cx, cy, s, c) {
        // Frost ring at feet
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = c.accentColor;
        ctx.beginPath(); ctx.ellipse(cx, cy + s*0.7, s*0.4, s*0.08, 0, 0, Math.PI*2); ctx.fill();
        ctx.restore();
        // Legs - short and wide
        ctx.fillStyle = c.bodyColor;
        ctx.beginPath(); ctx.ellipse(cx - s*0.2, cy + s*0.5, s*0.14, s*0.2, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + s*0.2, cy + s*0.5, s*0.14, s*0.2, 0, 0, Math.PI*2); ctx.fill();
        // Ice boots
        ctx.fillStyle = c.accentColor;
        ctx.beginPath(); ctx.ellipse(cx - s*0.2, cy + s*0.65, s*0.14, s*0.06, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + s*0.2, cy + s*0.65, s*0.14, s*0.06, 0, 0, Math.PI*2); ctx.fill();
        // Left arm - shield arm (big shield!)
        ctx.fillStyle = c.armorColor;
        ctx.beginPath(); ctx.ellipse(cx - s*0.4, cy + s*0.05, s*0.13, s*0.24, 0, 0, Math.PI*2); ctx.fill();
        // Shield (hexagonal)
        ctx.fillStyle = c.accentColor + 'aa';
        ctx.strokeStyle = c.accentColor; ctx.lineWidth = s*0.03;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (Math.PI * 2 / 6) * i - Math.PI / 2;
            const px = cx - s*0.52 + Math.cos(a) * s*0.16;
            const py = cy + Math.sin(a) * s*0.2;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // Right arm
        ctx.fillStyle = c.armorColor;
        ctx.beginPath(); ctx.ellipse(cx + s*0.38, cy + s*0.05, s*0.12, s*0.24, 0, 0, Math.PI*2); ctx.fill();
        // Crystal shoulder shards
        ctx.fillStyle = c.accentColor;
        ctx.beginPath();
        ctx.moveTo(cx - s*0.3, cy - s*0.2); ctx.lineTo(cx - s*0.35, cy - s*0.4);
        ctx.lineTo(cx - s*0.25, cy - s*0.2); ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + s*0.3, cy - s*0.2); ctx.lineTo(cx + s*0.35, cy - s*0.4);
        ctx.lineTo(cx + s*0.25, cy - s*0.2); ctx.closePath(); ctx.fill();
        // Crystal highlights
        ctx.fillStyle = '#ffffffaa';
        ctx.beginPath();
        ctx.moveTo(cx - s*0.31, cy - s*0.22); ctx.lineTo(cx - s*0.34, cy - s*0.35);
        ctx.lineTo(cx - s*0.29, cy - s*0.22); ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + s*0.29, cy - s*0.22); ctx.lineTo(cx + s*0.34, cy - s*0.35);
        ctx.lineTo(cx + s*0.31, cy - s*0.22); ctx.closePath(); ctx.fill();
        // Body - very wide
        ctx.fillStyle = c.bodyColor;
        ctx.beginPath(); ctx.ellipse(cx, cy, s*0.35, s*0.4, 0, 0, Math.PI*2); ctx.fill();
        // Chest armor with crystal pattern
        ctx.fillStyle = c.armorColor;
        ctx.beginPath(); ctx.moveTo(cx - s*0.25, cy - s*0.2); ctx.lineTo(cx + s*0.25, cy - s*0.2);
        ctx.lineTo(cx + s*0.2, cy + s*0.2); ctx.lineTo(cx - s*0.2, cy + s*0.2); ctx.closePath(); ctx.fill();
        // Crystal on chest
        ctx.fillStyle = c.accentColor;
        ctx.beginPath();
        ctx.moveTo(cx, cy - s*0.15); ctx.lineTo(cx + s*0.08, cy); ctx.lineTo(cx, cy + s*0.1);
        ctx.lineTo(cx - s*0.08, cy); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffffff66';
        ctx.beginPath();
        ctx.moveTo(cx - s*0.02, cy - s*0.12); ctx.lineTo(cx + s*0.04, cy - s*0.02);
        ctx.lineTo(cx - s*0.02, cy); ctx.closePath(); ctx.fill();
        // Head - round with flat top visor
        ctx.fillStyle = c.headColor;
        ctx.beginPath(); ctx.arc(cx, cy - s*0.42, s*0.2, 0, Math.PI*2); ctx.fill();
        // Flat visor
        ctx.fillStyle = c.accentColor;
        ctx.fillRect(cx - s*0.16, cy - s*0.46, s*0.32, s*0.08);
        // Crystal spike on top
        ctx.fillStyle = c.accentColor;
        ctx.beginPath(); ctx.moveTo(cx, cy - s*0.62); ctx.lineTo(cx - s*0.05, cy - s*0.52);
        ctx.lineTo(cx + s*0.05, cy - s*0.52); ctx.closePath(); ctx.fill();
    }

    // --- Shadow Assassin: slim, hood, daggers, cape ---
    _drawShadowAssassin(ctx, cx, cy, s, c) {
        // Shadow trail (behind everything)
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = c.bodyColor;
        ctx.beginPath(); ctx.ellipse(cx, cy + s*0.5, s*0.35, s*0.12, 0, 0, Math.PI*2); ctx.fill();
        ctx.restore();
        // Cape (behind body)
        ctx.fillStyle = c.bodyColor + 'cc';
        ctx.beginPath();
        ctx.moveTo(cx - s*0.2, cy - s*0.15);
        ctx.quadraticCurveTo(cx - s*0.35, cy + s*0.5, cx - s*0.15, cy + s*0.7);
        ctx.lineTo(cx + s*0.15, cy + s*0.7);
        ctx.quadraticCurveTo(cx + s*0.35, cy + s*0.5, cx + s*0.2, cy - s*0.15);
        ctx.closePath(); ctx.fill();
        // Legs - slim
        ctx.fillStyle = c.bodyColor;
        ctx.beginPath(); ctx.ellipse(cx - s*0.1, cy + s*0.5, s*0.07, s*0.22, -0.1, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + s*0.1, cy + s*0.5, s*0.07, s*0.22, 0.1, 0, Math.PI*2); ctx.fill();
        // Body - slim torso
        ctx.fillStyle = c.bodyColor;
        ctx.beginPath(); ctx.ellipse(cx, cy, s*0.2, s*0.32, 0, 0, Math.PI*2); ctx.fill();
        // Belt
        ctx.fillStyle = c.armorColor;
        ctx.fillRect(cx - s*0.18, cy + s*0.1, s*0.36, s*0.05);
        ctx.fillStyle = c.accentColor;
        ctx.beginPath(); ctx.arc(cx, cy + s*0.125, s*0.03, 0, Math.PI*2); ctx.fill();
        // Head - hooded
        ctx.fillStyle = c.armorColor;
        ctx.beginPath();
        ctx.moveTo(cx - s*0.22, cy - s*0.2);
        ctx.quadraticCurveTo(cx, cy - s*0.7, cx + s*0.22, cy - s*0.2);
        ctx.closePath(); ctx.fill();
        // Face shadow
        ctx.fillStyle = '#0a0a15';
        ctx.beginPath();
        ctx.ellipse(cx, cy - s*0.35, s*0.12, s*0.1, 0, 0, Math.PI*2); ctx.fill();
        // Glowing eyes
        ctx.fillStyle = c.accentColor;
        ctx.shadowColor = c.accentColor; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(cx - s*0.06, cy - s*0.37, s*0.025, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + s*0.06, cy - s*0.37, s*0.025, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
    }

    // --- Neon Hacker: floating drones, screen face, circuit lines, thin ---
    _drawNeonHacker(ctx, cx, cy, s, c) {
        // Small floating drones (orbiting)
        ctx.fillStyle = c.accentColor;
        ctx.strokeStyle = c.accentColor; ctx.lineWidth = s*0.01;
        for (let i = 0; i < 3; i++) {
            const a = (Math.PI * 2 / 3) * i - Math.PI / 4;
            const dx = cx + Math.cos(a) * s*0.55;
            const dy = cy - s*0.1 + Math.sin(a) * s*0.35;
            ctx.beginPath(); ctx.rect(dx - s*0.04, dy - s*0.03, s*0.08, s*0.06); ctx.fill();
            // Drone glow
            ctx.beginPath(); ctx.arc(dx, dy, s*0.06, 0, Math.PI*2); ctx.stroke();
        }
        // Legs - robotic with circuit lines
        ctx.fillStyle = c.bodyColor;
        ctx.beginPath(); ctx.ellipse(cx - s*0.12, cy + s*0.5, s*0.08, s*0.22, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + s*0.12, cy + s*0.5, s*0.08, s*0.22, 0, 0, Math.PI*2); ctx.fill();
        // Circuit lines on legs
        ctx.strokeStyle = c.accentColor; ctx.lineWidth = s*0.015;
        ctx.beginPath(); ctx.moveTo(cx - s*0.12, cy + s*0.35); ctx.lineTo(cx - s*0.12, cy + s*0.65); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + s*0.12, cy + s*0.35); ctx.lineTo(cx + s*0.12, cy + s*0.65); ctx.stroke();
        // Arms - thin mechanical
        ctx.fillStyle = c.armorColor;
        ctx.beginPath(); ctx.ellipse(cx - s*0.3, cy + s*0.05, s*0.08, s*0.2, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + s*0.3, cy + s*0.05, s*0.08, s*0.2, 0, 0, Math.PI*2); ctx.fill();
        // Holographic wrist displays
        ctx.fillStyle = c.accentColor + '88';
        ctx.fillRect(cx - s*0.36, cy + s*0.08, s*0.12, s*0.06);
        ctx.fillRect(cx + s*0.24, cy + s*0.08, s*0.12, s*0.06);
        // Body
        ctx.fillStyle = c.bodyColor;
        ctx.beginPath(); ctx.ellipse(cx, cy, s*0.24, s*0.32, 0, 0, Math.PI*2); ctx.fill();
        // Circuit board chest
        ctx.fillStyle = c.armorColor;
        ctx.fillRect(cx - s*0.15, cy - s*0.15, s*0.3, s*0.3);
        ctx.strokeStyle = c.accentColor; ctx.lineWidth = s*0.015;
        // Circuit traces
        ctx.beginPath(); ctx.moveTo(cx - s*0.1, cy - s*0.1); ctx.lineTo(cx, cy - s*0.1);
        ctx.lineTo(cx, cy + s*0.05); ctx.lineTo(cx + s*0.1, cy + s*0.05); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - s*0.1, cy + s*0.02); ctx.lineTo(cx - s*0.04, cy + s*0.02);
        ctx.lineTo(cx - s*0.04, cy + s*0.1); ctx.stroke();
        // Nodes
        ctx.fillStyle = c.accentColor;
        ctx.beginPath(); ctx.arc(cx - s*0.1, cy - s*0.1, s*0.02, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + s*0.1, cy + s*0.05, s*0.02, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy - s*0.1, s*0.02, 0, Math.PI*2); ctx.fill();
        // Head - screen face
        ctx.fillStyle = c.headColor;
        ctx.fillRect(cx - s*0.14, cy - s*0.58, s*0.28, s*0.24);
        // Screen
        ctx.fillStyle = '#001a0d';
        ctx.fillRect(cx - s*0.11, cy - s*0.55, s*0.22, s*0.18);
        // Screen face (emoticon)
        ctx.fillStyle = c.accentColor;
        ctx.shadowColor = c.accentColor; ctx.shadowBlur = 4;
        ctx.fillRect(cx - s*0.08, cy - s*0.5, s*0.04, s*0.04);
        ctx.fillRect(cx + s*0.04, cy - s*0.5, s*0.04, s*0.04);
        // Mouth (line)
        ctx.strokeStyle = c.accentColor; ctx.lineWidth = s*0.02;
        ctx.beginPath(); ctx.moveTo(cx - s*0.06, cy - s*0.4); ctx.lineTo(cx + s*0.06, cy - s*0.4); ctx.stroke();
        ctx.shadowBlur = 0;
        // Antenna
        ctx.strokeStyle = c.accentColor; ctx.lineWidth = s*0.015;
        ctx.beginPath(); ctx.moveTo(cx + s*0.1, cy - s*0.55); ctx.lineTo(cx + s*0.14, cy - s*0.68); ctx.stroke();
        ctx.fillStyle = c.accentColor;
        ctx.beginPath(); ctx.arc(cx + s*0.14, cy - s*0.68, s*0.02, 0, Math.PI*2); ctx.fill();
        // Data orb
        ctx.fillStyle = c.accentColor;
        ctx.shadowColor = c.accentColor; ctx.shadowBlur = 4;
        ctx.beginPath(); ctx.arc(cx + s*0.4, cy - s*0.3, s*0.035, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(cx + s*0.4, cy - s*0.3, s*0.015, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
    }

    // --- Void Walker: floating, robe-like, energy orbs, no visible legs ---
    _drawVoidWalker(ctx, cx, cy, s, c) {
        // Void mist (below robe)
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = c.accentColor;
        ctx.beginPath(); ctx.ellipse(cx, cy + s*0.55, s*0.4, s*0.1, 0, 0, Math.PI*2); ctx.fill();
        ctx.restore();
        // Energy trail (below robe)
        const trailGrad = ctx.createLinearGradient(cx, cy + s*0.3, cx, cy + s*0.8);
        trailGrad.addColorStop(0, c.accentColor + '66');
        trailGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = trailGrad;
        ctx.beginPath();
        ctx.moveTo(cx - s*0.2, cy + s*0.3);
        ctx.quadraticCurveTo(cx - s*0.25, cy + s*0.6, cx - s*0.1, cy + s*0.8);
        ctx.lineTo(cx + s*0.1, cy + s*0.8);
        ctx.quadraticCurveTo(cx + s*0.25, cy + s*0.6, cx + s*0.2, cy + s*0.3);
        ctx.closePath(); ctx.fill();
        // Floating orbs (3 orbiting)
        ctx.shadowColor = c.accentColor; ctx.shadowBlur = 6;
        ctx.fillStyle = c.accentColor;
        for (let i = 0; i < 3; i++) {
            const a = (Math.PI * 2 / 3) * i;
            const ox = cx + Math.cos(a) * s*0.45;
            const oy = cy + Math.sin(a) * s*0.3;
            ctx.beginPath(); ctx.arc(ox, oy, s*0.04, 0, Math.PI*2); ctx.fill();
        }
        ctx.shadowBlur = 0;
        // Secondary smaller orbs
        ctx.fillStyle = c.accentColor + '88';
        for (let i = 0; i < 3; i++) {
            const a2 = (Math.PI * 2 / 3) * i + Math.PI / 3;
            const ox2 = cx + Math.cos(a2) * s*0.32;
            const oy2 = cy + Math.sin(a2) * s*0.2;
            ctx.beginPath(); ctx.arc(ox2, oy2, s*0.025, 0, Math.PI*2); ctx.fill();
        }
        // Arms - robed, wide sleeves
        ctx.fillStyle = c.armorColor;
        ctx.beginPath();
        ctx.moveTo(cx - s*0.22, cy - s*0.1); ctx.lineTo(cx - s*0.45, cy + s*0.15);
        ctx.lineTo(cx - s*0.4, cy + s*0.25); ctx.lineTo(cx - s*0.2, cy + s*0.1);
        ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + s*0.22, cy - s*0.1); ctx.lineTo(cx + s*0.45, cy + s*0.15);
        ctx.lineTo(cx + s*0.4, cy + s*0.25); ctx.lineTo(cx + s*0.2, cy + s*0.1);
        ctx.closePath(); ctx.fill();
        // Hand orbs
        ctx.fillStyle = c.accentColor;
        ctx.shadowColor = c.accentColor; ctx.shadowBlur = 5;
        ctx.beginPath(); ctx.arc(cx - s*0.43, cy + s*0.2, s*0.045, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + s*0.43, cy + s*0.2, s*0.045, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
        // Body - robe shape (wider at bottom)
        ctx.fillStyle = c.bodyColor;
        ctx.beginPath();
        ctx.moveTo(cx - s*0.2, cy - s*0.2);
        ctx.lineTo(cx - s*0.25, cy + s*0.3);
        ctx.quadraticCurveTo(cx, cy + s*0.4, cx + s*0.25, cy + s*0.3);
        ctx.lineTo(cx + s*0.2, cy - s*0.2);
        ctx.closePath(); ctx.fill();
        // Robe trim
        ctx.strokeStyle = c.accentColor; ctx.lineWidth = s*0.02;
        ctx.beginPath();
        ctx.moveTo(cx - s*0.25, cy + s*0.3);
        ctx.quadraticCurveTo(cx, cy + s*0.4, cx + s*0.25, cy + s*0.3);
        ctx.stroke();
        // Central rune
        ctx.fillStyle = c.accentColor + '88';
        ctx.beginPath();
        ctx.moveTo(cx, cy - s*0.1); ctx.lineTo(cx + s*0.06, cy + s*0.05);
        ctx.lineTo(cx, cy + s*0.15); ctx.lineTo(cx - s*0.06, cy + s*0.05);
        ctx.closePath(); ctx.fill();
        // Head - floating with halo
        ctx.fillStyle = c.headColor;
        ctx.beginPath(); ctx.arc(cx, cy - s*0.4, s*0.18, 0, Math.PI*2); ctx.fill();
        // Halo
        ctx.strokeStyle = c.accentColor; ctx.lineWidth = s*0.025;
        ctx.beginPath(); ctx.ellipse(cx, cy - s*0.58, s*0.15, s*0.04, 0, 0, Math.PI*2); ctx.stroke();
        // Eyes - energy
        ctx.fillStyle = c.accentColor;
        ctx.shadowColor = c.accentColor; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(cx - s*0.07, cy - s*0.42, s*0.035, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + s*0.07, cy - s*0.42, s*0.035, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
    }
}

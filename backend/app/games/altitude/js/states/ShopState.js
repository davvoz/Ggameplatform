/**
 * ShopState - Upgrade shop state
 * Player can purchase upgrades using collected coins.
 */

import { State } from './State.js';
import { DESIGN_WIDTH, DESIGN_HEIGHT, COLORS, UPGRADE_CATALOG } from '../config/Constants.js';
import { drawUpgradeIcon } from '../graphics/UpgradeIcons.js';
import { bitmapFont } from '../graphics/BitmapFont.js';

export class ShopState extends State {
    #categories = ['mobility', 'combat', 'collection', 'score'];
    #selectedCategory = 0;
    #selectedUpgrade = 0;
    #scrollOffset = 0;
    #animTime = 0;
    #notification = null;

    // Back button hit region (canvas coords)
    static #BACK_BTN = { x: 10, y: 10, w: 70, h: 36 };

    // Prestige button — shown in header below coins when all upgrades are maxed
    static #PRESTIGE_BTN = { x: 20, y: 72, w: 360, h: 28 };

    enter() {
        this.#selectedCategory = 0;
        this.#selectedUpgrade = 0;
        this.#scrollOffset = 0;
        this.#notification = null;
    }

    exit() {
        // Save progress
        this._game.saveProgress();
    }

    update(dt) {
        this.#animTime += dt;
        const input = this._game.input;

        // ── Touch / click only ────────────────────────────────────────────
        if (input.justTapped) {
            this.#handleTap(input.tapX, input.tapY);
            input.consumeTap();
        }

        // Notification timer
        if (this.#notification?.time > 0) {
            this.#notification.time -= dt;
            if (this.#notification.time <= 0) this.#notification = null;
        }
    }

    #handleTap(tx, ty) {
        if (this.#tapBackButton(tx, ty)) return;
        if (this.#tapPrestigeButton(tx, ty)) return;
        if (this.#tapCategoryTab(tx, ty)) return;

        const listStartY = 150;
        const itemHeight = 90;
        const listEndY = listStartY + itemHeight * 4;

        if (this.#tapUpgradeItem(tx, ty, listStartY, listEndY, itemHeight)) return;
        if (ty < listStartY && ty >= listStartY - 30) { this.#changeUpgrade(-1); return; }
        if (ty > listEndY && ty <= listEndY + 30) this.#changeUpgrade(1);
    }

    #tapBackButton(tx, ty) {
        const btn = ShopState.#BACK_BTN;
        if (tx < btn.x || tx > btn.x + btn.w || ty < btn.y || ty > btn.y + btn.h) return false;
        this._game.closeShop();
        return true;
    }

    #tapPrestigeButton(tx, ty) {
        if (!this.#isAllMaxed()) return false;
        const pb = ShopState.#PRESTIGE_BTN;
        if (tx < pb.x || tx > pb.x + pb.w || ty < pb.y || ty > pb.y + pb.h) return false;
        this._game.openPrestige();
        return true;
    }

    #tapCategoryTab(tx, ty) {
        if (ty < 75 || ty > 135) return false;
        const tabWidth = DESIGN_WIDTH / this.#categories.length;
        const tappedCat = Math.floor(tx / tabWidth);
        if (tappedCat >= 0 && tappedCat < this.#categories.length) {
            this.#selectedCategory = tappedCat;
            this.#selectedUpgrade = 0;
            this.#scrollOffset = 0;
            this._game.sound.playSelect();
        }
        return true;
    }

    #tapUpgradeItem(tx, ty, listStartY, listEndY, itemHeight) {
        if (tx < 20 || tx > DESIGN_WIDTH - 20 || ty < listStartY || ty > listEndY) return false;
        const idx = Math.floor((ty - listStartY) / itemHeight) + this.#scrollOffset;
        const upgrades = this.#getCurrentUpgrades();
        if (idx >= 0 && idx < upgrades.length) {
            if (idx === this.#selectedUpgrade) {
                this.#purchaseUpgrade();
            } else {
                this.#selectedUpgrade = idx;
                this._game.sound.playSelect();
            }
        }
        return true;
    }

    #changeUpgrade(dir) {
        const upgrades = this.#getCurrentUpgrades();
        this.#selectedUpgrade = Math.max(0, Math.min(this.#selectedUpgrade + dir, upgrades.length - 1));

        // Scroll if needed
        const visibleItems = 4;
        if (this.#selectedUpgrade < this.#scrollOffset) {
            this.#scrollOffset = this.#selectedUpgrade;
        } else if (this.#selectedUpgrade >= this.#scrollOffset + visibleItems) {
            this.#scrollOffset = this.#selectedUpgrade - visibleItems + 1;
        }

        this._game.sound.playSelect();
    }

    #purchaseUpgrade() {
        const upgrades = this.#getCurrentUpgrades();
        if (upgrades.length === 0) return;

        const upgrade = upgrades[this.#selectedUpgrade];
        const currentLevel = this._game.getUpgradeLevel(upgrade.id);

        // Check if already maxed
        if (currentLevel >= upgrade.maxLevel) {
            if (this.#isAllMaxed()) {
                this.#showNotification('All maxed! Tap ⭐ PRESTIGE below.', 'error');
            } else {
                this.#showNotification('Already maxed!', 'error');
            }
            this._game.sound.playError();
            return;
        }

        // Calculate price
        const price = this.#getUpgradePrice(upgrade, currentLevel);

        // Check if can afford
        if (!this._game.spendCoins(price)) {
            this.#showNotification('Not enough coins!', 'error');
            this._game.sound.playError();
            return;
        }

        // Purchase
        this._game.upgradeLevel(upgrade.id);
        this.#showNotification(`${upgrade.name} upgraded!`, 'success');
        this._game.sound.playPurchase();
    }

    #getCurrentUpgrades() {
        const category = this.#categories[this.#selectedCategory];
        return Object.values(UPGRADE_CATALOG).filter(u => u.category === category);
    }

    #isAllMaxed() {
        return this._game.isAllUpgradesMaxed();
    }

    #getPrestigeProgress() {
        const all = Object.values(UPGRADE_CATALOG);
        const missing = all.filter(u => this._game.getUpgradeLevel(u.id) < u.maxLevel);
        return { maxed: all.length - missing.length, total: all.length, missing };
    }

    #isCategoryMaxed(category) {
        return Object.values(UPGRADE_CATALOG)
            .filter(u => u.category === category)
            .every(u => this._game.getUpgradeLevel(u.id) >= u.maxLevel);
    }

    #getUpgradePrice(upgrade, level) {
        return Math.floor(upgrade.baseCost * Math.pow(upgrade.costScale, level));
    }

    #showNotification(message, type) {
        this.#notification = { message, type, time: 1.5 };
    }

    draw(ctx) {
        // Background
        this.#drawBackground(ctx);

        // Back button (drawn first so header overlaps correctly)
        this.#drawBackButton(ctx);

        // Header
        this.#drawHeader(ctx);

        // Category tabs
        this.#drawCategoryTabs(ctx);

        // Upgrade list
        this.#drawUpgradeList(ctx);

        // Prestige section (only when all upgrades maxed)
        this.#drawPrestigeSection(ctx);

        // Notification
        this.#drawNotification(ctx);

        // Instructions
        this.#drawInstructions(ctx);
    }

    #drawBackButton(ctx) {
        const btn = ShopState.#BACK_BTN;
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('← BACK', btn.x + btn.w / 2, btn.y + btn.h / 2);
        ctx.textBaseline = 'alphabetic';
        ctx.restore();
    }

    #drawBackground(ctx) {
        const gradient = ctx.createLinearGradient(0, 0, 0, DESIGN_HEIGHT);
        gradient.addColorStop(0, COLORS.BG_PRIMARY);
        gradient.addColorStop(1, COLORS.BG_SECONDARY);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

        // Decorative particles
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        for (let i = 0; i < 20; i++) {
            const x = (i * 53 + this.#animTime * 20) % (DESIGN_WIDTH + 50) - 25;
            const y = (i * 67 + this.#animTime * 10) % DESIGN_HEIGHT;
            const size = 2 + (i % 3);
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    #drawHeader(ctx) {
        ctx.save();


        //shadow
        bitmapFont.drawText(ctx, 'UPGRADES', DESIGN_WIDTH / 2 + 2, 36, 28, {
            align: 'center', color: 'rgb(71, 67, 1)',
        });

        bitmapFont.drawText(ctx, 'UPGRADES', DESIGN_WIDTH / 2, 34, 28, {
            align: 'center', color: COLORS.NEON_CYAN,
        });


        // Coins display
        ctx.fillStyle = COLORS.COIN_GOLD;
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'center';
        bitmapFont.drawText(ctx, `${this._game.getCoins()}`, DESIGN_WIDTH / 2 + 2, 62 + 2, 28,
            { align: 'center', color: 'rgba(0, 0, 0, 1)' });
        bitmapFont.drawText(ctx, `${this._game.getCoins()}`, DESIGN_WIDTH / 2, 62, 28,
            { align: 'center', color: COLORS.COIN_GOLD });
        // Prestige banner or progress counter
        const btn = ShopState.#PRESTIGE_BTN;
        if (this.#isAllMaxed()) {
            const pulse = 0.7 + Math.sin(this.#animTime * 2.8) * 0.25;
            ctx.shadowColor = COLORS.NEON_YELLOW;
            ctx.shadowBlur = Math.floor(16 * pulse);
            ctx.fillStyle = COLORS.NEON_YELLOW;
            ctx.strokeStyle = COLORS.NEON_YELLOW;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 8);
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.fillStyle = COLORS.BG_PRIMARY;
            ctx.font = 'bold 13px monospace';
            ctx.textBaseline = 'middle';
            ctx.fillText('⭐  ALL MAXED! TAP HERE TO PRESTIGE  ⭐', DESIGN_WIDTH / 2, btn.y + btn.h / 2);
            ctx.textBaseline = 'alphabetic';
        } else {
            const { maxed, total, missing } = this.#getPrestigeProgress();
            ctx.textBaseline = 'middle';
            ctx.font = '12px monospace';
            ctx.fillStyle = COLORS.UI_TEXT_DIM;
            let label;
            if (missing.length === 1) {
                label = `🔓 ${maxed} / ${total} — missing: ${missing[0].name} (${missing[0].category})`;
            } else if (missing.length <= 3) {
                label = `🔓 ${maxed} / ${total} — left: ${missing.map(u => u.name).join(', ')}`;
            } else {
                label = `🔓 ${maxed} / ${total} upgrades maxed — keep buying!`;
            }
            ctx.fillText(label, DESIGN_WIDTH / 2, btn.y + btn.h / 2);
            ctx.textBaseline = 'alphabetic';
        }

        ctx.restore();
    }

    #drawCategoryTabs(ctx) {
        ctx.save();

        const tabWidth = DESIGN_WIDTH / this.#categories.length;
        const y = 100;

        this.#categories.forEach((cat, i) => {
            const x = tabWidth * i;
            const isSelected = i === this.#selectedCategory;

            // Tab background
            if (isSelected) {
                ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
                ctx.fillRect(x + 2, y, tabWidth - 4, 35);


            }

            // Tab text
            ctx.fillStyle = isSelected ? COLORS.NEON_CYAN : '#888888';
            ctx.font = isSelected ? 'bold 14px monospace' : '13px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(this.#getCategoryIcon(cat), x + tabWidth / 2, y + 15);
            bitmapFont.drawText(ctx, cat.toUpperCase(), x + tabWidth / 2, y + 27, 15, {
                align: 'center',
                color: isSelected ? COLORS.UI_TEXT : '#888888',
            });

            // Small checkmark dot when all upgrades in this category are maxed
            if (this.#isCategoryMaxed(cat)) {
                ctx.fillStyle = COLORS.NEON_CYAN;
                ctx.shadowColor = COLORS.NEON_CYAN;
                ctx.shadowBlur = 6;
                ctx.font = '9px monospace';
                ctx.textAlign = 'right';
                ctx.fillText('✓', x + tabWidth - 4, y + 10);
                ctx.shadowBlur = 0;
            }
        });

        ctx.restore();
    }

    #getCategoryIcon(category) {
        switch (category) {
            case 'mobility': return '🏃';
            case 'combat': return '⚔️';
            case 'collection': return '💎';
            case 'score': return '⭐';
            default: return '📦';
        }
    }

    #drawUpgradeList(ctx) {
        ctx.save();

        const upgrades = this.#getCurrentUpgrades();
        const startY = 150;
        const itemHeight = 90;
        const visibleItems = 4;

        if (upgrades.length === 0) {
            bitmapFont.drawText(ctx, 'No upgrades available', DESIGN_WIDTH / 2, startY + 50, 16, {
                align: 'center', color: '#888888',
            });
            ctx.restore();
            return;
        }

        // Clip to list area
        ctx.beginPath();
        ctx.rect(10, startY, DESIGN_WIDTH - 20, itemHeight * visibleItems);
        ctx.clip();

        upgrades.forEach((upgrade, i) => {
            const y = startY + (i - this.#scrollOffset) * itemHeight;

            if (y < startY - itemHeight || y > startY + itemHeight * visibleItems) return;

            const isSelected = i === this.#selectedUpgrade;
            const currentLevel = this._game.getUpgradeLevel(upgrade.id);
            const isMaxed = currentLevel >= upgrade.maxLevel;
            const price = this.#getUpgradePrice(upgrade, currentLevel);
            const canAfford = this._game.getCoins() >= price;

            this.#drawUpgradeItem(ctx, upgrade, y, {
                isSelected, currentLevel, isMaxed, price, canAfford
            });
        });

        ctx.restore();

        // Scroll indicators
        if (this.#scrollOffset > 0) {
            ctx.fillStyle = '#ffffff';
            ctx.font = '20px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('▲', DESIGN_WIDTH / 2, startY - 5);
        }
        if (this.#scrollOffset + visibleItems < upgrades.length) {
            ctx.fillStyle = '#ffffff';
            ctx.font = '20px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('▼', DESIGN_WIDTH / 2, startY + itemHeight * visibleItems + 15);
        }
    }

    #drawUpgradeItem(ctx, upgrade, y, state) {
        const { isSelected, currentLevel, isMaxed, price, canAfford } = state;
        const x = 20;
        const width = DESIGN_WIDTH - 40;
        const height = 80;

        // Background
        if (isSelected) {
            ctx.fillStyle = 'rgba(0, 255, 255, 0.15)';
            ctx.fillRect(x, y, width, height);

            // Border
            ctx.strokeStyle = COLORS.NEON_CYAN;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, width, height);
        } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.fillRect(x, y, width, height);
        }

        // Icon — canvas-drawn pixel-art style (40×40 box starting at x+5, y+5)
        drawUpgradeIcon(ctx, upgrade.id, x + 5, y + 5, 50);

        //shadow
        bitmapFont.drawText(ctx, upgrade.name, x + 60 + 2, y + 17 + 2, 25, {
            color: COLORS.BG_PRIMARY,
        });
        // Name
        bitmapFont.drawText(ctx, upgrade.name, x + 60, y + 17, 25, {
            color: COLORS.UI_TEXT,
        });

        // Description
        ctx.fillStyle = COLORS.UI_TEXT_DIM;
        ctx.font = '11px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(upgrade.description, x + 60, y + 38);

        // Level bar
        const barX = x + 60;
        const barY = y + 50;
        const barWidth = 150;
        const barHeight = 8;

        ctx.fillStyle = '#333333';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        const fillWidth = (currentLevel / upgrade.maxLevel) * barWidth;
        ctx.fillStyle = isMaxed ? COLORS.NEON_GREEN : COLORS.NEON_CYAN;
        ctx.fillRect(barX, barY, fillWidth, barHeight);

        // Level text
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px monospace';
        ctx.fillText(`Lv. ${currentLevel}/${upgrade.maxLevel}`, barX + barWidth + 10, barY + 7);

        // Price or status
        if (isMaxed) {
            bitmapFont.drawText(ctx, 'MAXED', x + width - 10, y + 26, 15, {
                align: 'right', color: COLORS.NEON_GREEN,
            });
        } else {
            ctx.fillStyle = canAfford ? COLORS.COIN_GOLD : '#ff4444';
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(`💰 ${price}`, x + width - 10, y + 30);
        }

        // Effect preview — next level cost
        if (!isMaxed) {
            const nextPrice = this.#getUpgradePrice(upgrade, currentLevel + 1);
            ctx.fillStyle = '#888888';
            ctx.font = '10px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(`Next: ${nextPrice}`, x + width - 10, y + 50);
        }
    }

    #drawNotification(ctx) {
        if (!this.#notification) return;

        const alpha = Math.min(1, this.#notification.time * 2);
        ctx.save();
        ctx.globalAlpha = alpha;

        const y = DESIGN_HEIGHT - 120;

        ctx.fillStyle = this.#notification.type === 'success'
            ? 'rgba(0, 255, 100, 0.2)'
            : 'rgba(255, 100, 100, 0.2)';
        ctx.fillRect(50, y, DESIGN_WIDTH - 100, 40);

        const notifColor = this.#notification.type === 'success' ? COLORS.NEON_GREEN : COLORS.NEON_RED;
        bitmapFont.drawText(ctx, this.#notification.message, DESIGN_WIDTH / 2, y + 22, 16, {
            align: 'center', color: notifColor,
        });

        ctx.restore();
    }

    #drawInstructions(ctx) {
        ctx.save();
        ctx.fillStyle = COLORS.UI_TEXT_DIM;
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Tap item to select · tap again to buy · ← BACK to exit', DESIGN_WIDTH / 2, DESIGN_HEIGHT - 30);
        ctx.restore();
    }

    #drawPrestigeSection(ctx) {
        // Prestige CTA is now in the header banner — nothing to draw here
    }
}
/**
 * Info Pages System
 * Encyclopedia for Enemies, Towers, Abilities and Shop Items
 * Professional and visually appealing information panels
 */

import { CANNON_TYPES, ZOMBIE_TYPES, SPECIAL_ABILITIES, SHOP_ITEMS, MERGE_LEVELS, CONFIG } from './config.js';
import { MultiPartEnemySprites } from './multi-part-enemies.js';
import { MultiPartTowerSprites } from './multi-part-towers.js';
import { Utils } from './utils.js';

/**
 * Info Pages Manager - handles the encyclopedia/codex system
 */
export class InfoPagesManager {
    constructor(graphics, canvas) {
        this.graphics = graphics;
        this.canvas = canvas;
        
        this.isOpen = false;
        this.currentTab = 'enemies'; // 'enemies' | 'towers' | 'abilities' | 'items'
        this.scrollOffset = 0;
        this.maxScrollOffset = 0;
        this.selectedItem = null;
        
        // Animation states
        this.fadeAlpha = 0;
        this.slideOffset = 0;
        
        // Cached sprites for display
        this.cachedSprites = {
            enemies: {},
            towers: {}
        };
        
        // Pre-cache sprites
        this.cacheSprites();
        
        // Touch/scroll state
        this.isDragging = false;
        this.dragStartY = 0;
        this.dragStartScroll = 0;
        this.lastDragY = 0;
        this.scrollVelocity = 0;
        
        // Tab configuration
        this.tabs = [
            { id: 'enemies', label: '👹 Enemies', icon: '👹' },
            { id: 'towers', label: '🗼 Turrets', icon: '🗼' },
            { id: 'abilities', label: '💥 Abilities', icon: '💥' },
            { id: 'items', label: '🛍️ Items', icon: '🛍️' }
        ];
        
        // Setup wheel scroll listener
        this.setupScrollListener();
    }
    
    /**
     * Pre-cache all sprites for smooth rendering
     */
    cacheSprites() {
        // Cache enemy sprites
        for (const [key, enemy] of Object.entries(ZOMBIE_TYPES)) {
            try {
                if (enemy.sprite) {
                    this.cachedSprites.enemies[key] = enemy.sprite();
                }
            } catch (e) {

            }
        }
        
        // Cache tower sprites
        for (const [key, tower] of Object.entries(CANNON_TYPES)) {
            try {
                if (tower.sprite) {
                    this.cachedSprites.towers[key] = tower.sprite();
                }
            } catch (e) {

            }
        }
    }
    
    /**
     * Setup scroll listener for mouse wheel
     */
    setupScrollListener() {
        this.canvas.addEventListener('wheel', (e) => {
            if (!this.isOpen) return;
            
            e.preventDefault();
            const scrollAmount = e.deltaY * 0.5;
            this.scrollOffset = Math.max(0, Math.min(this.maxScrollOffset, this.scrollOffset + scrollAmount));
        }, { passive: false });
    }
    
    /**
     * Open the info pages panel
     */
    open() {
        this.isOpen = true;
        this.fadeAlpha = 0;
        this.slideOffset = 50;
        this.scrollOffset = 0;
        this.selectedItem = null;
    }
    
    /**
     * Close the info pages panel
     */
    close() {
        this.isOpen = false;
    }
    
    /**
     * Toggle the info pages panel
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
    
    /**
     * Switch to a different tab
     */
    switchTab(tabId) {
        this.currentTab = tabId;
        this.scrollOffset = 0;
        this.selectedItem = null;
    }
    
    /**
     * Update animations
     */
    update(dt) {
        if (!this.isOpen) return;
        
        // Fade in animation
        this.fadeAlpha = Math.min(1, this.fadeAlpha + dt * 5);
        
        // Slide in animation
        this.slideOffset = Math.max(0, this.slideOffset - dt * 200);
        
        // Apply scroll momentum/inertia
        if (!this.isDragging && Math.abs(this.scrollVelocity) > 0.5) {
            this.scrollOffset = Math.max(0, Math.min(this.maxScrollOffset, this.scrollOffset + this.scrollVelocity * dt * 60));
            this.scrollVelocity *= 0.92; // Friction
        } else if (!this.isDragging) {
            this.scrollVelocity = 0;
        }
        
        // Update cached sprites animation
        for (const sprite of Object.values(this.cachedSprites.enemies)) {
            if (sprite && sprite.update) sprite.update(dt);
        }
        for (const sprite of Object.values(this.cachedSprites.towers)) {
            if (sprite && sprite.update) sprite.update(dt);
        }
    }
    
    /**
     * Handle tap/click events
     */
    handleTap(screenPos) {
        if (!this.isOpen) return null;
        
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        
        // Panel dimensions
        const panelPadding = 15;
        const panelWidth = width - panelPadding * 2;
        const panelHeight = height - panelPadding * 2;
        const panelX = panelPadding;
        const panelY = panelPadding;
        
        // Check close button
        const closeBtnSize = 36;
        const closeBtnX = panelX + panelWidth - closeBtnSize - 10;
        const closeBtnY = panelY + 10;
        
        if (Utils.pointInRect(screenPos.x, screenPos.y, closeBtnX, closeBtnY, closeBtnSize, closeBtnSize)) {
            this.close();
            return 'close';
        }
        
        // Check tab buttons
        const tabHeight = 40;
        const tabY = panelY + 70;
        const tabWidth = (panelWidth - 20) / this.tabs.length;
        
        for (let i = 0; i < this.tabs.length; i++) {
            const tabX = panelX + 10 + i * tabWidth;
            if (Utils.pointInRect(screenPos.x, screenPos.y, tabX, tabY, tabWidth - 5, tabHeight)) {
                this.switchTab(this.tabs[i].id);
                return 'tab_switch';
            }
        }
        
        // Check if in content area for scrolling (start drag)
        const contentY = panelY + 120;
        const contentHeight = panelHeight - 130;
        
        if (Utils.pointInRect(screenPos.x, screenPos.y, panelX, contentY, panelWidth, contentHeight)) {
            // Start drag for scrolling
            this.isDragging = true;
            this.dragStartY = screenPos.y;
            this.dragStartScroll = this.scrollOffset;
            this.lastDragY = screenPos.y;
            return 'drag_start';
        }
        
        // Click outside panel closes it
        if (!Utils.pointInRect(screenPos.x, screenPos.y, panelX, panelY, panelWidth, panelHeight)) {
            this.close();
            return 'close';
        }
        
        return 'panel_click';
    }
    
    /**
     * Start drag for scrolling (called when drag begins in content area)
     */
    startDrag(screenPos) {
        if (!this.isOpen) return false;
        
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        
        const panelPadding = 15;
        const panelWidth = width - panelPadding * 2;
        const panelHeight = height - panelPadding * 2;
        const panelX = panelPadding;
        const panelY = panelPadding;
        
        const contentY = panelY + 120;
        const contentHeight = panelHeight - 130;
        
        // Check if drag started in content area
        if (Utils.pointInRect(screenPos.x, screenPos.y, panelX, contentY, panelWidth, contentHeight)) {
            this.isDragging = true;
            this.dragStartY = screenPos.y;
            this.dragStartScroll = this.scrollOffset;
            this.lastDragY = screenPos.y;
            return true;
        }
        
        return false;
    }
    
    /**
     * Handle drag move for scrolling
     */
    handleDragMove(screenPos) {
        // If not already dragging, try to start drag
        if (!this.isOpen) return false;
        
        if (!this.isDragging) {
            // Try to start drag
            if (!this.startDrag(screenPos)) {
                return false;
            }
        }
        
        const deltaY = this.dragStartY - screenPos.y;
        this.scrollOffset = Math.max(0, Math.min(this.maxScrollOffset, this.dragStartScroll + deltaY));
        
        // Calculate velocity for momentum
        this.scrollVelocity = (this.lastDragY - screenPos.y) * 0.5;
        this.lastDragY = screenPos.y;
        
        return true;
    }
    
    /**
     * Handle drag end
     */
    handleDragEnd() {
        this.isDragging = false;
    }
    
    /**
     * Main render function
     */
    render() {
        if (!this.isOpen) return;
        
        const ctx = this.graphics.ctx;
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        
        // Apply fade animation
        ctx.save();
        ctx.globalAlpha = this.fadeAlpha;
        
        // Darken background - SOLID BLACK overlay
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);
        
        // Panel dimensions
        const panelPadding = 15;
        const panelWidth = width - panelPadding * 2;
        const panelHeight = height - panelPadding * 2;
        const panelX = panelPadding + this.slideOffset;
        const panelY = panelPadding;
        
        // Panel background - SOLID OPAQUE
        ctx.fillStyle = '#0a0f14';
        Utils.drawRoundRect(ctx, panelX, panelY, panelWidth, panelHeight, 15);
        ctx.fill();
        
        // Panel gradient overlay for visual depth
        const bgGradient = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelHeight);
        bgGradient.addColorStop(0, 'rgba(30, 40, 50, 0.5)');
        bgGradient.addColorStop(0.5, 'rgba(20, 30, 40, 0.3)');
        bgGradient.addColorStop(1, 'rgba(15, 25, 35, 0.5)');
        ctx.fillStyle = bgGradient;
        Utils.drawRoundRect(ctx, panelX, panelY, panelWidth, panelHeight, 15);
        ctx.fill();
        
        // Panel border with glow
        ctx.save();
        ctx.shadowColor = CONFIG.COLORS.TEXT_PRIMARY;
        ctx.shadowBlur = 15;
        ctx.strokeStyle = CONFIG.COLORS.TEXT_PRIMARY;
        ctx.lineWidth = 2;
        Utils.drawRoundRect(ctx, panelX, panelY, panelWidth, panelHeight, 15);
        ctx.stroke();
        ctx.restore();
        
        // Inner border
        ctx.strokeStyle = 'rgba(0, 255, 136, 0.3)';
        ctx.lineWidth = 1;
        Utils.drawRoundRect(ctx, panelX + 4, panelY + 4, panelWidth - 8, panelHeight - 8, 12);
        ctx.stroke();
        
        // Title
        this.graphics.drawText('📖 MTDPEDIA', panelX + panelWidth / 2, panelY + 32, {
            size: 28,
            color: CONFIG.COLORS.TEXT_PRIMARY,
            align: 'center',
            bold: true,
            shadow: true
        });
        
        // Close button
        this.renderCloseButton(ctx, panelX + panelWidth - 46, panelY + 10);
        
        // Render tabs (with more top padding)
        this.renderTabs(ctx, panelX, panelY + 70, panelWidth);
        
        // Render content based on current tab
        const contentY = panelY + 120;
        const contentHeight = panelHeight - 130;
        
        // Create clipping region for content
        ctx.save();
        ctx.beginPath();
        ctx.rect(panelX + 5, contentY, panelWidth - 10, contentHeight);
        ctx.clip();
        
        switch (this.currentTab) {
            case 'enemies':
                this.renderEnemiesTab(ctx, panelX, contentY, panelWidth, contentHeight);
                break;
            case 'towers':
                this.renderTowersTab(ctx, panelX, contentY, panelWidth, contentHeight);
                break;
            case 'abilities':
                this.renderAbilitiesTab(ctx, panelX, contentY, panelWidth, contentHeight);
                break;
            case 'items':
                this.renderItemsTab(ctx, panelX, contentY, panelWidth, contentHeight);
                break;
        }
        
        ctx.restore();
        
        // Scroll indicator
        if (this.maxScrollOffset > 0) {
            this.renderScrollIndicator(ctx, panelX + panelWidth - 15, contentY, 8, contentHeight);
        }
        
        ctx.restore();
    }
    
    /**
     * Render close button
     */
    renderCloseButton(ctx, x, y) {
        const size = 36;
        
        // Button background
        ctx.fillStyle = 'rgba(220, 50, 50, 0.8)';
        ctx.beginPath();
        ctx.arc(x + size/2, y + size/2, size/2, 0, Math.PI * 2);
        ctx.fill();
        
        // Button border
        ctx.strokeStyle = '#ff6666';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // X icon
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✕', x + size/2, y + size/2);
    }
    
    /**
     * Render tab buttons
     */
    renderTabs(ctx, panelX, tabY, panelWidth) {
        const tabHeight = 40;
        const tabWidth = (panelWidth - 20) / this.tabs.length;
        
        this.tabs.forEach((tab, index) => {
            const tabX = panelX + 10 + index * tabWidth;
            const isActive = this.currentTab === tab.id;
            
            // Tab background - SOLID base first
            ctx.fillStyle = isActive ? '#1a3328' : '#1a1d24';
            Utils.drawRoundRect(ctx, tabX, tabY, tabWidth - 5, tabHeight, 8);
            ctx.fill();
            
            // Tab gradient overlay
            if (isActive) {
                const gradient = ctx.createLinearGradient(tabX, tabY, tabX, tabY + tabHeight);
                gradient.addColorStop(0, 'rgba(0, 255, 136, 0.3)');
                gradient.addColorStop(1, 'rgba(0, 255, 136, 0.1)');
                ctx.fillStyle = gradient;
                Utils.drawRoundRect(ctx, tabX, tabY, tabWidth - 5, tabHeight, 8);
                ctx.fill();
            }
            
            // Tab border
            ctx.strokeStyle = isActive ? CONFIG.COLORS.TEXT_PRIMARY : 'rgba(100, 100, 120, 0.5)';
            ctx.lineWidth = isActive ? 2 : 1;
            Utils.drawRoundRect(ctx, tabX, tabY, tabWidth - 5, tabHeight, 8);
            ctx.stroke();
            
            // Tab icon and label
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = isActive ? CONFIG.COLORS.TEXT_PRIMARY : '#aaaaaa';
            ctx.fillText(tab.label, tabX + (tabWidth - 5) / 2, tabY + tabHeight / 2);
        });
    }
    
    /**
     * Render scroll indicator
     */
    renderScrollIndicator(ctx, x, y, width, height) {
        // Track
        ctx.fillStyle = 'rgba(50, 50, 60, 0.5)';
        Utils.drawRoundRect(ctx, x, y, width, height, 4);
        ctx.fill();
        
        // Thumb
        const thumbHeight = Math.max(30, height * (height / (height + this.maxScrollOffset)));
        const thumbY = y + (this.scrollOffset / this.maxScrollOffset) * (height - thumbHeight);
        
        ctx.fillStyle = CONFIG.COLORS.TEXT_PRIMARY;
        Utils.drawRoundRect(ctx, x, thumbY, width, thumbHeight, 4);
        ctx.fill();
    }
    
    /**
     * Render enemies tab content
     */
    renderEnemiesTab(ctx, panelX, startY, panelWidth, contentHeight) {
        const enemies = Object.entries(ZOMBIE_TYPES);
        const cardHeight = 130;
        const cardSpacing = 10;
        const cardWidth = panelWidth - 30;
        
        this.maxScrollOffset = Math.max(0, enemies.length * (cardHeight + cardSpacing) - contentHeight + 20);
        
        let y = startY + 10 - this.scrollOffset;
        
        enemies.forEach(([key, enemy]) => {
            if (y + cardHeight > startY - 20 && y < startY + contentHeight + 20) {
                this.renderEnemyCard(ctx, panelX + 15, y, cardWidth, cardHeight, key, enemy);
            }
            y += cardHeight + cardSpacing;
        });
    }
    
    /**
     * Render single enemy card
     */
    renderEnemyCard(ctx, x, y, width, height, key, enemy) {
        // Card background - SOLID base
        ctx.fillStyle = '#1a1f28';
        Utils.drawRoundRect(ctx, x, y, width, height, 10);
        ctx.fill();
        
        // Card color accent overlay
        const gradient = ctx.createLinearGradient(x, y, x + width, y);
        gradient.addColorStop(0, `rgba(${this.hexToRgb(enemy.color)}, 0.25)`);
        gradient.addColorStop(1, 'rgba(25, 30, 40, 0.8)');
        ctx.fillStyle = gradient;
        Utils.drawRoundRect(ctx, x, y, width, height, 10);
        ctx.fill();
        
        // Card border
        ctx.strokeStyle = enemy.color;
        ctx.lineWidth = 2;
        Utils.drawRoundRect(ctx, x, y, width, height, 10);
        ctx.stroke();
        
        // Sprite area
        const spriteSize = 70;
        const spriteX = x + 15;
        const spriteY = y + (height - spriteSize) / 2;
        
        // Sprite background circle - more visible
        ctx.fillStyle = '#0a0e12';
        ctx.beginPath();
        ctx.arc(spriteX + spriteSize/2, spriteY + spriteSize/2, spriteSize/2 + 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Sprite border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(spriteX + spriteSize/2, spriteY + spriteSize/2, spriteSize/2 + 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Render sprite
        const sprite = this.cachedSprites.enemies[key];
        if (sprite && sprite.render) {
            try {
                sprite.render(ctx, spriteX + spriteSize/2, spriteY + spriteSize/2, spriteSize);
            } catch (e) {
                // Fallback to icon
                ctx.font = `${spriteSize * 0.6}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(enemy.icon || '👹', spriteX + spriteSize/2, spriteY + spriteSize/2);
            }
        } else {
            // Fallback to icon
            ctx.font = `${spriteSize * 0.6}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(enemy.icon || '👹', spriteX + spriteSize/2, spriteY + spriteSize/2);
        }
        
        // Enemy name
        const textX = x + spriteSize + 30;
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.fillStyle = enemy.color;
        ctx.fillText(enemy.name, textX, y + 22);
        
        // Stats section
        const statsY = y + 42;
        ctx.font = '12px Arial';
        ctx.fillStyle = '#cccccc';
        
        // HP
        ctx.fillText(`❤️ HP: ${enemy.hp}`, textX, statsY);
        
        // Speed
        const speedDesc = enemy.speed >= 1.0 ? 'Fast' : enemy.speed >= 0.6 ? 'Medium' : 'Slow';
        ctx.fillText(`⚡ Speed: ${speedDesc}`, textX, statsY + 16);
        
        // Reward
        ctx.fillText(`💰 Reward: ${enemy.reward}`, textX, statsY + 32);
        
        // Special ability description
        const specialY = statsY + 52;
        ctx.font = 'italic 11px Arial';
        ctx.fillStyle = '#ffcc00';
        
        let specialText = this.getEnemySpecialDescription(key, enemy);
        if (specialText) {
            // Word wrap
            const maxWidth = width - spriteSize - 50;
            const words = specialText.split(' ');
            let line = '';
            let lineY = specialY;
            
            for (const word of words) {
                const testLine = line + (line ? ' ' : '') + word;
                if (ctx.measureText(testLine).width > maxWidth && line) {
                    ctx.fillText(line, textX, lineY);
                    line = word;
                    lineY += 13;
                } else {
                    line = testLine;
                }
            }
            ctx.fillText(line, textX, lineY);
        }
        
        // Scale indicator
        ctx.font = '10px Arial';
        ctx.fillStyle = '#888888';
        ctx.textAlign = 'right';
        ctx.fillText(`Scale: ${enemy.scale || 1.0}x`, x + width - 10, y + height - 8);
    }
    
    /**
     * Get special ability description for enemy
     */
    getEnemySpecialDescription(key, enemy) {
        const descriptions = {
            NORMAL: 'Basic enemy with no special abilities.',
            TANK: 'High resistance, slow but hard to take down.',
            RUSHER: `Very fast! ${enemy.dodgeChance * 100}% chance to dodge projectiles.`,
            FLYER: 'Flies over obstacles, ignores terrain.',
            SPLITTER: `On death splits into ${enemy.splitCount} smaller enemies!`,
            ARMORED: `Armor: reduces all damage by ${enemy.armor} points.`,
            BOSS: `Boss! Armor ${enemy.armor}, very resistant.`,
            HEALER: `Heals ${enemy.healAmount} HP every ${enemy.healInterval/1000}s to nearby enemies.`,
            PHASER: `Every ${enemy.phaseInterval/1000}s teleports ${enemy.phaseDistance} cells!`,
            VAMPIRE: `Steals ${enemy.lifesteal * 100}% of damage as HP.`,
            BOMBER: `Explodes on death! Stuns towers for ${enemy.stunDuration/1000}s.`,
            SHADOW: `Invisible for ${enemy.invisDuration/1000}s every ${enemy.invisCooldown/1000}s.`,
            SIREN: `Disables nearby towers for ${enemy.disableDuration/1000}s.`,
            GOLEM: `Stomping stuns towers for ${enemy.stompStunDuration/1000}s.`
        };
        return descriptions[key] || '';
    }
    
    /**
     * Render towers tab content
     */
    renderTowersTab(ctx, panelX, startY, panelWidth, contentHeight) {
        const towers = Object.entries(CANNON_TYPES);
        const cardHeight = 140;
        const cardSpacing = 10;
        const cardWidth = panelWidth - 30;
        
        this.maxScrollOffset = Math.max(0, towers.length * (cardHeight + cardSpacing) - contentHeight + 20);
        
        let y = startY + 10 - this.scrollOffset;
        
        towers.forEach(([key, tower]) => {
            if (y + cardHeight > startY - 20 && y < startY + contentHeight + 20) {
                this.renderTowerCard(ctx, panelX + 15, y, cardWidth, cardHeight, key, tower);
            }
            y += cardHeight + cardSpacing;
        });
    }
    
    /**
     * Render single tower card
     */
    renderTowerCard(ctx, x, y, width, height, key, tower) {
        // Card background - SOLID base
        ctx.fillStyle = '#1a1f28';
        Utils.drawRoundRect(ctx, x, y, width, height, 10);
        ctx.fill();
        
        // Card color accent overlay
        const gradient = ctx.createLinearGradient(x, y, x + width, y);
        gradient.addColorStop(0, `rgba(${this.hexToRgb(tower.color)}, 0.25)`);
        gradient.addColorStop(1, 'rgba(25, 30, 40, 0.8)');
        ctx.fillStyle = gradient;
        Utils.drawRoundRect(ctx, x, y, width, height, 10);
        ctx.fill();
        
        // Card border
        ctx.strokeStyle = tower.color;
        ctx.lineWidth = 2;
        Utils.drawRoundRect(ctx, x, y, width, height, 10);
        ctx.stroke();
        
        // Sprite area
        const spriteSize = 70;
        const spriteX = x + 15;
        const spriteY = y + 10;
        
        // Sprite background - SOLID
        ctx.fillStyle = '#0a0e12';
        Utils.drawRoundRect(ctx, spriteX - 5, spriteY - 5, spriteSize + 10, spriteSize + 10, 8);
        ctx.fill();
        
        // Sprite border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        Utils.drawRoundRect(ctx, spriteX - 5, spriteY - 5, spriteSize + 10, spriteSize + 10, 8);
        ctx.stroke();
        
        // Render sprite
        const sprite = this.cachedSprites.towers[key];
        if (sprite && sprite.render) {
            try {
                sprite.render(ctx, spriteX + spriteSize/2, spriteY + spriteSize/2, spriteSize);
            } catch (e) {
                ctx.font = `${spriteSize * 0.6}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(tower.icon || '🗼', spriteX + spriteSize/2, spriteY + spriteSize/2);
            }
        } else {
            ctx.font = `${spriteSize * 0.6}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(tower.icon || '🗼', spriteX + spriteSize/2, spriteY + spriteSize/2);
        }
        
        // Tower name and cost
        const textX = x + spriteSize + 30;
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.fillStyle = tower.color;
        ctx.fillText(tower.name, textX, y + 22);
        
        ctx.font = 'bold 12px Arial';
        ctx.fillStyle = '#ffcc00';
        ctx.fillText(`💰 ${tower.cost}`, textX + 80, y + 22);
        
        // Stats
        const statsY = y + 42;
        ctx.font = '11px Arial';
        ctx.fillStyle = '#cccccc';
        
        // Damage
        ctx.fillText(`⚔️ Damage: ${tower.damage}`, textX, statsY);
        
        // Fire rate
        const fireRateDesc = tower.fireRate <= 500 ? 'Very Fast' : 
                            tower.fireRate <= 1000 ? 'Fast' : 
                            tower.fireRate <= 1500 ? 'Medium' : 'Slow';
        ctx.fillText(`🔥 Fire Rate: ${fireRateDesc}`, textX, statsY + 14);
        
        // Range
        ctx.fillText(`🎯 Range: ${tower.range} cells`, textX, statsY + 28);
        
        // Special properties
        let specialProps = [];
        if (tower.splashRadius) specialProps.push(`💥 Splash: ${tower.splashRadius}`);
        if (tower.slowFactor) specialProps.push(`❄️ Slow: ${(1 - tower.slowFactor) * 100}%`);
        if (tower.piercing) specialProps.push(`🔆 Piercing: ${tower.piercing}`);
        if (tower.chainTargets) specialProps.push(`⚡ Chain: ${tower.chainTargets}`);
        
        if (specialProps.length > 0) {
            ctx.font = '10px Arial';
            ctx.fillStyle = '#88ccff';
            ctx.fillText(specialProps.join(' • '), textX, statsY + 44);
        }
        
        // Description
        ctx.font = 'italic 11px Arial';
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText(tower.description, textX, statsY + 60);
        
        // Best against
        const bestAgainst = this.getTowerBestAgainst(key, tower);
        if (bestAgainst) {
            ctx.font = '10px Arial';
            ctx.fillStyle = '#88ff88';
            ctx.fillText(`✓ Effective vs: ${bestAgainst}`, textX, statsY + 76);
        }
    }
    
    /**
     * Get best enemy types for this tower
     */
    getTowerBestAgainst(key, tower) {
        if (!tower.effectiveness) return '';
        
        const effective = Object.entries(tower.effectiveness)
            .filter(([k, v]) => v >= 1.5)
            .map(([k, v]) => ZOMBIE_TYPES[k]?.name || k)
            .slice(0, 3);
        
        return effective.join(', ');
    }
    
    /**
     * Render abilities tab content
     */
    renderAbilitiesTab(ctx, panelX, startY, panelWidth, contentHeight) {
        const abilities = Object.entries(SPECIAL_ABILITIES);
        const cardHeight = 120;
        const cardSpacing = 10;
        const cardWidth = panelWidth - 30;
        
        this.maxScrollOffset = Math.max(0, abilities.length * (cardHeight + cardSpacing) - contentHeight + 20);
        
        let y = startY + 10 - this.scrollOffset;
        
        abilities.forEach(([key, ability]) => {
            if (y + cardHeight > startY - 20 && y < startY + contentHeight + 20) {
                this.renderAbilityCard(ctx, panelX + 15, y, cardWidth, cardHeight, key, ability);
            }
            y += cardHeight + cardSpacing;
        });
    }
    
    /**
     * Render single ability card
     */
    renderAbilityCard(ctx, x, y, width, height, key, ability) {
        // Card background - SOLID base
        ctx.fillStyle = '#1a1f28';
        Utils.drawRoundRect(ctx, x, y, width, height, 10);
        ctx.fill();
        
        // Card color accent overlay
        const gradient = ctx.createLinearGradient(x, y, x + width, y);
        gradient.addColorStop(0, `rgba(${this.hexToRgb(ability.color)}, 0.3)`);
        gradient.addColorStop(1, 'rgba(25, 30, 40, 0.8)');
        ctx.fillStyle = gradient;
        Utils.drawRoundRect(ctx, x, y, width, height, 10);
        ctx.fill();
        
        // Card border with glow
        ctx.save();
        ctx.shadowColor = ability.glowColor;
        ctx.shadowBlur = 10;
        ctx.strokeStyle = ability.color;
        ctx.lineWidth = 2;
        Utils.drawRoundRect(ctx, x, y, width, height, 10);
        ctx.stroke();
        ctx.restore();
        
        // Icon area
        const iconSize = 60;
        const iconX = x + 20;
        const iconY = y + (height - iconSize) / 2;
        
        // Icon background
        ctx.fillStyle = ability.color;
        ctx.beginPath();
        ctx.arc(iconX + iconSize/2, iconY + iconSize/2, iconSize/2, 0, Math.PI * 2);
        ctx.fill();
        
        // Icon
        ctx.font = `${iconSize * 0.5}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(ability.icon, iconX + iconSize/2, iconY + iconSize/2);
        
        // Ability name
        const textX = x + iconSize + 40;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'left';
        ctx.fillStyle = ability.glowColor;
        ctx.fillText(ability.name, textX, y + 25);
        
        // Description
        ctx.font = '13px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(ability.description, textX, y + 45);
        
        // Stats
        ctx.font = '11px Arial';
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText(`⏱️ Cooldown: ${ability.baseCooldown / 1000}s`, textX, y + 65);
        
        // Ability-specific stats
        let specificStat = '';
        switch (key) {
            case 'BOMB':
                specificStat = `💥 Damage: ${ability.baseDamage} (+${ability.damagePerLevel}/Lv) • Radius: ${ability.baseRadius}`;
                break;
            case 'PUSHBACK':
                specificStat = `🌊 Push: ${ability.basePushDistance} cells (+${ability.pushDistancePerLevel}/Lv)`;
                break;
            case 'STUN':
                specificStat = `⚡ Stun: ${ability.baseStunDuration/1000}s (+${ability.stunDurationPerLevel/1000}s/Lv) • Radius: ${ability.baseRadius}`;
                break;
        }
        ctx.fillStyle = '#88ccff';
        ctx.fillText(specificStat, textX, y + 82);
        
        // Level indicator
        ctx.font = 'bold 10px Arial';
        ctx.fillStyle = '#ffcc00';
        ctx.textAlign = 'right';
        ctx.fillText('Max Lv: ∞', x + width - 15, y + height - 10);
    }
    
    /**
     * Render shop items tab content
     */
    renderItemsTab(ctx, panelX, startY, panelWidth, contentHeight) {
        const items = Object.entries(SHOP_ITEMS);
        const cardHeight = 100;
        const cardSpacing = 10;
        const cardWidth = panelWidth - 30;
        
        this.maxScrollOffset = Math.max(0, items.length * (cardHeight + cardSpacing) - contentHeight + 20);
        
        let y = startY + 10 - this.scrollOffset;
        
        items.forEach(([key, item]) => {
            if (y + cardHeight > startY - 20 && y < startY + contentHeight + 20) {
                this.renderItemCard(ctx, panelX + 15, y, cardWidth, cardHeight, key, item);
            }
            y += cardHeight + cardSpacing;
        });
    }
    
    /**
     * Render single shop item card
     */
    renderItemCard(ctx, x, y, width, height, key, item) {
        // Card background - SOLID base
        ctx.fillStyle = '#1a1f28';
        Utils.drawRoundRect(ctx, x, y, width, height, 10);
        ctx.fill();
        
        // Card color accent overlay
        const gradient = ctx.createLinearGradient(x, y, x + width, y);
        gradient.addColorStop(0, `rgba(${this.hexToRgb(item.color)}, 0.25)`);
        gradient.addColorStop(1, 'rgba(25, 30, 40, 0.8)');
        ctx.fillStyle = gradient;
        Utils.drawRoundRect(ctx, x, y, width, height, 10);
        ctx.fill();
        
        // Card border
        ctx.strokeStyle = item.color;
        ctx.lineWidth = 2;
        Utils.drawRoundRect(ctx, x, y, width, height, 10);
        ctx.stroke();
        
        // Icon area
        const iconSize = 50;
        const iconX = x + 15;
        const iconY = y + (height - iconSize) / 2;
        
        // Icon background
        const iconGradient = ctx.createRadialGradient(
            iconX + iconSize/2, iconY + iconSize/2, 0,
            iconX + iconSize/2, iconY + iconSize/2, iconSize/2
        );
        iconGradient.addColorStop(0, item.color);
        iconGradient.addColorStop(1, item.barColor || item.color);
        ctx.fillStyle = iconGradient;
        Utils.drawRoundRect(ctx, iconX, iconY, iconSize, iconSize, 10);
        ctx.fill();
        
        // Icon
        ctx.font = `${iconSize * 0.5}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(item.icon, iconX + iconSize/2, iconY + iconSize/2);
        
        // Item name and cost
        const textX = x + iconSize + 30;
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.fillStyle = item.color;
        ctx.fillText(item.name, textX, y + 22);
        
        ctx.font = 'bold 14px Arial';
        ctx.fillStyle = '#ffcc00';
        ctx.fillText(`💰 ${item.cost}`, textX + 140, y + 22);
        
        // Description
        ctx.font = '12px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(item.description, textX, y + 42);
        
        // Type badge
        ctx.font = 'bold 10px Arial';
        const typeBadge = item.type === 'instant' ? '⚡ Instant' : 
                         item.type === 'temporary' ? `⏱️ Duration: ${item.duration/1000}s` :
                         '✨ Special';
        ctx.fillStyle = item.type === 'instant' ? '#88ff88' : 
                       item.type === 'temporary' ? '#88ccff' : '#ffcc88';
        ctx.fillText(typeBadge, textX, y + 60);
        
        // Effect details
        ctx.font = '10px Arial';
        ctx.fillStyle = '#aaaaaa';
        let effectText = '';
        switch (item.effect.type) {
            case 'energy':
                effectText = `Restores ${item.effect.amount} energy`;
                break;
            case 'range_multiplier':
                effectText = `Multiplies range of all turrets x${item.effect.multiplier}`;
                break;
            case 'firerate_multiplier':
                effectText = `Multiplies fire rate of all turrets x${item.effect.multiplier}`;
                break;
            case 'damage_multiplier':
                effectText = `Multiplies damage of all turrets x${item.effect.multiplier}`;
                break;
            case 'tower_upgrade':
                effectText = `Upgrades a selected turret by 1 level`;
                break;
        }
        ctx.fillText(effectText, textX, y + 76);
    }
    
    /**
     * Convert hex color to RGB values
     */
    hexToRgb(hex) {
        if (!hex) return '100, 100, 100';
        hex = hex.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16) || 100;
        const g = parseInt(hex.substring(2, 4), 16) || 100;
        const b = parseInt(hex.substring(4, 6), 16) || 100;
        return `${r}, ${g}, ${b}`;
    }
}

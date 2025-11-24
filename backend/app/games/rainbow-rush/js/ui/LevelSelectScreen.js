/**
 * LevelSelectScreen - Menu selezione livelli con griglia 1-200
 * Mostra progresso, stelle ottenute, livelli bloccati
 */

export class LevelSelectScreen {
    constructor(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        
        this.visible = false;
        this.progress = {}; // Caricato da localStorage
        
        // Griglia livelli
        this.levelsPerRow = 5;
        this.levelsPerPage = 20; // 4 righe x 5 colonne
        this.currentPage = 0;
        this.totalPages = Math.ceil(200 / this.levelsPerPage);
        
        // Dimensioni celle
        this.cellSize = 70;
        this.cellSpacing = 10;
        
        // Layout constants
        this.topBarHeight = 100;
        this.navButtonsHeight = 75;
        
        // Scrolling
        this.scrollOffset = 0;
        this.targetScrollOffset = 0;
        
        // Selezione
        this.selectedLevel = null;
        this.hoveredLevel = null;
        
        // Pulsanti
        this.buttons = {
            back: null,
            pageUp: null,
            pageDown: null,
            play: null
        };
    }
    
    /**
     * Mostra schermata selezione livelli
     */
    show(progress) {
        this.progress = progress || {};
        this.visible = true;
        this.selectedLevel = null;
        
        // Trova l'ultimo livello sbloccato
        let lastUnlocked = 1;
        for (let i = 1; i <= 200; i++) {
            if (i === 1 || (this.progress[i - 1] && this.progress[i - 1].completed)) {
                lastUnlocked = i;
            } else {
                break;
            }
        }
        
        // Vai alla pagina dell'ultimo livello sbloccato
        this.currentPage = Math.floor((lastUnlocked - 1) / this.levelsPerPage);
        this.scrollOffset = 0;
        
        this.createButtons();
        
        // Abilita pointer-events sul textCanvas per catturare i click
        const textCanvas = document.getElementById('textCanvas');
        if (textCanvas) {
            textCanvas.style.pointerEvents = 'auto';
            textCanvas.style.display = 'block';
            textCanvas.style.opacity = '1';
        }
    }
    
    /**
     * Nascondi schermata
     */
    hide() {
        this.visible = false;
        
        // Disabilita pointer-events sul textCanvas per permettere click sul game
        const textCanvas = document.getElementById('textCanvas');
        if (textCanvas) {
            textCanvas.style.pointerEvents = 'none';
        }
    }
    
    /**
     * Crea pulsanti - SAME LOGIC AS LevelSummaryScreen
     */
    createButtons() {
        // Buttons will be positioned in render() based on panel coordinates
        // This just initializes the button structure
        this.buttons.back = {
            label: '← Back',
            color: [0.6, 0.6, 0.7, 1.0],
            hoverColor: [0.7, 0.7, 0.8, 1.0]
        };
        
        this.buttons.pageUp = {
            label: '⬅ Previous',
            color: [0.5, 0.5, 0.6, 1.0],
            hoverColor: [0.6, 0.6, 0.7, 1.0],
            enabled: this.currentPage > 0
        };
        
        this.buttons.pageDown = {
            label: 'Next ➡',
            color: [0.5, 0.5, 0.6, 1.0],
            hoverColor: [0.6, 0.6, 0.7, 1.0],
            enabled: this.currentPage < this.totalPages - 1
        };
        
        if (this.selectedLevel) {
            this.buttons.play = {
                label: '▶ Play Level ' + this.selectedLevel,
                color: [0.2, 0.8, 0.3, 1.0],
                hoverColor: [0.3, 0.9, 0.4, 1.0]
            };
        } else {
            this.buttons.play = null;
        }
    }
    
    /**
     * Update
     */
    update(deltaTime) {
        if (!this.visible) return;
        
        // Smooth scroll
        const diff = this.targetScrollOffset - this.scrollOffset;
        if (Math.abs(diff) > 0.1) {
            this.scrollOffset += diff * 10 * deltaTime;
        }
    }
    
    /**
     * Ottieni livelli della pagina corrente
     */
    getLevelsForCurrentPage() {
        const start = this.currentPage * this.levelsPerPage;
        const end = Math.min(start + this.levelsPerPage, 200);
        
        const levels = [];
        for (let i = start; i < end; i++) {
            levels.push(i + 1); // Livelli da 1 a 200
        }
        
        return levels;
    }
    
    /**
     * Check se livello è sbloccato
     */
    isLevelUnlocked(levelId) {
        // Livello 1 sempre sbloccato
        if (levelId === 1) return true;
        
        // Livello sbloccato se quello precedente è completato
        const prevLevel = levelId - 1;
        return this.progress[prevLevel] && this.progress[prevLevel].completed;
    }
    
    /**
     * Ottieni stelle per livello
     */
    getLevelStars(levelId) {
        if (this.progress[levelId]) {
            return this.progress[levelId].stars || 0;
        }
        return 0;
    }
    
    /**
     * Calcola posizione cella - uses panel coordinates
     */
    getCellPosition(levelIndex) {
        const row = Math.floor(levelIndex / this.levelsPerRow);
        const col = levelIndex % this.levelsPerRow;
        
        // Use stored panel coordinates if available
        if (!this.panelX || !this.panelWidth) {
            const totalGridWidth = this.levelsPerRow * (this.cellSize + this.cellSpacing) - this.cellSpacing;
            const startX = (this.canvasWidth - totalGridWidth) / 2;
            const startY = 100;
            return {
                x: startX + col * (this.cellSize + this.cellSpacing),
                y: startY + row * (this.cellSize + this.cellSpacing)
            };
        }
        
        // Calculate positions within panel
        const totalGridWidth = this.levelsPerRow * (this.cellSize + this.cellSpacing) - this.cellSpacing;
        const gridX = this.panelX + (this.panelWidth - totalGridWidth) / 2;
        const gridStartY = this.panelY + 100;
        
        return {
            x: gridX + col * (this.cellSize + this.cellSpacing),
            y: gridStartY + row * (this.cellSize + this.cellSpacing) + this.scrollOffset
        };
    }
    
    /**
     * Check click
     */
    checkClick(x, y) {
        if (!this.visible) return null;
        
        // Check pulsanti
        if (this.checkButtonClick(this.buttons.back, x, y)) {
            return { action: 'back' };
        }
        
        if (this.checkButtonClick(this.buttons.pageUp, x, y) && this.buttons.pageUp.enabled) {
            this.currentPage--;
            this.createButtons();
            return { action: 'page_change' };
        }
        
        if (this.checkButtonClick(this.buttons.pageDown, x, y) && this.buttons.pageDown.enabled) {
            this.currentPage++;
            this.createButtons();
            return { action: 'page_change' };
        }
        
        if (this.selectedLevel && this.checkButtonClick(this.buttons.play, x, y)) {
            return { action: 'play', levelId: this.selectedLevel };
        }
        
        // Check celle livelli
        const levels = this.getLevelsForCurrentPage();
        for (let i = 0; i < levels.length; i++) {
            const levelId = levels[i];
            const pos = this.getCellPosition(i);
            
            if (x >= pos.x && x <= pos.x + this.cellSize &&
                y >= pos.y && y <= pos.y + this.cellSize) {
                
                // Solo livelli sbloccati possono essere selezionati
                if (this.isLevelUnlocked(levelId)) {
                    this.selectedLevel = levelId;
                    this.createButtons();
                    return { action: 'select', levelId: levelId };
                }
            }
        }
        
        return null;
    }
    
    /**
     * Check click su pulsante
     */
    checkButtonClick(button, x, y) {
        if (!button) return false;
        return x >= button.x && x <= button.x + button.width &&
               y >= button.y && y <= button.y + button.height;
    }
    
    /**
     * Check hover
     */
    checkHover(x, y) {
        this.hoveredLevel = null;
        
        if (!this.visible) return;
        
        const levels = this.getLevelsForCurrentPage();
        for (let i = 0; i < levels.length; i++) {
            const levelId = levels[i];
            const pos = this.getCellPosition(i);
            
            if (x >= pos.x && x <= pos.x + this.cellSize &&
                y >= pos.y && y <= pos.y + this.cellSize) {
                this.hoveredLevel = levelId;
                break;
            }
        }
    }
    
    /**
     * Render con Canvas 2D
     */
    render(ctx, canvasWidth, canvasHeight) {
        if (!this.visible) return;
        
        if (!ctx) {
            console.error('❌ LevelSelectScreen: ctx is null!');
            return;
        }
        
        // Dark overlay with gradient - SAME AS LevelSummaryScreen
        const gradient = ctx.createRadialGradient(canvasWidth / 2, canvasHeight / 2, 0, canvasWidth / 2, canvasHeight / 2, canvasWidth);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // Panel with shadow and gradient
        const panelWidth = Math.min(420, canvasWidth * 0.85);
        const panelHeight = canvasHeight * 0.85;
        const panelX = (canvasWidth - panelWidth) / 2;
        const panelY = (canvasHeight - panelHeight) / 2;
        
        // Store panel coordinates for click detection
        this.panelX = panelX;
        this.panelY = panelY;
        this.panelWidth = panelWidth;
        this.panelHeight = panelHeight;
        
        // Panel gradient background (NO outer glow to avoid overflow)
        ctx.shadowBlur = 0;
        const panelGradient = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelHeight);
        panelGradient.addColorStop(0, '#ffffff');
        panelGradient.addColorStop(1, '#f0f8ff');
        ctx.fillStyle = panelGradient;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 30);
        ctx.fill();
        
        // Border accent with gradient
        const borderGradient = ctx.createLinearGradient(panelX, panelY, panelX + panelWidth, panelY + panelHeight);
        borderGradient.addColorStop(0, 'rgba(102, 126, 234, 0.4)');
        borderGradient.addColorStop(0.5, 'rgba(118, 75, 162, 0.4)');
        borderGradient.addColorStop(1, 'rgba(102, 126, 234, 0.4)');
        ctx.strokeStyle = borderGradient;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 30);
        ctx.stroke();
        
        // Decorative top bar
        const topBarGradient = ctx.createLinearGradient(panelX, panelY, panelX + panelWidth, panelY + 80);
        topBarGradient.addColorStop(0, 'rgba(102, 126, 234, 0.25)');
        topBarGradient.addColorStop(1, 'rgba(102, 126, 234, 0.05)');
        ctx.fillStyle = topBarGradient;
        ctx.beginPath();
        ctx.roundRect(panelX, panelY, panelWidth, 80, [30, 30, 0, 0]);
        ctx.fill();
        
        // Title with rainbow gradient
        ctx.save();
        const titleGradient = ctx.createLinearGradient(panelX, panelY + 40, panelX + panelWidth, panelY + 40);
        titleGradient.addColorStop(0, '#ff0080');
        titleGradient.addColorStop(0.2, '#ff7f00');
        titleGradient.addColorStop(0.4, '#ffff00');
        titleGradient.addColorStop(0.6, '#00ff00');
        titleGradient.addColorStop(0.8, '#0080ff');
        titleGradient.addColorStop(1, '#8000ff');
        ctx.fillStyle = titleGradient;
        ctx.font = 'bold 32px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 2;
        ctx.fillText('🎮 Select Level', canvasWidth / 2, panelY + 45);
        ctx.restore();
        
        // Subtitle
        ctx.fillStyle = '#666';
        ctx.font = 'bold 14px Arial';
        ctx.shadowColor = 'transparent';
        ctx.fillText(`Page ${this.currentPage + 1} / ${this.totalPages}`, canvasWidth / 2, panelY + 70);
        
        // Level grid area
        const gridStartY = panelY + 100;
        const gridHeight = panelHeight - 230; // Reserve space for buttons at bottom
        
        const levels = this.getLevelsForCurrentPage();
        levels.forEach((levelId, index) => {
            const row = Math.floor(index / this.levelsPerRow);
            const col = index % this.levelsPerRow;
            
            // Center grid in panel
            const totalGridWidth = this.levelsPerRow * (this.cellSize + this.cellSpacing) - this.cellSpacing;
            const gridX = panelX + (panelWidth - totalGridWidth) / 2;
            
            const posX = gridX + col * (this.cellSize + this.cellSpacing);
            const posY = gridStartY + row * (this.cellSize + this.cellSpacing);
            
            const unlocked = this.isLevelUnlocked(levelId);
            const stars = this.getLevelStars(levelId);
            const isSelected = levelId === this.selectedLevel;
            const isHovered = levelId === this.hoveredLevel;
            
            // Cell shadow for depth
            if (unlocked) {
                ctx.shadowColor = isHovered ? 'rgba(102, 126, 234, 0.6)' : 'rgba(0, 0, 0, 0.2)';
                ctx.shadowBlur = isHovered ? 15 : 8;
                ctx.shadowOffsetY = isHovered ? 4 : 2;
            }
            
            // Cell background gradient
            let cellGradient;
            if (!unlocked) {
                cellGradient = ctx.createLinearGradient(posX, posY, posX, posY + this.cellSize);
                cellGradient.addColorStop(0, 'rgba(200, 200, 200, 0.4)');
                cellGradient.addColorStop(1, 'rgba(180, 180, 180, 0.6)');
            } else if (isSelected) {
                cellGradient = ctx.createLinearGradient(posX, posY, posX, posY + this.cellSize);
                cellGradient.addColorStop(0, '#FFD700');
                cellGradient.addColorStop(1, '#FFA500');
            } else if (isHovered) {
                cellGradient = ctx.createLinearGradient(posX, posY, posX, posY + this.cellSize);
                cellGradient.addColorStop(0, 'rgba(102, 200, 255, 0.9)');
                cellGradient.addColorStop(1, 'rgba(102, 126, 234, 0.9)');
            } else {
                cellGradient = ctx.createLinearGradient(posX, posY, posX, posY + this.cellSize);
                cellGradient.addColorStop(0, '#ffffff');
                cellGradient.addColorStop(1, '#f5f5f5');
            }
            
            ctx.fillStyle = cellGradient;
            ctx.beginPath();
            ctx.roundRect(posX, posY, this.cellSize, this.cellSize, 12);
            ctx.fill();
            
            // Cell border
            if (unlocked) {
                ctx.strokeStyle = isSelected ? '#FFD700' : 
                                isHovered ? '#667eea' : 
                                'rgba(200, 200, 200, 0.6)';
                ctx.lineWidth = isSelected ? 3 : isHovered ? 2.5 : 2;
            } else {
                ctx.strokeStyle = 'rgba(180, 180, 180, 0.5)';
                ctx.lineWidth = 2;
            }
            ctx.beginPath();
            ctx.roundRect(posX, posY, this.cellSize, this.cellSize, 12);
            ctx.stroke();
            
            // Reset shadow
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;
            
            // Level number
            if (unlocked) {
                if (isSelected) {
                    ctx.fillStyle = 'white';
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                    ctx.shadowBlur = 4;
                } else {
                    const numGradient = ctx.createLinearGradient(posX, posY, posX + this.cellSize, posY + this.cellSize);
                    numGradient.addColorStop(0, '#667eea');
                    numGradient.addColorStop(1, '#764ba2');
                    ctx.fillStyle = numGradient;
                }
            } else {
                ctx.fillStyle = '#999';
            }
            
            ctx.font = 'bold 26px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(levelId.toString(), posX + this.cellSize / 2, posY + this.cellSize / 2 - 6);
            
            ctx.shadowBlur = 0;
            
            // Stars display
            if (stars > 0) {
                ctx.font = '16px Arial';
                ctx.textBaseline = 'bottom';
                const starText = '⭐'.repeat(stars);
                const starGradient = ctx.createLinearGradient(posX, posY + this.cellSize - 12, posX + this.cellSize, posY + this.cellSize - 12);
                starGradient.addColorStop(0, '#FFD700');
                starGradient.addColorStop(1, '#FFA500');
                ctx.fillStyle = starGradient;
                ctx.shadowColor = 'rgba(255, 165, 0, 0.4)';
                ctx.shadowBlur = 3;
                ctx.fillText(starText, posX + this.cellSize / 2, posY + this.cellSize - 6);
                ctx.shadowBlur = 0;
            }
            
            // Lock icon
            if (!unlocked) {
                ctx.font = '22px Arial';
                ctx.fillStyle = 'rgba(120, 120, 120, 0.8)';
                ctx.textBaseline = 'bottom';
                ctx.fillText('🔒', posX + this.cellSize / 2, posY + this.cellSize - 6);
            }
        });
        
        ctx.textBaseline = 'alphabetic';
        ctx.shadowBlur = 0;
        
        // Buttons at bottom of panel - same style as LevelSummaryScreen
        this.renderButtons(ctx, canvasWidth, canvasHeight, panelX, panelY, panelWidth, panelHeight);
    }
    
    /**
     * Render buttons at bottom of panel - calculates and STORES positions
     */
    renderButtons(ctx, canvasWidth, canvasHeight, panelX, panelY, panelWidth, panelHeight) {
        const isMobile = canvasWidth < 600;
        const buttonWidth = isMobile ? Math.min(140, panelWidth * 0.4) : 150;
        const buttonHeight = isMobile ? 45 : 50;
        const spacing = isMobile ? 10 : 15;
        
        // Buttons at bottom of panel (like LevelSummaryScreen)
        const buttonY = panelY + panelHeight - buttonHeight - 25;
        
        // Previous button (left side)
        this.buttons.pageUp.x = panelX + (panelWidth / 2) - buttonWidth - spacing / 2;
        this.buttons.pageUp.y = buttonY;
        this.buttons.pageUp.width = buttonWidth;
        this.buttons.pageUp.height = buttonHeight;
        
        // Next button (right side)
        this.buttons.pageDown.x = panelX + (panelWidth / 2) + spacing / 2;
        this.buttons.pageDown.y = buttonY;
        this.buttons.pageDown.width = buttonWidth;
        this.buttons.pageDown.height = buttonHeight;
        
        // Play button (above navigation if level selected)
        if (this.selectedLevel && this.buttons.play) {
            const playButtonWidth = Math.min(200, panelWidth * 0.7);
            const playButtonHeight = buttonHeight + 10;
            const playButtonY = buttonY - playButtonHeight - 15;
            
            this.buttons.play.x = panelX + (panelWidth - playButtonWidth) / 2;
            this.buttons.play.y = playButtonY;
            this.buttons.play.width = playButtonWidth;
            this.buttons.play.height = playButtonHeight;
            
            this.drawButton(ctx, this.buttons.play, this.buttons.play.color, this.buttons.play.hoverColor);
        }
        
        // Back button (top left of panel)
        this.buttons.back.x = panelX + 15;
        this.buttons.back.y = panelY + 15;
        this.buttons.back.width = 80;
        this.buttons.back.height = 40;
        
        // Draw all buttons
        this.drawButton(ctx, this.buttons.back, this.buttons.back.color, this.buttons.back.hoverColor);
        
        const prevEnabled = this.buttons.pageUp.enabled;
        const prevColor = prevEnabled ? this.buttons.pageUp.color : [0.5, 0.5, 0.5, 0.5];
        const prevHover = prevEnabled ? this.buttons.pageUp.hoverColor : [0.5, 0.5, 0.5, 0.5];
        this.drawButton(ctx, this.buttons.pageUp, prevColor, prevHover);
        
        const nextEnabled = this.buttons.pageDown.enabled;
        const nextColor = nextEnabled ? this.buttons.pageDown.color : [0.5, 0.5, 0.5, 0.5];
        const nextHover = nextEnabled ? this.buttons.pageDown.hoverColor : [0.5, 0.5, 0.5, 0.5];
        this.drawButton(ctx, this.buttons.pageDown, nextColor, nextHover);
    }
    
    /**
     * Draw button with LevelSummaryScreen style
     */
    drawButton(ctx, button, color, hoverColor) {
        const isHovered = false; // TODO: Add hover detection
        const btnColor = isHovered ? hoverColor : color;
        
        // Button shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 4;
        
        // Button gradient background
        const gradient = ctx.createLinearGradient(button.x, button.y, button.x, button.y + button.height);
        gradient.addColorStop(0, `rgba(${btnColor[0] * 255}, ${btnColor[1] * 255}, ${btnColor[2] * 255}, ${btnColor[3]})`);
        gradient.addColorStop(1, `rgba(${btnColor[0] * 200}, ${btnColor[1] * 200}, ${btnColor[2] * 200}, ${btnColor[3]})`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(button.x, button.y, button.width, button.height, button.height / 4);
        ctx.fill();
        
        // Button border
        ctx.strokeStyle = `rgba(${btnColor[0] * 255}, ${btnColor[1] * 255}, ${btnColor[2] * 255}, 0.8)`;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
        
        // Button text
        ctx.fillStyle = 'white';
        ctx.font = `bold ${Math.floor(button.height * 0.35)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 3;
        ctx.fillText(button.label, button.x + button.width / 2, button.y + button.height / 2);
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
    }
    
    /**
     * Ottieni dati per rendering
     */
    getRenderData() {
        if (!this.visible) return null;
        
        const levels = this.getLevelsForCurrentPage();
        const levelData = levels.map((levelId, index) => {
            const pos = this.getCellPosition(index);
            return {
                id: levelId,
                x: pos.x,
                y: pos.y,
                size: this.cellSize,
                unlocked: this.isLevelUnlocked(levelId),
                stars: this.getLevelStars(levelId),
                selected: levelId === this.selectedLevel,
                hovered: levelId === this.hoveredLevel
            };
        });
        
        return {
            visible: true,
            levels: levelData,
            currentPage: this.currentPage,
            totalPages: this.totalPages,
            buttons: this.buttons,
            selectedLevel: this.selectedLevel
        };
    }
    
    /**
     * Resize
     */
    resize(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
        this.createButtons();
    }
    
    /**
     * Check visibilità
     */
    isVisible() {
        return this.visible;
    }
}

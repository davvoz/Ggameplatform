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
     * Crea pulsanti
     */
    createButtons() {
        const margin = 20;
        
        // Pulsante Back
        this.buttons.back = {
            x: margin,
            y: margin,
            width: 80,
            height: 40,
            label: '← Back',
            color: [0.6, 0.6, 0.7, 1.0],
            hoverColor: [0.7, 0.7, 0.8, 1.0]
        };
        
        // Pulsanti paginazione
        this.buttons.pageUp = {
            x: margin,
            y: this.canvasHeight - margin - 40,
            width: 120,
            height: 40,
            label: '⬆ Previous',
            color: [0.5, 0.5, 0.6, 1.0],
            hoverColor: [0.6, 0.6, 0.7, 1.0],
            enabled: this.currentPage > 0
        };
        
        this.buttons.pageDown = {
            x: this.canvasWidth - margin - 120,
            y: this.canvasHeight - margin - 40,
            width: 120,
            height: 40,
            label: 'Next ⬇',
            color: [0.5, 0.5, 0.6, 1.0],
            hoverColor: [0.6, 0.6, 0.7, 1.0],
            enabled: this.currentPage < this.totalPages - 1
        };
        
        // Pulsante Play (solo se livello selezionato)
        if (this.selectedLevel) {
            this.buttons.play = {
                x: this.canvasWidth / 2 - 100,
                y: this.canvasHeight - margin - 60,
                width: 200,
                height: 50,
                label: '▶ Play Level ' + this.selectedLevel,
                color: [0.2, 0.8, 0.3, 1.0],
                hoverColor: [0.3, 0.9, 0.4, 1.0]
            };
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
     * Calcola posizione cella
     */
    getCellPosition(levelIndex) {
        const row = Math.floor(levelIndex / this.levelsPerRow);
        const col = levelIndex % this.levelsPerRow;
        
        const startX = (this.canvasWidth - (this.levelsPerRow * (this.cellSize + this.cellSpacing))) / 2;
        const startY = 140; // Aumentato margine superiore
        
        return {
            x: startX + col * (this.cellSize + this.cellSpacing),
            y: startY + row * (this.cellSize + this.cellSpacing) + this.scrollOffset
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
        
        // Background overlay with gradient
        const bgGradient = ctx.createRadialGradient(canvasWidth / 2, canvasHeight / 2, 0, canvasWidth / 2, canvasHeight / 2, canvasWidth);
        bgGradient.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
        bgGradient.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // Top bar with gradient
        const topBarHeight = 100;
        const topBarGradient = ctx.createLinearGradient(0, 0, 0, topBarHeight);
        topBarGradient.addColorStop(0, 'rgba(102, 126, 234, 0.95)');
        topBarGradient.addColorStop(1, 'rgba(118, 75, 162, 0.95)');
        ctx.fillStyle = topBarGradient;
        ctx.fillRect(0, 0, canvasWidth, topBarHeight);
        
        // Top bar shine effect
        const shineGradient = ctx.createLinearGradient(0, 0, 0, topBarHeight / 2);
        shineGradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
        shineGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = shineGradient;
        ctx.fillRect(0, 0, canvasWidth, topBarHeight / 2);
        
        // Title with rainbow gradient and shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 3;
        
        const titleGradient = ctx.createLinearGradient(0, 50, canvasWidth, 50);
        titleGradient.addColorStop(0, '#FFD700');
        titleGradient.addColorStop(0.5, '#FFA500');
        titleGradient.addColorStop(1, '#FFD700');
        ctx.fillStyle = titleGradient;
        ctx.font = 'bold 32px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🎮 Select Level', canvasWidth / 2, 55);
        ctx.restore();
        
        // Level grid with enhanced styling
        const levels = this.getLevelsForCurrentPage();
        levels.forEach((levelId, index) => {
            const pos = this.getCellPosition(index);
            const unlocked = this.isLevelUnlocked(levelId);
            const stars = this.getLevelStars(levelId);
            const isSelected = levelId === this.selectedLevel;
            const isHovered = levelId === this.hoveredLevel;
            
            // Cell shadow for depth
            if (unlocked) {
                ctx.shadowColor = isHovered ? 'rgba(102, 126, 234, 0.6)' : 'rgba(0, 0, 0, 0.3)';
                ctx.shadowBlur = isHovered ? 20 : 10;
                ctx.shadowOffsetY = isHovered ? 6 : 4;
            }
            
            // Cell background gradient
            let cellGradient;
            if (!unlocked) {
                cellGradient = ctx.createLinearGradient(pos.x, pos.y, pos.x, pos.y + this.cellSize);
                cellGradient.addColorStop(0, 'rgba(80, 80, 80, 0.6)');
                cellGradient.addColorStop(1, 'rgba(60, 60, 60, 0.8)');
            } else if (isSelected) {
                cellGradient = ctx.createLinearGradient(pos.x, pos.y, pos.x, pos.y + this.cellSize);
                cellGradient.addColorStop(0, 'rgba(255, 215, 0, 0.95)');
                cellGradient.addColorStop(1, 'rgba(255, 165, 0, 0.95)');
            } else if (isHovered) {
                cellGradient = ctx.createLinearGradient(pos.x, pos.y, pos.x, pos.y + this.cellSize);
                cellGradient.addColorStop(0, 'rgba(102, 200, 255, 0.95)');
                cellGradient.addColorStop(1, 'rgba(102, 126, 234, 0.95)');
            } else {
                cellGradient = ctx.createLinearGradient(pos.x, pos.y, pos.x, pos.y + this.cellSize);
                cellGradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
                cellGradient.addColorStop(1, 'rgba(240, 248, 255, 0.95)');
            }
            
            ctx.fillStyle = cellGradient;
            ctx.beginPath();
            ctx.roundRect(pos.x, pos.y, this.cellSize, this.cellSize, 12);
            ctx.fill();
            
            // Cell border
            if (unlocked) {
                ctx.strokeStyle = isSelected ? 'rgba(255, 215, 0, 0.8)' : 
                                isHovered ? 'rgba(102, 126, 234, 0.8)' : 
                                'rgba(200, 200, 200, 0.5)';
                ctx.lineWidth = isSelected ? 4 : isHovered ? 3 : 2;
            } else {
                ctx.strokeStyle = 'rgba(100, 100, 100, 0.5)';
                ctx.lineWidth = 2;
            }
            ctx.beginPath();
            ctx.roundRect(pos.x, pos.y, this.cellSize, this.cellSize, 12);
            ctx.stroke();
            
            // Reset shadow
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;
            
            // Level number with color coding
            if (unlocked) {
                if (isSelected) {
                    ctx.fillStyle = 'white';
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                    ctx.shadowBlur = 4;
                } else {
                    const numGradient = ctx.createLinearGradient(pos.x, pos.y, pos.x + this.cellSize, pos.y + this.cellSize);
                    numGradient.addColorStop(0, '#667eea');
                    numGradient.addColorStop(1, '#764ba2');
                    ctx.fillStyle = numGradient;
                }
            } else {
                ctx.fillStyle = '#999';
            }
            
            ctx.font = 'bold 28px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(levelId.toString(), pos.x + this.cellSize / 2, pos.y + this.cellSize / 2 - 8);
            
            ctx.shadowBlur = 0;
            
            // Stars display
            if (stars > 0) {
                ctx.font = '18px Arial';
                ctx.textBaseline = 'bottom';
                
                // Star background
                const starBgWidth = stars * 20;
                const starBgX = pos.x + (this.cellSize - starBgWidth) / 2;
                const starBgY = pos.y + this.cellSize - 25;
                
                ctx.fillStyle = 'rgba(255, 215, 0, 0.2)';
                ctx.beginPath();
                ctx.roundRect(starBgX - 4, starBgY - 2, starBgWidth + 8, 24, 12);
                ctx.fill();
                
                // Stars
                const starText = '⭐'.repeat(stars);
                const starGradient = ctx.createLinearGradient(
                    pos.x, 
                    pos.y + this.cellSize - 15, 
                    pos.x + this.cellSize, 
                    pos.y + this.cellSize - 15
                );
                starGradient.addColorStop(0, '#FFD700');
                starGradient.addColorStop(0.5, '#FFA500');
                starGradient.addColorStop(1, '#FFD700');
                ctx.fillStyle = starGradient;
                ctx.shadowColor = 'rgba(255, 165, 0, 0.5)';
                ctx.shadowBlur = 4;
                ctx.fillText(starText, pos.x + this.cellSize / 2, pos.y + this.cellSize - 8);
                ctx.shadowBlur = 0;
            }
            
            // Lock icon for locked levels
            if (!unlocked) {
                ctx.font = '24px Arial';
                ctx.fillStyle = 'rgba(150, 150, 150, 0.8)';
                ctx.textBaseline = 'bottom';
                ctx.fillText('🔒', pos.x + this.cellSize / 2, pos.y + this.cellSize - 8);
            }
        });
        
        ctx.textBaseline = 'alphabetic';
        
        // Page indicator with modern design
        const pageIndicatorY = canvasHeight - 60;
        const pageText = `Page ${this.currentPage + 1} / ${this.totalPages}`;
        
        // Background for page indicator
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.roundRect(canvasWidth / 2 - 80, pageIndicatorY - 20, 160, 40, 20);
        ctx.fill();
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(pageText, canvasWidth / 2, pageIndicatorY + 5);
        
        // Render back button with modern style
        if (this.buttons.back) {
            const btn = this.buttons.back;
            
            // Button background
            const btnGradient = ctx.createLinearGradient(btn.x, btn.y, btn.x, btn.y + btn.height);
            btnGradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
            btnGradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
            ctx.fillStyle = btnGradient;
            ctx.beginPath();
            ctx.roundRect(btn.x, btn.y, btn.width, btn.height, 20);
            ctx.fill();
            
            // Button border
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Button text
            ctx.fillStyle = 'white';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(btn.label, btn.x + btn.width / 2, btn.y + btn.height / 2 + 5);
        }
        
        // Render pagination buttons
        if (this.buttons.pageUp) {
            const btn = this.buttons.pageUp;
            const enabled = btn.enabled;
            
            // Button background
            const btnGradient = ctx.createLinearGradient(btn.x, btn.y, btn.x, btn.y + btn.height);
            btnGradient.addColorStop(0, enabled ? 'rgba(102, 126, 234, 0.8)' : 'rgba(100, 100, 100, 0.5)');
            btnGradient.addColorStop(1, enabled ? 'rgba(118, 75, 162, 0.8)' : 'rgba(80, 80, 80, 0.5)');
            ctx.fillStyle = btnGradient;
            ctx.beginPath();
            ctx.roundRect(btn.x, btn.y, btn.width, btn.height, 20);
            ctx.fill();
            
            // Button border
            ctx.strokeStyle = enabled ? 'rgba(255, 255, 255, 0.6)' : 'rgba(150, 150, 150, 0.4)';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Button text
            ctx.fillStyle = enabled ? 'white' : 'rgba(200, 200, 200, 0.6)';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(btn.label, btn.x + btn.width / 2, btn.y + btn.height / 2 + 5);
        }
        
        if (this.buttons.pageDown) {
            const btn = this.buttons.pageDown;
            const enabled = btn.enabled;
            
            // Button background
            const btnGradient = ctx.createLinearGradient(btn.x, btn.y, btn.x, btn.y + btn.height);
            btnGradient.addColorStop(0, enabled ? 'rgba(102, 126, 234, 0.8)' : 'rgba(100, 100, 100, 0.5)');
            btnGradient.addColorStop(1, enabled ? 'rgba(118, 75, 162, 0.8)' : 'rgba(80, 80, 80, 0.5)');
            ctx.fillStyle = btnGradient;
            ctx.beginPath();
            ctx.roundRect(btn.x, btn.y, btn.width, btn.height, 20);
            ctx.fill();
            
            // Button border
            ctx.strokeStyle = enabled ? 'rgba(255, 255, 255, 0.6)' : 'rgba(150, 150, 150, 0.4)';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Button text
            ctx.fillStyle = enabled ? 'white' : 'rgba(200, 200, 200, 0.6)';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(btn.label, btn.x + btn.width / 2, btn.y + btn.height / 2 + 5);
        }
        
        // Render play button if level selected
        if (this.buttons.play && this.selectedLevel) {
            const btn = this.buttons.play;
            
            // Button background
            const btnGradient = ctx.createLinearGradient(btn.x, btn.y, btn.x, btn.y + btn.height);
            btnGradient.addColorStop(0, 'rgba(46, 213, 115, 0.95)');
            btnGradient.addColorStop(1, 'rgba(39, 174, 96, 0.95)');
            ctx.fillStyle = btnGradient;
            ctx.beginPath();
            ctx.roundRect(btn.x, btn.y, btn.width, btn.height, 25);
            ctx.fill();
            
            // Button border
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 3;
            ctx.stroke();
            
            // Button text
            ctx.fillStyle = 'white';
            ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'center';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
            ctx.shadowBlur = 4;
            ctx.fillText(btn.label, btn.x + btn.width / 2, btn.y + btn.height / 2 + 6);
            ctx.shadowBlur = 0;
        }
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

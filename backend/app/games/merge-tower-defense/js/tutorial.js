/**
 * Tutorial System
 * Manages in-game tutorial with step-by-step instructions
 * OOP design for scalability and maintainability
 */

import { CONFIG, CANNON_TYPES, UI_CONFIG } from './config.js';
import { Utils } from './utils.js';

/**
 * Represents a single tutorial step
 */
class TutorialStep {
    constructor(config) {
        this.id = config.id;
        this.title = config.title;
        this.description = config.description;
        this.highlightArea = config.highlightArea || null; // {x, y, width, height} or 'grid' | 'shop' | 'sidebar' | 'topbar'
        this.highlightAreas = config.highlightAreas || null; // Array of areas to highlight simultaneously
        this.arrowDirection = config.arrowDirection || null; // 'up' | 'down' | 'left' | 'right'
        this.arrowTarget = config.arrowTarget || null; // {x, y}
        this.waitForAction = config.waitForAction || null; // 'tap' | 'place_tower' | 'merge' | 'start_wave' | null
        this.autoAdvanceDelay = config.autoAdvanceDelay || null; // ms to auto-advance, null = wait for action/tap
        this.condition = config.condition || null; // Function to check if step is complete
        this.onEnter = config.onEnter || null; // Callback when step starts
        this.onExit = config.onExit || null; // Callback when step ends
        this.position = config.position || 'center'; // 'top' | 'center' | 'bottom'
        this.icon = config.icon || '💡';
    }
}

/**
 * Tutorial Manager - handles the entire tutorial flow
 */
export class TutorialManager {
    constructor(game, graphics, ui) {
        this.game = game;
        this.graphics = graphics;
        this.ui = ui;
        
        this.isActive = false;
        this.isPaused = false;
        this.currentStepIndex = 0;
        this.steps = [];
        this.animationTime = 0;
        
        // Tutorial state tracking
        this.completedActions = {
            towerPlaced: false,
            towersMerged: false,
            waveStarted: false,
            abilityUsed: false,
            shopItemPurchased: false
        };
        
        // Visual state
        this.overlayAlpha = 0;
        this.textAlpha = 0;
        this.highlightPulse = 0;
        
        // Initialize tutorial steps
        this.initializeSteps();
        
        // Bind event listeners
        this.boundOnAction = this.onGameAction.bind(this);
    }

    /**
     * Initialize all tutorial steps
     */
    initializeSteps() {
        this.steps = [
            // Step 1: Welcome
            new TutorialStep({
                id: 'welcome',
                title: '🏰 Benvenuto in Merge Tower Defense!',
                description: 'Difendi la tua base dalle ondate di nemici costruendo e potenziando le torrette!',
                position: 'center',
                icon: '👋',
                autoAdvanceDelay: null
            }),

            // Step 2: Explain the grid
            new TutorialStep({
                id: 'grid_intro',
                title: '🎮 Il Campo di Battaglia',
                description: 'I nemici arrivano dall\'alto. La zona verde in basso è dove puoi piazzare le torrette.',
                highlightArea: 'defense_zone',
                arrowDirection: 'down',
                position: 'top',
                icon: '🗺️'
            }),

            // Step 3: Show the shop
            new TutorialStep({
                id: 'shop_intro',
                title: '🛒 Negozio Torrette',
                description: 'In basso trovi i diversi tipi di torrette. Ogni tipo ha caratteristiche uniche!',
                highlightArea: 'shop',
                arrowDirection: 'down',
                position: 'bottom',
                icon: '🏪'
            }),

            // Step 4: Place first tower
            new TutorialStep({
                id: 'place_tower',
                title: '🔫 Piazza la Prima Torretta',
                description: 'Prima seleziona una torretta dal negozio in basso, poi tocca una cella verde!',
                highlightAreas: ['defense_zone', 'shop'], // Multiple areas
                waitForAction: 'place_tower',
                position: 'center',
                icon: '👆',
                showFirstTowerArrow: true, // Show exaggerated arrow on first tower
                onEnter: (manager) => {
                    manager.completedActions.towerPlaced = false;
                }
            }),

            // Step 5: Place more towers
            new TutorialStep({
                id: 'place_more',
                title: '🔫 Piazza Altre Torrette',
                description: 'Piazza altre 2 torrette dello STESSO TIPO per poterle fondere!',
                highlightAreas: ['defense_zone', 'shop'], // Multiple areas
                waitForAction: 'place_multiple',
                position: 'center',
                icon: '✌️',
                condition: (manager) => {
                    const cannons = manager.game.entities.cannons;
                    if (cannons.length < 3) return false;
                    // Check if there are at least 3 of the same type
                    const types = {};
                    cannons.forEach(c => {
                        types[c.type] = (types[c.type] || 0) + 1;
                    });
                    return Object.values(types).some(count => count >= 3);
                }
            }),

            // Step 6: Explain merge system
            new TutorialStep({
                id: 'merge_intro',
                title: '🔄 Sistema di Fusione',
                description: 'Tocca 3 torrette IDENTICHE (stesso tipo e livello) per fonderle in una più potente!',
                position: 'center',
                icon: '⬆️'
            }),

            // Step 7: Perform merge
            new TutorialStep({
                id: 'perform_merge',
                title: '🔄 Fondi le Torrette!',
                description: 'Seleziona 3 torrette dello stesso tipo toccandole una alla volta.',
                highlightArea: 'defense_zone',
                waitForAction: 'merge',
                position: 'top',
                icon: '🔥',
                onEnter: (manager) => {
                    manager.completedActions.towersMerged = false;
                }
            }),

            // Step 8: Explain energy
            new TutorialStep({
                id: 'energy_intro',
                title: '⚡ Energia e Muro',
                description: 'Il muro di mattoni rappresenta la tua energia. Se i nemici lo raggiungono, perdi energia!',
                highlightArea: 'wall',
                arrowDirection: 'up',
                position: 'center',
                icon: '🧱'
            }),

            // Step 9: Explain coins
            new TutorialStep({
                id: 'coins_intro',
                title: '💰 Monete',
                description: 'Guadagni monete eliminando nemici. Usale per comprare nuove torrette!',
                highlightArea: 'topbar',
                position: 'top',
                icon: '🪙'
            }),

            // Step 10: Explain sidebar abilities
            new TutorialStep({
                id: 'abilities_intro',
                title: '💥 Abilità Speciali',
                description: 'In alto a sinistra trovi le abilità: Bomba esplode i nemici, Respingi li spinge indietro , lo stun li immobilizza!',
                highlightArea: 'sidebar_abilities',
                position: 'center',
                icon: '🎯'
            }),

            // Step 11: Explain shop items in sidebar
            new TutorialStep({
                id: 'shop_items_intro',
                title: '🛍️ Oggetti Acquistabili',
                description: 'Sotto le abilità trovi oggetti speciali: Energia, Potenziamenti per danni, velocità e raggio!I boost durano N secondi e potenziano TUTTE le torrette. Usali nelle ondate difficili!',
                highlightArea: 'sidebar_shop',
                position: 'center',
                icon: '✨'
            }),

            // Step 13: Ready to play
            new TutorialStep({
                id: 'ready',
                title: '⚔️ Sei Pronto!',
                description: 'Le ondate inizieranno automaticamente. Buona fortuna, comandante!',
                position: 'center',
                icon: '🚀'
            })
        ];
    }

    /**
     * Check if tutorial has been completed before
     */
    static hasCompletedTutorial() {
        try {
           // return localStorage.getItem('mergeTower_tutorialCompleted') === 'true';
        } catch (e) {
            return false;
        }
    }





    /**
     * Start the tutorial
     */
    start() {
        console.log('[Tutorial] Starting tutorial...');
        this.isActive = true;
        this.isPaused = false;
        this.currentStepIndex = 0;
        this.overlayAlpha = 0;
        this.textAlpha = 0;
        
        // Pause the game during tutorial
        if (this.game) {
            this.game.pause();
            // Prevent waves from starting
            this.game.state.tutorialMode = true;
            // Pause music during tutorial
            if (this.game.audio) {
                this.game.audio.pause();
            }
        }
        
        // Enter first step
        this.enterCurrentStep();
    }

    /**
     * Stop the tutorial
     */
    stop() {
        console.log('[Tutorial] Stopping tutorial...');
        this.isActive = false;
        
        // Resume the game
        if (this.game) {
            this.game.state.tutorialMode = false;
            this.game.resume();
            // Start music after tutorial ends
            if (this.game.audio) {
                this.game.audio.play();
            }
        }
    }


    /**
     * Complete the tutorial
     */
    complete() {
        console.log('[Tutorial] Tutorial completed!');
        this.stop();
    }

    /**
     * Enter the current step
     */
    enterCurrentStep() {
        const step = this.getCurrentStep();
        if (!step) {
            this.complete();
            return;
        }
        
        console.log(`[Tutorial] Entering step: ${step.id}`);
        
        // Call onEnter callback if exists
        if (step.onEnter) {
            step.onEnter(this);
        }
        
        // Resume game for action steps
        if (step.waitForAction) {
            if (this.game) {
                this.game.resume();
            }
        } else {
            if (this.game) {
                this.game.pause();
            }
        }
        
        // Reset animation
        this.textAlpha = 0;
        this.highlightPulse = 0;
    }

    /**
     * Exit the current step
     */
    exitCurrentStep() {
        const step = this.getCurrentStep();
        if (step && step.onExit) {
            step.onExit(this);
        }
    }

    /**
     * Advance to the next step
     */
    nextStep() {
        this.exitCurrentStep();
        this.currentStepIndex++;
        
        if (this.currentStepIndex >= this.steps.length) {
            this.complete();
        } else {
            this.enterCurrentStep();
        }
    }

    /**
     * Go back to the previous step
     */
    previousStep() {
        if (this.currentStepIndex > 0) {
            this.exitCurrentStep();
            this.currentStepIndex--;
            this.enterCurrentStep();
        }
    }

    /**
     * Get the current step
     */
    getCurrentStep() {
        return this.steps[this.currentStepIndex] || null;
    }

    /**
     * Handle game actions for step completion
     */
    onGameAction(actionType, data) {
        if (!this.isActive) return;
        
        const step = this.getCurrentStep();
        if (!step) return;
        
        // Update completed actions
        switch (actionType) {
            case 'tower_placed':
                this.completedActions.towerPlaced = true;
                if (step.waitForAction === 'place_tower') {
                    this.nextStep();
                }
                break;
                
            case 'towers_merged':
                this.completedActions.towersMerged = true;
                if (step.waitForAction === 'merge') {
                    this.nextStep();
                }
                break;
                
            case 'ability_used':
                this.completedActions.abilityUsed = true;
                break;
                
            case 'shop_purchased':
                this.completedActions.shopItemPurchased = true;
                break;
        }
        
        // Check condition-based steps
        if (step.condition && step.condition(this)) {
            this.nextStep();
        }
    }

    /**
     * Handle tap during tutorial
     */
    handleTap(screenPos) {
        if (!this.isActive) return false;
        
        const step = this.getCurrentStep();
        if (!step) return false;
        
        const width = this.graphics.canvas.width / (window.devicePixelRatio || 1);
        const height = this.graphics.canvas.height / (window.devicePixelRatio || 1);
        
        
        // Check next button (for non-action steps)
        if (!step.waitForAction) {
            const nextBtn = this.getNextButtonBounds(width, height);
            if (this.isPointInRect(screenPos, nextBtn)) {
                this.nextStep();
                return true;
            }
            
            // Tap anywhere to continue (except skip button)
            this.nextStep();
            return true;
        }
        
        // For action steps, let the tap pass through to the game
        return false;
    }

    /**
     * Update tutorial state
     */
    update(dt) {
        if (!this.isActive) return;
        
        this.animationTime += dt;
        
        // Animate overlay fade in
        this.overlayAlpha = Math.min(1, this.overlayAlpha + dt * 3);
        
        // Animate text fade in
        this.textAlpha = Math.min(1, this.textAlpha + dt * 4);
        
        // Pulse animation for highlights
        this.highlightPulse = (Math.sin(this.animationTime * 3) + 1) / 2;
        
        // Check auto-advance
        const step = this.getCurrentStep();
        if (step && step.autoAdvanceDelay) {
            // Auto advance logic would go here if needed
        }
        
        // Check condition-based completion
        if (step && step.condition && step.condition(this)) {
            this.nextStep();
        }
    }

    /**
     * Render the tutorial overlay
     */
    render() {
        if (!this.isActive) return;
        
        const ctx = this.graphics.ctx;
        const width = this.graphics.canvas.width / (window.devicePixelRatio || 1);
        const height = this.graphics.canvas.height / (window.devicePixelRatio || 1);
        
        const step = this.getCurrentStep();
        if (!step) return;
        
        // Draw semi-transparent overlay with hole for highlight
        this.renderOverlayWithHole(ctx, width, height, step);
        
        // Draw arrow if specified
        if (step.arrowDirection && step.arrowTarget) {
            this.renderArrow(ctx, step);
        }
        
        // Draw exaggerated arrow for first tower if specified
        this.renderFirstTowerArrow(ctx, step);
        
        // Draw tutorial dialog
        this.renderDialog(ctx, width, height, step);
        
        // Draw buttons
        this.renderButtons(ctx, width, height, step);
        
        // Draw progress indicator
        this.renderProgress(ctx, width, height);
    }

    /**
     * Render the darkened overlay with holes for the highlighted areas
     */
    renderOverlayWithHole(ctx, width, height, step) {
        ctx.save();
        ctx.globalAlpha = this.overlayAlpha * 0.85;
        ctx.fillStyle = 'rgba(0, 0, 0, 1)';
        
        // Get all highlight bounds (support both single and multiple areas)
        let allBounds = [];
        
        if (step.highlightAreas && step.highlightAreas.length > 0) {
            // Multiple areas
            for (const area of step.highlightAreas) {
                const bounds = this.getHighlightBounds(area, width, height);
                if (bounds) allBounds.push(bounds);
            }
        } else if (step.highlightArea) {
            // Single area (legacy support)
            const bounds = this.getHighlightBounds(step.highlightArea, width, height);
            if (bounds) allBounds.push(bounds);
        }
        
        if (allBounds.length > 0) {
            const pulse = this.highlightPulse;
            const expandAmount = pulse * 4 + 5;
            
            // Create a path that covers the whole screen except the highlighted areas
            // Using canvas clipping with "evenodd" fill rule
            ctx.beginPath();
            
            // Outer rectangle (full screen)
            ctx.rect(0, 0, width, height);
            
            // Inner rectangles (holes) - draw them counterclockwise to create holes
            for (const bounds of allBounds) {
                const hx = bounds.x - expandAmount;
                const hy = bounds.y - expandAmount;
                const hw = bounds.width + expandAmount * 2;
                const hh = bounds.height + expandAmount * 2;
                const radius = 12;
                
                // Draw rounded rect counterclockwise to create hole
                ctx.moveTo(hx + radius, hy);
                ctx.lineTo(hx, hy);
                ctx.lineTo(hx, hy + hh);
                ctx.lineTo(hx + hw, hy + hh);
                ctx.lineTo(hx + hw, hy);
                ctx.lineTo(hx + radius, hy);
            }
            
            ctx.fill('evenodd');
            ctx.restore();
            
            // Draw glowing borders around each highlight
            for (const bounds of allBounds) {
                const hx = bounds.x - expandAmount;
                const hy = bounds.y - expandAmount;
                const hw = bounds.width + expandAmount * 2;
                const hh = bounds.height + expandAmount * 2;
                const radius = 12;
                
                ctx.save();
                ctx.strokeStyle = `rgba(0, 255, 136, ${0.6 + pulse * 0.4})`;
                ctx.lineWidth = 3;
                ctx.shadowColor = '#00ff88';
                ctx.shadowBlur = 10 + pulse * 10;
                
                ctx.beginPath();
                ctx.moveTo(hx + radius, hy);
                ctx.lineTo(hx + hw - radius, hy);
                ctx.quadraticCurveTo(hx + hw, hy, hx + hw, hy + radius);
                ctx.lineTo(hx + hw, hy + hh - radius);
                ctx.quadraticCurveTo(hx + hw, hy + hh, hx + hw - radius, hy + hh);
                ctx.lineTo(hx + radius, hy + hh);
                ctx.quadraticCurveTo(hx, hy + hh, hx, hy + hh - radius);
                ctx.lineTo(hx, hy + radius);
                ctx.quadraticCurveTo(hx, hy, hx + radius, hy);
                ctx.closePath();
                ctx.stroke();
                ctx.restore();
            }
        } else {
            // No highlight - just draw full overlay
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
        }
    }

    /**
     * Render the darkened overlay (legacy - not used)
     */
    renderOverlay(ctx, width, height, step) {
        ctx.save();
        ctx.globalAlpha = this.overlayAlpha * 0.7;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
    }

    /**
     * Render highlighted area (legacy - border only now)
     */
    renderHighlight(ctx, width, height, step) {
        const bounds = this.getHighlightBounds(step.highlightArea, width, height);
        if (!bounds) return;
        
        const pulse = this.highlightPulse;
        const expandAmount = pulse * 4;
        
        // Draw rounded rect for highlight cutout
        const x = bounds.x - expandAmount;
        const y = bounds.y - expandAmount;
        const w = bounds.width + expandAmount * 2;
        const h = bounds.height + expandAmount * 2;
        const radius = 10;
        
        // Draw glowing border around highlight
        ctx.save();
        ctx.strokeStyle = `rgba(0, 255, 136, ${0.6 + pulse * 0.4})`;
        ctx.lineWidth = 3;
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 10 + pulse * 10;
        
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + w - radius, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
        ctx.lineTo(x + w, y + h - radius);
        ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
        ctx.lineTo(x + radius, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    }

    /**
     * Get bounds for highlight area
     */
    getHighlightBounds(area, width, height) {
        const cellSize = this.graphics.cellSize || 50;
        const gridOffsetX = this.graphics.offsetX || 0;
        const gridOffsetY = this.graphics.offsetY || 0;
        const sidebarWidth = UI_CONFIG.SIDEBAR_WIDTH || 64;
        
        switch (area) {
            case 'defense_zone':
                return {
                    x: gridOffsetX,
                    y: gridOffsetY + (CONFIG.ROWS - CONFIG.DEFENSE_ZONE_ROWS) * cellSize,
                    width: CONFIG.COLS * cellSize,
                    height: CONFIG.DEFENSE_ZONE_ROWS * cellSize
                };
                
            case 'shop':
                return {
                    x: 0,
                    y: height - UI_CONFIG.SHOP_HEIGHT,
                    width: width,
                    height: UI_CONFIG.SHOP_HEIGHT
                };
                
            case 'sidebar':
                return {
                    x: 0,
                    y: UI_CONFIG.TOP_BAR_HEIGHT,
                    width: sidebarWidth,
                    height: height - UI_CONFIG.TOP_BAR_HEIGHT - UI_CONFIG.SHOP_HEIGHT
                };
                
            case 'topbar':
                return {
                    x: 0,
                    y: 0,
                    width: width,
                    height: UI_CONFIG.TOP_BAR_HEIGHT
                };
                
            case 'wall':
                return {
                    x: gridOffsetX,
                    y: gridOffsetY + (CONFIG.ROWS - CONFIG.DEFENSE_ZONE_ROWS - 1) * cellSize,
                    width: CONFIG.COLS * cellSize,
                    height: cellSize 
                };
                
            case 'grid':
                return {
                    x: gridOffsetX,
                    y: gridOffsetY,
                    width: CONFIG.COLS * cellSize,
                    height: CONFIG.ROWS * cellSize
                };
            
            case 'sidebar_abilities':
                // Just the top portion of sidebar with abilities (first 3 buttons)
                return {
                    x: 0,
                    y: UI_CONFIG.TOP_BAR_HEIGHT,
                    width: sidebarWidth,
                    height: 170 // Approximately 3 ability buttons
                };
            
            case 'sidebar_shop':
                // The bottom portion of sidebar with shop items
                return {
                    x: 0,
                    y: UI_CONFIG.TOP_BAR_HEIGHT + 180,
                    width: sidebarWidth,
                    height: height - UI_CONFIG.TOP_BAR_HEIGHT - UI_CONFIG.SHOP_HEIGHT - 180
                };
                
            default:
                if (typeof area === 'object') {
                    return area;
                }
                return null;
        }
    }

    /**
     * Render pointing arrow
     */
    renderArrow(ctx, step) {
        const target = step.arrowTarget;
        if (!target) return;
        
        ctx.save();
        ctx.fillStyle = '#00ff88';
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 10;
        
        const size = 20;
        const bounce = Math.sin(this.animationTime * 5) * 5;
        
        ctx.beginPath();
        switch (step.arrowDirection) {
            case 'down':
                ctx.moveTo(target.x, target.y + bounce);
                ctx.lineTo(target.x - size, target.y - size + bounce);
                ctx.lineTo(target.x + size, target.y - size + bounce);
                break;
            case 'up':
                ctx.moveTo(target.x, target.y - bounce);
                ctx.lineTo(target.x - size, target.y + size - bounce);
                ctx.lineTo(target.x + size, target.y + size - bounce);
                break;
            case 'left':
                ctx.moveTo(target.x - bounce, target.y);
                ctx.lineTo(target.x + size - bounce, target.y - size);
                ctx.lineTo(target.x + size - bounce, target.y + size);
                break;
            case 'right':
                ctx.moveTo(target.x + bounce, target.y);
                ctx.lineTo(target.x - size + bounce, target.y - size);
                ctx.lineTo(target.x - size + bounce, target.y + size);
                break;
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    /**
     * Render an exaggerated arrow pointing to the first tower in shop
     */
    renderFirstTowerArrow(ctx, step) {
        // Check if this step should show the arrow
        if (!step.showFirstTowerArrow) return;
        
        // Get first shop button position from UI
        const ui = this.game?.ui;
        if (!ui || !ui.shopButtons || ui.shopButtons.length === 0) return;
        
        const firstButton = ui.shopButtons[0];
        const time = this.animationTime;
        
        // Arrow position - above the first button
        const arrowX = firstButton.x + firstButton.width / 2;
        const arrowY = firstButton.y - 15;
        
        // Exaggerated bounce animation
        const bounceAmount = Math.sin(time * 4) * 12;
        const pulseScale = 1 + Math.sin(time * 6) * 0.2;
        
        ctx.save();
        
        // Draw multiple glow layers for exaggerated effect
        for (let i = 3; i >= 0; i--) {
            ctx.globalAlpha = 0.3 - i * 0.05;
            ctx.fillStyle = i === 0 ? '#ffff00' : '#ff6600';
            
            const glowScale = pulseScale * (1 + i * 0.15);
            const size = 25 * glowScale;
            
            ctx.beginPath();
            ctx.moveTo(arrowX, arrowY + bounceAmount);
            ctx.lineTo(arrowX - size, arrowY - size + bounceAmount);
            ctx.lineTo(arrowX - size * 0.4, arrowY - size * 0.4 + bounceAmount);
            ctx.lineTo(arrowX - size * 0.4, arrowY - size * 1.8 + bounceAmount);
            ctx.lineTo(arrowX + size * 0.4, arrowY - size * 1.8 + bounceAmount);
            ctx.lineTo(arrowX + size * 0.4, arrowY - size * 0.4 + bounceAmount);
            ctx.lineTo(arrowX + size, arrowY - size + bounceAmount);
            ctx.closePath();
            ctx.fill();
        }
        
        // Main arrow
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ffdd00';
        ctx.shadowColor = '#ffaa00';
        ctx.shadowBlur = 20;
        
        const size = 25 * pulseScale;
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY + bounceAmount);
        ctx.lineTo(arrowX - size, arrowY - size + bounceAmount);
        ctx.lineTo(arrowX - size * 0.4, arrowY - size * 0.4 + bounceAmount);
        ctx.lineTo(arrowX - size * 0.4, arrowY - size * 1.8 + bounceAmount);
        ctx.lineTo(arrowX + size * 0.4, arrowY - size * 1.8 + bounceAmount);
        ctx.lineTo(arrowX + size * 0.4, arrowY - size * 0.4 + bounceAmount);
        ctx.lineTo(arrowX + size, arrowY - size + bounceAmount);
        ctx.closePath();
        ctx.fill();
        
        // Draw "TAP!" text above arrow
        const textY = arrowY - size * 2.2 + bounceAmount;
        ctx.font = `bold ${18 * pulseScale}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Text outline
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 4;
        ctx.strokeText('TAP!', arrowX, textY);
        
        // Text fill
        ctx.fillStyle = '#fff';
        ctx.fillText('TAP!', arrowX, textY);
        
        // Highlight circle around button
        ctx.strokeStyle = '#ffdd00';
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.5 + Math.sin(time * 5) * 0.3;
        ctx.setLineDash([8, 4]);
        ctx.lineDashOffset = -time * 50;
        ctx.beginPath();
        ctx.arc(
            firstButton.x + firstButton.width / 2,
            firstButton.y + firstButton.height / 2,
            firstButton.width / 2 + 8,
            0,
            Math.PI * 2
        );
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.restore();
    }

    /**
     * Render the tutorial dialog box
     */
    renderDialog(ctx, width, height, step) {
        const dialogWidth = Math.min(width * 0.85, 380);
        const dialogHeight = 160; // Increased from 140
        const dialogX = (width - dialogWidth) / 2;
        
        let dialogY;
        switch (step.position) {
            case 'top':
                dialogY = UI_CONFIG.TOP_BAR_HEIGHT + 20;
                break;
            case 'bottom':
                dialogY = height - UI_CONFIG.SHOP_HEIGHT - dialogHeight - 70;
                break;
            default: // center
                dialogY = (height - dialogHeight) / 2 - 30;
        }
        
        ctx.save();
        ctx.globalAlpha = this.textAlpha;
        
        // Dialog background
        ctx.fillStyle = 'rgba(10, 10, 20, 0.95)';
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 20;
        
        const radius = 15;
        ctx.beginPath();
        ctx.moveTo(dialogX + radius, dialogY);
        ctx.lineTo(dialogX + dialogWidth - radius, dialogY);
        ctx.quadraticCurveTo(dialogX + dialogWidth, dialogY, dialogX + dialogWidth, dialogY + radius);
        ctx.lineTo(dialogX + dialogWidth, dialogY + dialogHeight - radius);
        ctx.quadraticCurveTo(dialogX + dialogWidth, dialogY + dialogHeight, dialogX + dialogWidth - radius, dialogY + dialogHeight);
        ctx.lineTo(dialogX + radius, dialogY + dialogHeight);
        ctx.quadraticCurveTo(dialogX, dialogY + dialogHeight, dialogX, dialogY + dialogHeight - radius);
        ctx.lineTo(dialogX, dialogY + radius);
        ctx.quadraticCurveTo(dialogX, dialogY, dialogX + radius, dialogY);
        ctx.closePath();
        ctx.fill();
        
        // Border
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Icon
        ctx.font = '28px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(step.icon, dialogX + 30, dialogY + 40);
        
        // Title - with word wrap if needed
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#00ff88';
        
        const titleMaxWidth = dialogWidth - 75;
        const titleWords = step.title.split(' ');
        let titleLine = '';
        let titleY = dialogY + 30;
        const titleLineHeight = 20;
        
        for (let i = 0; i < titleWords.length; i++) {
            const testLine = titleLine + titleWords[i] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > titleMaxWidth && i > 0) {
                ctx.fillText(titleLine, dialogX + 60, titleY);
                titleLine = titleWords[i] + ' ';
                titleY += titleLineHeight;
            } else {
                titleLine = testLine;
            }
        }
        ctx.fillText(titleLine, dialogX + 60, titleY);
        
        // Description - word wrap
        ctx.font = '13px Arial';
        ctx.fillStyle = '#cccccc';
        const maxWidth = dialogWidth - 75;
        const words = step.description.split(' ');
        let line = '';
        let y = titleY + 30; // Start below title
        const lineHeight = 18;
        
        for (let i = 0; i < words.length; i++) {
            const testLine = line + words[i] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && i > 0) {
                ctx.fillText(line, dialogX + 60, y);
                line = words[i] + ' ';
                y += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, dialogX + 60, y);
        
        // Action hint for interactive steps
        if (step.waitForAction) {
            ctx.font = 'italic 11px Arial';
            ctx.fillStyle = '#ffaa00';
            ctx.textAlign = 'center';
            ctx.fillText('👆 Esegui l\'azione per continuare', dialogX + dialogWidth / 2, dialogY + dialogHeight - 12);
        } else {
            ctx.font = '11px Arial';
            ctx.fillStyle = '#888888';
            ctx.textAlign = 'center';
            ctx.fillText('Tocca per continuare →', dialogX + dialogWidth / 2, dialogY + dialogHeight - 12);
        }
        
        ctx.restore();
    }

    /**
     * Render tutorial buttons
     */
    renderButtons(ctx, width, height, step) {
        // Skip button (always visible)
        const skipBtn = this.getSkipButtonBounds(width, height);
        
        ctx.save();
        ctx.globalAlpha = this.textAlpha;
        
        // Skip button
        ctx.fillStyle = 'rgba(100, 50, 50, 0.8)';
        Utils.drawRoundRect(ctx, skipBtn.x, skipBtn.y, skipBtn.width, skipBtn.height, 8);
        ctx.fill();
        
        ctx.strokeStyle = '#ff6666';
        ctx.lineWidth = 1;
        Utils.drawRoundRect(ctx, skipBtn.x, skipBtn.y, skipBtn.width, skipBtn.height, 8);
        ctx.stroke();
        
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ff6666';
        ctx.fillText('Salta ⏭️', skipBtn.x + skipBtn.width / 2, skipBtn.y + skipBtn.height / 2);
        
        ctx.restore();
    }

    /**
     * Render progress indicator
     */
    renderProgress(ctx, width, height) {
        const totalSteps = this.steps.length;
        const currentStep = this.currentStepIndex + 1;
        
        ctx.save();
        ctx.globalAlpha = this.textAlpha;
        
        // Progress dots
        const dotSize = 8;
        const dotSpacing = 12;
        const totalWidth = totalSteps * (dotSize + dotSpacing) - dotSpacing;
        const startX = (width - totalWidth) / 2;
        const y = height - 30;
        
        for (let i = 0; i < totalSteps; i++) {
            const x = startX + i * (dotSize + dotSpacing);
            
            if (i < this.currentStepIndex) {
                // Completed
                ctx.fillStyle = '#00ff88';
            } else if (i === this.currentStepIndex) {
                // Current
                ctx.fillStyle = '#ffaa00';
            } else {
                // Upcoming
                ctx.fillStyle = '#444444';
            }
            
            ctx.beginPath();
            ctx.arc(x + dotSize / 2, y, dotSize / 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Step counter text
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#888888';
        ctx.fillText(`${currentStep} / ${totalSteps}`, width / 2, y + 18);
        
        ctx.restore();
    }

    /**
     * Get skip button bounds
     */
    getSkipButtonBounds(width, height) {
        return {
            x: width - 80,
            y: 10,
            width: 70,
            height: 30
        };
    }

    /**
     * Get next button bounds
     */
    getNextButtonBounds(width, height) {
        return {
            x: width / 2 - 50,
            y: height / 2 + 80,
            width: 100,
            height: 40
        };
    }

    /**
     * Check if point is in rectangle
     */
    isPointInRect(point, rect) {
        return point.x >= rect.x && 
               point.x <= rect.x + rect.width &&
               point.y >= rect.y && 
               point.y <= rect.y + rect.height;
    }
}

/**
 * Tutorial Prompt Manager - handles the initial "Do you want tutorial?" dialog
 */
export class TutorialPrompt {
    constructor(graphics, onChoice) {
        this.graphics = graphics;
        this.onChoice = onChoice;
        this.isVisible = false;
        this.animationTime = 0;
        this.alpha = 0;
    }

    show() {
        this.isVisible = true;
        this.alpha = 0;
        this.animationTime = 0;
    }

    hide() {
        this.isVisible = false;
    }

    update(dt) {
        if (!this.isVisible) return;
        
        this.animationTime += dt;
        this.alpha = Math.min(1, this.alpha + dt * 3);
    }

    handleTap(screenPos) {
        if (!this.isVisible) return false;
        
        const width = this.graphics.canvas.width / (window.devicePixelRatio || 1);
        const height = this.graphics.canvas.height / (window.devicePixelRatio || 1);
        
        const yesBtn = this.getYesButtonBounds(width, height);
        const noBtn = this.getNoButtonBounds(width, height);
        
        if (this.isPointInRect(screenPos, yesBtn)) {
            this.hide();
            if (this.onChoice) this.onChoice(true);
            return true;
        }
        
        if (this.isPointInRect(screenPos, noBtn)) {
            this.hide();
            if (this.onChoice) this.onChoice(false);
            return true;
        }
        
        return true; // Block other taps while prompt is visible
    }

    render() {
        if (!this.isVisible) return;
        
        const ctx = this.graphics.ctx;
        const width = this.graphics.canvas.width / (window.devicePixelRatio || 1);
        const height = this.graphics.canvas.height / (window.devicePixelRatio || 1);
        
        ctx.save();
        ctx.globalAlpha = this.alpha;
        
        // Dark overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(0, 0, width, height);
        
        // Dialog box
        const dialogWidth = Math.min(width * 0.85, 320);
        const dialogHeight = 200;
        const dialogX = (width - dialogWidth) / 2;
        const dialogY = (height - dialogHeight) / 2;
        
        // Dialog background
        ctx.fillStyle = 'rgba(15, 15, 30, 0.98)';
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 30;
        
        const radius = 20;
        ctx.beginPath();
        ctx.moveTo(dialogX + radius, dialogY);
        ctx.lineTo(dialogX + dialogWidth - radius, dialogY);
        ctx.quadraticCurveTo(dialogX + dialogWidth, dialogY, dialogX + dialogWidth, dialogY + radius);
        ctx.lineTo(dialogX + dialogWidth, dialogY + dialogHeight - radius);
        ctx.quadraticCurveTo(dialogX + dialogWidth, dialogY + dialogHeight, dialogX + dialogWidth - radius, dialogY + dialogHeight);
        ctx.lineTo(dialogX + radius, dialogY + dialogHeight);
        ctx.quadraticCurveTo(dialogX, dialogY + dialogHeight, dialogX, dialogY + dialogHeight - radius);
        ctx.lineTo(dialogX, dialogY + radius);
        ctx.quadraticCurveTo(dialogX, dialogY, dialogX + radius, dialogY);
        ctx.closePath();
        ctx.fill();
        
        // Border
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 0;
        ctx.stroke();
        
        // Icon
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('📖', dialogX + dialogWidth / 2, dialogY + 50);
        
        // Title
        ctx.font = 'bold 20px Arial';
        ctx.fillStyle = '#00ff88';
        ctx.fillText('Tutorial', dialogX + dialogWidth / 2, dialogY + 95);
        
        // Question
        ctx.font = '14px Arial';
        ctx.fillStyle = '#cccccc';
        ctx.fillText('Vuoi vedere il tutorial?', dialogX + dialogWidth / 2, dialogY + 125);
        
        // Buttons
        const yesBtn = this.getYesButtonBounds(width, height);
        const noBtn = this.getNoButtonBounds(width, height);
        
        // Yes button
        const pulse = (Math.sin(this.animationTime * 3) + 1) / 2;
        ctx.fillStyle = `rgba(0, ${180 + pulse * 75}, ${100 + pulse * 36}, 0.9)`;
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 5 + pulse * 10;
        Utils.drawRoundRect(ctx, yesBtn.x, yesBtn.y, yesBtn.width, yesBtn.height, 10);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 2;
        Utils.drawRoundRect(ctx, yesBtn.x, yesBtn.y, yesBtn.width, yesBtn.height, 10);
        ctx.stroke();
        
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('Sì! 👍', yesBtn.x + yesBtn.width / 2, yesBtn.y + yesBtn.height / 2);
        
        // No button
        ctx.fillStyle = 'rgba(80, 80, 100, 0.8)';
        Utils.drawRoundRect(ctx, noBtn.x, noBtn.y, noBtn.width, noBtn.height, 10);
        ctx.fill();
        
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 1;
        Utils.drawRoundRect(ctx, noBtn.x, noBtn.y, noBtn.width, noBtn.height, 10);
        ctx.stroke();
        
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText('No, gioca! 🎮', noBtn.x + noBtn.width / 2, noBtn.y + noBtn.height / 2);
        
        ctx.restore();
    }

    getYesButtonBounds(width, height) {
        const dialogWidth = Math.min(width * 0.85, 320);
        const dialogX = (width - dialogWidth) / 2;
        const dialogY = (height - 200) / 2;
        const btnWidth = (dialogWidth - 40) / 2;
        
        return {
            x: dialogX + 15,
            y: dialogY + 150,
            width: btnWidth,
            height: 40
        };
    }

    getNoButtonBounds(width, height) {
        const dialogWidth = Math.min(width * 0.85, 320);
        const dialogX = (width - dialogWidth) / 2;
        const dialogY = (height - 200) / 2;
        const btnWidth = (dialogWidth - 40) / 2;
        
        return {
            x: dialogX + 25 + btnWidth,
            y: dialogY + 150,
            width: btnWidth,
            height: 40
        };
    }

    isPointInRect(point, rect) {
        return point.x >= rect.x && 
               point.x <= rect.x + rect.width &&
               point.y >= rect.y && 
               point.y <= rect.y + rect.height;
    }
}

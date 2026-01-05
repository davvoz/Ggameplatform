/**
 * Menu Controller
 * 
 * Handles menu navigation and game mode selection
 */

export class MenuController {
    constructor(app) {
        this.app = app;
    }
    
    /**
     * Show AI difficulty selector
     */
    showDifficultySelector() {
        const selector = document.getElementById('difficulty-selector');
        selector.style.display = 'block';
    }
    
    /**
     * Hide AI difficulty selector
     */
    hideDifficultySelector() {
        const selector = document.getElementById('difficulty-selector');
        selector.style.display = 'none';
    }
    
    /**
     * Get selected difficulty
     */
    getSelectedDifficulty() {
        const activeBtn = document.querySelector('.diff-btn.active');
        return activeBtn ? activeBtn.dataset.difficulty : 'medium';
    }
}

// main.js - Entry point

window.addEventListener('load', async () => {
    console.log('🚀 Starting Blocky Road...');
    
    // Create and initialize game (global for collision checks)
    window.game = new BlockyRoadGame();
    await window.game.init();
});

// Handle visibility changes
document.addEventListener('visibilitychange', () => {
    if (window.game) {
        window.game.isPaused = document.hidden;
    }
});

// Prevent default behavior for arrow keys
window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
    }
});

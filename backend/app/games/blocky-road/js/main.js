// main.js - Entry point

window.addEventListener('load', async () => {
    console.log('🚀 Starting Blocky Road...');
    
    // Create and initialize game
    game = new BlockyRoadGame();
    await game.init();
});

// Handle visibility changes
document.addEventListener('visibilitychange', () => {
    if (game) {
        game.isPaused = document.hidden;
    }
});

// Prevent default behavior for arrow keys
window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
    }
});

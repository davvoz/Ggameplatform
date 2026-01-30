// Main entry point
let game;
let gameScene;

// Initialize Platform SDK
async function initPlatformSDK() {
    try {
        await PlatformSDK.init();

        
        // Listen for platform events
        PlatformSDK.on('pause', () => {

            if (gameScene) gameScene.pause();
        });
        
        PlatformSDK.on('resume', () => {

            if (gameScene) gameScene.resume();
        });
        
        return true;
    } catch (error) {

        return false;
    }
}

// Initialize Phaser game
function initGame() {
    const screenDim = Utils.getScreenDimensions();
    const gameWidth = Math.min(screenDim.width, 500);
    const gameHeight = Math.min(screenDim.height, 750);
    
    const config = {
        type: Phaser.AUTO,
        width: gameWidth,
        height: gameHeight,
        parent: 'game-container',
        backgroundColor: '#87CEEB',
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { y: 0 },
                debug: false
            }
        },
        scene: GameScene,
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH
        }
    };
    
    game = new Phaser.Game(config);
    gameScene = game.scene.scenes[0];
    
    // Hide loading screen
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'none';
    }
    

}

// Setup restart button
function setupRestartButton() {
    const restartBtn = document.getElementById('restart-button');
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            if (gameScene) {
                gameScene.restart();
            }
        });
    }
}

// Handle window resize
function handleResize() {
    if (game) {
        const screenDim = Utils.getScreenDimensions();
        const gameWidth = Math.min(screenDim.width, 500);
        const gameHeight = Math.min(screenDim.height, 750);
        game.scale.resize(gameWidth, gameHeight);
    }
}

// Handle visibility change (tab switching)
function handleVisibilityChange() {
    if (document.hidden) {
        if (gameScene && !gameScene.isGameOver) {
            gameScene.pause();
        }
    } else {
        if (gameScene && gameScene.isPaused && !gameScene.isGameOver) {
            gameScene.resume();
        }
    }
}

// Initialize everything when page loads
window.addEventListener('load', async () => {

    
    // Initialize Platform SDK first
    await initPlatformSDK();
    
    // Initialize game
    initGame();
    
    // Setup UI
    setupRestartButton();
    
    // Setup event listeners
    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    

});

// Cleanup on unload
window.addEventListener('beforeunload', () => {
    if (game) {
        game.destroy(true);
    }
});

// Prevent zoom on mobile
document.addEventListener('gesturestart', (e) => {
    e.preventDefault();
});

// Prevent context menu on long press
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

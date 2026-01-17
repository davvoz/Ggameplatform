/**
 * Main entry point
 */
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }
    
    // Prevent default touch behaviors (exclude fullscreen button)
    document.body.addEventListener('touchstart', (e) => {
        if (e.target.closest('#game-container') && !e.target.closest('#fullscreen-btn')) {
            e.preventDefault();
        }
    }, { passive: false });
    
    document.body.addEventListener('touchmove', (e) => {
        if (e.target.closest('#game-container') && !e.target.closest('#fullscreen-btn')) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // Initialize game
    const game = new Game(canvas);
    
    // Expose game instance for debugging
    window.game = game;
    
    // Fullscreen button - both click and touch
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', toggleFullscreen);
        fullscreenBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFullscreen();
        }, { passive: false });
    }

    // Update icon when fullscreen changes
    document.addEventListener('fullscreenchange', updateFullscreenIcon);
    document.addEventListener('webkitfullscreenchange', updateFullscreenIcon);
    document.addEventListener('mozfullscreenchange', updateFullscreenIcon);
    document.addEventListener('MSFullscreenChange', updateFullscreenIcon);

    updateFullscreenIcon();

    console.log('🚀 Space Shooter initialized!');
});

// ===== FULLSCREEN FUNCTIONALITY =====
function toggleFullscreen() {
    // Prefer Platform SDK if available
    if (window.PlatformSDK && typeof window.PlatformSDK.toggleFullscreen === 'function') {
        window.PlatformSDK.toggleFullscreen();
        return;
    }

    // Use game-container for Android compatibility
    const elem = document.getElementById('game-container') || document.documentElement;
    const fsElement = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;

    if (!fsElement) {
        // Enter fullscreen
        const requestFs = elem.requestFullscreen || elem.webkitRequestFullscreen || elem.mozRequestFullScreen || elem.msRequestFullscreen;
        if (requestFs) {
            const promise = requestFs.call(elem);
            if (promise && promise.then) {
                promise.then(() => {
                    document.body.classList.add('game-fullscreen');
                    setTimeout(() => { try { window.game && window.game.resize(); } catch(e){} }, 100);
                    updateFullscreenIcon();
                }).catch((err) => {
                    console.warn('Fullscreen request failed:', err);
                });
            } else {
                document.body.classList.add('game-fullscreen');
                setTimeout(() => { try { window.game && window.game.resize(); } catch(e){} }, 100);
            }
        }
    } else {
        // Exit fullscreen
        const exitFs = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
        if (exitFs) {
            const promise = exitFs.call(document);
            if (promise && promise.then) {
                promise.then(() => {
                    document.body.classList.remove('game-fullscreen');
                    setTimeout(() => { try { window.game && window.game.resize(); } catch(e){} }, 100);
                    updateFullscreenIcon();
                }).catch(() => {});
            } else {
                document.body.classList.remove('game-fullscreen');
                setTimeout(() => { try { window.game && window.game.resize(); } catch(e){} }, 100);
            }
        }
    }
}

function updateFullscreenIcon() {
    const btn = document.getElementById('fullscreen-btn');
    if (!btn) return;
    const isFs = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
    btn.innerHTML = isFs
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
         </svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
         </svg>`;
}

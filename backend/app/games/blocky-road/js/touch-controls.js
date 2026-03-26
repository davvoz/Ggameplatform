// touch-controls.js - Touch and mobile controls for Blocky Road

class TouchControls {
    constructor(game) {
        this.game = game;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;
        this.minSwipeDistance = 30; // Minimum distance for a swipe
        this.isTouching = false;
        
        this.setupTouchControls();
    }
    
    setupTouchControls() {
        // Touch events for swipe gestures
        document.addEventListener('touchstart', (e) => {
            this.handleTouchStart(e);
        }, { passive: false });
        
        document.addEventListener('touchmove', (e) => {
            this.handleTouchMove(e);
        }, { passive: false });
        
        document.addEventListener('touchend', (e) => {
            this.handleTouchEnd(e);
        }, { passive: false });
        
        // Prevent default touch behaviors on game canvas
        const canvas = document.querySelector('canvas');
        if (canvas) {
            canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
            canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
        }
    }
    
    handleTouchStart(e) {
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            
            // Ignore touches on UI buttons (game over screen, mute button, etc.)
            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            if (target && (
                target.tagName === 'BUTTON' ||
                target.closest('button') ||
                target.closest('#gameOver') ||
                target.closest('#startScreen')
            )) {
                return; // Don't process this touch as player input
            }
            
            this.touchStartX = touch.clientX;
            this.touchStartY = touch.clientY;
            // Initialize touchEnd to same position to prevent false swipe detection
            this.touchEndX = touch.clientX;
            this.touchEndY = touch.clientY;
            this.isTouching = true;
            
            // Start game on first touch
            if (!this.game.isStarted) {
                this.game.startGame();
            }
        }
    }
    
    handleTouchMove(e) {
        if (!this.isTouching) return;
        
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            this.touchEndX = touch.clientX;
            this.touchEndY = touch.clientY;
        }
    }
    
    handleTouchEnd(e) {
        if (!this.isTouching) return;
        
        this.isTouching = false;
        
        // Calculate swipe distance
        const deltaX = this.touchEndX - this.touchStartX;
        const deltaY = this.touchEndY - this.touchStartY;
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);
        
        // Determine if it's a swipe or a tap (increased threshold for more reliable tap detection)
        const isSwipe = Math.max(absDeltaX, absDeltaY) > this.minSwipeDistance;
        
        if (isSwipe) {
            // Handle swipe gesture - check which direction is dominant
            if (absDeltaX > absDeltaY) {
                // Horizontal swipe dominates
                if (deltaX > 0) {
                    this.handleSwipe('right');
                } else {
                    this.handleSwipe('left');
                }
            } else {
                // Vertical swipe dominates
                if (deltaY > 0) {
                    this.handleSwipe('down');
                } else {
                    this.handleSwipe('up');
                }
            }
        } else {
            // Tap anywhere = move forward (most common action)
            this.handleSwipe('up');
        }
        
        // Reset
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;
    }
    
    handleSwipe(direction) {
        if (!this.game.isStarted || this.game.isGameOver || this.game.isPaused) return;
        // No cooldown - instant cancellation system allows rapid inputs
        
        let dx = 0, dz = 0;
        
        switch(direction) {
            case 'up':
                dz = 1; // Move forward
                break;
            case 'down':
                dz = -1; // Move backward
                break;
            case 'left':
                dx = 1; // Move left (swapped for camera)
                break;
            case 'right':
                dx = -1; // Move right (swapped for camera)
                break;
        }
        
        // Use game's processMove method for consistent score tracking
        this.game.processMove(dx, dz);
    }

    
    destroy() {
        // Remove virtual buttons if they exist
        const buttons = document.getElementById('virtualButtons');
        if (buttons) {
            buttons.remove();
        }
    }
}

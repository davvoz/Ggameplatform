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
        this.createVirtualButtons();
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
    
    createVirtualButtons() {
        // Virtual buttons disabled - using swipe only
        return;
        
        // Check if mobile device
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (!isMobile) return;
        
        // Create button container
        const container = document.createElement('div');
        container.id = 'virtualButtons';
        container.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            display: grid;
            grid-template-columns: repeat(3, 60px);
            grid-template-rows: repeat(3, 60px);
            gap: 5px;
            z-index: 100;
            opacity: 0.7;
        `;
        
        // Button style
        const buttonStyle = `
            background: rgba(255, 255, 255, 0.9);
            border: 2px solid rgba(0, 0, 0, 0.3);
            border-radius: 10px;
            font-size: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            user-select: none;
            touch-action: manipulation;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;
        
        // Create buttons in grid layout
        const buttons = [
            { pos: '1,2', label: '⬆️', action: 'up' },
            { pos: '2,1', label: '⬅️', action: 'left' },
            { pos: '2,3', label: '➡️', action: 'right' },
            { pos: '3,2', label: '⬇️', action: 'down' }
        ];
        
        buttons.forEach(btn => {
            const button = document.createElement('div');
            button.style.cssText = buttonStyle;
            button.style.gridColumn = btn.pos.split(',')[1];
            button.style.gridRow = btn.pos.split(',')[0];
            button.textContent = btn.label;
            
            // Touch events for button
            button.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                button.style.transform = 'scale(0.95)';
                button.style.background = 'rgba(255, 255, 255, 1)';
                this.handleSwipe(btn.action);
            });
            
            button.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                button.style.transform = 'scale(1)';
                button.style.background = 'rgba(255, 255, 255, 0.9)';
            });
            
            // Also support mouse for testing
            button.addEventListener('mousedown', (e) => {
                e.preventDefault();
                button.style.transform = 'scale(0.95)';
                this.handleSwipe(btn.action);
            });
            
            button.addEventListener('mouseup', (e) => {
                e.preventDefault();
                button.style.transform = 'scale(1)';
            });
            
            container.appendChild(button);
        });
        
        document.body.appendChild(container);
        

    }
    
    destroy() {
        // Remove virtual buttons if they exist
        const buttons = document.getElementById('virtualButtons');
        if (buttons) {
            buttons.remove();
        }
    }
}

/**
 * Input Handler
 * Manages touch and mouse input for mobile-first experience
 */



export class InputHandler {
    constructor(canvas, graphics) {
        this.canvas = canvas;
        this.graphics = graphics;
        
        this.pointerDown = false;
        this.pointerX = 0;
        this.pointerY = 0;
        this.startX = 0;
        this.startY = 0;
        this.dragThreshold = 10;
        this.isDragging = false;
        this.draggedCannon = null;
        
        this.tapHandlers = [];
        this.dragHandlers = [];
        this.dragEndHandlers = [];
        
        this.setupEvents();
    }

    setupEvents() {
        // Touch events (mobile)
        this.canvas.addEventListener('touchstart', (e) => this.handleStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.handleMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.handleEnd(e), { passive: false });
        this.canvas.addEventListener('touchcancel', (e) => this.handleEnd(e), { passive: false });
        
        // Mouse events (desktop)
        this.canvas.addEventListener('mousedown', (e) => this.handleStart(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleEnd(e));
        this.canvas.addEventListener('mouseleave', (e) => this.handleEnd(e));
        
        // Prevent context menu on long press
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    handleStart(e) {
        e.preventDefault();
        
        const pos = this.getEventPosition(e);
        if (!pos) return;
        
        this.pointerDown = true;
        this.startX = pos.x;
        this.startY = pos.y;
        this.pointerX = pos.x;
        this.pointerY = pos.y;
        this.isDragging = false;
        this.draggedCannon = null;
    }

    handleMove(e) {
        e.preventDefault();
        
        if (!this.pointerDown) return;
        
        const pos = this.getEventPosition(e);
        if (!pos) return;
        
        this.pointerX = pos.x;
        this.pointerY = pos.y;
        
        const dx = this.pointerX - this.startX;
        const dy = this.pointerY - this.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (!this.isDragging && distance > this.dragThreshold) {
            this.isDragging = true;
            
            // Get grid position of start
            const gridPos = this.graphics.screenToGrid(this.startX, this.startY);
            
            // Notify drag handlers
            this.dragHandlers.forEach(handler => {
                handler(gridPos, { x: this.pointerX, y: this.pointerY });
            });
        }
        
        if (this.isDragging) {
            const gridPos = this.graphics.screenToGrid(this.pointerX, this.pointerY);
            this.dragHandlers.forEach(handler => {
                handler(gridPos, { x: this.pointerX, y: this.pointerY });
            });
        }
    }

    handleEnd(e) {
        e.preventDefault();
        
        if (!this.pointerDown) return;
        
        const pos = this.getEventPosition(e) || { x: this.pointerX, y: this.pointerY };
        
        if (this.isDragging) {
            // Handle drag end
            const startGridPos = this.graphics.screenToGrid(this.startX, this.startY);
            const endGridPos = this.graphics.screenToGrid(pos.x, pos.y);
            
            this.dragEndHandlers.forEach(handler => {
                handler(startGridPos, endGridPos);
            });
        } else {
            // Handle tap/click
            const gridPos = this.graphics.screenToGrid(pos.x, pos.y);
            
            this.tapHandlers.forEach(handler => {
                handler(gridPos, { x: pos.x, y: pos.y });
            });
        }
        
        this.pointerDown = false;
        this.isDragging = false;
        this.draggedCannon = null;
    }

    getEventPosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        let clientX, clientY;
        
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    onTap(handler) {
        this.tapHandlers.push(handler);
    }

    onDrag(handler) {
        this.dragHandlers.push(handler);
    }

    onDragEnd(handler) {
        this.dragEndHandlers.push(handler);
    }

    getCurrentPointer() {
        if (this.pointerDown) {
            return {
                x: this.pointerX,
                y: this.pointerY,
                gridPos: this.graphics.screenToGrid(this.pointerX, this.pointerY)
            };
        }
        return null;
    }

    isPointerDown() {
        return this.pointerDown;
    }

    clear() {
        this.tapHandlers = [];
        this.dragHandlers = [];
        this.dragEndHandlers = [];
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InputHandler;
}

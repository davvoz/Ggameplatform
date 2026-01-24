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
        this.dragThreshold = 20; // Increased from 10 to reduce missed clicks
        this.isDragging = false;
        this.draggedCannon = null;
        this.dragEnabled = true; // Can be disabled for targeting modes
        
        this.tapHandlers = [];
        this.dragHandlers = [];
        this.dragEndHandlers = [];
        this.moveHandlers = []; // For cursor tracking (targeting mode)
        
        // Prevent duplicate events (touch + mouse on hybrid devices)
        this.lastEventTime = 0;
        this.eventDebounce = 50; // ms to ignore duplicate events
        this.lastEventType = null; // 'touch' or 'mouse'
        
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
        
        // Detect event type and prevent duplicate handling
        const eventType = e.type.startsWith('touch') ? 'touch' : 'mouse';
        const now = Date.now();
        
        // If this is a mouse event shortly after a touch event, ignore it
        // (hybrid devices often fire both)
        if (eventType === 'mouse' && this.lastEventType === 'touch' && 
            (now - this.lastEventTime) < this.eventDebounce) {
            return;
        }
        
        this.lastEventType = eventType;
        this.lastEventTime = now;
        
        const pos = this.getEventPosition(e);
        if (!pos) return;
        
        this.pointerDown = true;
        this.startX = pos.x;
        this.startY = pos.y;
        this.pointerX = pos.x;
        this.pointerY = pos.y;
        this.isDragging = false;
        this.draggedCannon = null;
        this.startTime = now; // Track start time for tap detection
        
        // Notify move handlers with initial position (and touch indicator)
        const isTouch = eventType === 'touch';
        this.moveHandlers.forEach(handler => {
            handler({ x: this.pointerX, y: this.pointerY, isTouch });
        });
    }

    handleMove(e) {
        e.preventDefault();
        
        const pos = this.getEventPosition(e);
        if (!pos) return;
        
        // Detect if touch event
        const isTouch = e.type.startsWith('touch');
        
        // Always track pointer position for cursor rendering
        this.pointerX = pos.x;
        this.pointerY = pos.y;
        
        // Notify move handlers (for targeting cursor)
        this.moveHandlers.forEach(handler => {
            handler({ x: this.pointerX, y: this.pointerY, isTouch });
        });
        
        if (!this.pointerDown) return;
        
        // Skip drag detection if disabled (targeting mode)
        if (!this.dragEnabled) return;
        
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
        
        // Detect event type and prevent duplicate handling
        const eventType = e.type.startsWith('touch') ? 'touch' : 'mouse';
        const now = Date.now();
        
        // If this is a mouse event shortly after a touch event, ignore it
        if (eventType === 'mouse' && this.lastEventType === 'touch' && 
            (now - this.lastEventTime) < this.eventDebounce) {
            this.pointerDown = false;
            this.isDragging = false;
            return;
        }
        
        this.lastEventTime = now;
        
        // Notify move handlers that touch ended (for mobile targeting)
        if (eventType === 'touch') {
            this.moveHandlers.forEach(handler => {
                handler({ x: this.pointerX, y: this.pointerY, isTouch: false, touchEnded: true });
            });
        }
        
        const pos = this.getEventPosition(e) || { x: this.pointerX, y: this.pointerY };
        
        if (this.isDragging) {
            // Handle drag end
            const startGridPos = this.graphics.screenToGrid(this.startX, this.startY);
            const endGridPos = this.graphics.screenToGrid(pos.x, pos.y);
            
            this.dragEndHandlers.forEach(handler => {
                handler(startGridPos, endGridPos);
            });
        } else {
            // Handle tap/click - use start position for more accurate tap detection
            // This prevents "drift" during the tap from changing the target
            const gridPos = this.graphics.screenToGrid(this.startX, this.startY);
            
            this.tapHandlers.forEach(handler => {
                handler(gridPos, { x: this.startX, y: this.startY });
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

    onMove(handler) {
        this.moveHandlers.push(handler);
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

    /**
     * Get the grid position where the drag started
     */
    getDragStartGridPos() {
        if (this.isDragging) {
            return this.graphics.screenToGrid(this.startX, this.startY);
        }
        return null;
    }

    isPointerDown() {
        return this.pointerDown;
    }

    /**
     * Disable drag detection (useful for targeting modes)
     */
    setDragEnabled(enabled) {
        this.dragEnabled = enabled;
        if (!enabled) {
            this.isDragging = false;
        }
    }

    clear() {
        this.tapHandlers = [];
        this.dragHandlers = [];
        this.dragEndHandlers = [];
        this.moveHandlers = [];
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InputHandler;
}

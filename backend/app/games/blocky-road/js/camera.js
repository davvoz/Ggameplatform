// camera.js - Crossy Road style isometric camera

class CrossyCamera {
    constructor(scene, renderer) {
        this.scene = scene;
        this.renderer = renderer;
        
        // Orthographic camera for isometric view
        const aspect = window.innerWidth / window.innerHeight;
        const frustumSize = 8; // Normal zoom
        
        this.camera = new THREE.OrthographicCamera(
            -frustumSize * aspect, // left
            frustumSize * aspect,  // right
            frustumSize,           // top
            -frustumSize,          // bottom
            0.1,                   // near
            300                    // far
        );
        
        // Crossy Road camera position (isometric angle)
        this.camera.position.set(-5, 8, -5);
        this.camera.lookAt(0, 0, 0);
        
        // Store the rotation for consistent viewing angle
        this.fixedRotation = this.camera.rotation.clone();
        
        this.camera.updateProjectionMatrix();
        
        // Target for smooth following
        this.target = new THREE.Vector3(0, 0, 0);
        this.easing = 0.1; // Smooth camera follow
        
        // Handle window resize
        window.addEventListener('resize', () => this.onResize());
    }
    
    follow(target, normalizedDelta = 1) {
        // Frame-rate independent lerp: convert 60fps factors to exponential decay
        // Formula: newFactor = 1 - Math.pow(1 - factor60fps, normalizedDelta)
        const smoothX = 1 - Math.pow(1 - 0.08, normalizedDelta);
        const smoothZ = 1 - Math.pow(1 - 0.15, normalizedDelta);
        
        // Different easing for X (smooth player following) and Z (constant advancement)
        // X: Heavy smoothing to avoid jitter on moving platforms
        this.target.x += (target.x - this.target.x) * smoothX;
        
        // Z: Light smoothing for responsive forward movement (death line driven)
        this.target.z += (target.z - this.target.z) * smoothZ;
        
        // Camera follows smoothed target
        const targetCamZ = this.target.z - 5;
        const targetCamX = this.target.x - 5;
        
        // Apply camera easing
        this.camera.position.x += (targetCamX - this.camera.position.x) * smoothX;
        this.camera.position.z += (targetCamZ - this.camera.position.z) * smoothZ;
        
        // Keep fixed rotation instead of continuous lookAt
        this.camera.rotation.copy(this.fixedRotation);
    }
    
    onResize() {
        const aspect = window.innerWidth / window.innerHeight;
        const frustumSize = 8; // Match constructor
        
        this.camera.left = -frustumSize * aspect;
        this.camera.right = frustumSize * aspect;
        this.camera.top = frustumSize;
        this.camera.bottom = -frustumSize;
        
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    getCamera() {
        return this.camera;
    }
}

// camera.js - Crossy Road style isometric camera

class CrossyCamera {
    constructor(scene, renderer) {
        this.scene = scene;
        this.renderer = renderer;
        
        // Orthographic camera for isometric view
        const aspect = window.innerWidth / window.innerHeight;
        const frustumSize = 8; // Smaller = more zoom
        
        this.camera = new THREE.OrthographicCamera(
            -frustumSize * aspect, // left
            frustumSize * aspect,  // right
            frustumSize,           // top
            -frustumSize,          // bottom
            0.1,                   // near
            100                    // far
        );
        
        // Crossy Road camera position (isometric angle)
        this.camera.position.set(-5, 7, -5);
        this.camera.lookAt(0, 0, 0);
        this.camera.updateProjectionMatrix();
        
        // Target for smooth following
        this.target = new THREE.Vector3(0, 0, 0);
        this.easing = 0.1; // Smooth camera follow
        
        // Handle window resize
        window.addEventListener('resize', () => this.onResize());
    }
    
    follow(target) {
        // Smoothly follow target position
        this.target.x = target.x;
        this.target.z = target.z;
        
        // Move camera to follow player, maintaining isometric angle
        const targetCamX = this.target.x - 5;
        const targetCamZ = this.target.z - 5;
        
        this.camera.position.x += (targetCamX - this.camera.position.x) * this.easing;
        this.camera.position.z += (targetCamZ - this.camera.position.z) * this.easing;
        
        this.camera.lookAt(this.target.x, 0, this.target.z);
    }
    
    onResize() {
        const aspect = window.innerWidth / window.innerHeight;
        const frustumSize = 8;
        
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

export class BaseEntity {
  constructor() {
    this.isDisposed = false;
  }

  addToScene(scene) {
    if (this.mesh) {
      scene.add(this.mesh);
    }
  }

  removeFromScene(scene) {
    if (this.mesh && this.mesh.parent === scene) {
      scene.remove(this.mesh);
    }
  }

  dispose(scene) {
    this.isDisposed = true;
    
    // Dispose ONLY geometries - materials are shared via MaterialCache!
    if (this.mesh) {
      this.mesh.traverse((child) => {
        if (child.geometry) {
          child.geometry.dispose();
        }
        // DO NOT dispose materials - they're shared from MaterialCache
      });
      
      this.removeFromScene(scene);
    }
  }
}


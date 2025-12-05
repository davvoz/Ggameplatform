import * as THREE from "three";

export class SceneManager {
  constructor(renderingConfig, performanceProfile = null) {
    this.renderingConfig = renderingConfig;
    this.performanceProfile = performanceProfile;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(renderingConfig.clearColor);

    // FOV maggiore su mobile per vedere più area
    const isMobile = 'ontouchstart' in window;
    const fov = isMobile ? 70 : renderingConfig.camera.fov;

    this.camera = new THREE.PerspectiveCamera(
      fov,
      1,
      renderingConfig.camera.near,
      renderingConfig.camera.far
    );

    const { position, target } = renderingConfig.camera;
    
    // Su mobile, camera più alta e più lontana per vedere meglio
    if (isMobile) {
      this.camera.position.set(position.x * 1.4, position.y * 1.6, position.z * 1.4);
    } else {
      this.camera.position.set(position.x, position.y, position.z);
    }
    
    this.camera.lookAt(target.x, target.y, target.z);
    
    // Store camera reference in scene for health bars
    this.scene.userData.camera = this.camera;

    // Renderer con accelerazione hardware ottimizzata
    const antialias = this.performanceProfile ? this.performanceProfile.antialias : true;
    this.renderer = new THREE.WebGLRenderer({
      antialias: antialias,
      alpha: false,
      powerPreference: "high-performance", // Forza GPU dedicata
      stencil: false,
      depth: true,
      logarithmicDepthBuffer: false
    });
    
    // Applica profilo performance se disponibile
    if (this.performanceProfile) {
      this.performanceProfile.applyToRenderer(this.renderer);
      this.performanceProfile.applyToScene(this.scene);
    } else {
      this.renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, renderingConfig.pixelRatioMax)
      );
    }
    
    this.renderer.setSize(1, 1, false);

    this._setupLights();
    window.addEventListener("resize", () => this.onResize());
  }

  attachTo(rootElement) {
    rootElement.appendChild(this.renderer.domElement);
    this.onResize();
  }

  _setupLights() {
    const ambient = new THREE.AmbientLight(0xa6ffe6, 0.5);
    this.scene.add(ambient);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.1);
    mainLight.position.set(6, 15, 6);
    
    // Shadows basate su performance profile
    if (this.performanceProfile && this.performanceProfile.shadows) {
      mainLight.castShadow = true;
      mainLight.shadow.mapSize.set(
        this.performanceProfile.shadowMapSize,
        this.performanceProfile.shadowMapSize
      );
      mainLight.shadow.camera.near = 1;
      mainLight.shadow.camera.far = 30;
      mainLight.shadow.camera.left = -15;
      mainLight.shadow.camera.right = 15;
      mainLight.shadow.camera.top = 15;
      mainLight.shadow.camera.bottom = -15;
    }
    
    this.scene.add(mainLight);

    const rimLight = new THREE.DirectionalLight(0x7de2ff, 0.45);
    rimLight.position.set(-8, 10, -10);
    this.scene.add(rimLight);
  }

  onResize() {
    const canvas = this.renderer.domElement;
    const parent = canvas.parentElement;
    if (!parent) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.renderer.dispose();
  }
}


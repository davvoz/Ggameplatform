/**
 * Fast Initialization System
 * Loads only critical components first, defers others
 */

export class FastInitializer {
    constructor() {
        this.criticalModulesLoaded = false;
        this.deferredModules = [];
    }

    /**
     * Load only critical modules for fast startup
     * @returns {Promise<Object>} Critical components
     */
    async loadCriticalModules() {
        // Only load what's needed to show the game screen
        const modules = await Promise.all([
            import('./core/GameEngine.js'),
            import('./core/GameState.js'),
            import('./entities/Player.js'),
            import('./systems/renderers/BackgroundRenderer.js'),
            import('./systems/BackgroundSystem.js'),
            // Defer everything else
        ]);

        this.criticalModulesLoaded = true;
        return {
            GameEngine: modules[0].GameEngine,
            GameState: modules[1].GameState,
            Player: modules[2].Player,
            BackgroundRenderer: modules[3].BackgroundRenderer,
            BackgroundSystem: modules[4].BackgroundSystem,
        };
    }

    /**
     * Load non-critical modules in background
     */
    async loadDeferredModules() {
        if (!this.criticalModulesLoaded) {
            await this.loadCriticalModules();
        }

        // Load in chunks to avoid blocking
        const chunks = [
            // Chunk 1: Managers
            [
                './managers/LevelManager.js',
                './managers/AudioManager.js',
                './managers/InputManager.js',
            ],
            // Chunk 2: Systems
            [
                './systems/RenderingSystem.js',
                './systems/ScoreSystem.js',
                './systems/PowerupSystem.js',
            ],
            // Chunk 3: UI & Collision
            [
                './systems/CollisionDetector.js',
                './managers/UIManager.js',
                './effects/ParticleSystem.js',
            ],
        ];

        for (const chunk of chunks) {
            await Promise.all(chunk.map(path => import(path)));
            // Small delay to let browser breathe
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        this.deferredModules = chunks.flat();
    }

    /**
     * Get initialization progress
     * @returns {number} Progress 0-1
     */
    getProgress() {
        if (!this.criticalModulesLoaded) return 0;
        const total = this.deferredModules.length + 5; // 5 critical
        const loaded = 5 + this.deferredModules.length;
        return loaded / total;
    }
}

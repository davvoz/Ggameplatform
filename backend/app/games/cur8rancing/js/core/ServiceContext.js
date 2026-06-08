/**
 * Dependency-injection container shared by every state. States read services
 * from here instead of constructing them, which keeps states decoupled and
 * makes new states trivial to add (Dependency Inversion).
 *
 * `session` is the only mutable, cross-state payload (selected car, last result).
 */
export class ServiceContext {
    /**
     * @param {object} services
     * @param {import('../config/GameConfig.js').GameConfig} services.config
     * @param {import('../core/StateMachine.js').StateMachine} services.stateMachine
     * @param {import('../rendering/SceneRenderer.js').SceneRenderer} services.renderer
     * @param {import('../input/InputManager.js').InputManager} services.input
     * @param {import('../platform/PlatformBridge.js').PlatformBridge} services.bridge
     * @param {import('../assets/ModelLoader.js').ModelLoader} services.models
     * @param {import('../config/CarCatalog.js').CarCatalog} services.catalog
     * @param {import('../physics/CarPhysics.js').CarPhysics} services.physics
     * @param {HTMLElement} services.ui overlay container for DOM views
     */
    constructor(services) {
        this.config = services.config;
        this.stateMachine = services.stateMachine;
        this.renderer = services.renderer;
        this.input = services.input;
        this.bridge = services.bridge;
        this.models = services.models;
        this.catalog = services.catalog;
        this.physics = services.physics;
        this.ui = services.ui;

        /** Cross-state run data. */
        this.session = {
            selectedCarId: services.catalog.first().id,
            /** @type {import('../race/RaceResult.js').RaceResult|null} */
            result: null,
        };
    }

    /**
     * Convenience helper to transition to another state.
     * @param {import('../core/IState.js').IState} state
     */
    go(state) {
        this.stateMachine.change(state);
    }
}

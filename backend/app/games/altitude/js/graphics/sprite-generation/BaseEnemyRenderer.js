/**
 * BaseEnemyRenderer - Abstract base for individual enemy type renderers.
 * Subclasses implement draw() to render their specific enemy at (0,0) centered.
 */
export class BaseEnemyRenderer {
    draw(ctx, phase) {
        throw new Error(`${this.constructor.name}.draw() must be implemented`);
    }
}

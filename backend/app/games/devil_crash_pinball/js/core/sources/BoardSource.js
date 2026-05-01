/**
 * Strategy that supplies the game with its level configuration data.
 *
 * Implementations must return:
 *   {
 *     sectionKeys: string[],                       // ordered, declared by board
 *     configs:     Record<string, object>,         // key → parsed section JSON
 *     meta?:       { source: string, boardId?: number, name?: string }
 *   }
 *
 * Synchronous-friendly: callers `await loadConfigs()` exactly once before
 * the game starts. No allocations happen in the game loop itself.
 *
 * @abstract
 */
export class BoardSource {
    /**
     * @returns {Promise<{ sectionKeys: string[], configs: Record<string, object>, meta?: object }>}
     */
    async loadConfigs() {
        throw new Error('BoardSource.loadConfigs() must be overridden');
    }

    /**
     * Optional cleanup (e.g. removing postMessage listeners). Default no-op.
     */
    destroy() { /* no-op */ }
}

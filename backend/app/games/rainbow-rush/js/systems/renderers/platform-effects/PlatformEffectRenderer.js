/**
 * Base class for platform effect renderers
 * Strategy Pattern - each effect type implements this interface
 */
export class PlatformEffectRenderer {
    constructor(renderer) {
        this.renderer = renderer;
    }

    render(platform, x, y, time) {
        throw new Error('Method render() must be implemented');
    }
}

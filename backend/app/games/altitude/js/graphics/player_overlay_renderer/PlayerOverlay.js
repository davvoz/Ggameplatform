/**
 * PlayerOverlay.js
 *
 * Abstract base class for all perk visual overlays.
 * Subclasses override update(dt), drawBehind() and/or draw()
 * to render their effect on top of / behind the player sprite.
 */

export class PlayerOverlay {
    _t = 0;

    update(dt) {
        this._t += dt;
    }

    /** Drawn BEFORE the sprite (wings, armour…). Receives full perks context. */
    drawBehind(ctx, x, y, h, perks) { /* no-op by default */ }

    /** Drawn AFTER the sprite (shields, auras…). Receives full perks context. */
    draw(ctx, x, y, h, perks) { /* no-op by default */ }
}

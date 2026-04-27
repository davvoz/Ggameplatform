import { GameConfig as C } from '../config/GameConfig.js';
import { SectionRegistry } from './SectionRegistry.js';
import { WarpWirer }       from './WarpWirer.js';

/**
 * Owns all sections, returns the active one for the ball's current Y, and
 * checks for ball drain.
 *
 * Open/Closed: to add a new floor, add a CONFIG_KEY to SectionRegistry#MANIFEST
 * and supply the corresponding JSON in data/levels/. Zero other files change.
 */
export class BoardManager {
    /**
     * @param {(score:number)=>void} onScore
     * @param {(type:string)=>void} onEvent
     */
    constructor(onScore, onEvent) {
        this.sections = SectionRegistry.createAll();
        for (const s of this.sections) {
            s.onScore = onScore;
            s.onEvent = onEvent;
        }

        WarpWirer.wire(this.sections);

        // Named shortcut refs (by section key) for external callers.
        // Resolved by key string so they survive any board reorder.
        this.dungeon = this._byKey('bonus_dungeon');  // WitchBoss
        this.upper   = this._byKey('upper_table');    // DragonBoss
        this.main    = this._byKey('main_table');      // DemonBoss
        this.abyss   = this._byKey('abyss_floor');    // GolemBoss

        // Collect all LaunchSpring instances across every section.
        this.launchSprings = this.sections.flatMap(s => s.launchSprings);
        // Convenience ref: first spring, or null if none placed.
        this.launchSpring  = this.launchSprings[0] ?? null;
    }

    /** @private */
    _byKey(key) {
        return this.sections.find(s => s.sectionKey === key) ?? null;
    }

    /** Section index in this.sections for a given world-Y. */
    sectionIndexAt(y) {
        const idx = Math.floor(y / C.SECTION_HEIGHT);
        return Math.max(0, Math.min(this.sections.length - 1, idx));
    }

    activeSection(ball) {
        return this.sections[this.sectionIndexAt(ball.pos.y)];
    }

    update(dt) {
        for (const s of this.sections) s.update(dt);
    }

    setFlippers(leftActive, rightActive) {
        for (const section of this.sections) {
            for (const f of section.flippers) {
                if (f.side ===  1) f.setActive(leftActive);
                if (f.side === -1) f.setActive(rightActive);
            }
        }
    }

    isDrained(ball) {
        // Death-line triggers (explicit drain zones placed in level JSON)
        for (const s of this.sections) {
            if (s.touchesDeathLine(ball)) return true;
        }
        // Fallback: ball exits the world boundary
        const bottomSection = this.sections.at(-1);
        return ball.pos.y >= bottomSection.bottom - 12;
    }

    resetTargets() {
        for (const s of this.sections) {
            for (const t of s.targets) t.reset();
        }
    }

    /**
     * Reset all bosses to their initial SLEEP state.
     * Called on game over, before a new game starts.
     */
    resetBosses() {
        for (const s of this.sections) {
            s.boss?.reset();
        }
    }
}

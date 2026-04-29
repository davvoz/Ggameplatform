import { GameConfig as C } from '../config/GameConfig.js';
import { SectionRegistry } from './SectionRegistry.js';
import { WarpWirer }       from './WarpWirer.js';
import { LevelConfigStore } from './LevelConfigStore.js';

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
        // First spring (validate() guarantees it exists).
        this.launchSpring  = this.launchSprings[0] ?? null;

        // Resolved at validate() time from main_table.ballStarts[0].
        this._ballSpawn = null;
    }

    /**
     * Boot-time invariants. Called by Game.init() after the registry has
     * created every section and the LevelConfigStore is loaded.
     *
     * Fails loud (throws) if any required structural element is missing,
     * so configuration bugs surface at startup instead of producing
     * wrong-but-playable gameplay through silent fallbacks.
     */
    validate() {
        if (!this.main) {
            throw new Error('[BoardManager] Required section "main_table" is missing.');
        }
        if (!this.launchSpring) {
            throw new Error('[BoardManager] No LaunchSpring entity found in any section.');
        }

        const bottom = this.sections.at(-1);
        if (!bottom?.deathLines?.length) {
            throw new Error(
                `[BoardManager] Bottom section "${bottom?.sectionKey}" must define at least one deathLine.`
            );
        }

        const mainCfg = LevelConfigStore.get('main_table');
        const bs = mainCfg?.ballStarts?.[0];
        if (!bs || typeof bs.x !== 'number' || typeof bs.y !== 'number') {
            throw new Error('[BoardManager] main_table.json must define ballStarts[0] with numeric x/y.');
        }
        this._ballSpawn = { x: bs.x, y: this.main.top + bs.y };
    }

    /** Validated ball spawn point in world coordinates. Available after validate(). */
    get ballSpawn() {
        if (!this._ballSpawn) {
            throw new Error('[BoardManager] ballSpawn read before validate().');
        }
        return this._ballSpawn;
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
        for (const s of this.sections) {
            if (s.touchesDeathLine(ball)) return true;
        }
        return false;
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

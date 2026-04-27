import { Mission } from './Mission.js';
import { GameConfig as C } from '../config/GameConfig.js';

/**
 * Owns the 7 missions. Picks the next IDLE mission when one finishes (success
 * or failure). Emits onComplete/onFail to allow sections to alter table state
 * (open gates, summon mini-boss, lit a special target, etc).
 */
export class MissionManager {
    constructor() {
        this.missions = [
            new Mission('drop_bank',     'CHURCH BANK',     5, 'drop_target',  C.MISSION_TIMEOUT, C.MISSION_REWARD),
            new Mission('bumper_storm',  'BUMPER STORM',   25, 'bumper',       C.MISSION_TIMEOUT, C.MISSION_REWARD),
            new Mission('ramp_combo',    'TWIN RAMPS',      4, 'ramp',         C.MISSION_TIMEOUT, C.MISSION_REWARD),
            new Mission('dragon_fight',  'SLAY DRAGON',     1, 'dragon_kill',  0,                 C.MISSION_REWARD * 2),
            new Mission('witch_fight',   'BURN WITCH',      1, 'witch_kill',   0,                 C.MISSION_REWARD * 2),
            new Mission('golem_fight',   'CRUSH GOLEM',     1, 'golem_kill',   0,                 C.MISSION_REWARD * 2),
            new Mission('demon_summon',  'CALL THE DEMON',  3, 'cross_to_demon', C.MISSION_TIMEOUT, C.MISSION_REWARD),
        ];
        this.activeIdx = -1;
        this.onComplete = null; // (mission) => void
        this.onFail = null;     // (mission) => void
        this.onActivate = null; // (mission) => void
    }

    reset() {
        for (const m of this.missions) {
            m.state = Mission.STATE.IDLE;
            m.progress = 0;
            m.timer = 0;
        }
        this.activeIdx = -1;
    }

    /** Activate the next IDLE mission (cyclic). */
    advance() {
        const n = this.missions.length;
        for (let off = 1; off <= n; off++) {
            const i = (this.activeIdx + off + n) % n;
            const m = this.missions[i];
            if (m.state === Mission.STATE.IDLE || m.state === Mission.STATE.COMPLETE || m.state === Mission.STATE.FAILED) {
                m.activate();
                this.activeIdx = i;
                if (this.onActivate) this.onActivate(m);
                return m;
            }
        }
        return null;
    }

    active() { return this.activeIdx >= 0 ? this.missions[this.activeIdx] : null; }

    update(dt) {
        const a = this.active();
        if (!a) { this.advance(); return; }
        a.update(dt);
        if (a.state === Mission.STATE.COMPLETE) {
            if (this.onComplete) this.onComplete(a);
            this.advance();
        } else if (a.state === Mission.STATE.FAILED) {
            if (this.onFail) this.onFail(a);
            this.advance();
        }
    }

    /** Forward an event to the active mission. */
    notify(eventType, amount = 1) {
        const a = this.active();
        if (a) a.onEvent(eventType, amount);
    }
}

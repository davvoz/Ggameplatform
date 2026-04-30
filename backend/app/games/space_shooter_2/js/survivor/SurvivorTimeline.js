import { SURVIVOR_BOSS_IDS, SURVIVOR_MINIBOSS_IDS } from './SurvivorConfig.js';

/**
 * SurvivorTimeline — Hard-scripted milestone schedule (KILL-BASED).
 *
 * The run is structured as 4 phases. Each phase contains 3 mini-bosses and
 * 1 boss, fought in order. Between consecutive milestones the player must
 * clear KILLS_PER_STEP regular enemies (see SurvivorConfig).
 *
 *   Phase 1: 3 W1 mini-bosses → BOSS 1 (W1 final, id 6)
 *   Phase 2: 3 W2 mini-bosses → BOSS 2 (W2 final, id 12)
 *   Phase 3: 3 W3 mini-bosses → BOSS 3 (W3 final, id 18)
 *   Phase 4: 3 W4 mini-bosses → BOSS 4 (W4 final, id 24)
 *
 * Each event:  { type: 'miniboss'|'boss', id: number, phase: number }
 */
function buildTimeline() {
    const events = [];
    for (let p = 0; p < 4; p++) {
        const minis = SURVIVOR_MINIBOSS_IDS.slice(p * 3, p * 3 + 3);
        for (const id of minis) {
            events.push({ type: 'miniboss', id, phase: p });
        }
        events.push({ type: 'boss', id: SURVIVOR_BOSS_IDS[p], phase: p });
    }
    return events;
}

/** Ordered list of all milestone fights in the run. */
export const SURVIVOR_TIMELINE = buildTimeline();

/** Number of bosses defined in the timeline (drives victory check). */
export const TOTAL_BOSSES = SURVIVOR_TIMELINE.filter(e => e.type === 'boss').length;

/** Number of mini-bosses (informational). */
export const TOTAL_MINIBOSSES = SURVIVOR_TIMELINE.filter(e => e.type === 'miniboss').length;

/** Number of phases (informational). */
export const TOTAL_PHASES = 4;

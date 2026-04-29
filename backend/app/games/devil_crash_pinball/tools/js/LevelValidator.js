/**
 * Pure validation of editor state against the runtime invariants enforced by
 * BoardManager.validate(). Mirroring those checks here lets the editor refuse
 * to export configurations that would crash the game on load.
 *
 * Each rule is a function (state) -> Issue[] where state is the editor model
 * snapshot { configs, levelKeys }. Adding a new invariant = add a function to
 * one of the rule arrays. No coupling to UI, history, or runtime classes.
 *
 * Severity:
 *   'error'   -> blocks export unless user overrides
 *   'warning' -> non-blocking (suspicious but legal)
 */

const MAIN_KEY = 'main_table';

// ── Errors: mirror of BoardManager.validate() ─────────────────────────────────

function ruleMainTablePresent({ configs, levelKeys }) {
    if (!levelKeys.includes(MAIN_KEY) || !configs[MAIN_KEY]) {
        return [{ code: 'NO_MAIN_TABLE', msg: `Required section "${MAIN_KEY}" is missing from board.` }];
    }
    return [];
}

function ruleAtLeastOneLaunchSpring({ configs, levelKeys }) {
    const found = levelKeys.some(k => Array.isArray(configs[k]?.launchSprings) && configs[k].launchSprings.length > 0);
    return found ? [] : [{ code: 'NO_LAUNCH_SPRING', msg: 'No LaunchSpring entity found in any section.' }];
}

function ruleBottomSectionHasDeathLine({ configs, levelKeys }) {
    if (levelKeys.length === 0) return [];
    const bottomKey = levelKeys.at(-1);
    const cfg       = configs[bottomKey];
    if (!cfg) return [];
    if (!Array.isArray(cfg.deathLines) || cfg.deathLines.length === 0) {
        return [{ code: 'NO_DEATH_LINE', msg: `Bottom section "${bottomKey}" must define at least one deathLine.` }];
    }
    return [];
}

function ruleMainTableHasBallStart({ configs }) {
    const cfg = configs[MAIN_KEY];
    if (!cfg) return []; // already reported by ruleMainTablePresent
    const bs = cfg.ballStarts?.[0];
    if (!bs || typeof bs.x !== 'number' || typeof bs.y !== 'number') {
        return [{ code: 'BAD_BALL_START', msg: `${MAIN_KEY}.json must define ballStarts[0] with numeric x/y.` }];
    }
    return [];
}

// ── Warnings: known footguns ──────────────────────────────────────────────────

function ruleNoDuplicateSectionKeys({ levelKeys }) {
    const seen = new Set();
    const dup  = new Set();
    for (const k of levelKeys) {
        if (seen.has(k)) dup.add(k);
        seen.add(k);
    }
    return [...dup].map(k => ({ code: 'DUP_SECTION', msg: `Duplicate section key in board: "${k}".` }));
}

function ruleWarpExitsTargetKnownSections({ configs, levelKeys }) {
    const issues = [];
    const known  = new Set(levelKeys);
    for (const [key, cfg] of Object.entries(configs)) {
        const exits = cfg?.warpExits;
        if (!Array.isArray(exits)) continue;
        exits.forEach((exit, i) => {
            if (exit?.fromSection && !known.has(exit.fromSection)) {
                issues.push({
                    code: 'WARP_UNKNOWN_SECTION',
                    msg:  `${key}.warpExits[${i}] references unknown source section "${exit.fromSection}".`,
                });
            }
        });
    }
    return issues;
}

function ruleNoOrphanLevelConfigs({ configs, levelKeys }) {
    const inBoard = new Set(levelKeys);
    return Object.keys(configs)
        .filter(k => !inBoard.has(k))
        .map(k => ({ code: 'ORPHAN_SECTION', msg: `Section "${k}" exists in editor but is not listed in board order.` }));
}

const ERROR_RULES = [
    ruleMainTablePresent,
    ruleAtLeastOneLaunchSpring,
    ruleBottomSectionHasDeathLine,
    ruleMainTableHasBallStart,
];

const WARNING_RULES = [
    ruleNoDuplicateSectionKeys,
    ruleWarpExitsTargetKnownSections,
    ruleNoOrphanLevelConfigs,
];

/**
 * Run every rule against the given editor state.
 * @param {{ configs: Record<string,object>, levelKeys: string[] }} state
 * @returns {{ errors: {code:string,msg:string}[], warnings: {code:string,msg:string}[] }}
 */
export function validateLevels(state) {
    const errors   = ERROR_RULES.flatMap(r => r(state));
    const warnings = WARNING_RULES.flatMap(r => r(state));
    return { errors, warnings };
}

/**
 * Pure configuration data for support-unit VFX emissions.
 *
 * Each entry maps a unit-def property (trigger) to:
 *   - burst: rapid multi-particle emission from a source origin
 *   - pulse: periodic expanding ring emitted at a target origin
 *
 * OCP: adding a new support unit never requires modifying any system class —
 * just add a new entry here.
 */

/** Interval (seconds) between burst emissions. */
export const BURST_INTERVAL = 0.22;

/** Interval (seconds) between pulse emissions. */
export const PULSE_INTERVAL = 0.45;

/**
 * @typedef {Object} BurstConfig
 * @property {number} count     - Particles emitted per burst.
 * @property {number} spreadX   - Half-width of random spawn scatter (px).
 * @property {number} spreadY   - Half-height of random spawn scatter (px).
 * @property {number} vyBase    - Base upward speed (px/s, applied as negative vy).
 * @property {number} vyRange   - Random addition to base upward speed (px/s).
 * @property {number} vxSpread  - Max horizontal speed magnitude (px/s).
 * @property {number} lifeMin   - Minimum particle lifetime (s).
 * @property {number} lifeMax   - Maximum particle lifetime (s).
 */

/**
 * @typedef {Object} PulseConfig
 * @property {number} maxLife - Lifetime of the pulse ring (s).
 */

/**
 * @typedef {'entity' | 'tower'} VfxOrigin
 */

/**
 * @typedef {Object} SupportVfxEntry
 * @property {string}     trigger       - Property key on unit def that activates this entry.
 * @property {string}     burstType     - VFX type string for burst particles.
 * @property {string}     pulseType     - VFX type string for pulse ring.
 * @property {VfxOrigin}  burstOrigin   - Spawn location for burst particles.
 * @property {VfxOrigin}  pulseOrigin   - Spawn location for pulse ring.
 * @property {boolean}    requiresTower - If true, skip when the allied tower is dead.
 * @property {BurstConfig} burst        - Burst emission parameters.
 * @property {PulseConfig} pulse        - Pulse emission parameters.
 */

/** @type {ReadonlyArray<SupportVfxEntry>} */
export const SUPPORT_VFX_CONFIGS = Object.freeze([
    {
        trigger:       'manaRegenBonus',
        burstType:     'mana_orb',
        pulseType:     'mana_pulse',
        burstOrigin:   'entity',
        pulseOrigin:   'entity',
        requiresTower: false,
        burst: Object.freeze({
            count:    4,
            spreadX:  22,
            spreadY:  10,
            vyBase:   70,
            vyRange:  35,
            vxSpread: 44,
            lifeMin:  0.58,
            lifeMax:  0.86,
        }),
        pulse: Object.freeze({ maxLife: 0.52 }),
    },
    {
        trigger:       'towerRepairBonus',
        burstType:     'repair_spark',
        pulseType:     'repair_pulse',
        burstOrigin:   'tower',
        pulseOrigin:   'tower',
        requiresTower: true,
        burst: Object.freeze({
            count:    4,
            spreadX:  44,
            spreadY:  44,
            vyBase:   55,
            vyRange:  35,
            vxSpread: 38,
            lifeMin:  0.55,
            lifeMax:  0.8,
        }),
        pulse: Object.freeze({ maxLife: 0.58 }),
    },
    {
        trigger:       'charmAura',
        burstType:     'heart_particle',
        pulseType:     'heart_pulse',
        burstOrigin:   'entity',
        pulseOrigin:   'entity',
        requiresTower: false,
        burst: Object.freeze({
            count:    3,
            spreadX:  20,
            spreadY:  12,
            vyBase:   65,
            vyRange:  30,
            vxSpread: 40,
            lifeMin:  0.5,
            lifeMax:  0.85,
        }),
        pulse: Object.freeze({ maxLife: 0.5 }),
    },
]);

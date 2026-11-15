/**
 * The powers offered after every `BOON_EVERY` waves (after each boss): three
 * at random (the week's seed), one is taken and kept for the night. `max` is how many times one can be
 * taken; the other numbers are what one level gives.
 */
export const BOONS = Object.freeze({
    hearts: { max: 2, hearts: 2 },
    /** One cast in `every[level - 1]` sends a second bolt at another monster. */
    twin: { max: 2, every: [3, 2] },
    longShield: { max: 2, seconds: 0.35 },
    quickShield: { max: 1, factor: 0.8 },
    stormCaller: { max: 2, factor: 0.8 },
    crystal: { max: 2 },
    quickCrystals: { max: 2, factor: 1.15 },
    thorns: { max: 1, damage: 2 },
    vampire: { max: 1, kills: 10 },
    lucky: { max: 1, factor: 2 },
    sharpEye: { max: 1, multiplier: 3, refund: 1 },
});

/** Cards shown after a wave. */
export const BOON_CHOICES = 3;

/** The powers are offered after one wave in this many: the waves that end with a boss. */
export const BOON_EVERY = 2;

/**
 * The cards' screen comes in and goes out slowly, and takes no taps while it
 * comes in: the taps still flying at the end of a wave must not pick a card.
 * Seconds: `intro` until the cards can be taken, `stagger` between two cards
 * rising, `outro` from the choice to the night going on.
 */
export const BOON_SCREEN = Object.freeze({ intro: 0.9, stagger: 0.12, outro: 0.55 });

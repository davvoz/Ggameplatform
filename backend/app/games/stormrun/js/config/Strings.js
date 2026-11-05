/** Every word the player reads. The game speaks as little as possible. */
export const Strings = Object.freeze({
    tap: 'TAP TO JUMP',
    tapAgain: 'TAP AGAIN',
    perfect: 'PERFECT',
    you: 'You',
    best: 'Best',
    newBest: 'New best!',
    weekRank: (rank) => `#${rank} this week`,
    xpEarned: (xp) => `+${xp.toFixed(2)} XP`,
    levelUp: (level) => `Level ${level}!`,
    coinsEarned: (coins) => `+${coins} coins`,
});

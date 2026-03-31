/**
 * Character roster definitions.
 * Each character has unique stats and pixel art color palette.
 * Stats: strength (hit power), speed (movement), spin (curve ability).
 * passiveSize: natural hitbox multiplier (default 1).
 * superShot: unique super-shot data (fires on ball hit when bar is full).
 */
export const CHARACTERS = [
    {
        id: 'blaze',
        name: 'BLAZE',
        title: 'Fire Warrior',
        strength: 9,
        speed: 5,
        spin: 4,
        passiveSize: 1,
        palette: {
            primary: '#ff4400',
            secondary: '#ff8800',
            accent: '#ffcc00',
            skin: '#e8a86a',
            eyes: '#ff0000',
            outline: '#8b2200',
        },
        description: 'Raw power. Devastating hits.',
        superShot: { name: 'INFERNO SMASH', color: '#ff4400' },
    },
    {
        id: 'frost',
        name: 'FROST',
        title: 'Ice Mage',
        strength: 4,
        speed: 6,
        spin: 10,
        passiveSize: 1,
        palette: {
            primary: '#0088ff',
            secondary: '#00ccff',
            accent: '#aaeeff',
            skin: '#c4d4e8',
            eyes: '#00ffff',
            outline: '#003366',
        },
        description: 'Insane curves. Tricky angles.',
        superShot: { name: 'BLIZZARD SHOT', color: '#00ccff' },
    },
    {
        id: 'shadow',
        name: 'SHADOW',
        title: 'Ninja',
        strength: 5,
        speed: 10,
        spin: 5,
        passiveSize: 1,
        palette: {
            primary: '#6600cc',
            secondary: '#9933ff',
            accent: '#cc66ff',
            skin: '#b89e8a',
            eyes: '#ff00ff',
            outline: '#330066',
        },
        description: 'Lightning fast. Untouchable.',
        superShot: { name: 'PHANTOM STRIKE', color: '#cc66ff' },
    },
    {
        id: 'tank',
        name: 'TANK',
        title: 'Heavy Guard',
        strength: 10,
        speed: 4,
        spin: 3,
        passiveSize: 1.3,
        palette: {
            primary: '#228833',
            secondary: '#44bb44',
            accent: '#88ee88',
            skin: '#c8a882',
            eyes: '#00ff44',
            outline: '#114422',
        },
        description: 'Huge hitbox. Iron wall.',
        superShot: { name: 'IRON FORTRESS', color: '#88ee88' },
    },
    {
        id: 'spark',
        name: 'SPARK',
        title: 'Electric Striker',
        strength: 6,
        speed: 8,
        spin: 6,
        passiveSize: 1,
        palette: {
            primary: '#ffdd00',
            secondary: '#ffee44',
            accent: '#ffffff',
            skin: '#f0d0a0',
            eyes: '#ffff00',
            outline: '#886600',
        },
        description: 'Speed and power combined.',
        superShot: { name: 'THUNDER BOLT', color: '#ffdd00' },
    },
    {
        id: 'venom',
        name: 'VENOM',
        title: 'Toxic Trickster',
        strength: 5,
        speed: 5,
        spin: 9,
        passiveSize: 1,
        palette: {
            primary: '#33cc33',
            secondary: '#66ff33',
            accent: '#ccff66',
            skin: '#a8c890',
            eyes: '#00ff00',
            outline: '#116611',
        },
        description: 'Master of spin. Chaos king.',
        superShot: { name: 'TOXIC SHOT', color: '#66ff33' },
    },
];

export function getCharacterById(id) {
    return CHARACTERS.find(c => c.id === id) ?? CHARACTERS[0];
}

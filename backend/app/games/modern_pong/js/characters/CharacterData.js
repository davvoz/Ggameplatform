import {
    ARENA_LEFT, ARENA_RIGHT, ARENA_TOP, ARENA_BOTTOM, ARENA_MID_Y,
    COLORS, BALL_MAX_SPEED,
} from '../config/Constants.js';
import { SuperShield } from '../entities/FieldObjects.js';

/**
 * Character roster definitions.
 * Each character has unique stats and pixel art color palette.
 * Stats: strength (hit power), speed (movement), spin (curve ability).
 * passiveSize: natural hitbox multiplier (default 1).
 * superShot: unique super-shot data + execute() logic.
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
        superShot: {
            name: 'INFERNO SMASH',
            color: '#ff4400',
            execute(character, ball, game, opponent) {
                ball.setFireball(4000);
                ball.vx *= 1.5;
                ball.vy *= 1.5;
                game.particles.emit(ball.x, ball.y, 20, {
                    colors: [COLORS.NEON_ORANGE, COLORS.NEON_RED, '#ffff00'],
                    speedMin: 60, speedMax: 140,
                });
            },
        },
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
        superShot: {
            name: 'BLIZZARD SHOT',
            color: '#00ccff',
            execute(character, ball, game, opponent) {
                opponent.stun(2500);
                ball.vx += (character.x > ball.x ? -150 : 150);
                ball.setColor('#88ddff', '#00ccff');
                game.particles.emit(opponent.x, opponent.y, 25, {
                    colors: ['#88ddff', '#aaeeff', '#ffffff'],
                    speedMin: 20, speedMax: 80,
                });
            },
        },
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
        superShot: {
            name: 'PHANTOM STRIKE',
            color: '#cc66ff',
            execute(character, ball, game, opponent) {
                const sDir = character.isTopPlayer ? 1 : -1;
                const mag = BALL_MAX_SPEED * 0.95;
                ball.vy = mag * sDir;
                ball.vx = (Math.random() - 0.5) * 80;
                ball.setShadowBlaze(2500);
                ball.setColor('#cc66ff', '#9933ff');
                game.particles.emit(ball.x, ball.y, 30, {
                    colors: ['#cc66ff', '#ff00ff', '#9933ff', '#ffffff'],
                    speedMin: 60, speedMax: 160,
                    sizeMin: 2, sizeMax: 5,
                });
            },
        },
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
        superShot: {
            name: 'IRON FORTRESS',
            color: '#88ee88',
            execute(character, ball, game, opponent) {
                game.addFieldObject(
                    new SuperShield(character.isTopPlayer, character.data.palette.accent)
                );
                ball.vx *= 1.8;
                ball.vy *= 1.8;
                game.particles.emit(
                    (ARENA_LEFT + ARENA_RIGHT) / 2,
                    character.isTopPlayer ? ARENA_TOP + 4 : ARENA_BOTTOM - 4,
                    30,
                    { colors: ['#88ee88', '#44bb44', '#ffffff'], speedMin: 30, speedMax: 100 }
                );
            },
        },
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
        superShot: {
            name: 'THUNDER BOLT',
            color: '#ffdd00',
            execute(character, ball, game, opponent) {
                const dir = character.isTopPlayer ? 1 : -1;
                ball.x = ARENA_LEFT + Math.random() * (ARENA_RIGHT - ARENA_LEFT - 40) + 20;
                ball.y = ARENA_MID_Y + dir * 80;
                ball.vy = BALL_MAX_SPEED * 0.85 * dir;
                ball.vx = (Math.random() - 0.5) * 120;
                ball.triggerImpact();
                game.particles.emit(ball.x, ball.y, 25, {
                    colors: ['#ffdd00', '#ffee44', '#ffffff'],
                    speedMin: 60, speedMax: 150,
                });
            },
        },
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
        superShot: {
            name: 'TOXIC SHOT',
            color: '#66ff33',
            execute(character, ball, game, opponent) {
                opponent.applyEffect('mirror', 3000, { controlsReversed: true });
                game.particles.emit(opponent.x, opponent.y, 25, {
                    colors: ['#33cc33', '#66ff33', '#ccff66'],
                    speedMin: 30, speedMax: 100,
                });
            },
        },
    },
];

export function getCharacterById(id) {
    return CHARACTERS.find(c => c.id === id) ?? CHARACTERS[0];
}

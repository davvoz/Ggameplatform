import { COLORS, POWERUP_DURATION, ARENA_TOP, ARENA_BOTTOM } from '../config/Constants.js';
import { Shield } from '../entities/FieldObjects.js';

/**
 * 7 tactical power-up types.
 * Each has a clear purpose, visible effect, and strategic trade-off.
 */
export const POWERUP_TYPES = [
    {
        id: 'fireball',
        name: 'FIREBALL',
        icon: 'fire',
        color: COLORS.NEON_ORANGE,
        description: 'Ball passes through opponent on next hit!',
        apply(game, _collector) {
            game.ball.setFireball(POWERUP_DURATION);
        },
    },
    {
        id: 'shield',
        name: 'SHIELD',
        icon: 'shield',
        color: COLORS.NEON_CYAN,
        description: 'Blocks one goal with a barrier!',
        apply(game, collector) {
            const shield = new Shield(collector.isTopPlayer);
            game.addFieldObject(shield);
        },
    },
    {
        id: 'multiball',
        name: 'MULTI-BALL',
        icon: 'multi',
        color: COLORS.NEON_YELLOW,
        description: 'Spawns 2 extra balls that can score!',
        apply(game, _collector) {
            game.spawnExtraBalls(2);
        },
    },
    {
        id: 'grow',
        name: 'GROW',
        icon: 'grow',
        color: COLORS.NEON_GREEN,
        description: 'Double your size — bigger block area!',
        apply(_game, collector) {
            collector.applyEffect('giant', POWERUP_DURATION, {
                sizeMultiplier: 2,
            });
        },
    },
    {
        id: 'freeze',
        name: 'FREEZE',
        icon: 'freeze',
        color: '#88ddff',
        description: 'Stun your opponent for 1.5 seconds!',
        apply(game, collector) {
            const opponent = game.getOpponent(collector);
            opponent.stun(1500);
        },
    },
    {
        id: 'magnet',
        name: 'MAGNET',
        icon: 'magnet',
        color: COLORS.NEON_PINK,
        description: 'Ball curves toward opponent\'s goal!',
        apply(game, collector) {
            const targetY = collector.isTopPlayer ? ARENA_BOTTOM : ARENA_TOP;
            game.ball.setMagnet(targetY, POWERUP_DURATION);
        },
    },
    {
        id: 'speed',
        name: 'SPEED',
        icon: 'speed',
        color: '#ffee44',
        description: 'Move 50% faster for 5 seconds!',
        apply(_game, collector) {
            collector.applyEffect('speed', POWERUP_DURATION, {
                speedMultiplier: 1.5,
            });
        },
    },
];

export function getPowerUpById(id) {
    return POWERUP_TYPES.find(p => p.id === id);
}

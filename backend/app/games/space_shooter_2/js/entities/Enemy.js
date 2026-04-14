import Enemy from './enemy/TheEnemy.js';
import BossPart from './enemy/BossPart.js';
import { FORMATIONS } from "./enemy/types/FORMATIONS.js";
import { BOSS_DEFS } from "./enemy/types/BOSS_DEFS.js";
import { MINIBOSS_DEFS } from "./enemy/types/MINIBOSS_DEFS.js";
import MultiBoss from './enemy/MultiBoss.js';
export { BOSS_DEFS } from "./enemy/types/BOSS_DEFS.js";
export { MINIBOSS_DEFS } from "./enemy/types/MINIBOSS_DEFS.js";
export { MOVEMENT } from "./enemy/types/MOVEMENT.js";
export { FORMATIONS } from "./enemy/types/FORMATIONS.js";



/**
 * EnemyFactory - Creates enemies and bosses
 */
class EnemyFactory {
    static create(options) {
        const enemy = new Enemy(options.x, options.y, options.type, options.pattern, options.canvasWidth, options.difficultyConfig, options.level);
        enemy.speed *= options.speedMultiplier;
        return enemy;
    }

    /**
     * Create a multi-part boss.
     * bossLevel: 1-6 (mapped from LevelData boss field)
     */
    static createBoss(x, y, bossLevel, canvasWidth, difficultyConfig = null, level = 1) {
        const bossId = Math.min(bossLevel, Object.keys(BOSS_DEFS).length);
        return new MultiBoss(x, y, bossId, canvasWidth, false, difficultyConfig, level);
    }

    /**
     * Create a multi-part mini-boss.
     * miniBossType: 1-8 (1-4 = W1, 5-8 = W2)
     */
    static createMiniBoss(x, y, miniBossType, canvasWidth, difficultyConfig = null, level = 1) {
        const maxType = Object.keys(MINIBOSS_DEFS).length;
        const typeId = ((miniBossType - 1) % maxType) + 1;
        return new MultiBoss(x, y, typeId, canvasWidth, true, difficultyConfig, level);
    }

    /**
     * Spawn a wave with optional formation arrangement.
     * formation: string key into FORMATIONS
     */
    static spawnFormationWave(wave, canvasWidth, speedMult, difficultyConfig = null, level = 1) {
        let enemies = [...wave.enemies];
        const formation = wave.formation || 'none';
        if (FORMATIONS[formation]) {
            enemies = FORMATIONS[formation](enemies, canvasWidth);
        }
        const result = [];
        for (const def of enemies) {
            const x = def.x * canvasWidth;
            const y = -80 - Math.random() * 40;
            const enemy = EnemyFactory.create(
                { ...def, x, y, canvasWidth, speedMultiplier: speedMult, difficultyConfig, level }
            );
            result.push(enemy);
        }
        return result;
    }
}

export { Enemy, MultiBoss, BossPart, EnemyFactory };
export default Enemy;

import Enemy from  './enemy/TheEnemy.js';
import BossPart from './enemy/BossPart.js';
import { MOVEMENT } from "./enemy/types/MOVEMENT.js";
import { FORMATIONS } from "./enemy/types/FORMATIONS.js";
import { MINIBOSS_DEFS } from "./enemy/types/MINIBOSS_DEFS.js";
import { BOSS_DEFS } from "./enemy/types/BOSS_DEFS.js";
import MultiBoss from './enemy/MultiBoss.js';


/**
 * EnemyFactory - Creates enemies and bosses
 */
class EnemyFactory {
    static create(type, x, y, pattern, canvasWidth, speedMultiplier = 1, difficultyConfig = null, level = 1) {
        const enemy = new Enemy(x, y, type, pattern, canvasWidth, difficultyConfig, level);
        enemy.speed *= speedMultiplier;
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
            const y = -80 - window.randomSecure() * 40;
            const enemy = EnemyFactory.create(
                def.type, x, y, def.pattern,
                canvasWidth, speedMult, difficultyConfig, level
            );
            result.push(enemy);
        }
        return result;
    }
}

export { Enemy, MultiBoss, BossPart, EnemyFactory,  MOVEMENT, FORMATIONS, BOSS_DEFS, MINIBOSS_DEFS };
export default Enemy;

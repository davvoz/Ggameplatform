import Explosion from '../entities/Explosion.js';
import SpatialGrid from '../utils/SpatialGrid.js';
import PlayerAttackHandler from './collision/PlayerAttackHandler.js';
import PlayerDefenseHandler from './collision/PlayerDefenseHandler.js';

class CollisionManager {

    constructor(game) {
        this.game = game;
        this._enemyGrid = new SpatialGrid(120, game.logicalWidth, game.logicalHeight);
        this._lastW = game.logicalWidth;
        this._lastH = game.logicalHeight;

        this._attackHandler = new PlayerAttackHandler(game);
        this._defenseHandler = new PlayerDefenseHandler(game, () => this.onPlayerDeath());
    }

    _rebuildEnemyGrid(entities) {
        const w = this.game.logicalWidth;
        const h = this.game.logicalHeight;
        if (w !== this._lastW || h !== this._lastH) {
            this._enemyGrid.resize(w, h);
            this._lastW = w;
            this._lastH = h;
        }
        this._enemyGrid.clear();
        for (let i = 0, len = entities.enemies.length; i < len; i++) {
            const e = entities.enemies[i];
            if (e.active) this._enemyGrid.insert(e);
        }
    }

    checkCollisions() {
        const g = this.game;
        const entities = g.entityManager;
        const perks = g.perkSystem;

        this._rebuildEnemyGrid(entities);

        this._attackHandler.process(perks, entities, this._enemyGrid);
        this._defenseHandler.process(entities, perks);
    }

    onPlayerDeath() {
        const g = this.game;
        const entities = g.entityManager;
        const px = entities.player.position.x + entities.player.width / 2;
        const py = entities.player.position.y + entities.player.height / 2;

        entities.explosions.push(new Explosion(px, py, 2, { r: 100, g: 200, b: 255 }));
        g.particles.emit(px, py, 'explosion', 25);
        g.sound.playExplosionBig();
        g.postProcessing.shake(12, 0.6);
        g.postProcessing.flash({ r: 255, g: 60, b: 60 }, 0.5);

        g.uiManager.hideHudButtons();

        // Delete checkpoint save  this run is over (leaderboard integrity)
        g.saveManager.deleteSave(true);

        // Send score to platform  use delta (xp_score) so XP is only for new points
        const deltaScore = g.scoreManager.score - g.lastSentScore;
        if (globalThis.sendScoreToPlatform) {
            globalThis.sendScoreToPlatform(g.scoreManager.score, {
                level: g.levelManager.currentLevel,
                levelsCompleted: g.levelManager.currentLevel - (g.sessionStartLevel || 1),
                enemiesKilled: g.scoreManager.totalEnemiesKilled,
                maxCombo: g.scoreManager.maxCombo,
                ship: g.selectedShipId,
                ultimate: g.selectedUltimateId,
                difficulty: g.difficulty.id,
                continued: g.hasContinued,
                xp_score: deltaScore > 0 ? deltaScore : g.scoreManager.score
            });
        }
        g.lastSentScore = g.scoreManager.score;

        g.cinematicManager.beginDeathCinematic(px, py);
    }
}

export default CollisionManager;

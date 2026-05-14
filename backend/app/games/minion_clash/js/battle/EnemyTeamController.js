import { TeamController } from './TeamController.js';
import { EnemyAI } from './EnemyAI.js';

/**
 * Enemy team driven by EnemyAI. Same mana/deck/hand semantics as the player.
 */
export class EnemyTeamController extends TeamController {
    constructor(opts) {
        super(opts);
        this.ai = new EnemyAI(this, opts.aiProfile);
    }
    update(dt, world) {
        super.update(dt, world);
        if (!this.tower.isDead()) this.ai.update(dt, world);
    }
}

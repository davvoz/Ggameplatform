import { TeamController } from './TeamController.js';

/**
 * Local human player. The DragController in BattleState calls
 * `playCardFromHand(slot, x, y)` directly — no extra logic here.
 */
export class PlayerTeamController extends TeamController {}

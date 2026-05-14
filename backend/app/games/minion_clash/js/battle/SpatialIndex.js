import { GameConfig } from '../config/GameConfig.js';

/**
 * Uniform-grid spatial index. Rebuilt every frame from EntityManager.
 * Provides fast nearest-enemy queries and circular range queries.
 */
export class SpatialIndex {
    constructor() {
        this._cell = GameConfig.BATTLE.SPATIAL_CELL;
        this._cols = Math.ceil(GameConfig.VIEW_WIDTH / this._cell);
        this._rows = Math.ceil(GameConfig.VIEW_HEIGHT / this._cell);
        this._grid = new Array(this._cols * this._rows);
        for (let i = 0; i < this._grid.length; i++) this._grid[i] = [];
    }

    rebuild(entityManager) {
        for (const bucket of this._grid) bucket.length = 0;
        const cell = this._cell;
        const cols = this._cols, rows = this._rows;
        for (const e of entityManager.list()) {
            if (e.kind === 'projectile') continue;
            const cx = Math.max(0, Math.min(cols - 1, Math.floor(e.x / cell)));
            const cy = Math.max(0, Math.min(rows - 1, Math.floor(e.y / cell)));
            this._grid[cy * cols + cx].push(e);
        }
    }

    queryByTeam(x, y, radius, team) {
        return this._collect(x, y, radius, (e) => e.team === team && !e.isDead());
    }

    queryAll(x, y, radius) {
        return this._collect(x, y, radius, (e) => !e.isDead());
    }

    findNearestEnemy(self, enemyTeam, maxRadius) {
        const candidates = this.queryByTeam(self.x, self.y, maxRadius, enemyTeam);
        let best = null, bestSq = Infinity;
        for (const e of candidates) {
            if (e === self) continue;
            const dx = e.x - self.x, dy = e.y - self.y;
            const dsq = dx * dx + dy * dy;
            if (dsq < bestSq) { bestSq = dsq; best = e; }
        }
        return best;
    }

    _collect(x, y, radius, predicate) {
        const cell = this._cell;
        const cols = this._cols, rows = this._rows;
        const minCx = Math.max(0, Math.floor((x - radius) / cell));
        const maxCx = Math.min(cols - 1, Math.floor((x + radius) / cell));
        const minCy = Math.max(0, Math.floor((y - radius) / cell));
        const maxCy = Math.min(rows - 1, Math.floor((y + radius) / cell));
        const r2 = radius * radius;
        const out = [];
        for (let cy = minCy; cy <= maxCy; cy++) {
            for (let cx = minCx; cx <= maxCx; cx++) {
                const bucket = this._grid[cy * cols + cx];
                for (const e of bucket) {
                    if (!predicate(e)) continue;
                    const dx = e.x - x, dy = e.y - y;
                    if (dx * dx + dy * dy <= r2) out.push(e);
                }
            }
        }
        return out;
    }
}

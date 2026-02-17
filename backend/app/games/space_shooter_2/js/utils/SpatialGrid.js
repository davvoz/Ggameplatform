/**
 * SpatialGrid – Lightweight spatial partitioning for fast collision queries.
 *
 * Divides the canvas into uniform cells and lets callers insert entities,
 * then query a rectangular region to get only the entities whose bounding
 * boxes overlap that region.  Reduces bullet-vs-enemy checks from O(n*m)
 * to roughly O(n + m) for uniformly distributed entities.
 */
class SpatialGrid {
    /**
     * @param {number} cellSize – Side length of each cell in pixels (default 120).
     * @param {number} width   – Canvas / world width.
     * @param {number} height  – Canvas / world height.
     */
    constructor(cellSize = 120, width = 800, height = 600) {
        this.cellSize = cellSize;
        this.cols = 0;
        this.rows = 0;
        this.cells = null;          // flat array, lazily allocated
        this._queryResult = [];     // reusable array to avoid allocs
        this._querySet = new Set(); // dedup within a single query
        this.resize(width, height);
    }
        

    /** Call once (or on canvas resize) to reallocate the grid. */
    resize(width, height) {
        this.cols = Math.ceil(width / this.cellSize) + 1;
        this.rows = Math.ceil(height / this.cellSize) + 1;
        const total = this.cols * this.rows;
        // Pre-allocate arrays only if size changed
        if (!this.cells || this.cells.length !== total) {
            this.cells = new Array(total);
            for (let i = 0; i < total; i++) this.cells[i] = [];
        }
    }

    /** Empties every cell – call at the start of each frame. */
    clear() {
        for (let i = 0, len = this.cells.length; i < len; i++) {
            this.cells[i].length = 0;   // fast reuse, no GC
        }
    }

    /**
     * Insert an entity into every cell its AABB overlaps.
     * @param {object} entity – Must have { position: {x,y}, width, height }.
     */
    insert(entity) {
        const x = entity.position.x;
        const y = entity.position.y;
        const w = entity.width;
        const h = entity.height;
        const cs = this.cellSize;

        const minCol = Math.max(0, (x / cs) | 0);
        const maxCol = Math.min(this.cols - 1, ((x + w) / cs) | 0);
        const minRow = Math.max(0, (y / cs) | 0);
        const maxRow = Math.min(this.rows - 1, ((y + h) / cs) | 0);

        for (let r = minRow; r <= maxRow; r++) {
            const rowOff = r * this.cols;
            for (let c = minCol; c <= maxCol; c++) {
                this.cells[rowOff + c].push(entity);
            }
        }
    }

    /**
     * Return all entities whose cells overlap the given AABB.
     * The returned array is reused – copy it if you need to store it.
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @returns {object[]}
     */
    query(x, y, w, h) {
        const result = this._queryResult;
        const seen = this._querySet;
        result.length = 0;
        seen.clear();

        const cs = this.cellSize;
        const minCol = Math.max(0, (x / cs) | 0);
        const maxCol = Math.min(this.cols - 1, ((x + w) / cs) | 0);
        const minRow = Math.max(0, (y / cs) | 0);
        const maxRow = Math.min(this.rows - 1, ((y + h) / cs) | 0);

        for (let r = minRow; r <= maxRow; r++) {
            const rowOff = r * this.cols;
            for (let c = minCol; c <= maxCol; c++) {
                const cell = this.cells[rowOff + c];
                for (let i = 0, len = cell.length; i < len; i++) {
                    const e = cell[i];
                    if (!seen.has(e)) {
                        seen.add(e);
                        result.push(e);
                    }
                }
            }
        }
        return result;
    }
}

export default SpatialGrid;

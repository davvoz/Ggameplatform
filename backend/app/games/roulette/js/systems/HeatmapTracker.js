/**
 * Tracks recent spin outcomes and computes hot/cold subsets.
 * Window size + hot/cold count are config-driven (heatmap block in config.json).
 */
export class HeatmapTracker {
    constructor(heatmapConfig) {
        this._window   = heatmapConfig.windowSize;
        this._hotCount = heatmapConfig.hotCount;
        this._coldCount = heatmapConfig.coldCount;
        this._history = [];   // most recent at index 0
        this._counts = new Map();   // n → occurrences inside window
        // Track which numbers have NEVER appeared — for cold prioritization.
        this._allNumbers = Array.from({ length: 37 }, (_, i) => i);
    }

    record(n) {
        if (typeof n !== 'number' || n < 0 || n > 36) {
            throw new Error(`HeatmapTracker: invalid number ${n}`);
        }
        this._history.unshift(n);
        this._counts.set(n, (this._counts.get(n) ?? 0) + 1);
        if (this._history.length > this._window) {
            const dropped = this._history.pop();
            const c = this._counts.get(dropped) - 1;
            if (c <= 0) this._counts.delete(dropped);
            else this._counts.set(dropped, c);
        }
    }

    /** N most-frequently observed numbers in the window. */
    getHotNumbers(count = this._hotCount) {
        const entries = Array.from(this._counts.entries())
            .sort((a, b) => b[1] - a[1] || a[0] - b[0]);
        return entries.slice(0, count).map(([n]) => n);
    }

    /** N "overdue" numbers — those NOT in the window, or with minimum count. */
    getColdNumbers(count = this._coldCount) {
        const missing = this._allNumbers.filter(n => !this._counts.has(n));
        if (missing.length >= count) return missing.slice(0, count);
        // Fill from low-frequency entries
        const present = Array.from(this._counts.entries())
            .sort((a, b) => a[1] - b[1] || a[0] - b[0])
            .map(([n]) => n);
        const need = count - missing.length;
        return [...missing, ...present.slice(0, need)];
    }

    getHistory() { return [...this._history]; }
    size()       { return this._history.length; }
}

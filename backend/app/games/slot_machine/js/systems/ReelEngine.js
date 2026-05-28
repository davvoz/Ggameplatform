/**
 * Generates symbol strips (long sequences for spinning visuals) and resolves
 * the 3-row visible window per reel after a spin. Uses weighted random per reel.
 */
export class ReelEngine {
    constructor(dataRegistry) {
        this.data = dataRegistry;
        this.strips = this._buildStrips();
    }

    _buildStrips() {
        const len = this.data.stripLength;
        return this.data.reels.map(reel => this._buildOneStrip(reel.weights, len));
    }

    _buildOneStrip(weights, len) {
        const ids = Object.keys(weights);
        const ws = ids.map(id => weights[id]);
        const total = ws.reduce((a, b) => a + b, 0);
        const out = new Array(len);
        for (let i = 0; i < len; i++) out[i] = this._pickWeighted(ids, ws, total);
        return out;
    }

    _pickWeighted(ids, ws, total) {
        let r = Math.random() * total;
        for (let i = 0; i < ids.length; i++) {
            r -= ws[i];
            if (r <= 0) return ids[i];
        }
        return ids[ids.length - 1];
    }

    /**
     * Spin the reel: pick a final landing index, return the 3 visible symbols
     * (top, mid, bottom) and the landing index (used by the renderer animation).
     */
    spinReel(reelIndex) {
        const strip = this.strips[reelIndex];
        const landingIndex = Math.floor(Math.random() * strip.length);
        const visible = [
            strip[(landingIndex + 0) % strip.length],
            strip[(landingIndex + 1) % strip.length],
            strip[(landingIndex + 2) % strip.length]
        ];
        return { landingIndex, visible };
    }

    getStrip(reelIndex) { return this.strips[reelIndex]; }
}

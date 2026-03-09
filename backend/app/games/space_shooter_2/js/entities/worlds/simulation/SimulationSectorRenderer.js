/**
 * SimulationSectorRenderer — Abstract base class for simulation sector sub-renderers.
 *
 * Each of the 6 sectors extends this class and implements its own
 * build / update / renderBg / renderOverlay pipeline.
 *
 *   Sector 1  "Boot Sequence"  — BootSequenceSector
 *   Sector 2  "Corrupted Zone" — CorruptedZoneSector
 *   Sector 3  "Data Ocean"     — DataOceanSector
 *   Sector 4  "Virus Core"     — VirusCoreSector
 *   Sector 5  "Matrix Decay"   — MatrixDecaySector
 *   Sector 6  "The Kernel"     — TheKernelSector
 */
export class SimulationSectorRenderer {
    /**
     * @param {number} canvasWidth
     * @param {number} canvasHeight
     * @param {'high'|'medium'|'low'} quality
     */
    constructor(canvasWidth, canvasHeight, quality) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.quality = quality;
        this.time = 0;
        this.intensity = 0;
    }

    /** Build all sector structures. */
    build() { /* override */ }

    /** Per-frame animation / scrolling. */
    update(dt) { /* override */ }

    /** Render sector background. */
    renderBg(ctx) { /* override */ }

    /** Render sector overlay. */
    renderOverlay(ctx) { /* override */ }

    resize(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
    }

    setQuality(quality) {
        this.quality = quality;
    }
}

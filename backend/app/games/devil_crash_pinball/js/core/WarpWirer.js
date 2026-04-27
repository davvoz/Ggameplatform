/**
 * Resolves warp exit destinations.
 *
 * warpExit objects live in the DESTINATION section JSON:
 *   { fromSection, x, y, vx, vy }
 *
 * WarpWirer iterates every section's warpExits array, locates all warps in
 * the source section, and writes exitX/Y/VelX/VelY onto each WarpHole.
 * All warps in the same source section share one exit destination.
 *
 * This keeps the warp entry clean (name + position only) and makes the
 * landing point visually explicit in the section where the ball arrives.
 *
 * Adding a new floor never requires touching this file.
 */
export class WarpWirer {
    /**
     * @param {import('../sections/Section.js').Section[]} sections
     */
    static wire(sections) {
        // Build lookup: sectionKey → WarpHole[]
        const byKey = new Map();
        for (const section of sections) {
            byKey.set(section.sectionKey, section.warps);
        }

        // Each warpExit lives in the destination section and references its source
        for (const section of sections) {
            for (const exit of section.warpExits) {
                const sourceWarps = byKey.get(exit.fromSection);
                if (!sourceWarps) continue;
                for (const warp of sourceWarps) {
                    warp.exitX    = exit.x;
                    warp.exitY    = exit.y;
                    warp.exitVelX = exit.vx;
                    warp.exitVelY = exit.vy;
                }
            }
        }
    }
}


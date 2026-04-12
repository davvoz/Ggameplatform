/**
 * Formation system — arranges enemies in geometric patterns
 */
const FORMATIONS = {
    /** Default: spawn at specified x positions */
    none: (enemies, canvasWidth) => enemies,

    /** V formation */
    vee: (enemies, canvasWidth) => {
        const cx = canvasWidth / 2;
        const count = enemies.length;
        return enemies.map((e, i) => {
            const offset = i - (count - 1) / 2;
            e.x = (cx + offset * 55) / canvasWidth;
            return e;
        });
    },

    /** Horizontal line */
    line: (enemies, canvasWidth) => {
        const count = enemies.length;
        const spacing = 0.8 / Math.max(count - 1, 1);
        return enemies.map((e, i) => {
            e.x = 0.1 + i * spacing;
            return e;
        });
    },

    /** Diamond shape */
    diamond: (enemies, canvasWidth) => {
        const positions = [
            [0.5], [0.35, 0.65], [0.2, 0.5, 0.8], [0.35, 0.65], [0.5]
        ].flat();
        return enemies.map((e, i) => {
            if (i < positions.length) e.x = positions[i];
            return e;
        });
    },

    /** Pincer — two groups at edges */
    pincer: (enemies, canvasWidth) => {
        const half = Math.ceil(enemies.length / 2);
        return enemies.map((e, i) => {
            if (i < half) {
                e.x = 0.1 + (i / half) * 0.2;
            } else {
                e.x = 0.7 + ((i - half) / (enemies.length - half)) * 0.2;
            }
            return e;
        });
    },

    /** Circle formation */
    ring: (enemies, canvasWidth) => {
        const count = enemies.length;
        const cx = 0.5;
        const radius = 0.2;
        return enemies.map((e, i) => {
            const angle = (Math.PI * 2 / count) * i - Math.PI / 2;
            e.x = cx + Math.cos(angle) * radius;
            return e;
        });
    },

    /** Staggered rows */
    stagger: (enemies, canvasWidth) => {
        return enemies.map((e, i) => {
            const row = Math.floor(i / 3);
            const col = i % 3;
            const offset = (row % 2) * 0.08;
            e.x = 0.25 + col * 0.25 + offset;
            return e;
        });
    },

    /** Cross/X pattern */
    cross: (enemies, canvasWidth) => {
        const positions = [0.5, 0.3, 0.7, 0.15, 0.85, 0.4, 0.6, 0.25, 0.75];
        return enemies.map((e, i) => {
            if (i < positions.length) e.x = positions[i];
            return e;
        });
    },

    /** Arrow pointing down */
    arrow: (enemies, canvasWidth) => {
        return enemies.map((e, i) => {
            if (i === 0) { e.x = 0.5; }
            else {
                const side = (i % 2 === 1) ? -1 : 1;
                const row = Math.ceil(i / 2);
                e.x = 0.5 + side * row * 0.12;
            }
            return e;
        });
    }
};

export { FORMATIONS };
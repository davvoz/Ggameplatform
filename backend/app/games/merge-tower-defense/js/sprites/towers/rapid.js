/**
 * RAPID Tower Sprite - Twin-barrel rapid fire turret
 */

const RapidTowerSprite = {
    base: {
        parts: [
            // Ground shadow
            {
                type: 'ellipse',
                x: 0.5, y: 0.87,
                width: 0.52, height: 0.14,
                color: 'rgba(192, 192, 192, 0.25)',
                fill: true
            },

            // Base platform (trapezoid, compact)
            {
                type: 'polygon',
                points: [
                    { x: 0.32, y: 0.72 },
                    { x: 0.68, y: 0.72 },
                    { x: 0.75, y: 0.82 },
                    { x: 0.25, y: 0.82 }
                ],
                color: '#ff8800',
                fill: true,
                stroke: true,
                strokeWidth: 1
            },

            // Base bolt heads
            {
                type: 'circle',
                x: 0.35, y: 0.79,
                radius: 0.012,
                color: '#ffdd00',
                fill: true
            },
            {
                type: 'circle',
                x: 0.65, y: 0.79,
                radius: 0.012,
                color: '#ffdd00',
                fill: true
            },

            // Mounting column (shorter, wider)
            {
                type: 'rect',
                x: 0.42, y: 0.62,
                width: 0.16, height: 0.12,
                color: '#ff6600',
                fill: true,
                stroke: true,
                strokeWidth: 1
            },
            {
                type: 'rect',
                x: 0.43, y: 0.64,
                width: 0.14, height: 0.02,
                color: '#ffaa00',
                fill: true
            },

            // Turret housing (compact, armored)
            {
                type: 'rect',
                x: 0.37, y: 0.48,
                width: 0.26, height: 0.18,
                color: '#cc00ff',
                fill: true,
                stroke: true,
                strokeWidth: 2
            },
            {
                type: 'rect',
                x: 0.39, y: 0.50,
                width: 0.22, height: 0.14,
                color: '#aa00dd',
                fill: true
            },

            // Central ammo feed mechanism
            {
                type: 'rect',
                x: 0.46, y: 0.54,
                width: 0.08, height: 0.12,
                color: '#00ddff',
                fill: true,
                stroke: true,
                strokeWidth: 1
            },
            {
                type: 'rect',
                x: 0.475, y: 0.56,
                width: 0.05, height: 0.04,
                color: '#00ffff',
                fill: true
            },

            // Left barrel (upper position)
            {
                type: 'rect',
                x: 0.58, y: 0.49,
                width: 0.28, height: 0.04,
                color: '#ff0000',
                fill: true,
                stroke: true,
                strokeWidth: 1
            },
            {
                type: 'rect',
                x: 0.58, y: 0.495,
                width: 0.28, height: 0.012,
                color: '#ff3333',
                fill: true
            },
            {
                type: 'rect',
                x: 0.84, y: 0.485,
                width: 0.03, height: 0.05,
                color: '#00ff00',
                fill: true
            },

            // Right barrel (lower position)
            {
                type: 'rect',
                x: 0.58, y: 0.58,
                width: 0.28, height: 0.04,
                color: '#ff0000',
                fill: true,
                stroke: true,
                strokeWidth: 1
            },
            {
                type: 'rect',
                x: 0.58, y: 0.595,
                width: 0.28, height: 0.012,
                color: '#ff3333',
                fill: true
            },
            {
                type: 'rect',
                x: 0.84, y: 0.575,
                width: 0.03, height: 0.05,
                color: '#ffff00',
                fill: true
            },

            // Barrel heat sinks
            {
                type: 'rect',
                x: 0.68, y: 0.485,
                width: 0.015, height: 0.05,
                color: '#00aaff',
                fill: true
            },
            {
                type: 'rect',
                x: 0.72, y: 0.485,
                width: 0.015, height: 0.05,
                color: '#00aaff',
                fill: true
            },
            {
                type: 'rect',
                x: 0.76, y: 0.485,
                width: 0.015, height: 0.05,
                color: '#00aaff',
                fill: true
            },
            {
                type: 'rect',
                x: 0.68, y: 0.575,
                width: 0.015, height: 0.05,
                color: '#00aaff',
                fill: true
            },
            {
                type: 'rect',
                x: 0.72, y: 0.575,
                width: 0.015, height: 0.05,
                color: '#00aaff',
                fill: true
            },
            {
                type: 'rect',
                x: 0.76, y: 0.575,
                width: 0.015, height: 0.05,
                color: '#00aaff',
                fill: true
            },

            // Targeting sensor array
            {
                type: 'rect',
                x: 0.40, y: 0.44,
                width: 0.06, height: 0.05,
                color: '#222244',
                fill: true
            },
            {
                type: 'circle',
                x: 0.43, y: 0.465,
                radius: 0.018,
                color: '#ff0066',
                fill: true
            },

            // Status indicators
            {
                type: 'circle',
                x: 0.39, y: 0.52,
                radius: 0.010,
                color: '#00ff00',
                fill: true
            },
            {
                type: 'circle',
                x: 0.61, y: 0.52,
                radius: 0.010,
                color: '#00ff00',
                fill: true
            },
            {
                type: 'circle',
                x: 0.39, y: 0.61,
                radius: 0.010,
                color: '#ffff00',
                fill: true
            },
            {
                type: 'circle',
                x: 0.61, y: 0.61,
                radius: 0.010,
                color: '#ffff00',
                fill: true
            }
        ]
    },

    animations: {
        idle: { fps: 3, frames: 2 },
        firing: { fps: 20, frames: 6 },
        alternating: { fps: 15, frames: 4 }
    },

    colors: {
        primary: '#ff0000',
        secondary: '#cc00ff',
        accent: '#00ddff'
    }
};

export { RapidTowerSprite };

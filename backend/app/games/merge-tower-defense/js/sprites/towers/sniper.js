/**
 * SNIPER Tower Sprite - Long-range precision rifle
 */

const SniperTowerSprite = {
    base: {
        parts: [
            // Ground shadow
            {
                type: 'ellipse',
                x: 0.5, y: 0.87,
                width: 0.54, height: 0.14,
                color: 'rgba(192, 192, 192, 0.25)',
                fill: true
            },

            // Base platform (angular, tactical)
            {
                type: 'polygon',
                points: [
                    { x: 0.30, y: 0.73 },
                    { x: 0.70, y: 0.73 },
                    { x: 0.76, y: 0.82 },
                    { x: 0.24, y: 0.82 }
                ],
                color: '#ff0066',
                fill: true,
                stroke: true,
                strokeWidth: 2
            },

            // Base accent stripe
            {
                type: 'rect',
                x: 0.32, y: 0.745,
                width: 0.36, height: 0.03,
                color: '#ff3399',
                fill: true
            },

            // Mounting column
            {
                type: 'rect',
                x: 0.44, y: 0.62,
                width: 0.12, height: 0.13,
                color: '#cc0055',
                fill: true,
                stroke: true,
                strokeWidth: 1
            },

            // Turret housing (compact, sleek)
            {
                type: 'rect',
                x: 0.40, y: 0.50,
                width: 0.20, height: 0.14,
                color: '#ff0066',
                fill: true,
                stroke: true,
                strokeWidth: 2
            },
            {
                type: 'rect',
                x: 0.42, y: 0.52,
                width: 0.16, height: 0.10,
                color: '#dd0055',
                fill: true
            },

            // Optic sensor housing
            {
                type: 'circle',
                x: 0.45, y: 0.57,
                radius: 0.04,
                color: '#ff3388',
                fill: true,
                stroke: true,
                strokeWidth: 1
            },
            {
                type: 'circle',
                x: 0.45, y: 0.57,
                radius: 0.025,
                color: '#00ffff',
                fill: true
            },

            // Long precision barrel
            {
                type: 'rect',
                x: 0.58, y: 0.540,
                width: 0.35, height: 0.045,
                color: '#2a0a1a',
                fill: true,
                stroke: true,
                strokeWidth: 1
            },
            {
                type: 'rect',
                x: 0.58, y: 0.545,
                width: 0.35, height: 0.015,
                color: '#3a1a2a',
                fill: true
            },

            // Barrel reinforcement rings
            {
                type: 'rect',
                x: 0.68, y: 0.537,
                width: 0.015, height: 0.052,
                color: '#3a1a2a',
                fill: true
            },
            {
                type: 'rect',
                x: 0.78, y: 0.537,
                width: 0.015, height: 0.052,
                color: '#3a1a2a',
                fill: true
            },
            {
                type: 'rect',
                x: 0.88, y: 0.537,
                width: 0.015, height: 0.052,
                color: '#3a1a2a',
                fill: true
            },

            // Muzzle brake (precision cut)
            {
                type: 'rect',
                x: 0.92, y: 0.535,
                width: 0.04, height: 0.056,
                color: '#1a0a15',
                fill: true
            },
            {
                type: 'circle',
                x: 0.94, y: 0.5625,
                radius: 0.010,
                color: '#000000',
                fill: true
            },

            // Advanced scope assembly
            {
                type: 'rect',
                x: 0.60, y: 0.46,
                width: 0.15, height: 0.06,
                color: '#ff0066',
                fill: true,
                stroke: true,
                strokeWidth: 1
            },
            {
                type: 'rect',
                x: 0.62, y: 0.48,
                width: 0.11, height: 0.02,
                color: '#ff3399',
                fill: true
            },

            // Scope lens
            {
                type: 'circle',
                x: 0.72, y: 0.49,
                radius: 0.025,
                color: '#00ffff',
                fill: true,
                stroke: true,
                strokeWidth: 1
            },
            {
                type: 'circle',
                x: 0.72, y: 0.49,
                radius: 0.015,
                color: '#ffffff',
                fill: true
            },

            // Scope reticle indicator
            {
                type: 'line',
                x1: 0.715, y1: 0.49,
                x2: 0.725, y2: 0.49,
                color: '#ff0000',
                strokeWidth: 1
            },
            {
                type: 'line',
                x1: 0.72, y1: 0.485,
                x2: 0.72, y2: 0.495,
                color: '#ff0000',
                strokeWidth: 1
            },

            // Bipod/stabilizer
            {
                type: 'polygon',
                points: [
                    { x: 0.70, y: 0.60 },
                    { x: 0.65, y: 0.70 },
                    { x: 0.68, y: 0.70 }
                ],
                color: '#990044',
                fill: true
            },
            {
                type: 'polygon',
                points: [
                    { x: 0.80, y: 0.60 },
                    { x: 0.85, y: 0.70 },
                    { x: 0.82, y: 0.70 }
                ],
                color: '#990044',
                fill: true
            },

            // Targeting laser mount
            {
                type: 'rect',
                x: 0.56, y: 0.595,
                width: 0.03, height: 0.02,
                color: '#ff3388',
                fill: true
            },
            {
                type: 'circle',
                x: 0.575, y: 0.605,
                radius: 0.008,
                color: '#ff0000',
                fill: true
            },

            // Status indicators
            {
                type: 'circle',
                x: 0.42, y: 0.53,
                radius: 0.008,
                color: '#00ff00',
                fill: true
            },
            {
                type: 'circle',
                x: 0.58, y: 0.53,
                radius: 0.008,
                color: '#ffff00',
                fill: true
            }
        ]
    },

    animations: {
        idle: { fps: 1, frames: 2 },
        charging: { fps: 8, frames: 3 },
        firing: { fps: 10, frames: 4 }
    },

    colors: {
        primary: '#ff0066',
        secondary: '#2a0a1a',
        accent: '#00ffff'
    }
};

export { SniperTowerSprite };

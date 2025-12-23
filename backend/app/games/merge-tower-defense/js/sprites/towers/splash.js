/**
 * SPLASH Tower Sprite - Area damage mortar launcher
 */

const SplashTowerSprite = {
    base: {
        parts: [
            // Ground shadow
            {
                type: 'ellipse',
                x: 0.5, y: 0.87,
                width: 0.60, height: 0.14,
                color: 'rgba(192, 192, 192, 0.25)',
                fill: true
            },

            // Wide stable base platform
            {
                type: 'polygon',
                points: [
                    { x: 0.27, y: 0.72 },
                    { x: 0.73, y: 0.72 },
                    { x: 0.80, y: 0.82 },
                    { x: 0.20, y: 0.82 }
                ],
                color: '#ff8800',
                fill: true,
                stroke: true,
                strokeWidth: 2
            },

            // Base reinforcement stripe
            {
                type: 'rect',
                x: 0.30, y: 0.74,
                width: 0.40, height: 0.04,
                color: '#ffaa00',
                fill: true
            },

            // Base bolts/mounting points
            {
                type: 'circle',
                x: 0.32, y: 0.79,
                radius: 0.014,
                color: '#cc6600',
                fill: true
            },
            {
                type: 'circle',
                x: 0.50, y: 0.79,
                radius: 0.014,
                color: '#cc6600',
                fill: true
            },
            {
                type: 'circle',
                x: 0.68, y: 0.79,
                radius: 0.014,
                color: '#cc6600',
                fill: true
            },

            // Rotating platform (elliptical)
            {
                type: 'ellipse',
                x: 0.5, y: 0.68,
                width: 0.35, height: 0.12,
                color: '#dd7700',
                fill: true,
                stroke: true,
                strokeWidth: 2
            },
            {
                type: 'ellipse',
                x: 0.5, y: 0.68,
                width: 0.28, height: 0.08,
                color: '#ff9900',
                fill: true
            },

            // Mortar body (rounded, bulky)
            {
                type: 'ellipse',
                x: 0.5, y: 0.58,
                width: 0.28, height: 0.22,
                color: '#ff8800',
                fill: true,
                stroke: true,
                strokeWidth: 2
            },
            {
                type: 'rect',
                x: 0.42, y: 0.54,
                width: 0.16, height: 0.12,
                color: '#cc6600',
                fill: true
            },

            // Mortar loading hatch
            {
                type: 'rect',
                x: 0.46, y: 0.56,
                width: 0.08, height: 0.06,
                color: '#aa5500',
                fill: true,
                stroke: true,
                strokeWidth: 1
            },
            {
                type: 'circle',
                x: 0.48, y: 0.58,
                radius: 0.008,
                color: '#ffaa00',
                fill: true
            },
            {
                type: 'circle',
                x: 0.52, y: 0.60,
                radius: 0.008,
                color: '#ffaa00',
                fill: true
            },

            // Angled barrel assembly
            {
                type: 'rect',
                x: 0.47, y: 0.38,
                width: 0.12, height: 0.20,
                color: '#2a1a0a',
                fill: true,
                stroke: true,
                strokeWidth: 1.5
            },
            {
                type: 'rect',
                x: 0.485, y: 0.40,
                width: 0.09, height: 0.16,
                color: '#1a1a0a',
                fill: true
            },

            // Barrel muzzle (wide bore)
            {
                type: 'rect',
                x: 0.46, y: 0.35,
                width: 0.14, height: 0.05,
                color: '#1a1a0a',
                fill: true,
                stroke: true,
                strokeWidth: 1
            },
            {
                type: 'circle',
                x: 0.53, y: 0.375,
                radius: 0.018,
                color: '#000000',
                fill: true
            },

            // Barrel reinforcement bands
            {
                type: 'rect',
                x: 0.46, y: 0.43,
                width: 0.14, height: 0.02,
                color: '#3a2a1a',
                fill: true
            },
            {
                type: 'rect',
                x: 0.46, y: 0.50,
                width: 0.14, height: 0.02,
                color: '#3a2a1a',
                fill: true
            },

            // Hydraulic recoil absorbers
            {
                type: 'rect',
                x: 0.40, y: 0.56,
                width: 0.04, height: 0.08,
                color: '#cc6600',
                fill: true,
                stroke: true,
                strokeWidth: 1
            },
            {
                type: 'rect',
                x: 0.62, y: 0.56,
                width: 0.04, height: 0.08,
                color: '#cc6600',
                fill: true,
                stroke: true,
                strokeWidth: 1
            },

            // Loading mechanism indicator
            {
                type: 'rect',
                x: 0.36, y: 0.59,
                width: 0.08, height: 0.08,
                color: '#ff8800',
                fill: true,
                stroke: true,
                strokeWidth: 1
            },
            {
                type: 'circle',
                x: 0.40, y: 0.63,
                radius: 0.015,
                color: '#ffff00',
                fill: true
            },

            // Ammo counter display
            {
                type: 'rect',
                x: 0.45, y: 0.63,
                width: 0.06, height: 0.03,
                color: '#00ff00',
                fill: true
            },

            // Safety lights
            {
                type: 'circle',
                x: 0.38, y: 0.70,
                radius: 0.012,
                color: '#ff0000',
                fill: true
            },
            {
                type: 'circle',
                x: 0.62, y: 0.70,
                radius: 0.012,
                color: '#ff0000',
                fill: true
            }
        ]
    },

    animations: {
        idle: { fps: 2, frames: 2 },
        loading: { fps: 8, frames: 4 },
        firing: { fps: 10, frames: 5 }
    },

    colors: {
        primary: '#ff8800',
        secondary: '#2a1a0a',
        accent: '#ffff00'
    }
};

export { SplashTowerSprite };

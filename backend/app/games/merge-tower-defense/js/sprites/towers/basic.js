/**
 * BASIC Tower Sprite - Standard ballistic turret
 */

const BasicTowerSprite = {
    base: {
        parts: [
            // Ground shadow
            {
                type: 'ellipse',
                x: 0.5, y: 0.87,
                width: 0.56, height: 0.14,
                color: 'rgba(192, 192, 192, 0.25)',
                fill: true
            },

            // Base platform (thicker, beveled)
            {
                type: 'polygon',
                points: [
                    { x: 0.29, y: 0.72 },
                    { x: 0.71, y: 0.72 },
                    { x: 0.79, y: 0.82 },
                    { x: 0.71, y: 0.89 },
                    { x: 0.29, y: 0.89 },
                    { x: 0.21, y: 0.82 }
                ],
                color: '#6868ffff',
                fill: true
            },
            {
                type: 'polygon',
                points: [
                    { x: 0.32, y: 0.74 },
                    { x: 0.68, y: 0.74 },
                    { x: 0.74, y: 0.82 },
                    { x: 0.68, y: 0.87 },
                    { x: 0.32, y: 0.87 },
                    { x: 0.26, y: 0.82 }
                ],
                color: '#2a2a3a',
                fill: true
            },
            // Base outline
            {
                type: 'polygon',
                points: [
                    { x: 0.29, y: 0.72 },
                    { x: 0.71, y: 0.72 },
                    { x: 0.79, y: 0.82 },
                    { x: 0.71, y: 0.89 },
                    { x: 0.29, y: 0.89 },
                    { x: 0.21, y: 0.82 }
                ],
                color: '#a1bd03ff',
                fill: false,
                stroke: true,
                strokeWidth: 2
            },
            // Base bolt heads
            {
                type: 'circle',
                x: 0.33, y: 0.82,
                radius: 0.014,
                color: '#05b0c7ff',
                fill: true
            },
            {
                type: 'circle',
                x: 0.67, y: 0.82,
                radius: 0.014,
                color: '#3a3a4a',
                fill: true
            },
            {
                type: 'circle',
                x: 0.5, y: 0.86,
                radius: 0.014,
                color: '#db0505ff',
                fill: true
            },

            // Rotation ring + bearing race
            {
                type: 'circle',
                x: 0.5, y: 0.67,
                radius: 0.13,
                color: '#f7c57aff',
                fill: true
            },
            {
                type: 'circle',
                x: 0.5, y: 0.67,
                radius: 0.105,
                color: '#0000aaff',
                fill: true
            },
            {
                type: 'circle',
                x: 0.5, y: 0.67,
                radius: 0.13,
                color: '#0a0a1a',
                fill: false,
                stroke: true,
                strokeWidth: 2
            },

            // Mounting column (chunkier) + gussets
            {
                type: 'rect',
                x: 0.435, y: 0.58,
                width: 0.13, height: 0.16,
                color: '#3a3a4a',
                fill: true
            },
            {
                type: 'rect',
                x: 0.445, y: 0.59,
                width: 0.11, height: 0.03,
                color: '#4a4a5a',
                fill: true
            },
            {
                type: 'polygon',
                points: [
                    { x: 0.435, y: 0.72 },
                    { x: 0.39, y: 0.79 },
                    { x: 0.435, y: 0.79 }
                ],
                color: '#2a2a3a',
                fill: true
            },
            {
                type: 'polygon',
                points: [
                    { x: 0.565, y: 0.72 },
                    { x: 0.565, y: 0.79 },
                    { x: 0.61, y: 0.79 }
                ],
                color: '#2a2a3a',
                fill: true
            },
            // Column outline
            {
                type: 'rect',
                x: 0.435, y: 0.58,
                width: 0.13, height: 0.16,
                color: '#0202ffff',
                fill: false,
                stroke: true,
                strokeWidth: 2
            },

            // Turret body (armored, better proportions)
            {
                type: 'polygon',
                points: [
                    { x: 0.36, y: 0.56 },
                    { x: 0.44, y: 0.44 },
                    { x: 0.62, y: 0.44 },
                    { x: 0.69, y: 0.50 },
                    { x: 0.69, y: 0.57 },
                    { x: 0.60, y: 0.62 },
                    { x: 0.40, y: 0.62 }
                ],
                color: '#2370bdff',
                fill: true
            },
            // Body bevel highlight
            {
                type: 'polygon',
                points: [
                    { x: 0.40, y: 0.56 },
                    { x: 0.47, y: 0.47 },
                    { x: 0.60, y: 0.47 },
                    { x: 0.64, y: 0.51 },
                    { x: 0.64, y: 0.56 },
                    { x: 0.57, y: 0.59 },
                    { x: 0.43, y: 0.59 }
                ],
                color: '#00ff15ff',
                fill: true
            },
            // Body outline
            {
                type: 'polygon',
                points: [
                    { x: 0.36, y: 0.56 },
                    { x: 0.44, y: 0.44 },
                    { x: 0.62, y: 0.44 },
                    { x: 0.69, y: 0.50 },
                    { x: 0.69, y: 0.57 },
                    { x: 0.60, y: 0.62 },
                    { x: 0.40, y: 0.62 }
                ],
                color: '#b6f800ff',
                fill: false,
                stroke: true,
                strokeWidth: 2
            },
            // Side armor plates
            {
                type: 'rect',
                x: 0.39, y: 0.54,
                width: 0.07, height: 0.06,
                color: '#4ead0fff',
                fill: true
            },
            {
                type: 'rect',
                x: 0.56, y: 0.54,
                width: 0.07, height: 0.06,
                color: '#3a3a4a',
                fill: true
            },
            // Plate bolts
            {
                type: 'circle',
                x: 0.405, y: 0.555,
                radius: 0.010,
                color: '#2a2a3a',
                fill: true
            },
            {
                type: 'circle',
                x: 0.605, y: 0.555,
                radius: 0.010,
                color: '#7ff033ff',
                fill: true
            },

            // Breech block / barrel mount (chunky)
            {
                type: 'rect',
                x: 0.60, y: 0.49,
                width: 0.08, height: 0.09,
                color: '#a0a0beff',
                fill: true
            },
            {
                type: 'rect',
                x: 0.60, y: 0.49,
                width: 0.08, height: 0.09,
                color: '#0a0a1a',
                fill: false,
                stroke: true,
                strokeWidth: 2
            },
            // Recoil sleeve
            {
                type: 'rect',
                x: 0.68, y: 0.505,
                width: 0.05, height: 0.06,
                color: '#2a2a3a',
                fill: true
            },

            // Main barrel (cylindrical with highlight/shadow)
            {
                type: 'rect',
                x: 0.72, y: 0.515,
                width: 0.18, height: 0.045,
                color: '#1a1a2a',
                fill: true
            },
            {
                type: 'rect',
                x: 0.72, y: 0.515,
                width: 0.18, height: 0.012,
                color: '#3a3a4a',
                fill: true
            },
            {
                type: 'rect',
                x: 0.72, y: 0.548,
                width: 0.18, height: 0.012,
                color: '#0a0a1a',
                fill: true
            },
            // Barrel collar rings
            {
                type: 'rect',
                x: 0.76, y: 0.512,
                width: 0.015, height: 0.051,
                color: '#1a1a2a',
                fill: true
            },
            {
                type: 'rect',
                x: 0.82, y: 0.512,
                width: 0.015, height: 0.051,
                color: '#1a1a2a',
                fill: true
            },
            // Muzzle brake (taper + bore)
            {
                type: 'polygon',
                points: [
                    { x: 0.90, y: 0.508 },
                    { x: 0.94, y: 0.520 },
                    { x: 0.94, y: 0.558 },
                    { x: 0.90, y: 0.570 }
                ],
                color: '#0a0a1a',
                fill: true
            },
            {
                type: 'circle',
                x: 0.93, y: 0.539,
                radius: 0.012,
                color: '#000000',
                fill: true
            },

            // Targeting optic block + lens
            {
                type: 'rect',
                x: 0.41, y: 0.46,
                width: 0.08, height: 0.06,
                color: '#2a2a3a',
                fill: true
            },
            {
                type: 'circle',
                x: 0.41, y: 0.49,
                radius: 0.028,
                color: '#0a0a1a',
                fill: false,
                stroke: true,
                strokeWidth: 2
            },
            {
                type: 'circle',
                x: 0.41, y: 0.49,
                radius: 0.018,
                color: '#88ccff',
                fill: true
            },

            // Maintenance hatch + fasteners
            {
                type: 'rect',
                x: 0.49, y: 0.56,
                width: 0.05, height: 0.05,
                color: '#3a3a4a',
                fill: true
            },
            {
                type: 'circle',
                x: 0.50, y: 0.565,
                radius: 0.008,
                color: '#2a2a3a',
                fill: true
            },
            {
                type: 'circle',
                x: 0.53, y: 0.605,
                radius: 0.008,
                color: '#2a2a3a',
                fill: true
            },

            // Status LEDs
            {
                type: 'circle',
                x: 0.34, y: 0.865,
                radius: 0.015,
                color: '#88ccff',
                fill: true
            },
            {
                type: 'circle',
                x: 0.66, y: 0.865,
                radius: 0.015,
                color: '#88ccff',
                fill: true
            }
        ]
    },

    animations: {
        idle: { fps: 2, frames: 2 },
        firing: { fps: 12, frames: 4 },
        recoil: { fps: 15, frames: 3 }
    },

    colors: {
        primary: '#88ccff',
        secondary: '#3a5a4a',
        accent: '#88ccff'
    }
};

export { BasicTowerSprite };

/**
 * LASER Tower Sprite - Focused energy beam weapon
 */

const LaserTowerSprite = {
    base: {
        parts: [
            // Ground shadow
            {
                type: 'ellipse',
                x: 0.5, y: 0.87,
                width: 0.54, height: 0.14,
                color: 'rgba(255, 255, 0, 0.2)',
                fill: true
            },

            // Base platform (tech design)
            {
                type: 'polygon',
                points: [
                    { x: 0.31, y: 0.73 },
                    { x: 0.69, y: 0.73 },
                    { x: 0.75, y: 0.82 },
                    { x: 0.25, y: 0.82 }
                ],
                color: '#ffff00',
                fill: true,
                stroke: true,
                strokeWidth: 2
            },

            // Energy conduit stripe
            {
                type: 'rect',
                x: 0.33, y: 0.75,
                width: 0.34, height: 0.03,
                color: '#ffaa00',
                fill: true
            },

            // Base mounting points
            {
                type: 'circle',
                x: 0.34, y: 0.79,
                radius: 0.012,
                color: '#ccaa00',
                fill: true
            },
            {
                type: 'circle',
                x: 0.66, y: 0.79,
                radius: 0.012,
                color: '#ccaa00',
                fill: true
            },

            // Power core housing
            {
                type: 'rect',
                x: 0.40, y: 0.58,
                width: 0.20, height: 0.18,
                color: '#ffdd00',
                fill: true,
                stroke: true,
                strokeWidth: 2
            },
            {
                type: 'rect',
                x: 0.42, y: 0.60,
                width: 0.16, height: 0.14,
                color: '#ffff00',
                fill: true
            },

            // Central power core
            {
                type: 'circle',
                x: 0.50, y: 0.67,
                radius: 0.07,
                color: '#ffffff',
                fill: true,
                stroke: true,
                strokeWidth: 1.5
            },
            {
                type: 'circle',
                x: 0.50, y: 0.67,
                radius: 0.05,
                color: '#ffff00',
                fill: true
            },
            {
                type: 'circle',
                x: 0.50, y: 0.67,
                radius: 0.03,
                color: '#ffffff',
                fill: true
            },

            // Energy flow indicators
            {
                type: 'line',
                x1: 0.44, y1: 0.67,
                x2: 0.56, y2: 0.67,
                color: '#ffaa00',
                strokeWidth: 2
            },
            {
                type: 'line',
                x1: 0.50, y1: 0.61,
                x2: 0.50, y2: 0.73,
                color: '#ffaa00',
                strokeWidth: 2
            },

            // Crystal housing chamber
            {
                type: 'rect',
                x: 0.58, y: 0.61,
                width: 0.16, height: 0.12,
                color: '#ddbb00',
                fill: true,
                stroke: true,
                strokeWidth: 1.5
            },
            {
                type: 'rect',
                x: 0.59, y: 0.625,
                width: 0.14, height: 0.08,
                color: '#ffdd00',
                fill: true
            },

            // Focusing crystal
            {
                type: 'polygon',
                points: [
                    { x: 0.70, y: 0.67 },
                    { x: 0.80, y: 0.64 },
                    { x: 0.80, y: 0.70 }
                ],
                color: '#ffffff',
                fill: true,
                stroke: true,
                strokeWidth: 1
            },
            {
                type: 'polygon',
                points: [
                    { x: 0.72, y: 0.67 },
                    { x: 0.78, y: 0.655 },
                    { x: 0.78, y: 0.685 }
                ],
                color: '#ffff00',
                fill: true
            },

            // Crystal energy core
            {
                type: 'circle',
                x: 0.75, y: 0.67,
                radius: 0.015,
                color: '#ffffff',
                fill: true
            },

            // Primary lens assembly
            {
                type: 'circle',
                x: 0.83, y: 0.67,
                radius: 0.045,
                color: '#aaffff',
                fill: true,
                stroke: true,
                strokeWidth: 1.5
            },
            {
                type: 'circle',
                x: 0.83, y: 0.67,
                radius: 0.032,
                color: '#ccffff',
                fill: true
            },
            {
                type: 'circle',
                x: 0.83, y: 0.67,
                radius: 0.020,
                color: '#ffffff',
                fill: true
            },

            // Beam aperture
            {
                type: 'circle',
                x: 0.88, y: 0.67,
                radius: 0.025,
                color: '#ffff00',
                fill: true,
                stroke: true,
                strokeWidth: 1
            },
            {
                type: 'circle',
                x: 0.88, y: 0.67,
                radius: 0.015,
                color: '#ffffff',
                fill: true
            },

            // Cooling vents
            {
                type: 'rect',
                x: 0.405, y: 0.60,
                width: 0.015, height: 0.04,
                color: '#ffaa00',
                fill: true
            },
            {
                type: 'rect',
                x: 0.425, y: 0.60,
                width: 0.015, height: 0.04,
                color: '#ffaa00',
                fill: true
            },
            {
                type: 'rect',
                x: 0.445, y: 0.60,
                width: 0.015, height: 0.04,
                color: '#ffaa00',
                fill: true
            },
            {
                type: 'rect',
                x: 0.555, y: 0.60,
                width: 0.015, height: 0.04,
                color: '#ffaa00',
                fill: true
            },
            {
                type: 'rect',
                x: 0.575, y: 0.60,
                width: 0.015, height: 0.04,
                color: '#ffaa00',
                fill: true
            },
            {
                type: 'rect',
                x: 0.595, y: 0.60,
                width: 0.015, height: 0.04,
                color: '#ffaa00',
                fill: true
            },

            // Calibration panel
            {
                type: 'rect',
                x: 0.45, y: 0.70,
                width: 0.10, height: 0.04,
                color: '#333333',
                fill: true,
                stroke: true,
                strokeWidth: 1
            },

            // Power level indicators
            {
                type: 'rect',
                x: 0.46, y: 0.71,
                width: 0.015, height: 0.02,
                color: '#00ff00',
                fill: true
            },
            {
                type: 'rect',
                x: 0.48, y: 0.71,
                width: 0.015, height: 0.02,
                color: '#00ff00',
                fill: true
            },
            {
                type: 'rect',
                x: 0.50, y: 0.71,
                width: 0.015, height: 0.02,
                color: '#ffff00',
                fill: true
            },
            {
                type: 'rect',
                x: 0.52, y: 0.71,
                width: 0.015, height: 0.02,
                color: '#ffaa00',
                fill: true
            },
            {
                type: 'rect',
                x: 0.54, y: 0.71,
                width: 0.015, height: 0.02,
                color: '#ff0000',
                fill: true
            },

            // Targeting alignment markers
            {
                type: 'line',
                x1: 0.60, y1: 0.655,
                x2: 0.64, y2: 0.655,
                color: '#ff0000',
                strokeWidth: 1
            },
            {
                type: 'line',
                x1: 0.60, y1: 0.685,
                x2: 0.64, y2: 0.685,
                color: '#ff0000',
                strokeWidth: 1
            }
        ]
    },

    animations: {
        idle: { fps: 3, frames: 3 },
        charging: { fps: 10, frames: 5 },
        firing: { fps: 15, frames: 6 }
    },

    colors: {
        primary: '#ffff00',
        secondary: '#ddbb00',
        accent: '#ffffff'
    }
};

// Export to global scope for browser
if (typeof window !== 'undefined') {
    window.LaserTowerSprite = LaserTowerSprite;
}

/**
 * ELECTRIC Tower Sprite - Tesla coil chain lightning system
 */

const ElectricTowerSprite = {
    base: {
        parts: [
            // Ground shadow
            {
                type: 'ellipse',
                x: 0.5, y: 0.87,
                width: 0.56, height: 0.14,
                color: 'rgba(170, 136, 255, 0.3)',
                fill: true
            },

            // Base platform (high voltage design)
            {
                type: 'polygon',
                points: [
                    { x: 0.30, y: 0.72 },
                    { x: 0.70, y: 0.72 },
                    { x: 0.76, y: 0.82 },
                    { x: 0.24, y: 0.82 }
                ],
                color: '#6644cc',
                fill: true,
                stroke: true,
                strokeWidth: 2
            },

            // Warning stripe
            {
                type: 'rect',
                x: 0.32, y: 0.745,
                width: 0.36, height: 0.03,
                color: '#aa88ff',
                fill: true
            },

            // High voltage warning symbols
            {
                type: 'polygon',
                points: [
                    { x: 0.36, y: 0.78 },
                    { x: 0.39, y: 0.80 },
                    { x: 0.37, y: 0.80 },
                    { x: 0.40, y: 0.82 },
                    { x: 0.36, y: 0.82 }
                ],
                color: '#ffff00',
                fill: true
            },
            {
                type: 'polygon',
                points: [
                    { x: 0.64, y: 0.78 },
                    { x: 0.67, y: 0.80 },
                    { x: 0.65, y: 0.80 },
                    { x: 0.68, y: 0.82 },
                    { x: 0.64, y: 0.82 }
                ],
                color: '#ffff00',
                fill: true
            },

            // Central core housing
            {
                type: 'rect',
                x: 0.42, y: 0.59,
                width: 0.16, height: 0.20,
                color: '#4422aa',
                fill: true,
                stroke: true,
                strokeWidth: 2
            },
            {
                type: 'rect',
                x: 0.44, y: 0.61,
                width: 0.12, height: 0.16,
                color: '#5533bb',
                fill: true
            },

            // Energy capacitor
            {
                type: 'circle',
                x: 0.50, y: 0.69,
                radius: 0.06,
                color: '#aa88ff',
                fill: true,
                stroke: true,
                strokeWidth: 1.5
            },
            {
                type: 'circle',
                x: 0.50, y: 0.69,
                radius: 0.04,
                color: '#cc99ff',
                fill: true
            },

            // Power arc indicators
            {
                type: 'line',
                x1: 0.44, y1: 0.69,
                x2: 0.56, y2: 0.69,
                color: '#ffffff',
                strokeWidth: 1.5
            },
            {
                type: 'line',
                x1: 0.50, y1: 0.63,
                x2: 0.50, y2: 0.75,
                color: '#ffffff',
                strokeWidth: 1.5
            },

            // Left Tesla coil
            {
                type: 'rect',
                x: 0.29, y: 0.54,
                width: 0.07, height: 0.26,
                color: '#3311aa',
                fill: true,
                stroke: true,
                strokeWidth: 1.5
            },
            {
                type: 'rect',
                x: 0.305, y: 0.56,
                width: 0.04, height: 0.22,
                color: '#4422bb',
                fill: true
            },

            // Left coil top electrode
            {
                type: 'circle',
                x: 0.325, y: 0.52,
                radius: 0.04,
                color: '#8866dd',
                fill: true,
                stroke: true,
                strokeWidth: 1.5
            },
            {
                type: 'circle',
                x: 0.325, y: 0.52,
                radius: 0.025,
                color: '#aa88ff',
                fill: true
            },

            // Left coil bottom electrode
            {
                type: 'circle',
                x: 0.325, y: 0.78,
                radius: 0.04,
                color: '#8866dd',
                fill: true,
                stroke: true,
                strokeWidth: 1.5
            },

            // Right Tesla coil
            {
                type: 'rect',
                x: 0.70, y: 0.54,
                width: 0.07, height: 0.26,
                color: '#3311aa',
                fill: true,
                stroke: true,
                strokeWidth: 1.5
            },
            {
                type: 'rect',
                x: 0.715, y: 0.56,
                width: 0.04, height: 0.22,
                color: '#4422bb',
                fill: true
            },

            // Right coil top electrode
            {
                type: 'circle',
                x: 0.735, y: 0.52,
                radius: 0.04,
                color: '#8866dd',
                fill: true,
                stroke: true,
                strokeWidth: 1.5
            },
            {
                type: 'circle',
                x: 0.735, y: 0.52,
                radius: 0.025,
                color: '#aa88ff',
                fill: true
            },

            // Right coil bottom electrode
            {
                type: 'circle',
                x: 0.735, y: 0.78,
                radius: 0.04,
                color: '#8866dd',
                fill: true,
                stroke: true,
                strokeWidth: 1.5
            },

            // Top discharge sphere
            {
                type: 'circle',
                x: 0.50, y: 0.48,
                radius: 0.065,
                color: '#aa88ff',
                fill: true,
                stroke: true,
                strokeWidth: 2
            },
            {
                type: 'circle',
                x: 0.50, y: 0.48,
                radius: 0.045,
                color: '#cc99ff',
                fill: true
            },
            {
                type: 'circle',
                x: 0.50, y: 0.48,
                radius: 0.025,
                color: '#ffffff',
                fill: true
            },

            // Connecting rod to sphere
            {
                type: 'rect',
                x: 0.485, y: 0.54,
                width: 0.03, height: 0.06,
                color: '#5533bb',
                fill: true
            },

            // Coil winding details
            {
                type: 'rect',
                x: 0.29, y: 0.60,
                width: 0.07, height: 0.015,
                color: '#5533cc',
                fill: true
            },
            {
                type: 'rect',
                x: 0.29, y: 0.64,
                width: 0.07, height: 0.015,
                color: '#5533cc',
                fill: true
            },
            {
                type: 'rect',
                x: 0.29, y: 0.68,
                width: 0.07, height: 0.015,
                color: '#5533cc',
                fill: true
            },
            {
                type: 'rect',
                x: 0.29, y: 0.72,
                width: 0.07, height: 0.015,
                color: '#5533cc',
                fill: true
            },
            {
                type: 'rect',
                x: 0.70, y: 0.60,
                width: 0.07, height: 0.015,
                color: '#5533cc',
                fill: true
            },
            {
                type: 'rect',
                x: 0.70, y: 0.64,
                width: 0.07, height: 0.015,
                color: '#5533cc',
                fill: true
            },
            {
                type: 'rect',
                x: 0.70, y: 0.68,
                width: 0.07, height: 0.015,
                color: '#5533cc',
                fill: true
            },
            {
                type: 'rect',
                x: 0.70, y: 0.72,
                width: 0.07, height: 0.015,
                color: '#5533cc',
                fill: true
            },

            // Power conduits
            {
                type: 'rect',
                x: 0.36, y: 0.66,
                width: 0.06, height: 0.02,
                color: '#5533bb',
                fill: true
            },
            {
                type: 'rect',
                x: 0.64, y: 0.66,
                width: 0.06, height: 0.02,
                color: '#5533bb',
                fill: true
            },

            // Voltage meters
            {
                type: 'circle',
                x: 0.44, y: 0.62,
                radius: 0.015,
                color: '#00ff00',
                fill: true
            },
            {
                type: 'circle',
                x: 0.56, y: 0.62,
                radius: 0.015,
                color: '#00ff00',
                fill: true
            },

            // Charge level indicators
            {
                type: 'rect',
                x: 0.455, y: 0.74,
                width: 0.01, height: 0.02,
                color: '#00ff00',
                fill: true
            },
            {
                type: 'rect',
                x: 0.47, y: 0.74,
                width: 0.01, height: 0.02,
                color: '#ffff00',
                fill: true
            },
            {
                type: 'rect',
                x: 0.485, y: 0.74,
                width: 0.01, height: 0.02,
                color: '#ff9900',
                fill: true
            },
            {
                type: 'rect',
                x: 0.50, y: 0.74,
                width: 0.01, height: 0.02,
                color: '#ff0000',
                fill: true
            },
            {
                type: 'rect',
                x: 0.515, y: 0.74,
                width: 0.01, height: 0.02,
                color: '#ff00ff',
                fill: true
            },
            {
                type: 'rect',
                x: 0.53, y: 0.74,
                width: 0.01, height: 0.02,
                color: '#aa00ff',
                fill: true
            },
            {
                type: 'rect',
                x: 0.545, y: 0.74,
                width: 0.01, height: 0.02,
                color: '#8800ff',
                fill: true
            }
        ]
    },

    animations: {
        idle: { fps: 4, frames: 3 },
        charging: { fps: 12, frames: 5 },
        discharging: { fps: 20, frames: 8 }
    },

    colors: {
        primary: '#6644cc',
        secondary: '#aa88ff',
        accent: '#ffffff'
    }
};

// Export to global scope for browser
if (typeof window !== 'undefined') {
    window.ElectricTowerSprite = ElectricTowerSprite;
}

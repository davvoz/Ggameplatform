/**
 * FREEZE Tower Sprite - Cryo emitter slowing system
 */

const FreezeTowerSprite = {
    base: {
        parts: [
            // Ground shadow
            {
                type: 'ellipse',
                x: 0.5, y: 0.87,
                width: 0.52, height: 0.14,
                color: 'rgba(180, 220, 255, 0.3)',
                fill: true
            },

            // Base platform (icy theme)
            {
                type: 'polygon',
                points: [
                    { x: 0.32, y: 0.72 },
                    { x: 0.68, y: 0.72 },
                    { x: 0.74, y: 0.82 },
                    { x: 0.26, y: 0.82 }
                ],
                color: '#00ddff',
                fill: true,
                stroke: true,
                strokeWidth: 2
            },

            // Ice crystal decorations on base
            {
                type: 'polygon',
                points: [
                    { x: 0.35, y: 0.79 },
                    { x: 0.38, y: 0.76 },
                    { x: 0.41, y: 0.79 }
                ],
                color: '#aaffff',
                fill: true
            },
            {
                type: 'polygon',
                points: [
                    { x: 0.59, y: 0.79 },
                    { x: 0.62, y: 0.76 },
                    { x: 0.65, y: 0.79 }
                ],
                color: '#aaffff',
                fill: true
            },

            // Cryo fluid indicators
            {
                type: 'circle',
                x: 0.33, y: 0.76,
                radius: 0.020,
                color: '#ffffff',
                fill: true,
                stroke: true,
                strokeWidth: 1
            },
            {
                type: 'circle',
                x: 0.67, y: 0.76,
                radius: 0.020,
                color: '#ffffff',
                fill: true,
                stroke: true,
                strokeWidth: 1
            },

            // Central core unit (spherical reactor)
            {
                type: 'circle',
                x: 0.5, y: 0.62,
                radius: 0.13,
                color: '#66ddff',
                fill: true,
                stroke: true,
                strokeWidth: 2
            },
            {
                type: 'circle',
                x: 0.5, y: 0.62,
                radius: 0.09,
                color: '#aaffff',
                fill: true
            },
            {
                type: 'circle',
                x: 0.5, y: 0.62,
                radius: 0.06,
                color: '#ffffff',
                fill: true
            },

            // Core energy lines
            {
                type: 'line',
                x1: 0.44, y1: 0.62,
                x2: 0.56, y2: 0.62,
                color: '#00ffff',
                strokeWidth: 2
            },
            {
                type: 'line',
                x1: 0.50, y1: 0.56,
                x2: 0.50, y2: 0.68,
                color: '#00ffff',
                strokeWidth: 2
            },

            // Top emitter array
            {
                type: 'rect',
                x: 0.46, y: 0.42,
                width: 0.08, height: 0.14,
                color: '#44ccff',
                fill: true,
                stroke: true,
                strokeWidth: 1.5
            },
            {
                type: 'polygon',
                points: [
                    { x: 0.45, y: 0.42 },
                    { x: 0.55, y: 0.42 },
                    { x: 0.52, y: 0.38 },
                    { x: 0.48, y: 0.38 }
                ],
                color: '#66ccff',
                fill: true
            },

            // Top emitter nozzle
            {
                type: 'polygon',
                points: [
                    { x: 0.48, y: 0.38 },
                    { x: 0.52, y: 0.38 },
                    { x: 0.50, y: 0.34 }
                ],
                color: '#aaffff',
                fill: true,
                stroke: true,
                strokeWidth: 1
            },

            // Left side emitter
            {
                type: 'rect',
                x: 0.32, y: 0.58,
                width: 0.10, height: 0.09,
                color: '#44bbee',
                fill: true,
                stroke: true,
                strokeWidth: 1.5
            },
            {
                type: 'polygon',
                points: [
                    { x: 0.32, y: 0.59 },
                    { x: 0.32, y: 0.66 },
                    { x: 0.28, y: 0.625 }
                ],
                color: '#66aadd',
                fill: true,
                stroke: true,
                strokeWidth: 1
            },

            // Right side emitter
            {
                type: 'rect',
                x: 0.64, y: 0.58,
                width: 0.10, height: 0.09,
                color: '#44bbee',
                fill: true,
                stroke: true,
                strokeWidth: 1.5
            },
            {
                type: 'polygon',
                points: [
                    { x: 0.74, y: 0.59 },
                    { x: 0.74, y: 0.66 },
                    { x: 0.78, y: 0.625 }
                ],
                color: '#66aadd',
                fill: true,
                stroke: true,
                strokeWidth: 1
            },

            // Coolant pipes
            {
                type: 'rect',
                x: 0.43, y: 0.68,
                width: 0.02, height: 0.08,
                color: '#0099cc',
                fill: true
            },
            {
                type: 'rect',
                x: 0.57, y: 0.68,
                width: 0.02, height: 0.08,
                color: '#0099cc',
                fill: true
            },

            // Emitter vent details
            {
                type: 'rect',
                x: 0.475, y: 0.44,
                width: 0.02, height: 0.10,
                color: '#aaffff',
                fill: true
            },
            {
                type: 'rect',
                x: 0.51, y: 0.44,
                width: 0.02, height: 0.10,
                color: '#aaffff',
                fill: true
            },

            // Status indicators (cryo levels)
            {
                type: 'circle',
                x: 0.36, y: 0.60,
                radius: 0.010,
                color: '#00ffff',
                fill: true
            },
            {
                type: 'circle',
                x: 0.36, y: 0.63,
                radius: 0.010,
                color: '#00ffff',
                fill: true
            },
            {
                type: 'circle',
                x: 0.70, y: 0.60,
                radius: 0.010,
                color: '#00ffff',
                fill: true
            },
            {
                type: 'circle',
                x: 0.70, y: 0.63,
                radius: 0.010,
                color: '#00ffff',
                fill: true
            },

            // Frost effect particles (decorative)
            {
                type: 'circle',
                x: 0.42, y: 0.52,
                radius: 0.008,
                color: '#ffffff',
                fill: true
            },
            {
                type: 'circle',
                x: 0.58, y: 0.52,
                radius: 0.008,
                color: '#ffffff',
                fill: true
            },
            {
                type: 'circle',
                x: 0.50, y: 0.48,
                radius: 0.008,
                color: '#ffffff',
                fill: true
            }
        ]
    },

    animations: {
        idle: { fps: 3, frames: 3 },
        charging: { fps: 6, frames: 4 },
        emitting: { fps: 12, frames: 6 }
    },

    colors: {
        primary: '#00ddff',
        secondary: '#66ddff',
        accent: '#ffffff'
    }
};

// Export to global scope for browser
if (typeof window !== 'undefined') {
    window.FreezeTowerSprite = FreezeTowerSprite;
}

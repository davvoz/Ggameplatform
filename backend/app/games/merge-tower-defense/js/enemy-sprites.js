/**
 * Enemy Sprite Library
 * Professional vector-based enemy designs
 * Each enemy has unique silhouette, proportions, and visual identity
 */

// ============================================================================
// ENEMY SPRITE DEFINITIONS
// ============================================================================

export const EnemySpriteLibrary = {

    // ========== GRUNT - Basic frontline infantry ==========
    GRUNT: {
        base: {
            parts: [
                // Body - squat, compact silhouette
                {
                    type: 'ellipse',
                    x: 0.5, y: 0.6,
                    width: 0.5, height: 0.65,
                    color: '#3a5a4a',
                    fill: true
                },
                // Head - rounded, low profile
                {
                    type: 'circle',
                    x: 0.5, y: 0.32,
                    radius: 0.18,
                    color: '#2d4a3a',
                    fill: true
                },
                // Shoulders - broad and heavy
                {
                    type: 'rect',
                    x: 0.22, y: 0.42,
                    width: 0.56, height: 0.15,
                    color: '#4a6a5a',
                    fill: true
                },
                // Eyes - menacing glow
                {
                    type: 'circle',
                    x: 0.42, y: 0.3,
                    radius: 0.04,
                    color: '#ff3333',
                    fill: true
                },
                {
                    type: 'circle',
                    x: 0.58, y: 0.3,
                    radius: 0.04,
                    color: '#ff3333',
                    fill: true
                },
                // Legs - stubby and stable
                {
                    type: 'rect',
                    x: 0.32, y: 0.8,
                    width: 0.12, height: 0.2,
                    color: '#2d4a3a',
                    fill: true
                },
                {
                    type: 'rect',
                    x: 0.56, y: 0.8,
                    width: 0.12, height: 0.2,
                    color: '#2d4a3a',
                    fill: true
                },
                // Armor plating detail
                {
                    type: 'rect',
                    x: 0.38, y: 0.55,
                    width: 0.24, height: 0.08,
                    color: '#5a7a6a',
                    fill: true
                }
            ]
        },
        
        animations: {
            idle: { fps: 2, frames: 2 },
            move: { fps: 6, frames: 4 },
            hit: { fps: 12, frames: 3 },
            death: { fps: 8, frames: 6 }
        },

        colors: {
            primary: '#3a5a4a',
            secondary: '#2d4a3a',
            accent: '#ff3333'
        }
    },

    // ========== RUSHER - Fast, aggressive attacker ==========
    RUSHER: {
        base: {
            parts: [
                // Body - lean and aerodynamic
                {
                    type: 'ellipse',
                    x: 0.5, y: 0.58,
                    width: 0.35, height: 0.55,
                    color: '#8a3a3a',
                    fill: true
                },
                // Head - forward-tilted, aggressive
                {
                    type: 'ellipse',
                    x: 0.52, y: 0.28,
                    width: 0.22, height: 0.26,
                    color: '#6a2a2a',
                    fill: true
                },
                // Spikes/horns - aggressive silhouette
                {
                    type: 'polygon',
                    points: [
                        { x: 0.45, y: 0.18 },
                        { x: 0.4, y: 0.1 },
                        { x: 0.48, y: 0.2 }
                    ],
                    color: '#aa4a4a',
                    fill: true
                },
                {
                    type: 'polygon',
                    points: [
                        { x: 0.55, y: 0.18 },
                        { x: 0.6, y: 0.1 },
                        { x: 0.52, y: 0.2 }
                    ],
                    color: '#aa4a4a',
                    fill: true
                },
                // Eyes - wild and glowing
                {
                    type: 'circle',
                    x: 0.44, y: 0.26,
                    radius: 0.05,
                    color: '#ffaa00',
                    fill: true
                },
                {
                    type: 'circle',
                    x: 0.6, y: 0.26,
                    radius: 0.05,
                    color: '#ffaa00',
                    fill: true
                },
                // Legs - long, ready to sprint
                {
                    type: 'rect',
                    x: 0.35, y: 0.75,
                    width: 0.1, height: 0.28,
                    color: '#6a2a2a',
                    fill: true
                },
                {
                    type: 'rect',
                    x: 0.55, y: 0.75,
                    width: 0.1, height: 0.28,
                    color: '#6a2a2a',
                    fill: true
                },
                // Speed stripes - visual indicator
                {
                    type: 'path',
                    points: [
                        { x: 0.3, y: 0.5 },
                        { x: 0.2, y: 0.52 }
                    ],
                    color: '#ff6666',
                    stroke: true,
                    strokeWidth: 2
                },
                {
                    type: 'path',
                    points: [
                        { x: 0.3, y: 0.6 },
                        { x: 0.22, y: 0.62 }
                    ],
                    color: '#ff6666',
                    stroke: true,
                    strokeWidth: 2
                }
            ]
        },

        animations: {
            idle: { fps: 4, frames: 2 },
            move: { fps: 12, frames: 6 },
            hit: { fps: 16, frames: 2 },
            death: { fps: 10, frames: 5 }
        },

        colors: {
            primary: '#8a3a3a',
            secondary: '#6a2a2a',
            accent: '#ffaa00'
        }
    },

    // ========== TANK - Heavy armored unit ==========
    TANK: {
        base: {
            parts: [
                // Main body - massive and imposing
                {
                    type: 'rect',
                    x: 0.25, y: 0.45,
                    width: 0.5, height: 0.5,
                    color: '#4a4a6a',
                    fill: true
                },
                // Head - integrated into body
                {
                    type: 'rect',
                    x: 0.32, y: 0.25,
                    width: 0.36, height: 0.3,
                    color: '#3a3a5a',
                    fill: true
                },
                // Heavy armor plates - layered defense
                {
                    type: 'rect',
                    x: 0.28, y: 0.48,
                    width: 0.44, height: 0.12,
                    color: '#6a6a8a',
                    fill: true
                },
                {
                    type: 'rect',
                    x: 0.28, y: 0.65,
                    width: 0.44, height: 0.12,
                    color: '#6a6a8a',
                    fill: true
                },
                // Shield emblem
                {
                    type: 'polygon',
                    points: [
                        { x: 0.5, y: 0.52 },
                        { x: 0.45, y: 0.58 },
                        { x: 0.45, y: 0.64 },
                        { x: 0.5, y: 0.68 },
                        { x: 0.55, y: 0.64 },
                        { x: 0.55, y: 0.58 }
                    ],
                    color: '#8a8aaa',
                    fill: true
                },
                // Visor - single menacing eye slit
                {
                    type: 'rect',
                    x: 0.36, y: 0.34,
                    width: 0.28, height: 0.06,
                    color: '#ff4444',
                    fill: true
                },
                // Legs - thick, planted stance
                {
                    type: 'rect',
                    x: 0.3, y: 0.85,
                    width: 0.16, height: 0.18,
                    color: '#3a3a5a',
                    fill: true
                },
                {
                    type: 'rect',
                    x: 0.54, y: 0.85,
                    width: 0.16, height: 0.18,
                    color: '#3a3a5a',
                    fill: true
                },
                // Shoulder pauldrons
                {
                    type: 'circle',
                    x: 0.22, y: 0.48,
                    radius: 0.08,
                    color: '#5a5a7a',
                    fill: true
                },
                {
                    type: 'circle',
                    x: 0.78, y: 0.48,
                    radius: 0.08,
                    color: '#5a5a7a',
                    fill: true
                }
            ]
        },

        animations: {
            idle: { fps: 1, frames: 2 },
            move: { fps: 3, frames: 3 },
            hit: { fps: 8, frames: 2 },
            death: { fps: 6, frames: 8 }
        },

        colors: {
            primary: '#4a4a6a',
            secondary: '#3a3a5a',
            accent: '#ff4444'
        }
    },

    // ========== FLYER - Aerial fast-moving unit ==========
    FLYER: {
        base: {
            parts: [
                // Core body - small and agile
                {
                    type: 'ellipse',
                    x: 0.5, y: 0.5,
                    width: 0.25, height: 0.35,
                    color: '#4a3a5a',
                    fill: true
                },
                // Head - streamlined
                {
                    type: 'circle',
                    x: 0.5, y: 0.32,
                    radius: 0.12,
                    color: '#3a2a4a',
                    fill: true
                },
                // Wings - distinctive flight silhouette
                {
                    type: 'polygon',
                    points: [
                        { x: 0.35, y: 0.45 },
                        { x: 0.15, y: 0.35 },
                        { x: 0.2, y: 0.55 },
                        { x: 0.38, y: 0.55 }
                    ],
                    color: '#6a4a7a',
                    fill: true,
                    stroke: true,
                    strokeWidth: 1
                },
                {
                    type: 'polygon',
                    points: [
                        { x: 0.65, y: 0.45 },
                        { x: 0.85, y: 0.35 },
                        { x: 0.8, y: 0.55 },
                        { x: 0.62, y: 0.55 }
                    ],
                    color: '#6a4a7a',
                    fill: true,
                    stroke: true,
                    strokeWidth: 1
                },
                // Wing membranes - semi-transparent effect
                {
                    type: 'polygon',
                    points: [
                        { x: 0.25, y: 0.4 },
                        { x: 0.18, y: 0.38 },
                        { x: 0.22, y: 0.5 }
                    ],
                    color: 'rgba(138, 98, 158, 0.5)',
                    fill: true
                },
                {
                    type: 'polygon',
                    points: [
                        { x: 0.75, y: 0.4 },
                        { x: 0.82, y: 0.38 },
                        { x: 0.78, y: 0.5 }
                    ],
                    color: 'rgba(138, 98, 158, 0.5)',
                    fill: true
                },
                // Eyes - predator gaze
                {
                    type: 'circle',
                    x: 0.45, y: 0.3,
                    radius: 0.04,
                    color: '#ffff00',
                    fill: true
                },
                {
                    type: 'circle',
                    x: 0.55, y: 0.3,
                    radius: 0.04,
                    color: '#ffff00',
                    fill: true
                },
                // Tail - flight control
                {
                    type: 'polygon',
                    points: [
                        { x: 0.5, y: 0.65 },
                        { x: 0.45, y: 0.85 },
                        { x: 0.55, y: 0.85 }
                    ],
                    color: '#4a3a5a',
                    fill: true
                }
            ]
        },

        animations: {
            idle: { fps: 8, frames: 4 },
            move: { fps: 10, frames: 6 },
            hit: { fps: 14, frames: 3 },
            death: { fps: 12, frames: 7 }
        },

        colors: {
            primary: '#4a3a5a',
            secondary: '#3a2a4a',
            accent: '#ffff00'
        }
    },

    // ========== HEALER - Support unit with distinct appearance ==========
    HEALER: {
        base: {
            parts: [
                // Robe-like body - mystical appearance
                {
                    type: 'polygon',
                    points: [
                        { x: 0.5, y: 0.35 },
                        { x: 0.35, y: 0.45 },
                        { x: 0.3, y: 0.85 },
                        { x: 0.7, y: 0.85 },
                        { x: 0.65, y: 0.45 }
                    ],
                    color: '#2a5a4a',
                    fill: true
                },
                // Hood/head
                {
                    type: 'ellipse',
                    x: 0.5, y: 0.28,
                    width: 0.28, height: 0.32,
                    color: '#1a4a3a',
                    fill: true
                },
                // Staff/healing implement
                {
                    type: 'rect',
                    x: 0.72, y: 0.25,
                    width: 0.04, height: 0.55,
                    color: '#6a8a7a',
                    fill: true
                },
                // Staff crystal/orb
                {
                    type: 'circle',
                    x: 0.74, y: 0.2,
                    radius: 0.08,
                    color: '#00ff88',
                    fill: true
                },
                // Inner glow
                {
                    type: 'circle',
                    x: 0.74, y: 0.2,
                    radius: 0.05,
                    color: '#aaffcc',
                    fill: true
                },
                // Face area - mysterious
                {
                    type: 'ellipse',
                    x: 0.5, y: 0.3,
                    width: 0.18, height: 0.2,
                    color: '#0a2a1a',
                    fill: true
                },
                // Glowing eyes
                {
                    type: 'circle',
                    x: 0.45, y: 0.29,
                    radius: 0.03,
                    color: '#00ff88',
                    fill: true
                },
                {
                    type: 'circle',
                    x: 0.55, y: 0.29,
                    radius: 0.03,
                    color: '#00ff88',
                    fill: true
                },
                // Healing energy particles
                {
                    type: 'circle',
                    x: 0.35, y: 0.4,
                    radius: 0.025,
                    color: 'rgba(0, 255, 136, 0.6)',
                    fill: true
                },
                {
                    type: 'circle',
                    x: 0.4, y: 0.32,
                    radius: 0.02,
                    color: 'rgba(0, 255, 136, 0.4)',
                    fill: true
                },
                {
                    type: 'circle',
                    x: 0.6, y: 0.38,
                    radius: 0.03,
                    color: 'rgba(0, 255, 136, 0.5)',
                    fill: true
                }
            ]
        },

        animations: {
            idle: { fps: 4, frames: 4 },
            move: { fps: 5, frames: 4 },
            heal: { fps: 8, frames: 6 },
            hit: { fps: 10, frames: 3 },
            death: { fps: 8, frames: 6 }
        },

        colors: {
            primary: '#2a5a4a',
            secondary: '#1a4a3a',
            accent: '#00ff88'
        }
    },

    // ========== BOSS - Massive threatening presence ==========
    BOSS: {
        base: {
            parts: [
                // Massive body - intimidating scale
                {
                    type: 'rect',
                    x: 0.2, y: 0.4,
                    width: 0.6, height: 0.55,
                    color: '#6a2a2a',
                    fill: true
                },
                // Head - crown-like structure
                {
                    type: 'rect',
                    x: 0.28, y: 0.15,
                    width: 0.44, height: 0.35,
                    color: '#5a1a1a',
                    fill: true
                },
                // Crown spikes
                {
                    type: 'polygon',
                    points: [
                        { x: 0.35, y: 0.15 },
                        { x: 0.33, y: 0.05 },
                        { x: 0.37, y: 0.15 }
                    ],
                    color: '#8a3a3a',
                    fill: true
                },
                {
                    type: 'polygon',
                    points: [
                        { x: 0.48, y: 0.15 },
                        { x: 0.5, y: 0.02 },
                        { x: 0.52, y: 0.15 }
                    ],
                    color: '#aa4a4a',
                    fill: true
                },
                {
                    type: 'polygon',
                    points: [
                        { x: 0.63, y: 0.15 },
                        { x: 0.67, y: 0.05 },
                        { x: 0.65, y: 0.15 }
                    ],
                    color: '#8a3a3a',
                    fill: true
                },
                // Chest armor
                {
                    type: 'rect',
                    x: 0.3, y: 0.48,
                    width: 0.4, height: 0.15,
                    color: '#8a4a4a',
                    fill: true
                },
                // Power core
                {
                    type: 'circle',
                    x: 0.5, y: 0.55,
                    radius: 0.06,
                    color: '#ff0000',
                    fill: true
                },
                {
                    type: 'circle',
                    x: 0.5, y: 0.55,
                    radius: 0.04,
                    color: '#ffaa00',
                    fill: true
                },
                // Eyes - dual color menacing
                {
                    type: 'rect',
                    x: 0.35, y: 0.28,
                    width: 0.1, height: 0.08,
                    color: '#ff0000',
                    fill: true
                },
                {
                    type: 'rect',
                    x: 0.55, y: 0.28,
                    width: 0.1, height: 0.08,
                    color: '#ff0000',
                    fill: true
                },
                // Shoulder guards - massive
                {
                    type: 'polygon',
                    points: [
                        { x: 0.15, y: 0.42 },
                        { x: 0.1, y: 0.38 },
                        { x: 0.15, y: 0.55 },
                        { x: 0.22, y: 0.52 }
                    ],
                    color: '#7a3a3a',
                    fill: true
                },
                {
                    type: 'polygon',
                    points: [
                        { x: 0.85, y: 0.42 },
                        { x: 0.9, y: 0.38 },
                        { x: 0.85, y: 0.55 },
                        { x: 0.78, y: 0.52 }
                    ],
                    color: '#7a3a3a',
                    fill: true
                },
                // Legs - powerful stance
                {
                    type: 'rect',
                    x: 0.28, y: 0.85,
                    width: 0.18, height: 0.18,
                    color: '#5a1a1a',
                    fill: true
                },
                {
                    type: 'rect',
                    x: 0.54, y: 0.85,
                    width: 0.18, height: 0.18,
                    color: '#5a1a1a',
                    fill: true
                },
                // Battle scars
                {
                    type: 'path',
                    points: [
                        { x: 0.4, y: 0.22 },
                        { x: 0.55, y: 0.32 }
                    ],
                    color: '#aa5a5a',
                    stroke: true,
                    strokeWidth: 2
                }
            ]
        },

        animations: {
            idle: { fps: 3, frames: 3 },
            move: { fps: 4, frames: 4 },
            attack: { fps: 8, frames: 6 },
            hit: { fps: 10, frames: 2 },
            death: { fps: 6, frames: 10 }
        },

        colors: {
            primary: '#6a2a2a',
            secondary: '#5a1a1a',
            accent: '#ff0000'
        }
    },

    // ========== VAMPIRE - Elegant bloodlord with cape ==========
    VAMPIRE: {
        base: {
            parts: [
                // Cape back
                {
                    type: 'polygon',
                    points: [
                        { x: 0.3, y: 0.3 },
                        { x: 0.7, y: 0.3 },
                        { x: 0.8, y: 0.9 },
                        { x: 0.5, y: 0.85 },
                        { x: 0.2, y: 0.9 }
                    ],
                    color: '#2a0a0a',
                    fill: true
                },
                // Body - elegant suit
                {
                    type: 'ellipse',
                    x: 0.5, y: 0.55,
                    width: 0.35, height: 0.45,
                    color: '#2d0a0a',
                    fill: true
                },
                // Vest
                {
                    type: 'polygon',
                    points: [
                        { x: 0.42, y: 0.4 },
                        { x: 0.58, y: 0.4 },
                        { x: 0.62, y: 0.7 },
                        { x: 0.38, y: 0.7 }
                    ],
                    color: '#8B0000',
                    fill: true
                },
                // White collar
                {
                    type: 'polygon',
                    points: [
                        { x: 0.38, y: 0.35 },
                        { x: 0.5, y: 0.42 },
                        { x: 0.62, y: 0.35 }
                    ],
                    color: '#ffffff',
                    fill: true
                },
                // Hair
                {
                    type: 'ellipse',
                    x: 0.5, y: 0.2,
                    width: 0.22, height: 0.18,
                    color: '#0a0a0a',
                    fill: true
                },
                // Pale face
                {
                    type: 'circle',
                    x: 0.5, y: 0.28,
                    radius: 0.14,
                    color: '#e8d8d8',
                    fill: true
                },
                // Red glowing eyes
                {
                    type: 'ellipse',
                    x: 0.44, y: 0.26,
                    width: 0.05, height: 0.03,
                    color: '#ff0000',
                    fill: true
                },
                {
                    type: 'ellipse',
                    x: 0.56, y: 0.26,
                    width: 0.05, height: 0.03,
                    color: '#ff0000',
                    fill: true
                },
                // Fangs
                {
                    type: 'polygon',
                    points: [
                        { x: 0.46, y: 0.34 },
                        { x: 0.48, y: 0.40 },
                        { x: 0.50, y: 0.34 }
                    ],
                    color: '#ffffff',
                    fill: true
                },
                {
                    type: 'polygon',
                    points: [
                        { x: 0.50, y: 0.34 },
                        { x: 0.52, y: 0.40 },
                        { x: 0.54, y: 0.34 }
                    ],
                    color: '#ffffff',
                    fill: true
                },
                // Legs
                {
                    type: 'rect',
                    x: 0.38, y: 0.75,
                    width: 0.1, height: 0.2,
                    color: '#1a1a1a',
                    fill: true
                },
                {
                    type: 'rect',
                    x: 0.52, y: 0.75,
                    width: 0.1, height: 0.2,
                    color: '#1a1a1a',
                    fill: true
                }
            ]
        },
        colors: {
            primary: '#8B0000',
            secondary: '#2a0a0a',
            accent: '#ff0000'
        }
    },

    // ========== BOMBER - Round explosive enemy with fuse ==========
    BOMBER: {
        base: {
            parts: [
                // Main sphere body
                {
                    type: 'circle',
                    x: 0.5, y: 0.55,
                    radius: 0.28,
                    color: '#1a1a1a',
                    fill: true
                },
                // Metallic band
                {
                    type: 'rect',
                    x: 0.2, y: 0.52,
                    width: 0.6, height: 0.06,
                    color: '#555555',
                    fill: true
                },
                // Warning stripes
                {
                    type: 'rect',
                    x: 0.35, y: 0.63,
                    width: 0.1, height: 0.04,
                    color: '#ff4500',
                    fill: true
                },
                {
                    type: 'rect',
                    x: 0.55, y: 0.63,
                    width: 0.1, height: 0.04,
                    color: '#ffaa00',
                    fill: true
                },
                // Fuse top
                {
                    type: 'rect',
                    x: 0.46, y: 0.22,
                    width: 0.08, height: 0.1,
                    color: '#444444',
                    fill: true
                },
                // Angry eyes
                {
                    type: 'ellipse',
                    x: 0.4, y: 0.48,
                    width: 0.08, height: 0.05,
                    color: '#ff3300',
                    fill: true
                },
                {
                    type: 'ellipse',
                    x: 0.6, y: 0.48,
                    width: 0.08, height: 0.05,
                    color: '#ff3300',
                    fill: true
                },
                // Legs
                {
                    type: 'ellipse',
                    x: 0.38, y: 0.85,
                    width: 0.12, height: 0.2,
                    color: '#2a2a2a',
                    fill: true
                },
                {
                    type: 'ellipse',
                    x: 0.62, y: 0.85,
                    width: 0.12, height: 0.2,
                    color: '#2a2a2a',
                    fill: true
                }
            ]
        },
        colors: {
            primary: '#1a1a1a',
            secondary: '#ff4500',
            accent: '#ffff00'
        }
    },

    // ========== SHADOW - Ethereal dark creature ==========
    SHADOW: {
        base: {
            parts: [
                // Shadow trail
                {
                    type: 'ellipse',
                    x: 0.5, y: 0.9,
                    width: 0.5, height: 0.15,
                    color: 'rgba(20, 20, 40, 0.5)',
                    fill: true
                },
                // Wisp tendrils
                {
                    type: 'polygon',
                    points: [
                        { x: 0.3, y: 0.5 },
                        { x: 0.2, y: 0.7 },
                        { x: 0.15, y: 0.95 },
                        { x: 0.25, y: 0.85 },
                        { x: 0.35, y: 0.65 }
                    ],
                    color: '#1a1a2e',
                    fill: true
                },
                {
                    type: 'polygon',
                    points: [
                        { x: 0.7, y: 0.5 },
                        { x: 0.8, y: 0.7 },
                        { x: 0.85, y: 0.95 },
                        { x: 0.75, y: 0.85 },
                        { x: 0.65, y: 0.65 }
                    ],
                    color: '#1a1a2e',
                    fill: true
                },
                // Core body
                {
                    type: 'ellipse',
                    x: 0.5, y: 0.55,
                    width: 0.4, height: 0.55,
                    color: '#0a0a1a',
                    fill: true
                },
                // Inner glow
                {
                    type: 'ellipse',
                    x: 0.5, y: 0.55,
                    width: 0.25, height: 0.35,
                    color: '#2a2a4a',
                    fill: true
                },
                // Hood
                {
                    type: 'ellipse',
                    x: 0.5, y: 0.3,
                    width: 0.32, height: 0.35,
                    color: '#0a0a15',
                    fill: true
                },
                // Void face
                {
                    type: 'circle',
                    x: 0.5, y: 0.32,
                    radius: 0.1,
                    color: '#000000',
                    fill: true
                },
                // Glowing cyan eyes
                {
                    type: 'circle',
                    x: 0.45, y: 0.3,
                    radius: 0.03,
                    color: '#00ffff',
                    fill: true
                },
                {
                    type: 'circle',
                    x: 0.55, y: 0.3,
                    radius: 0.03,
                    color: '#00ffff',
                    fill: true
                }
            ]
        },
        colors: {
            primary: '#0a0a1a',
            secondary: '#1a1a2e',
            accent: '#00ffff'
        }
    },

    // ========== SIREN - Ghostly feminine screamer ==========
    SIREN: {
        base: {
            parts: [
                // Aura glow
                {
                    type: 'circle',
                    x: 0.5, y: 0.5,
                    radius: 0.4,
                    color: 'rgba(255, 0, 255, 0.15)',
                    fill: true
                },
                // Flowing dress
                {
                    type: 'polygon',
                    points: [
                        { x: 0.35, y: 0.5 },
                        { x: 0.65, y: 0.5 },
                        { x: 0.75, y: 0.95 },
                        { x: 0.6, y: 0.92 },
                        { x: 0.5, y: 0.98 },
                        { x: 0.4, y: 0.92 },
                        { x: 0.25, y: 0.95 }
                    ],
                    color: '#4a0040',
                    fill: true
                },
                // Body
                {
                    type: 'ellipse',
                    x: 0.5, y: 0.5,
                    width: 0.32, height: 0.42,
                    color: '#6a0050',
                    fill: true
                },
                // Chest ornament
                {
                    type: 'circle',
                    x: 0.5, y: 0.55,
                    radius: 0.05,
                    color: '#ff00ff',
                    fill: true
                },
                // Flowing hair
                {
                    type: 'polygon',
                    points: [
                        { x: 0.38, y: 0.18 },
                        { x: 0.62, y: 0.18 },
                        { x: 0.7, y: 0.5 },
                        { x: 0.65, y: 0.6 },
                        { x: 0.5, y: 0.55 },
                        { x: 0.35, y: 0.6 },
                        { x: 0.3, y: 0.5 }
                    ],
                    color: '#2a0020',
                    fill: true
                },
                // Pale face
                {
                    type: 'ellipse',
                    x: 0.5, y: 0.28,
                    width: 0.24, height: 0.28,
                    color: '#d8c8d8',
                    fill: true
                },
                // Closed eyes
                {
                    type: 'line',
                    x1: 0.42, y1: 0.26,
                    x2: 0.48, y2: 0.26,
                    color: '#4a0040',
                    stroke: true,
                    strokeWidth: 2
                },
                {
                    type: 'line',
                    x1: 0.52, y1: 0.26,
                    x2: 0.58, y2: 0.26,
                    color: '#4a0040',
                    stroke: true,
                    strokeWidth: 2
                },
                // Open mouth
                {
                    type: 'ellipse',
                    x: 0.5, y: 0.34,
                    width: 0.08, height: 0.05,
                    color: '#2a0020',
                    fill: true
                }
            ]
        },
        colors: {
            primary: '#6a0050',
            secondary: '#4a0040',
            accent: '#ff00ff'
        }
    },

    // ========== GOLEM - Massive stone creature ==========
    GOLEM: {
        base: {
            parts: [
                // Massive legs
                {
                    type: 'rect',
                    x: 0.28, y: 0.7,
                    width: 0.18, height: 0.3,
                    color: '#5a5040',
                    fill: true
                },
                {
                    type: 'rect',
                    x: 0.54, y: 0.7,
                    width: 0.18, height: 0.3,
                    color: '#5a5040',
                    fill: true
                },
                // Massive rocky torso
                {
                    type: 'polygon',
                    points: [
                        { x: 0.25, y: 0.3 },
                        { x: 0.75, y: 0.3 },
                        { x: 0.8, y: 0.55 },
                        { x: 0.7, y: 0.7 },
                        { x: 0.3, y: 0.7 },
                        { x: 0.2, y: 0.55 }
                    ],
                    color: '#6a6050',
                    fill: true
                },
                // Moss patches
                {
                    type: 'circle',
                    x: 0.35, y: 0.5,
                    radius: 0.06,
                    color: '#3a5a3a',
                    fill: true
                },
                {
                    type: 'circle',
                    x: 0.6, y: 0.55,
                    radius: 0.04,
                    color: '#4a6a4a',
                    fill: true
                },
                // Boulder arms
                {
                    type: 'ellipse',
                    x: 0.15, y: 0.5,
                    width: 0.15, height: 0.35,
                    color: '#5a5040',
                    fill: true
                },
                {
                    type: 'ellipse',
                    x: 0.85, y: 0.5,
                    width: 0.15, height: 0.35,
                    color: '#5a5040',
                    fill: true
                },
                // Fists
                {
                    type: 'circle',
                    x: 0.15, y: 0.68,
                    radius: 0.1,
                    color: '#4a4535',
                    fill: true
                },
                {
                    type: 'circle',
                    x: 0.85, y: 0.68,
                    radius: 0.1,
                    color: '#4a4535',
                    fill: true
                },
                // Stone head
                {
                    type: 'polygon',
                    points: [
                        { x: 0.35, y: 0.12 },
                        { x: 0.65, y: 0.12 },
                        { x: 0.68, y: 0.28 },
                        { x: 0.5, y: 0.35 },
                        { x: 0.32, y: 0.28 }
                    ],
                    color: '#7a7060',
                    fill: true
                },
                // Stone brow
                {
                    type: 'rect',
                    x: 0.36, y: 0.15,
                    width: 0.28, height: 0.04,
                    color: '#5a5545',
                    fill: true
                },
                // Glowing eyes
                {
                    type: 'circle',
                    x: 0.43, y: 0.22,
                    radius: 0.03,
                    color: '#ffaa00',
                    fill: true
                },
                {
                    type: 'circle',
                    x: 0.57, y: 0.22,
                    radius: 0.03,
                    color: '#ffaa00',
                    fill: true
                },
                // Crystal power source
                {
                    type: 'polygon',
                    points: [
                        { x: 0.5, y: 0.4 },
                        { x: 0.56, y: 0.5 },
                        { x: 0.5, y: 0.6 },
                        { x: 0.44, y: 0.5 }
                    ],
                    color: '#00ff88',
                    fill: true
                }
            ]
        },
        colors: {
            primary: '#6a6050',
            secondary: '#5a5040',
            accent: '#00ff88'
        }
    }
};

// Export to global scope
window.EnemySpriteLibrary = EnemySpriteLibrary;

/**
 * RenderingConfig - Centralizes all rendering constants and configurations
 * Eliminates magic numbers and provides single source of truth
 */
export const RenderingConfig = {
    // Colors
    COLORS: {
        PLAYER_DEFAULT: [0.0, 0.85, 1.0, 1.0],         // Cyan brillante SBAM
        PLAYER_TURBO: [1.0, 0.85, 0.0, 1.0],           // Giallo oro intenso
        PLAYER_IMMORTALITY: [1.0, 0.75, 0.0, 1.0],     // Arancione dorato
        PLAYER_FLIGHT: [0.3, 0.95, 1.0, 1.0],          // Azzurro brillante
        PLAYER_SUPER_JUMP: [1.0, 0.2, 0.8, 1.0],       // Magenta acceso
        SHADOW: [0.0, 0.0, 0.0, 0.3],
        WHITE: [1.0, 1.0, 1.0, 1.0],
        DANGER_RED: [1.0, 0.3, 0.2, 1.0],
        SUCCESS_GREEN: [0.4, 1.0, 0.6, 1.0],
    },

    // Sizes
    SIZES: {
        GLOW_LAYERS: 4,
        PARTICLE_MIN: 1,
        PARTICLE_MAX: 5,
        EYE_SIZE: 6,
        PUPIL_SIZE: 3,
    },

    // Animation timings
    ANIMATION: {
        PULSE_SPEED: 5,
        ROTATION_SPEED: 2,
        BLINK_INTERVAL: 3000,
        BLINK_DURATION: 150,
    },

    // Effects intensity
    EFFECTS: {
        GLOW_ALPHA_BASE: 0.3,
        GLOW_ALPHA_STEP: 0.08,
        SHADOW_BLUR_LAYERS: 3,
        PARTICLE_TRAIL_COUNT: 5,
    },

    // Ambient particles
    AMBIENT: {
        STARS_COUNT: 15,
        MIST_COUNT: 3,
        ENERGY_COUNT: 8,
    },
};

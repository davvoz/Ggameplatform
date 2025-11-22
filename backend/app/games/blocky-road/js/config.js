// Game configuration for Three.js version
const CONFIG = {
    // World settings
    WORLD_SIZE: 11, // Width in tiles (-5 to 5)
    
    // Generation settings
    GENERATION_DISTANCE: 20, // Rows ahead to generate
    CLEANUP_DISTANCE: 15, // Rows behind to keep
    
    // Player settings
    JUMP_DURATION: 150, // ms for jump animation (faster)
    JUMP_HEIGHT: 0.8, // Height of jump arc
    
    // Camera settings - Crossy Road style
    CAMERA_POSITION: { x: -1, y: 2.8, z: -2.9 },
    CAMERA_ZOOM: 300,
    CAMERA_EASING: 0.05,
    
    // Terrain probabilities
    TERRAIN_WEIGHTS: {
        grass: 0.3,
        road: 0.35,
        rail: 0.15,
        water: 0.2
    },
    
    // Decoration probabilities
    DECORATION_CHANCE: 0.3,
    
    // Vehicle settings
    VEHICLE_SPAWN_INTERVAL: 100, // Frames between spawn checks
    VEHICLE_SPAWN_CHANCE: 0.3,
    VEHICLE_SPEED_MIN: 0.03,
    VEHICLE_SPEED_MAX: 0.07,
    
    // Coin settings
    COIN_SPAWN_CHANCE: 0.15,
    COIN_VALUE: 10,
    COIN_ROTATION_SPEED: 0.05,
    
    // Collision settings
    PLAYER_COLLISION_RADIUS: 0.4,
    COIN_COLLECTION_RADIUS: 0.6,
    PLATFORM_ATTACH_RADIUS: 0.8,
    
    // Lighting
    AMBIENT_LIGHT: 0.6,
    DIRECTIONAL_LIGHT: 0.8,
    
    // Shadows
    SHADOW_MAP_SIZE: 2048,
    SHADOW_CAMERA_SIZE: 15,
    
    // Audio settings
    AUDIO_ENABLED: false
};

// materials.js - Material definitions and helpers

const Materials = {
    // Standard materials with proper lighting response
    grass: new THREE.MeshLambertMaterial({ 
        color: 0x7EC850,
        flatShading: true
    }),
    
    road: new THREE.MeshLambertMaterial({ 
        color: 0x4A4A4A,
        flatShading: true
    }),
    
    water: new THREE.MeshLambertMaterial({ 
        color: 0x4DD0E1,
        transparent: true,
        opacity: 0.7,
        flatShading: true
    }),
    
    rail: new THREE.MeshLambertMaterial({ 
        color: 0x8B7355,
        flatShading: true
    }),
    
    // Car colors
    carColors: [
        0xFF4444, // Red
        0x4444FF, // Blue
        0xFFFF44, // Yellow
        0x44FF44, // Green
        0xFF44FF, // Magenta
        0x44FFFF  // Cyan
    ],
    
    getRandomCarColor() {
        return this.carColors[Math.floor(Math.random() * this.carColors.length)];
    }
};

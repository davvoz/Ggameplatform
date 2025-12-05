export const GameConfig = Object.freeze({
  rendering: {
    pixelRatioMax: 2,
    clearColor: 0x050608,
    camera: {
      fov: ('ontouchstart' in window) ? 65 : 55, // FOV maggiore su mobile
      near: 0.1,
      far: 200,
      position: { x: 10, y: 12, z: 12 },
      target: { x: 0, y: 0, z: 0 }
    }
  },
  world: {
    gridSize: 9,
    tileSize: 1,
    pathHeight: 0.06
  },
  gameplay: {
    startingCredits: 80,
    startingHealth: 15,
    towerTypes: [
      {
        id: "laser",
        label: "Laser",
        icon: "◎",
        baseCost: 40,
        range: 4.5,
        fireRate: 1.8,
        damage: 3.5,
        projectileColor: 0x29a3ff,
        damageType: "laser"
      },
      {
        id: "rail",
        label: "Rail",
        icon: "⦿",
        baseCost: 60,
        range: 6.0,
        fireRate: 0.55,
        damage: 14,
        projectileColor: 0xffda6c,
        damageType: "plasma"
      },
      {
        id: "aoe",
        label: "Pulse",
        icon: "◉",
        baseCost: 70,
        range: 3.5,
        fireRate: 1.0,
        damage: 5,
        area: 1.8,
        projectileColor: 0x6cf3c5,
        damageType: "magic"
      }
    ]
  },
  levels: [
    {
      id: "level-1",
      name: "Orbital On-Ramp",
      waves: [
        // Wave 1: Solo Grunt (tutorial)
        { index: 1, count: 8, baseHp: 12, reward: 8, speed: 1.0, type: "grunt" },
        
        // Wave 2: Grunt + primi Swarm
        { index: 2, count: 6, baseHp: 14, reward: 9, speed: 1.1, type: "grunt" },
        { index: 2, count: 4, baseHp: 10, reward: 8, speed: 1.4, type: "swarm" },
        
        // Wave 3: Mix Grunt e Swarm
        { index: 3, count: 8, baseHp: 14, reward: 9, speed: 1.0, type: "grunt" },
        { index: 3, count: 6, baseHp: 10, reward: 9, speed: 1.5, type: "swarm" },
        
        // Wave 4: Primo Tank + supporto Grunt
        { index: 4, count: 3, baseHp: 35, reward: 18, speed: 1.0, type: "tank" },
        { index: 4, count: 6, baseHp: 16, reward: 9, speed: 1.1, type: "grunt" },
        
        // Wave 5: Swarm rush + Tank lento
        { index: 5, count: 10, baseHp: 12, reward: 10, speed: 1.5, type: "swarm" },
        { index: 5, count: 2, baseHp: 38, reward: 19, speed: 0.9, type: "tank" },
        
        // Wave 6: Mix bilanciato tutti i tipi
        { index: 6, count: 8, baseHp: 16, reward: 10, speed: 1.1, type: "grunt" },
        { index: 6, count: 6, baseHp: 12, reward: 10, speed: 1.6, type: "swarm" },
        { index: 6, count: 3, baseHp: 40, reward: 20, speed: 1.0, type: "tank" },
        
        // Wave 7: Tank wave con Swarm distrazione
        { index: 7, count: 5, baseHp: 42, reward: 21, speed: 1.0, type: "tank" },
        { index: 7, count: 8, baseHp: 12, reward: 11, speed: 1.7, type: "swarm" },
        
        // Wave 8: Grunt principale + Swarm e Tank
        { index: 8, count: 12, baseHp: 18, reward: 11, speed: 1.2, type: "grunt" },
        { index: 8, count: 5, baseHp: 14, reward: 11, speed: 1.6, type: "swarm" },
        { index: 8, count: 2, baseHp: 44, reward: 22, speed: 1.0, type: "tank" },
        
        // Wave 9: Swarm intenso + Tank pesanti
        { index: 9, count: 14, baseHp: 14, reward: 12, speed: 1.7, type: "swarm" },
        { index: 9, count: 4, baseHp: 46, reward: 23, speed: 1.1, type: "tank" },
        
        // Wave 10: Mix equilibrato crescente
        { index: 10, count: 10, baseHp: 20, reward: 12, speed: 1.2, type: "grunt" },
        { index: 10, count: 8, baseHp: 15, reward: 12, speed: 1.7, type: "swarm" },
        { index: 10, count: 4, baseHp: 48, reward: 24, speed: 1.1, type: "tank" },
        
        // Wave 11: Tank focus + supporto
        { index: 11, count: 6, baseHp: 50, reward: 25, speed: 1.1, type: "tank" },
        { index: 11, count: 10, baseHp: 20, reward: 12, speed: 1.3, type: "grunt" },
        { index: 11, count: 6, baseHp: 16, reward: 13, speed: 1.8, type: "swarm" },
        
        // Wave 12: Swarm chaos + elite
        { index: 12, count: 16, baseHp: 16, reward: 13, speed: 1.8, type: "swarm" },
        { index: 12, count: 8, baseHp: 22, reward: 13, speed: 1.3, type: "grunt" },
        { index: 12, count: 3, baseHp: 52, reward: 26, speed: 1.2, type: "tank" },
        
        // Wave 13: Assalto misto bilanciato
        { index: 13, count: 12, baseHp: 24, reward: 14, speed: 1.3, type: "grunt" },
        { index: 13, count: 10, baseHp: 18, reward: 14, speed: 1.8, type: "swarm" },
        { index: 13, count: 5, baseHp: 55, reward: 27, speed: 1.2, type: "tank" },
        
        // Wave 14: Tank heavy con distrazioni
        { index: 14, count: 7, baseHp: 58, reward: 28, speed: 1.2, type: "tank" },
        { index: 14, count: 14, baseHp: 18, reward: 14, speed: 1.9, type: "swarm" },
        { index: 14, count: 6, baseHp: 26, reward: 15, speed: 1.4, type: "grunt" },
        
        // Wave 15: Pre-boss intenso
        { index: 15, count: 14, baseHp: 28, reward: 16, speed: 1.4, type: "grunt" },
        { index: 15, count: 16, baseHp: 20, reward: 15, speed: 1.9, type: "swarm" },
        { index: 15, count: 6, baseHp: 60, reward: 29, speed: 1.3, type: "tank" },
        
        // Wave 16: Elite preparation
        { index: 16, count: 8, baseHp: 62, reward: 30, speed: 1.3, type: "tank" },
        { index: 16, count: 12, baseHp: 30, reward: 17, speed: 1.5, type: "grunt" },
        { index: 16, count: 12, baseHp: 22, reward: 16, speed: 2.0, type: "swarm" },
        
        // Wave 17: Final assault
        { index: 17, count: 16, baseHp: 32, reward: 18, speed: 1.5, type: "grunt" },
        { index: 17, count: 18, baseHp: 24, reward: 17, speed: 2.0, type: "swarm" },
        { index: 17, count: 8, baseHp: 65, reward: 31, speed: 1.3, type: "tank" },
        
        // Wave 18: BOSS - Tank armada
        { index: 18, count: 12, baseHp: 120, reward: 50, speed: 1.0, type: "tank" }
      ]
    }
  ]
});
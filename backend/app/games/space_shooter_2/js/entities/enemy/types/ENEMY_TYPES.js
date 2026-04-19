import { C_PERIWINKLE, C_GOLD } from '../../LevelsThemes.js';
/**
 * Enemy types configuration
 */
const ENEMY_TYPES = {
    scout: {
        width: 48, height: 48, health: 1, speed: 100, score: 50,
        color: '#ee3333', shootRate: 0, dropChance: 0.08
    },
    fighter: {
        width: 56, height: 56, health: 2, speed: 80, score: 100,
        color: '#ee7700', shootRate: 2.5, dropChance: 0.12
    },
    heavy: {
        width: 72, height: 72, health: 5, speed: 50, score: 200,
        color: '#ddaa00', shootRate: 3, dropChance: 0.18
    },
    phantom: {
        width: 52, height: 52, health: 3, speed: 120, score: 150,
        color: '#9933ee', shootRate: 1.8, dropChance: 0.15
    },
    sentinel: {
        width: 64, height: 64, health: 6, speed: 40, score: 250,
        color: '#2288ee', shootRate: 2, dropChance: 0.2
    },
    swarm: {
        width: 36, height: 36, health: 1, speed: 130, score: 30,
        color: '#33cc44', shootRate: 0, dropChance: 0.05
    },

    // ═══════ WORLD 2 ENEMIES ═══════
    // Common W2 — stealth predator, phases in/out near player
    stalker: {
        width: 50, height: 50, health: 2, speed: 90, score: 180,
        color: '#44cc88', shootRate: 2, dropChance: 0.15,
        stealth: true
    },
    // Common W2 — spawns swarm enemies periodically
    nest: {
        width: 60, height: 60, health: 4, speed: 20, score: 300,
        color: '#996633', shootRate: 0, dropChance: 0.25,
        spawner: true
    },
    // Alien Jungle exclusive — quick vine whip attacker
    jungle_vine: {
        width: 44, height: 58, health: 2, speed: 70, score: 160,
        color: '#22aa44', shootRate: 2.2, dropChance: 0.12
    },
    // Volcanic exclusive — tanky fire creature
    lava_golem: {
        width: 62, height: 62, health: 3, speed: 55, score: 220,
        color: '#ff4400', shootRate: 2.5, dropChance: 0.18
    },
    // Frozen exclusive — fast ice shards
    frost_elemental: {
        width: 48, height: 48, health: 2, speed: 85, score: 190,
        color: '#66ddff', shootRate: 1.8, dropChance: 0.15
    },
    // Desert exclusive — bursts from ground
    sand_wurm: {
        width: 56, height: 70, health: 3, speed: 60, score: 210,
        color: '#ccaa55', shootRate: 3, dropChance: 0.17
    },
    // Mechanical exclusive — armored, slow, precision fire
    mech_drone: {
        width: 58, height: 58, health: 4, speed: 45, score: 260,
        color: '#8899aa', shootRate: 1.5, dropChance: 0.2
    },
    // Toxic exclusive — splits into 2 mini blobs on death
    toxic_blob: {
        width: 46, height: 46, health: 2, speed: 75, score: 170,
        color: '#88dd00', shootRate: 2, dropChance: 0.14,
        splits: true
    },

    // ═══════ WORLD 3 ENEMIES — Simulation Break ═══════
    // Common W3 — corrupted drone, fast, blink-teleports around
    glitch_drone: {
        width: 42, height: 42, health: 2, speed: 110, score: 200,
        color: '#00eedd', shootRate: 1.6, dropChance: 0.12,
        w3behaviour: 'blinker' // teleports + shoots after blink
    },
    // Common W3 — boxy data cube, tanky, shield-links with nearby cubes
    data_cube: {
        width: 54, height: 54, health: 5, speed: 40, score: 280,
        color: '#8844ff', shootRate: 2, dropChance: 0.2,
        w3behaviour: 'shielder' // links shield with nearby cubes, takes less dmg when linked
    },
    // Simulation exclusive — fragmented polygon, bursts into fast fragments on low HP
    fragment_shard: {
        width: 50, height: 50, health: 3, speed: 75, score: 230,
        color: '#ff3388', shootRate: 2.2, dropChance: 0.16,
        w3behaviour: 'fragmenter' // at 1 HP, splits into 3 fast micro-shards instead of dying
    },
    // Simulation exclusive — phasing warp bug, periodically invisible/invulnerable
    warp_bug: {
        width: 46, height: 46, health: 2, speed: 95, score: 220,
        color: '#44ff88', shootRate: 1.5, dropChance: 0.14,
        stealth: true,
        w3behaviour: 'phaser' // cycles between visible (vulnerable) and invisible (invulnerable)
    },
    // Simulation exclusive — spawns glitch_drone swarms + attracts nearby enemies
    error_node: {
        width: 62, height: 62, health: 4, speed: 25, score: 320,
        color: '#ff8800', shootRate: 0, dropChance: 0.22,
        spawner: true,
        w3behaviour: 'beacon' // boosts speed of nearby enemies while alive
    },
    // Simulation exclusive — mirror ghost, copies player movement inversely
    mirror_ghost: {
        width: 48, height: 48, health: 2, speed: 85, score: 190,
        color: C_PERIWINKLE, shootRate: 1.8, dropChance: 0.13,
        splits: true,
        w3behaviour: 'mirror' // mirrors player X position (opposite side of screen)
    },

    // ═══════ WORLD 4 ENEMIES — Quantum Realm (Standard Model) ═══════
    // Common W4 — three linked quarks (RGB color charge), must kill all 3 quickly or they reform
    quark_triplet: {
        width: 52, height: 52, health: 2, speed: 65, score: 280,
        color: '#ff3355', shootRate: 2.2, dropChance: 0.16,
        w4behaviour: 'triplet' // 3 linked enemies — if one survives 3s after kin die, all reform
    },
    // Common W4 — oscillates between 3 "flavors", only vulnerable in one color state
    neutrino_ghost: {
        width: 56, height: 56, health: 3, speed: 100, score: 260,
        color: '#aa88ff', shootRate: 1.5, dropChance: 0.14,
        stealth: true,
        w4behaviour: 'oscillator' // cycles 3 flavors every 2s, only 1 flavor is vulnerable
    },
    // W4 — links two enemies with a force line, buffing both; break the carrier to break the link
    boson_carrier: {
        width: 62, height: 62, health: 4, speed: 55, score: 320,
        color: '#ffee33', shootRate: 2.5, dropChance: 0.2,
        w4behaviour: 'forcelink' // connects 2 nearest enemies with a force line, +50% damage resist while linked
    },
    // W4 — creates a slowing field that grows over time; must kill before field covers screen
    higgs_field: {
        width: 68, height: 68, health: 5, speed: 30, score: 350,
        color: '#a050ff', shootRate: 3, dropChance: 0.22,
        w4behaviour: 'massfield' // expanding aura that slows player bullets and player movement
    },
    // W4 — antimatter mirror twin: spawns alongside another enemy, must kill both within 2s or they reform
    positron_mirror: {
        width: 58, height: 58, health: 2, speed: 80, score: 240,
        color: '#ff4488', shootRate: 1.8, dropChance: 0.15,
        w4behaviour: 'antimatter' // paired with a 'particle' twin, both must die within 2s
    },
    // W4 — chain of linked gluon segments: can only damage the ends, not middle segments
    gluon_chain: {
        width: 50, height: 50, health: 2, speed: 50, score: 300,
        color: '#33ff77', shootRate: 2, dropChance: 0.18,
        w4behaviour: 'chain' // only endpoints take damage — middle links are shielded
    }
};

export { ENEMY_TYPES };
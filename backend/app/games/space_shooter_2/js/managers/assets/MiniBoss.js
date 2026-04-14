import { _genMiniBoss1Sprites , _genMiniBoss2Sprites, _genMiniBoss3Sprites, _genMiniBoss4Sprites } from './minibosses/world_mini1.js';
import { _genMiniBoss5Sprites , _genMiniBoss6Sprites, _genMiniBoss7Sprites, _genMiniBoss8Sprites } from './minibosses/world_mini2.js';
import { _genMiniBoss9Sprites , _genMiniBoss10Sprites, _genMiniBoss11Sprites, _genMiniBoss12Sprites } from './minibosses/world_mini3.js';
import { _genMiniBoss13Sprites , _genMiniBoss14Sprites, _genMiniBoss15Sprites, _genMiniBoss16Sprites } from './minibosses/world_mini4.js';

function generateMiniBossSprites(sprites) {
    _genMiniBoss1Sprites(sprites); // Scarab Drone (teal/green, agile)
    _genMiniBoss2Sprites(sprites); // Garrison Turret (bronze/orange, heavy)
    _genMiniBoss3Sprites(sprites); // Phantom Wraith (purple, orbiting)
    _genMiniBoss4Sprites(sprites); // Inferno Striker (crimson, aggressive)
    // World 2 mini-bosses
    _genMiniBoss5Sprites(sprites); // Vine Sentinel (jungle green)
    _genMiniBoss6Sprites(sprites); // Magma Sprite (fiery orange)
    _genMiniBoss7Sprites(sprites); // Cryo Colossus (ice blue)
    _genMiniBoss8Sprites(sprites); // Rust Hulk (rusty bronze)
    // World 3 mini-bosses — Simulation Break
    _genMiniBoss9Sprites(sprites);  // Glitch Core (cyan, fast)
    _genMiniBoss10Sprites(sprites); // Broken Renderer (purple, shielded)
    _genMiniBoss11Sprites(sprites); // Fragment Swarm (magenta, orbiting)
    _genMiniBoss12Sprites(sprites); // Mirror Guardian (silver, aggressive)
    // World 4 mini-bosses — Quantum Realm
    _genMiniBoss13Sprites(sprites); // Charm Quark (pink, phase-cycling)
    _genMiniBoss14Sprites(sprites); // Strange Oscillator (cyan, state-changing)
    _genMiniBoss15Sprites(sprites); // Top Resonance (gold, shielded)
    _genMiniBoss16Sprites(sprites); // Bottom Decayer (green, splitting)
}






export { generateMiniBossSprites };

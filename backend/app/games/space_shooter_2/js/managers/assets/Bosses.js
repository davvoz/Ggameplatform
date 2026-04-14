import { _genBoss1Sprites, _genBoss2Sprites, _genBoss3Sprites, _genBoss4Sprites, _genBoss5Sprites, _genBoss6Sprites } from './bosses/world1.js';
import { _genBoss7Sprites, _genBoss8Sprites, _genBoss9Sprites, _genBoss10Sprites, _genBoss11Sprites, _genBoss12Sprites } from './bosses/world2.js';
import { _genBoss13Sprites, _genBoss14Sprites, _genBoss15Sprites, _genBoss16Sprites, _genBoss17Sprites, _genBoss18Sprites } from './bosses/world3.js';
import { _genBoss19Sprites, _genBoss20Sprites, _genBoss21Sprites, _genBoss22Sprites, _genBoss23Sprites, _genBoss24Sprites } from './bosses/world4.js';
// ================================================================
//  BOSSES  — Multi-part sprites for 6 unique bosses
//  Each boss generates: _core, _turret, _arm, _shield, _orb, _weak
// ================================================================

function generateBossSprites(sprites) {
    _genBoss1Sprites(sprites);
    _genBoss2Sprites(sprites);
    _genBoss3Sprites(sprites);
    _genBoss4Sprites(sprites);
    _genBoss5Sprites(sprites);
    _genBoss6Sprites(sprites);
    // World 2 bosses
    _genBoss7Sprites(sprites);
    _genBoss8Sprites(sprites);
    _genBoss9Sprites(sprites);
    _genBoss10Sprites(sprites);
    _genBoss11Sprites(sprites);
    _genBoss12Sprites(sprites);
    // World 3 bosses — Simulation Break
    _genBoss13Sprites(sprites);
    _genBoss14Sprites(sprites);
    _genBoss15Sprites(sprites);
    _genBoss16Sprites(sprites);
    _genBoss17Sprites(sprites);
    _genBoss18Sprites(sprites);
    // World 4 bosses — Quantum Realm
    _genBoss19Sprites(sprites);
    _genBoss20Sprites(sprites);
    _genBoss21Sprites(sprites);
    _genBoss22Sprites(sprites);
    _genBoss23Sprites(sprites);
    _genBoss24Sprites(sprites);
}






export {generateBossSprites};
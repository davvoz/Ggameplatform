import { Baffone } from '../bosses/Baffone.js';
import { GelatoVan } from '../bosses/GelatoVan.js';
import { Panzerpig } from '../bosses/Panzerpig.js';
import { PinataChopper } from '../bosses/PinataChopper.js';
import { ThroneMech } from '../bosses/ThroneMech.js';
import { Torta } from '../bosses/Torta.js';
import { Balloonist } from './Balloonist.js';
import { Bazooka } from './Bazooka.js';
import { Clown } from './Clown.js';
import { Drone } from './Drone.js';
import { Grenadier } from './Grenadier.js';
import { Grunt } from './Grunt.js';
import { Guard } from './Guard.js';
import { Gull } from './Gull.js';
import { Mortar } from './Mortar.js';
import { ShieldGrunt } from './ShieldGrunt.js';
import { Sniper } from './Sniper.js';
import { Turret } from './Turret.js';

/** Enemy type → class. A new enemy is a class, a line here and an entry in config/Enemies.js. */
const CLASSES = {
    grunt: Grunt,
    grenadier: Grenadier,
    shield: ShieldGrunt,
    bazooka: Bazooka,
    clown: Clown,
    balloon: Balloonist,
    drone: Drone,
    gull: Gull,
    mortar: Mortar,
    turret: Turret,
    sniper: Sniper,
    guard: Guard,
    panzerpig: Panzerpig,
    torta: Torta,
    gelato: GelatoVan,
    pinata: PinataChopper,
    baffone: Baffone,
    throne: ThroneMech,
};

export function createEnemy(type, x, y, opts) {
    const Type = CLASSES[type];
    if (!Type) throw new Error(`Unknown enemy type: ${type}`);
    return new Type(type, x, y, opts);
}

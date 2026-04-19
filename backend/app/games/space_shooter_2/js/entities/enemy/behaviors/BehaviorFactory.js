import StealthBehavior from './StealthBehavior.js';
import SpawnerBehavior from './SpawnerBehavior.js';
import SplitOnDeathBehavior from './SplitOnDeathBehavior.js';
import {
    BlinkerBehavior, PhaserBehavior, BeaconBehavior,
    ShielderBehavior, MirrorBehavior, FragmenterBehavior
} from './w3/W3Behaviors.js';
import {
    TripletBehavior, OscillatorBehavior, ForcelinkBehavior,
    MassfieldBehavior, AntimatterBehavior, ChainBehavior
} from './w4/W4Behaviors.js';

const W3_MAP = {
    blinker:     BlinkerBehavior,
    phaser:      PhaserBehavior,
    beacon:      BeaconBehavior,
    shielder:    ShielderBehavior,
    mirror:      MirrorBehavior,
    fragmenter:  FragmenterBehavior,
};

const W4_MAP = {
    triplet:     TripletBehavior,
    oscillator:  OscillatorBehavior,
    forcelink:   ForcelinkBehavior,
    massfield:   MassfieldBehavior,
    antimatter:  AntimatterBehavior,
    chain:       ChainBehavior,
};

/**
 * BehaviorFactory — Creates the correct set of EnemyBehavior instances
 * from an ENEMY_TYPES configuration object.
 */
const BehaviorFactory = {
    createBehaviors(config) {
        const behaviors = [];

        if (config.stealth)       behaviors.push(new StealthBehavior());
        if (config.spawner)       behaviors.push(new SpawnerBehavior());
        if (config.splits)        behaviors.push(new SplitOnDeathBehavior());

        const W3Class = W3_MAP[config.w3behaviour];
        if (W3Class) behaviors.push(new W3Class());

        const W4Class = W4_MAP[config.w4behaviour];
        if (W4Class) behaviors.push(new W4Class());

        return behaviors;
    }
};

export default BehaviorFactory;

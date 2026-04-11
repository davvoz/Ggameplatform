/**
 * Multi-Part Enemy Sprite Definitions
 * Each enemy built from independent animated parts
 */

import { grunt } from './enemy/createGrunt.js';
import { rusher } from './enemy/createRusher.js';
import { tank } from './enemy/createTank.js';
import { flyer } from './enemy/createFlyer.js';
import { healer } from './enemy/createHealer.js';
import { armored } from './enemy/createArmored.js';
import { boss } from './enemy/createBoss.js';
import { vampire } from './enemy/createVampire.js';
import { bomber } from './enemy/createBomber.js';
import { shadow } from './enemy/createShadow.js';
import { siren } from './enemy/createSiren.js';
import { golem } from './enemy/createGolem.js';
import { phaser } from './enemy/createPhaser.js';
import { splitter } from './enemy/createSplitter.js';

export const MultiPartEnemySprites = {

    createGrunt() {
        return grunt();
    },

    createRusher() {
        return rusher();
    },

    createTank() {
        return tank();
    },

    createFlyer() {
        return flyer();
    },

    createHealer() {
        return healer();
    },

    createBoss() {
        return boss();
    },

    createArmored() {
        return armored();
    },

    createVampire() {
        return vampire();
    },

    createBomber() {
        return bomber();
    },

    createShadow() {
        return shadow();
    },

    createSiren() {
        return siren();
    },

    createGolem() {
        return golem();
    },

    createPhaser() {
        return phaser();
    },

    createSplitter() {
        return splitter(); // Reuse grunt sprite with different color scheme
    }
};

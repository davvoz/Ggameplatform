/**
 * Multi-Part Enemy Sprite Definitions
 * Each enemy built from independent animated parts
 */

import { grunt } from './sprites/enemy/createGrunt.js';
import { rusher } from './sprites/enemy/createRusher.js';
import { tank } from './sprites/enemy/createTank.js';
import { flyer } from './sprites/enemy/createFlyer.js';
import { healer } from './sprites/enemy/createHealer.js';
import { armored } from './sprites/enemy/createArmored.js';
import { boss } from './sprites/enemy/createBoss.js';
import { vampire } from './sprites/enemy/createVampire.js';
import { bomber } from './sprites/enemy/createBomber.js';
import { shadow } from './sprites/enemy/createShadow.js';
import { siren } from './sprites/enemy/createSiren.js';
import { golem } from './sprites/enemy/createGolem.js';
import { phaser } from './sprites/enemy/createPhaser.js';
import { splitter } from './sprites/enemy/createSplitter.js';

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

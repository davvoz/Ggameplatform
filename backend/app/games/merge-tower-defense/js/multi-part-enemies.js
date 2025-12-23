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
    }

};

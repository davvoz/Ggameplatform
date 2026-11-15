import { INVADER, MAGE, WORLD } from '../config/Tuning.js';
import { drawName } from './Font.js';
import { poseFrame } from './poses.js';
import { pixelRing } from './pixels.js';
import { drawEnergy } from './EnergyArt.js';
import { drawBubble, drawShieldBar, paintBubble } from './ShieldArt.js';
import { drawShot } from './ShotArt.js';

const TAU = Math.PI * 2;
const TAG_MARGIN = 70;
/** The bubble pops up in this long, and blinks for this long before it goes. */
const BUBBLE_IN = 0.2;
const BUBBLE_ENDING = 0.3;
/** The shield bar flashes for this long when the shield comes back. */
const READY_FLASH = 0.35;
/** Space between the shield bar and the energy crystals under it. */
const SHIELD_BAR_GAP = 4;

/**
 * Draws the arena: the painted scene, the gifts, the monsters (walkers by
 * depth, flyers on top), the mage and the magic in flight. Reads the
 * simulation and never changes it.
 */
export class WorldView {
    #bank;
    #scenes;
    #icons;
    #shots;
    #bubbleArt;
    #time = 0;
    #readiness = 1;
    #readyAt = -Infinity;

    constructor({ bank, scenes, icons, shots }) {
        this.#bank = bank;
        this.#scenes = scenes;
        this.#icons = icons;
        this.#shots = shots;
        this.#bubbleArt = paintBubble();
    }

    update(dt) {
        this.#time += dt;
    }

    /** @param {CanvasRenderingContext2D} ctx @param {import('../sim/Simulation.js').Simulation} sim @param {object} mapSpec */
    draw(ctx, sim, mapSpec) {
        ctx.drawImage(this.#scenes.backdrop(mapSpec), 0, 0, WORLD.width, WORLD.height);
        if (sim.mage.hasBuff('frost')) this.#frostWash(ctx);
        if (sim.storm.active) this.#stormSky(ctx);
        for (const pickup of sim.pickups) this.#pickup(ctx, pickup);
        this.#mage(ctx, sim.mage);
        const walkers = sim.enemies.filter((e) => !e.flying).sort((a, b) => a.y - b.y);
        for (const enemy of walkers) this.#enemy(ctx, enemy);
        for (const enemy of sim.enemies) if (enemy.flying) this.#enemy(ctx, enemy);
        for (const enemy of sim.enemies) if (enemy.invader) this.#invaderTag(ctx, enemy);
        for (const shot of sim.shots) this.#shot(ctx, shot);
        for (const bolt of sim.bolts) this.#bolt(ctx, bolt);
    }

    /** Just the scene and an idle mage: the backdrop of the title. */
    drawStill(ctx, mapSpec, mage) {
        ctx.drawImage(this.#scenes.backdrop(mapSpec), 0, 0, WORLD.width, WORLD.height);
        if (mage) this.#mage(ctx, mage);
    }

    /** The arena darkens while the storm is out. */
    #stormSky(ctx) {
        ctx.fillStyle = 'rgba(40,10,70,0.32)';
        ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    }

    #frostWash(ctx) {
        ctx.fillStyle = 'rgba(150,220,255,0.12)';
        ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    }

    /** The mage, and over his head his shield bar and his energy. */
    #mage(ctx, mage) {
        const { anim, frame } = poseFrame('mage', mage.pose, mage.poseTime);
        const blink = mage.grace > 0 && mage.alive && Math.floor(mage.grace * 16) % 2 === 0;
        ctx.globalAlpha = blink ? 0.45 : 1;
        this.#bank.draw(ctx, { actor: 'mage', anim, frame, facing: mage.facing, x: mage.x, y: mage.feetY });
        ctx.globalAlpha = 1;
        if (mage.shielded) this.#bubble(ctx, mage);
        if (mage.alive) {
            const top = mage.feetY - MAGE.tapHeight - 6;
            drawEnergy(ctx, mage.x, top, { energy: mage.energy, max: mage.energyMax, denied: mage.denied > 0 && Math.floor(mage.denied * 20) % 2 === 0 });
            this.#shieldBar(ctx, mage, top - SHIELD_BAR_GAP);
        }
    }

    /** The shield's recharge bar, with a flash the moment the shield is back. */
    #shieldBar(ctx, mage, bottom) {
        const done = shieldReadiness(mage);
        if (done >= 1 && this.#readiness < 1) this.#readyAt = this.#time;
        this.#readiness = done;
        const flash = Math.max(0, 1 - (this.#time - this.#readyAt) / READY_FLASH);
        drawShieldBar(ctx, mage.x, bottom, { done, time: this.#time, flash });
    }

    #bubble(ctx, mage) {
        const { x, y } = mage.chest;
        const fade = Math.min(1, (mage.shieldDuration - mage.shieldTime) / BUBBLE_IN);
        drawBubble(ctx, this.#bubbleArt, x, y, { fade, time: this.#time, ending: mage.shieldTime < BUBBLE_ENDING });
    }

    #enemy(ctx, enemy) {
        const { anim, frame } = poseFrame(enemy.kind, enemy.state, enemy.stateTime, enemy.timing);
        const appearing = enemy.state === 'spawn' ? Math.min(1, enemy.stateTime / 0.45) : 1;
        if (enemy.invader) this.#invaderAura(ctx, enemy);
        if (enemy.state === 'windup' || enemy.state === 'throw') this.#warning(ctx, enemy);
        ctx.globalAlpha = appearing;
        const scale = enemy.invader ? INVADER.lookScale : 1;
        this.#bank.draw(ctx, { actor: enemy.kind, anim, frame, facing: enemy.facing, x: enemy.x, y: enemy.y, flash: enemy.flash > 0, scale });
        ctx.globalAlpha = 1;
        if (enemy.maxHp > 1 && enemy.hp < enemy.maxHp) this.#healthBar(ctx, enemy);
    }

    /** A red "!" over a monster about to strike. */
    #warning(ctx, enemy) {
        const top = enemy.flying ? enemy.y - 50 : enemy.y - enemy.body.height - 34;
        const blink = Math.floor(this.#time * 10) % 2 === 0;
        ctx.fillStyle = blink ? '#ff3b3b' : '#ffd27a';
        ctx.fillRect(enemy.x - 3, top, 6, 14);
        ctx.fillRect(enemy.x - 3, top + 18, 6, 6);
    }

    #invaderAura(ctx, enemy) {
        const { x, y } = enemy.center;
        const pulse = 0.6 + 0.4 * Math.sin(this.#time * 5);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const gradient = ctx.createRadialGradient(x, y, 10, x, y, 90);
        gradient.addColorStop(0, `rgba(255,80,200,${0.35 * pulse})`);
        gradient.addColorStop(1, 'rgba(255,80,200,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(x - 90, y - 90, 180, 180);
        ctx.restore();
    }

    /** The owner's name over an invader, kept on screen while it walks in from the side. */
    #invaderTag(ctx, enemy) {
        const top = enemy.flying ? enemy.y - 64 : enemy.y - enemy.body.height - 58;
        const x = Math.min(WORLD.width - TAG_MARGIN, Math.max(TAG_MARGIN, enemy.x));
        drawName(ctx, enemy.invader.name, x, top, { size: 15, color: '#ffb3e6' });
    }

    #healthBar(ctx, enemy) {
        const width = 50;
        const top = enemy.flying ? enemy.y - 46 : enemy.y - enemy.body.height - 14;
        ctx.fillStyle = 'rgba(10,5,20,0.75)';
        ctx.fillRect(enemy.x - width / 2 - 2, top - 2, width + 4, 8);
        ctx.fillStyle = enemy.invader ? '#ff6ad5' : '#ff5a3c';
        ctx.fillRect(enemy.x - width / 2, top, (width * enemy.hp) / enemy.maxHp, 4);
    }

    #pickup(ctx, pickup) {
        if (pickup.blinking && Math.floor(this.#time * 8) % 2 === 0) return;
        const bob = Math.sin(this.#time * 4 + pickup.id) * 4;
        const icon = this.#icons[pickup.kind];
        const y = pickup.y - 46 + bob;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(255,240,170,0.18)';
        ctx.beginPath();
        ctx.arc(pickup.x, y + 24, 32, 0, TAU);
        ctx.fill();
        ctx.restore();
        ctx.drawImage(icon, pickup.x - 24, y, 48, 48);
    }

    #shot(ctx, shot) {
        drawShot(ctx, this.#shots, shot, this.#time);
        if (shot.reflected) pixelRing(ctx, shot.x, shot.y, shot.radius + 8, { size: 4, color: '#9be7ff' });
    }

    #bolt(ctx, bolt) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const gradient = ctx.createRadialGradient(bolt.x, bolt.y, 1, bolt.x, bolt.y, 18);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.35, 'rgba(255,120,80,0.9)');
        gradient.addColorStop(1, 'rgba(200,30,10,0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(bolt.x, bolt.y, 18, 0, TAU);
        ctx.fill();
        ctx.restore();
    }
}

/** How far the shield has recharged, from 0 to 1 (1: ready). */
export function shieldReadiness(mage) {
    if (mage.shieldReady) return 1;
    return 1 - Math.min(1, mage.shieldCooldown / mage.shieldRecharge);
}

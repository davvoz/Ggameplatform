import { C, PARTY } from '../config/Palette.js';
import { View } from '../config/Tuning.js';
import { Ev } from '../sim/Events.js';
import { Missions } from '../sim/levels/Missions.js';
import { Terrain } from '../sim/Terrain.js';
import { enemySprite, hostageSprite, playerSprites, shotSprite } from './ActorSprites.js';
import { Effects } from './Effects.js';
import { Hud } from './Hud.js';
import { PixelCanvas, makeCanvas } from './PixelCanvas.js';
import { StreetPainter, paintBackdrop } from './art/SceneryArt.js';

const CHUNK = 128;
const FAR_SPEED = 0.12;
const MID_SPEED = 0.4;
/** close up, at most this many rows of the picture are left out, at most CUT_BOTTOM of them below the street */
const MAX_CUT = 48;
const CUT_BOTTOM = 12;

/**
 * Draws the game into a fixed 384x216 canvas; CSS scales it up with hard
 * pixels. Reads the simulation, never writes to it.
 *
 * The street is baked in 128 px chunks, all of a mission's in its first
 * second, into recycled canvases: about 4 MB, and no uploads while fighting.
 */
export class Renderer {
    canvas;
    ctx;
    bank;
    font;
    effects = new Effects();
    hud;
    /** @type {import('../sim/Simulation.js').Simulation | null} */
    sim = null;
    frame = 0;
    /** mission card at the start of each mission */
    missionCardAge = 999;
    /** the rows of the canvas on screen: the HUD and the screens are laid out inside them */
    viewTop = 0;
    viewHeight = View.height;
    #backdrops = new Map();
    #backdrop = null;
    #street = null;
    #chunks = new Map();
    /** chunk canvases are recycled: creating canvases while scrolling causes hitches */
    #spare = [];
    #chunkPixels = new PixelCanvas(CHUNK, View.height);
    #missionIndex = -1;
    #prebake = 0;
    #chunkCount = 0;
    #viewX = 0;
    #viewY = 0;

    /**
     * @param {HTMLCanvasElement} canvas
     * @param {import('./SpriteBank.js').SpriteBank} bank
     * @param {import('./Font.js').Font} font
     */
    constructor(canvas, bank, font) {
        this.canvas = canvas;
        canvas.width = View.width;
        canvas.height = View.height;
        this.ctx = canvas.getContext('2d', { alpha: false });
        this.ctx.imageSmoothingEnabled = false;
        this.bank = bank;
        this.font = font;
        this.hud = new Hud(bank, font);
    }

    /**
     * Fit the picture in the stage. A stage wider than 16:9 (a phone on its
     * side, a browser under its toolbars) leaves empty sides; close up (while
     * playing) a strip of sky and of pavement is left out instead, so the
     * whole width fills the screen and everything is bigger. Only the picture
     * changes: the game sees the same 384x216 world on every screen.
     * @returns {number} the size of one game pixel in CSS pixels
     */
    resize(width, height, close = false) {
        const cut = close ? Math.max(0, Math.min(MAX_CUT, Math.round(View.height - (View.width * height) / width))) : 0;
        const bottom = Math.min(CUT_BOTTOM, cut >> 2);
        this.viewTop = cut - bottom;
        this.viewHeight = View.height - cut;
        const scale = Math.min(width / View.width, height / this.viewHeight);
        // prefer whole-number scales when they lose little space: crisper pixels
        const whole = Math.floor(scale);
        const s = whole >= 2 && whole / scale > 0.9 ? whole : scale;
        const style = this.canvas.style;
        style.width = `${Math.floor(View.width * s)}px`;
        style.height = `${Math.floor(View.height * s)}px`;
        style.transform = `translateY(${-Math.round(this.viewTop * s)}px)`;
        const frame = this.canvas.parentElement.style;
        frame.width = style.width;
        frame.height = `${Math.floor(this.viewHeight * s)}px`;
        return s;
    }

    /** @param {import('../sim/Simulation.js').Simulation} sim */
    attach(sim) {
        this.sim = sim;
        this.effects.reset();
        this.#useMission(sim.missionIndex);
    }

    /** Paint a theme's backdrop ahead of time (the title uses mission 1). */
    prepare(missionIndex) {
        this.#useMission(missionIndex);
    }

    /** @param {import('../sim/Events.js').EventQueue} events */
    handle(events) {
        for (let i = 0; i < events.count; i++) {
            const e = events.items[i];
            if (e.type === Ev.LEVEL_START) {
                this.#useMission(e.a);
                this.missionCardAge = 0;
                this.effects.reset();
            }
        }
        this.effects.handle(events);
    }

    /** One simulation tick of visual time. */
    tick() {
        this.effects.tick();
        this.missionCardAge++;
    }

    /**
     * Draw the world, the HUD and an optional overlay.
     * @param {(ctx: CanvasRenderingContext2D, r: Renderer) => void} [overlay]
     * @param {{hud?: boolean, cameraX?: number}} [opts]
     */
    render(overlay, { hud = true, cameraX } = {}) {
        this.frame++;
        const ctx = this.ctx;
        const sim = this.sim;
        const fx = this.effects;
        const camX = cameraX ?? sim?.world.camera.x ?? 0;
        const shake = fx.shake > 0.3 ? fx.shake : 0;
        this.#viewX = Math.round(camX + (shake ? (Math.random() - 0.5) * 2 * shake : 0));
        this.#viewY = Math.round(shake ? (Math.random() - 0.5) * 2 * shake * 0.6 : 0);

        this.#drawBackdrop(ctx, camX);
        this.#drawStreet(ctx);
        if (sim && cameraX === undefined) {
            ctx.save();
            ctx.translate(-this.#viewX, -this.#viewY);
            this.#drawWorld(ctx, sim);
            ctx.restore();
            if (fx.flash > 0) {
                ctx.globalAlpha = Math.min(0.55, fx.flash / 14);
                ctx.fillStyle = fx.flashColor;
                ctx.fillRect(0, 0, View.width, View.height);
                ctx.globalAlpha = 1;
            }
        }
        // everything over the scene is laid out in the rows on screen
        ctx.save();
        ctx.translate(0, this.viewTop);
        if (sim && cameraX === undefined && hud) {
            this.hud.draw(ctx, sim, fx, this.frame, this.viewHeight);
            this.#drawCards(ctx, sim);
        }
        overlay?.(ctx, this);
        ctx.restore();
    }

    // ------------------------------------------------------------ scenery

    #useMission(index) {
        if (index === this.#missionIndex) return;
        this.#missionIndex = index;
        const level = Missions[index];
        if (!this.#backdrops.has(level.theme)) {
            const { sky, far, mid } = paintBackdrop(level.theme);
            this.#backdrops.set(level.theme, { sky: sky.toCanvas(), far: far.toCanvas(), mid: mid.toCanvas() });
        }
        this.#backdrop = this.#backdrops.get(level.theme);
        this.#street = new StreetPainter(level.theme, level, new Terrain(level));
        for (const c of this.#chunks.values()) this.#spare.push(c);
        this.#chunks.clear();
        this.#prebake = 0;
        this.#chunkCount = Math.ceil(level.length / CHUNK) + 1;
    }

    #drawBackdrop(ctx, camX) {
        const b = this.#backdrop;
        if (!b) return;
        ctx.drawImage(b.sky, 0, 0);
        this.#strip(ctx, b.far, camX * FAR_SPEED);
        this.#strip(ctx, b.mid, camX * MID_SPEED);
    }

    #strip(ctx, img, offset) {
        const w = img.width;
        let x = -Math.round(offset % w);
        if (x > 0) x -= w;
        for (; x < View.width; x += w) ctx.drawImage(img, x, 0);
    }

    #drawStreet(ctx) {
        if (!this.#street) return;
        const first = Math.floor(this.#viewX / CHUNK);
        const last = Math.floor((this.#viewX + View.width) / CHUNK);
        for (let i = first; i <= last; i++) {
            ctx.drawImage(this.#chunk(i), i * CHUNK - this.#viewX, -this.#viewY);
        }
        // the rest of the street is baked one chunk per frame while the mission
        // card is up, so no texture is uploaded in the middle of a fight
        while (this.#prebake < this.#chunkCount && this.#chunks.has(this.#prebake)) this.#prebake++;
        if (this.#prebake < this.#chunkCount) this.#chunk(this.#prebake);
    }

    #chunk(i) {
        let c = this.#chunks.get(i);
        if (!c) {
            const pc = this.#chunkPixels;
            pc.data.fill(0);
            this.#street.paint(pc, i * CHUNK);
            c = this.#spare.pop() ?? this.#newChunkCanvas();
            new Uint32Array(c.image.data.buffer).set(pc.data);
            c.ctx.putImageData(c.image, 0, 0);
            this.#chunks.set(i, c);
        }
        return c.canvas;
    }

    #newChunkCanvas() {
        const canvas = makeCanvas(CHUNK, View.height);
        const ctx = canvas.getContext('2d');
        return { canvas, ctx, image: ctx.createImageData(CHUNK, View.height) };
    }

    // ------------------------------------------------------------ actors

    #drawWorld(ctx, sim) {
        const w = sim.world;
        const bank = this.bank;
        const fx = this.effects;
        const left = this.#viewX - 60;
        const right = this.#viewX + View.width + 60;

        // markers on the ground first
        for (const m of fx.markers.items) {
            if (!m.active) continue;
            this.#marker(ctx, m, w);
        }

        for (const p of w.props) {
            if (!p.active || p.x < left || p.x > right) continue;
            bank.draw(ctx, `prop_${p.type}`, p.x, p.y, false, p.flash > 0);
        }
        for (const h of w.hostages) {
            if (h.state === 'gone' || h.x < left || h.x > right) continue;
            const s = hostageSprite(h);
            bank.draw(ctx, s.name, h.x, h.y, s.flip);
            if (h.state === 'tied' && (this.frame >> 5) % 3 === 0) this.font.draw(ctx, 'HELP!', h.x, h.y - 40, { align: 'center', color: C.cyan });
        }
        for (const p of w.pickups.items) {
            if (!p.active) continue;
            if (p.life > 0 && p.age > p.life - 120 && (p.age >> 2) & 1) continue;
            const bob = p.onGround ? Math.round(Math.sin(p.age * 0.12) * 1.5) - 1 : 0;
            bank.draw(ctx, `pick_${p.type}`, p.x, p.y + bob);
            if (p.type === 'tooth' && (this.frame >> 3) % 4 === 0) bank.draw(ctx, 'fx_spark', p.x + 4, p.y - 10);
        }

        for (const e of w.enemies) {
            if (e.x < left - 60 || e.x > right + 60 || !e.awake) continue;
            this.#enemy(ctx, e);
        }
        this.#player(ctx, sim.player);

        for (const p of w.playerShots.items) if (p.active) this.#shot(ctx, p);
        for (const p of w.enemyShots.items) if (p.active) this.#shot(ctx, p);

        this.#effects(ctx);
        for (const e of w.enemies) {
            if (e.speechTicks > 0 && e.speech && e.awake) this.#speech(ctx, e.speech, e.x, e.y - e.h - (e.type === 'balloon' ? 4 : 16));
        }
    }

    #enemy(ctx, e) {
        const bank = this.bank;
        // a hit blinks for one frame: under steady fire bosses must stay visible
        const flash = e.flash >= (e.isBoss ? 4 : 3) || (e.dead && e.isBoss && (e.t >> 2) & 1);
        if (e.type === 'turret') {
            bank.draw(ctx, 'turret_base', e.x, e.y, false, flash);
            if (!e.dead) {
                const i = (Math.round((Math.atan2(e.aimY, e.aimX) / (Math.PI * 2)) * 16) + 16) % 16;
                bank.draw(ctx, `turret_gun${i}`, e.x, e.y - 14, false, flash || (e.state === 'charge' && (e.t >> 2) & 1));
            }
            return;
        }
        if (e.type === 'sniper' && e.laserOn) this.#sniperLaser(ctx, e);
        if (e.type === 'balloon' && e.floating) this.#balloons(ctx, e);
        if (e.type === 'throne' && e.laserLive) this.#beam(ctx, e);
        const s = enemySprite(e);
        if (!s.name) return;
        if (e.dead && !e.isBoss && e.deathStyle === 'blown' && e.vy !== 0) {
            this.#rotated(ctx, s.name, e.x, e.y - e.h / 2, e.t * 0.35 * (e.vx < 0 ? -1 : 1), s.flip);
            return;
        }
        if (e.dead && !e.isBoss && e.t > 30 && (e.t >> 1) & 1) return;
        bank.draw(ctx, s.name, e.x, e.y, s.flip, flash);
    }

    #balloons(ctx, e) {
        const top = e.y - e.def.h - 2;
        for (let i = 0; i < e.balloons; i++) {
            const bx = e.x + (i - (e.balloons - 1) / 2) * 7;
            this.bank.draw(ctx, `balloon_${(e.id + i) % PARTY.length}`, bx, top + (i === 1 ? -4 : 0));
        }
    }

    #sniperLaser(ctx, e) {
        const locked = e.laserLocked;
        if (locked && (this.frame >> 1) & 1) return;
        ctx.fillStyle = locked ? C.enemyShotCore : C.enemyShot;
        const x0 = e.muzzleX;
        const y0 = e.muzzleY;
        for (let d = 4; d < 420; d += locked ? 2 : 4) {
            ctx.fillRect(Math.round(x0 + e.aimX * d), Math.round(y0 + e.aimY * d), 1, 1);
        }
    }

    #beam(ctx, e) {
        const y = Math.round(e.y - e.laserY);
        const x1 = e.x - 10;
        const x0 = this.#viewX - 10;
        const flicker = (this.frame >> 1) & 1;
        ctx.fillStyle = C.enemyShot;
        ctx.fillRect(x0, y - 3 - flicker, x1 - x0, 6 + flicker * 2);
        ctx.fillStyle = C.enemyShotCore;
        ctx.fillRect(x0, y - 1, x1 - x0, 2);
    }

    #player(ctx, p) {
        const b = p.body;
        if (p.state === 'out') return;
        const bank = this.bank;
        if (p.state === 'respawn') bank.draw(ctx, 'nonna_umbrella', b.x, b.y - 32);
        if (p.invuln > 0 && p.state === 'alive' && p.invuln < 1e6 && (p.invuln >> 2) & 1) return;
        const s = playerSprites(p);
        const flash = p.invuln > 94 && p.invuln < 101;
        if (s.whole) {
            bank.draw(ctx, s.whole, b.x, b.y, s.flip);
            return;
        }
        bank.draw(ctx, s.lower, b.x, b.y, s.flip, flash);
        bank.draw(ctx, s.upper, b.x, b.y - s.hip, s.flip, flash);
    }

    #shot(ctx, p) {
        if (p.kind === 'blast') return;
        const s = shotSprite(p);
        if (!s.name) return;
        if (p.owner === 'enemy' && p.hp > 0 && (this.frame >> 2) & 1) {
            // shootable: a red ring says "you can shoot this"
            ctx.fillStyle = C.fireRed;
            ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y - p.h / 2) - 4, 2, 2);
        }
        if (s.angle) this.#rotated(ctx, s.name, p.x, p.y, s.angle, false, p.flash > 0);
        else this.bank.draw(ctx, s.name, p.x, p.y, p.vx < 0, p.flash > 0);
    }

    #rotated(ctx, name, x, y, angle, flip, flash = false) {
        const f = this.bank.frame(name, flip);
        if (!f) return;
        ctx.save();
        ctx.translate(Math.round(x), Math.round(y));
        ctx.rotate(angle);
        this.bank.draw(ctx, name, 0, 0, flip, flash);
        ctx.restore();
    }

    #effects(ctx) {
        const fx = this.effects;
        const bank = this.bank;
        for (const a of fx.anims.items) {
            if (!a.active) continue;
            const i = Math.min(a.frames - 1, Math.floor(a.age / a.frameTicks));
            const name = a.frames > 1 || bank.has(`${a.prefix}${i}`) ? `${a.prefix}${i}` : a.prefix;
            if (a.angle) this.#rotated(ctx, name, a.x, a.y, a.angle, a.flip);
            else bank.draw(ctx, bank.has(name) ? name : a.prefix, a.x, a.y, a.flip);
        }
        for (const p of fx.particles.items) {
            if (!p.active) continue;
            if (p.kind === 'smoke' || p.kind === 'sprite') {
                if (p.kind === 'smoke' && p.age > p.life * 0.7 && (p.age & 1)) continue;
                bank.draw(ctx, p.sprite, p.x, p.y);
            } else if (p.kind === 'hat') {
                ctx.fillStyle = p.color;
                const tilt = (p.age >> 2) & 3;
                ctx.fillRect(Math.round(p.x) - 2 + (tilt === 1 ? 1 : 0), Math.round(p.y), 5, 2);
                ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 2, 3, 2);
                ctx.fillRect(Math.round(p.x) + (tilt > 1 ? 1 : 0), Math.round(p.y) - 4, 1, 2);
            } else {
                ctx.fillStyle = p.color;
                const w = p.kind === 'confetti' && (p.age >> 2) & 1 ? 1 : p.w;
                ctx.fillRect(Math.round(p.x), Math.round(p.y), w, p.h);
            }
        }
        for (const t of fx.texts.items) {
            if (!t.active) continue;
            if (t.age > t.life - 15 && (t.age >> 1) & 1) continue;
            this.font.draw(ctx, t.text, t.x, t.y, { align: 'center', color: t.color, scale: t.big ? 2 : 1 });
        }
    }

    #marker(ctx, m, w) {
        const blink = (m.age >> 2) & 1;
        switch (m.kind) {
            case 'target':
                this.bank.draw(ctx, `fx_target${blink}`, m.x, m.y);
                break;
            case 'shadow': {
                const k = Math.min(1, m.age / m.life);
                ctx.globalAlpha = 0.25 + k * 0.45;
                this.bank.draw(ctx, 'fx_shadow', m.x, m.y - 1);
                ctx.globalAlpha = 1;
                if (blink) this.bank.draw(ctx, 'fx_target0', m.x, m.y);
                break;
            }
            case 'laser': {
                const boss = w.boss;
                if (!boss || boss.dead) break;
                if (blink) {
                    ctx.fillStyle = C.enemyShot;
                    const y = Math.round(boss.y - m.extra);
                    for (let x = this.#viewX; x < boss.x - 10; x += 4) ctx.fillRect(x, y, 2, 1);
                    this.font.draw(ctx, m.extra < 12 ? 'JUMP!' : 'DUCK!', this.#viewX + View.width / 2, y - 12, { align: 'center', color: C.enemyShotCore });
                }
                break;
            }
            case 'duck':
            case 'jump': {
                // a plain instruction for moves that need a crouch or a jump
                if ((m.age >> 3) % 3 !== 2) {
                    const text = m.kind === 'duck' ? 'DUCK!' : 'JUMP!';
                    this.font.draw(ctx, text, w.player.body.x, w.player.body.y - 44, { align: 'center', color: C.enemyShotCore, scale: 2 });
                }
                break;
            }
            default:
                if (blink) this.bank.draw(ctx, 'fx_hit', m.x, m.y);
                break;
        }
    }

    #speech(ctx, text, x, y) {
        const width = this.font.measure(text);
        const bx = Math.round(Math.max(this.#viewX + 2, Math.min(this.#viewX + View.width - width - 6, x - width / 2 - 3)));
        const by = Math.round(Math.max(26, y - 12));
        ctx.fillStyle = C.ink;
        ctx.fillRect(bx - 1, by - 1, width + 8, 13);
        ctx.fillStyle = C.white;
        ctx.fillRect(bx, by, width + 6, 11);
        ctx.fillRect(Math.round(x) - 1, by + 11, 3, 2);
        this.font.draw(ctx, text, bx + 3, by + 2, { color: C.ink, outline: null });
    }

    // ------------------------------------------------------------ cards

    #drawCards(ctx, sim) {
        const fx = this.effects;
        const font = this.font;
        const cx = View.width / 2;
        if (this.missionCardAge < 170) {
            const a = this.missionCardAge;
            const slide = Math.max(0, 30 - a) * 8;
            const m = sim.mission;
            this.#band(ctx, 70, 44);
            font.draw(ctx, `MISSION ${m.id}`, cx - slide, 76, { align: 'center', scale: 2, color: C.yellow });
            font.draw(ctx, m.name, cx + slide, 98, { align: 'center', color: C.white });
        }
        if (fx.bannerAge < 150 && fx.banner) {
            if ((fx.bannerAge >> 3) % 4 !== 3) font.draw(ctx, fx.banner, cx, 60, { align: 'center', color: C.yellow });
        }
        if (fx.bossCardAge < 160 && fx.bossCard) {
            const a = fx.bossCardAge;
            this.#warning(ctx, 52, a);
            font.draw(ctx, fx.bossCard, cx, 82, { align: 'center', scale: 2, color: C.white });
        }
        if (fx.goAge < 200 && (fx.goAge >> 4) & 1) {
            this.bank.draw(ctx, 'fx_go', View.width - 40, 100);
            ctx.fillStyle = C.yellow;
            for (let i = 0; i < 4; i++) ctx.fillRect(View.width - 20 + i, 96 + i, 1, 9 - i * 2);
        }
    }

    #band(ctx, y, h) {
        ctx.fillStyle = C.ink;
        ctx.globalAlpha = 0.75;
        ctx.fillRect(0, y, View.width, h);
        ctx.globalAlpha = 1;
        ctx.fillStyle = C.bandana;
        ctx.fillRect(0, y, View.width, 2);
        ctx.fillRect(0, y + h - 2, View.width, 2);
    }

    #warning(ctx, y, age) {
        this.#band(ctx, y, 52);
        if ((age >> 3) & 1) this.font.draw(ctx, 'WARNING', View.width / 2, y + 8, { align: 'center', color: C.bandana });
        ctx.fillStyle = C.yellow;
        for (let x = -20 + (age % 16); x < View.width; x += 16) {
            ctx.beginPath();
            ctx.moveTo(x, y + 2);
            ctx.lineTo(x + 6, y + 2);
            ctx.lineTo(x + 2, y + 6);
            ctx.lineTo(x - 4, y + 6);
            ctx.fill();
        }
    }
}

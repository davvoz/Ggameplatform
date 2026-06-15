/**
 * Game — orchestrator + MATCH controller.
 *
 * Match rules: a timed run with lives and a finish line.
 *   - Score = distance + tricks/combos/pickups (+ finish & time bonuses).
 *   - timeLimit seconds; reaching the finish gives a bonus (more if you're fast).
 *   - startLives; each roll-over costs a life; 0 lives → game over. Extra lives
 *     are found on the track. Time up or finish also end the run.
 *
 * Particles & audio are cosmetic, driven by observing vehicle state each frame;
 * they never touch the deterministic physics step.
 */
import { CONFIG, FIXED_DT, MAX_SUBSTEPS } from '../config/GameConfig.js';
import { Vehicle } from './Vehicle.js';
import { rot } from './utils.js';
import { segmentInfo, terrainHeight, currentMap, setMap, setSeed, SEG_LEN } from './Terrain.js';
import { MAPS } from '../config/maps.js';
import { activeCar } from '../config/cars.js';
import { Progress } from './Progress.js';
import { Renderer } from '../render/Renderer.js';
import { InputManager } from '../systems/InputManager.js';
import { ParticleSystem } from '../systems/ParticleSystem.js';
import { AudioManager } from '../systems/AudioManager.js';
import { TrackObjects } from '../systems/TrackObjects.js';
import { Hud } from '../ui/Hud.js';
import { PlatformBridge } from '../platform/PlatformBridge.js';

export class Game {
  static async create(canvas) {
    const game = new Game(canvas);
    await game.init();
    return game;
  }

  constructor(canvas) {
    this.renderer = new Renderer(canvas);
    this.vehicle = new Vehicle();
    this.hud = new Hud();
    this.particles = new ParticleSystem();
    this.audio = new AudioManager();
    this.track = new TrackObjects();
    this.bridge = new PlatformBridge();
    this.input = new InputManager({ onReset: () => this.restart() });

    this.vehicle.onTrick = (text) => {
      this.hud.showTrick(text); this.audio.trick(); this.particles.spark(this.vehicle.car.x, this.vehicle.car.y);
      if (!/BAD|INCOMPLETE|TOO SLOW/.test(text)) this._runStats.tricks++;   // count landed tricks for XP
    };
    this.vehicle.onCrash = () => this._onCrash();
    this.vehicle.onCannon = () => this._onCannon();

    this.match = this._freshMatch();
    this.paused = false;
    this.inMenu = true;        // boots into the menu; startMatch() begins a run
    this.mode = 'story';       // 'story' (unlocks, no leaderboard) | 'ranked' (weekly map, real score)
    this._rankedMeta = null;    // server week kept so PLAY AGAIN replays the same weekly seed
    this.mapIndex = 0;
    this.onOpenMenu = null;    // wired by main.js → shows the menu overlay
    this._devStart = Number(new URLSearchParams(location.search).get('start')) || 0;
    this._countdown = 0;       // race-start 3·2·1·GO! (seconds left); 0 = running
    this._countNum = null;
    this._runStats = { coins: 0, tricks: 0 };   // per-run XP tally (gems/stars/tricks)
    this._last = 0;
    this._acc = 0;
    this._frame = 0;
    this._prevGrounded = true;
    this._prevCrashed = false;
    this._airMinVy = 0;
    this._lastSegK = -1;
    this._scoreTimer = 0;
    this._loop = this._loop.bind(this);
  }

  _freshMatch() {
    return {
      timeLeft: CONFIG.timeLimit,
      lives: CONFIG.startLives,
      finishX: CONFIG.levelLength,
      finished: false,
      gameOver: false,
    };
  }

  async init() {
    this.input.bindButtons();

    const unlock = () => {
      this.audio.unlock();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('touchstart', unlock);

    this.hud.onRestart(() => this.restart());
    this.hud.onMenu(() => this.openMenu());

    await this.bridge.init({
      onPause:  () => { this.paused = true; },
      onResume: () => { this.paused = false; },
    });

    this._last = performance.now();
    requestAnimationFrame(this._loop);
  }

  /**
   * Begin a run on map `mapIndex` in 'story' or 'ranked' mode.
   * @param {Object} [rankedMeta] server week from RankedApi.getWeek():
   *        { week_id, map_index, seed } — applied (seed override) only in ranked.
   */
  startMatch(mapIndex, mode, rankedMeta = null) {
    const n = MAPS.length;
    this.mapIndex = ((Math.round(mapIndex) % n) + n) % n;
    this.mode = mode;
    setMap(this.mapIndex);
    // RANKED: play the exact server-seeded weekly track (overrides the map's own
    // seed). The score is submitted via the normal platform session (gameOver),
    // where the server validates it before it counts on the leaderboard.
    this._rankedMeta = (mode === 'ranked') ? rankedMeta : null;   // kept so PLAY AGAIN replays the same week
    if (mode === 'ranked' && rankedMeta && rankedMeta.seed) setSeed(rankedMeta.seed >>> 0);
    this.vehicle.reset(0, true);
    this.track.reset();
    this.match = this._freshMatch();
    this._prevGrounded = true;
    this._prevCrashed = false;
    this._airMinVy = 0;
    this._lastSegK = -1;
    this._scoreTimer = 0;
    this._runStats = { coins: 0, tricks: 0 };
    this.hud.hideGameOver();
    this.inMenu = false;
    this.bridge.startRun();
    this.hud.showZone(currentMap().name);
    // race start: 3·2·1·GO! — the car is held on the line until GO
    this._countdown = 3;
    this._countNum = null;
    // dev helper: ?start=800 spawns at 800 m (level inspection / screenshots)
    const atX = this._devStart > 0 ? this._devStart : 0;
    if (atX > 0) this.vehicle.reset(atX, true);
    this.renderer.cam.x = atX;
    this.renderer.cam.y = terrainHeight(atX) + 2.4;
  }

  restart() {
    if (this.inMenu) return;
    this.startMatch(this.mapIndex, this.mode, this._rankedMeta);   // ranked: replay the same weekly seed
  }

  openMenu() {
    this.inMenu = true;
    this.hud.hideGameOver();
    this.hud.hideCountdown();
    if (this.onOpenMenu) this.onOpenMenu();
  }

  _loop(now) {
    let dt = (now - this._last) / 1000;
    this._last = now;
    if (dt > 0.1) dt = 0.1;

    // menu: scenic idle pan of the current map behind the overlay
    if (this.inMenu) {
      const cam = this.renderer.cam;
      cam.x += dt * 3;
      cam.y += (terrainHeight(cam.x) + 2.6 - cam.y) * 0.04;
      this.track.ensure(cam.x);
      this.renderer.draw({
        vehicle: this.vehicle, particles: this.particles, track: this.track,
        time: now / 1000, finishX: null, braking: false, boosting: false,
      });
      requestAnimationFrame(this._loop);
      return;
    }

    const m = this.match;
    if (!this.paused && !m.gameOver && this._countdown > 0) {
      // ── race start countdown: hold the car on the line (no driving), timer frozen
      this._countdown -= dt;
      this._acc += dt;
      let guard = 0;
      while (this._acc >= FIXED_DT && guard < MAX_SUBSTEPS) {
        this.vehicle.step(FIXED_DT, 0, false);   // settle on the line, ignore input
        this._acc -= FIXED_DT;
        guard++;
      }
      this.particles.update(dt);
      if (this._countdown <= 0) {
        this.hud.hideCountdown(); this.hud.showTrick('GO!'); this.audio.beep(900, 0.20); this._countNum = 0;
      } else {
        const nC = Math.ceil(this._countdown);
        if (nC !== this._countNum) { this.hud.showCountdown(nC); this.audio.beep(460, 0.12); this._countNum = nC; }
      }
    } else if (!this.paused && !m.gameOver) {
      this._acc += dt;
      let guard = 0;
      while (this._acc >= FIXED_DT && guard < MAX_SUBSTEPS) {
        this.vehicle.step(FIXED_DT, this.input.input, this.input.boosting);
        this._acc -= FIXED_DT;
        guard++;
      }
      this._effects(dt);

      // zone banner when entering a new designed zone
      const k = Math.floor(this.vehicle.car.x / SEG_LEN);
      if (k !== this._lastSegK) {
        this._lastSegK = k;
        const info = segmentInfo(k);
        if (info.zone) this.hud.showZone(info.zone);
      }

      // live score to the platform HUD (~1/s) — RANKED only (free ride doesn't compete)
      if (this.mode === 'ranked') {
        this._scoreTimer += dt;
        if (this._scoreTimer >= 1) {
          this._scoreTimer = 0;
          const dist = Math.max(0, Math.round(this.vehicle.car.x));
          this.bridge.sendScore(dist + Math.round(this.vehicle.run.trickScore));
        }
      }

      // match timer & finish line
      m.timeLeft -= dt;
      if (m.timeLeft <= 0) { m.timeLeft = 0; this._gameOver('TIME UP'); }
      else if (!m.finished && this.vehicle.car.x >= m.finishX) this._finish();
    }

    this.renderer.followCamera(this.vehicle);
    this.renderer.draw({
      vehicle: this.vehicle,
      particles: this.particles,
      track: this.track,
      time: now / 1000,
      finishX: m.finishX,
      braking: this.input.input < 0,
      boosting: this.input.boosting && this.vehicle.run.boost > 0,
    });
    this.hud.update(this.vehicle, m);

    requestAnimationFrame(this._loop);
  }

  _onCrash() {
    const m = this.match;
    m.lives -= 1;
    this.renderer.kick(1);
    if (m.lives <= 0) { m.lives = 0; this._gameOver('CRASHED OUT'); return; }
    setTimeout(() => { if (!m.gameOver) this.vehicle.reset(Math.max(0, this.vehicle.car.x - 3)); }, 900);
  }

  /** The cannon fired: muzzle blast FX + a bit of boost for the flight. */
  _onCannon() {
    const car = this.vehicle.car, run = this.vehicle.run;
    this.hud.showTrick('BOOM!');
    this.audio.crash();
    this.renderer.kick(0.8);
    run.boost = Math.min(CONFIG.maxBoost, run.boost + 15);
    const back = rot(-1, 0, car.a);
    for (let i = 0; i < 6; i++) this.particles.flame(car.x + back.x, car.y + back.y, back.x, back.y);
    this.particles.impact(car.x + back.x * 1.5, car.y + back.y * 1.5, 1);
  }

  _finish() {
    const m = this.match;
    m.finished = true;
    const timeBonus = Math.round(m.timeLeft * CONFIG.timeBonusPerSec);
    this.vehicle.run.trickScore += CONFIG.finishBonus + timeBonus;
    this.particles.confetti(this.vehicle.car.x + 1.5, this.vehicle.car.y + 2.5);
    this._gameOver('FINISH!', { finishBonus: CONFIG.finishBonus, timeBonus });
  }

  _gameOver(reason, extra = {}) {
    const m = this.match;
    if (m.gameOver) return;
    m.gameOver = true;
    this.audio.setBoost(false);
    const dist = Math.max(0, Math.round(this.vehicle.car.x));
    const finalScore = dist + Math.round(this.vehicle.run.trickScore);
    Progress.setBest(this.mapIndex, finalScore);
    let unlockedName = null;
    if (m.finished && this.mode === 'story') {
      const ni = Progress.onStoryFinish(this.mapIndex, MAPS.length);
      if (ni >= 0) unlockedName = MAPS[ni].name;
    }
    this.hud.showGameOver({ reason, score: finalScore, distance: dist, unlockedName, ...extra });
    // FREE RIDE → score 0 (no leaderboard) but the session still grants XP from
    // coins/tricks/finish · RANKED → real score on the leaderboard.
    this.bridge.gameOver(finalScore, {
      distance: dist,
      coins: this._runStats.coins,
      tricks: this._runStats.tricks,
      levelsCompleted: m.finished ? 1 : 0,
      map: currentMap().id,
      car: activeCar().id,   // which car was used (for the future ranked replay validator)
    }, this.mode === 'ranked' ? 'ranked' : 'free');
  }

  /** Cosmetic effects + collectibles, driven by observing vehicle state. */
  _effects(dt) {
    const car = this.vehicle.car, run = this.vehicle.run;
    const grounded = run.wasGrounded;
    const spd = Math.hypot(car.vx, car.vy);
    const boosting = this.input.boosting && run.boost > 0;

    const back = rot(-1.0, 0, car.a);
    const rx = car.x + back.x, ry = car.y + back.y;

    if (!grounded) this._airMinVy = Math.min(this._airMinVy, car.vy);

    if (boosting) this.particles.flame(rx, ry, back.x, back.y);
    if (grounded && spd > 5 && (this._frame & 1) === 0) this.particles.dust(rx, ry - 0.3, car.vx);
    if (grounded && this.input.input < 0 && spd > 8 && (this._frame & 1) === 1) this.particles.smoke(rx, ry - 0.3, car.vx);

    if (!this._prevGrounded && grounded) {
      const intensity = Math.min(1, Math.abs(this._airMinVy) / 14);
      if (intensity > 0.12) {
        this.particles.impact(car.x, car.y - 0.4, intensity);
        this.audio.land(intensity);
        this.renderer.kick(intensity * 0.7);
      }
    }
    if (grounded) this._airMinVy = 0;

    if (this.vehicle.crashed && !this._prevCrashed) { this.audio.crash(); this.particles.impact(car.x, car.y, 1); }
    this._prevCrashed = this.vehicle.crashed;
    this._prevGrounded = grounded;

    this.audio.setBoost(boosting);
    this.track.update(car, (o) => this._onCollect(o));
    this.particles.update(dt);
    this._frame++;
  }

  /** Apply score / boost / impulses / FX when the car hits a track object. */
  _onCollect(o) {
    const run = this.vehicle.run, car = this.vehicle.car;
    if (o.type === 'boostpad') {
      const f = rot(1, 0, car.a);
      car.vx += f.x * 9; car.vy += f.y * 9;
      run.boost = Math.min(CONFIG.maxBoost, run.boost + 15);
      this.hud.showTrick('TURBO!'); this.audio.trick(); this.particles.flame(o.x, o.y, -f.x, -f.y);
      return;
    }
    if (o.type === 'spring') {
      const vIn = Math.max(0, -car.vy);
      car.vy = (o.power || 15) + Math.min(11, vIn * 0.7);
      car.vx += rot(1, 0, car.a).x * 2;
      this.hud.showTrick(o.super ? 'SUPER BOING!' : 'BOING!');
      this.audio.boing(); this.particles.impact(o.x, o.y, o.super ? 1 : 0.6);
      if (o.super) this.renderer.kick(0.5);
      return;
    }
    if (o.type === 'gate') {
      const spd = Math.hypot(car.vx, car.vy);
      if (spd >= 18) {
        const pts = Math.round(150 * run.multiplier);
        run.trickScore += pts;
        run.comboTimer = CONFIG.comboWindow;
        this.hud.showTrick(`SPEED GATE +${pts}  (x${run.multiplier})`);
        run.multiplier = Math.min(CONFIG.maxMultiplier, run.multiplier + 1);
        this.audio.trick(); this.particles.spark(o.x, o.y + 1, '#7ce8ff');
      } else {
        this.hud.showTrick('TOO SLOW…');
      }
      return;
    }
    if (o.type === 'life') {
      this.match.lives = Math.min(CONFIG.maxLives, this.match.lives + 1);
      this.hud.showTrick('+1 LIFE'); this.audio.trick(); this.particles.spark(o.x, o.y, '#ff6b8a');
      return;
    }
    if (o.type === 'star') {
      const pts = Math.round(o.value * run.multiplier);
      run.trickScore += pts;
      run.comboTimer = CONFIG.comboWindow;
      this._runStats.coins += 3;
      this.hud.showTrick(`STAR +${pts}  (x${run.multiplier})`);
      run.multiplier = Math.min(CONFIG.maxMultiplier, run.multiplier + 1);
      this.audio.trick(); this.particles.spark(o.x, o.y, '#ffd24a');
    } else if (o.type === 'gem') {
      run.trickScore += o.value;
      this._runStats.coins += 1;
      if (run.multiplier > 1) run.comboTimer = CONFIG.comboWindow;
      this.hud.showTrick(`+${o.value}`); this.audio.trick(); this.particles.spark(o.x, o.y);
    }
  }
}

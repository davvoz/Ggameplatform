/**
 * Hud — DOM UI: score, distance, speed, best, boost bar, combo (+ timer bar),
 * timer (countdown), lives (hearts), trick popups, zone banners, "CRASHED"
 * overlay and the Game Over screen. DOM updates run at ~15 Hz to avoid reflow.
 */
import { CONFIG } from '../config/GameConfig.js';

const REASON_ICONS = { 'FINISH!': '🏁', 'TIME UP': '⏰', 'CRASHED OUT': '💥' };

export class Hud {
  constructor() {
    this.el = {
      score: document.getElementById('hud-score'),
      dist: document.getElementById('hud-dist'),
      spd: document.getElementById('hud-spd'),
      best: document.getElementById('hud-best'),
      boost: document.getElementById('hud-boostbar'),
      combo: document.getElementById('hud-combo'),
      combobar: document.getElementById('hud-combobar'),
      combobarWrap: document.querySelector('.combobar'),
      trick: document.getElementById('hud-trick'),
      zone: document.getElementById('hud-zone'),
      count: document.getElementById('hud-count'),
      crash: document.getElementById('hud-crash'),
      timer: document.getElementById('hud-timer'),
      lives: document.getElementById('hud-lives'),
      gameover: document.getElementById('gameover'),
      goReason: document.getElementById('go-reason'),
      goScore: document.getElementById('go-score'),
      goDetail: document.getElementById('go-detail'),
      goUnlock: document.getElementById('go-unlock'),
      goRestart: document.getElementById('go-restart'),
      goMenu: document.getElementById('go-menu'),
    };
    this._tick = 0;
    this._lastTrickAt = -10;
  }

  onRestart(cb) {
    if (this.el.goRestart) this.el.goRestart.addEventListener('click', cb);
  }

  onMenu(cb) {
    if (this.el.goMenu) this.el.goMenu.addEventListener('click', cb);
  }

  showTrick(text) {
    this._lastTrickAt = performance.now();
    const t = this.el.trick;
    if (t) {
      t.textContent = text;
      t.style.opacity = '1';
      t.classList.remove('pop');      // retrigger the scale-pop animation
      void t.offsetWidth;
      t.classList.add('pop');
    }
  }

  /** Race-start countdown number (3·2·1) — re-pops on each change. */
  showCountdown(text) {
    const e = this.el.count;
    if (!e) return;
    e.textContent = text;
    e.style.display = 'block';
    e.classList.remove('pop');
    void e.offsetWidth;
    e.classList.add('pop');
  }

  hideCountdown() {
    if (this.el.count) this.el.count.style.display = 'none';
  }

  /** Big zone banner ("TRICK PARK", "FINAL SPRINT", ...) — CSS-animated. */
  showZone(name) {
    const z = this.el.zone;
    if (!z) return;
    z.textContent = name;
    z.classList.remove('show');
    void z.offsetWidth;
    z.classList.add('show');
  }

  showGameOver({ reason, score, distance, finishBonus, timeBonus, unlockedName }) {
    const e = this.el;
    if (e.goReason) {
      const icon = REASON_ICONS[reason] || '';
      e.goReason.textContent = icon ? `${icon} ${reason}` : (reason || 'GAME OVER');
    }
    if (e.goScore) e.goScore.textContent = score.toLocaleString('en-US');
    if (e.goDetail) {
      const parts = [`${distance} m`];
      if (finishBonus) parts.push(`finish +${finishBonus}`);
      if (timeBonus) parts.push(`time +${timeBonus}`);
      e.goDetail.textContent = parts.join('  ·  ');
    }
    if (e.goUnlock) {
      if (unlockedName) {
        e.goUnlock.textContent = `★ NEW MAP UNLOCKED: ${unlockedName}`;
        e.goUnlock.style.display = 'block';
      } else {
        e.goUnlock.style.display = 'none';
      }
    }
    if (e.gameover) e.gameover.style.display = 'flex';
  }

  hideGameOver() {
    if (this.el.gameover) this.el.gameover.style.display = 'none';
  }

  update(vehicle, match) {
    const car = vehicle.car, run = vehicle.run;
    const dist = Math.max(0, Math.round(car.x));
    const total = dist + Math.round(run.trickScore);
    if (total > run.bestScore) run.bestScore = total;

    this._tick = (this._tick + 1) & 3;
    if (this._tick === 0) {
      this._set(this.el.score, total);
      this._set(this.el.dist, dist);
      this._set(this.el.spd, Math.round(Math.hypot(car.vx, car.vy) * 3.6));
      this._set(this.el.best, run.bestScore);
      if (this.el.boost) {
        this.el.boost.style.width = (run.boost / CONFIG.maxBoost * 100) + '%';
        this.el.boost.classList.toggle('full', run.boost >= CONFIG.maxBoost - 0.5);
      }

      const mult = run.multiplier;
      this._set(this.el.combo, mult > 1 ? ('COMBO x' + mult) : '');
      if (this.el.combobarWrap) {
        if (mult > 1) {
          this.el.combobarWrap.style.display = 'block';
          this.el.combobar.style.width = Math.max(0, Math.min(1, run.comboTimer / CONFIG.comboWindow)) * 100 + '%';
        } else {
          this.el.combobarWrap.style.display = 'none';
        }
      }

      if (match) {
        const t = Math.max(0, match.timeLeft);
        const mm = Math.floor(t / 60), sec = Math.floor(t % 60);
        this._set(this.el.timer, `${mm}:${sec < 10 ? '0' : ''}${sec}`);
        if (this.el.timer) this.el.timer.classList.toggle('low', t <= 10);
        this._set(this.el.lives, '❤'.repeat(Math.max(0, match.lives)));
      }

      const age = (performance.now() - this._lastTrickAt) / 1000;
      if (this.el.trick) this.el.trick.style.opacity = age < 1.3 ? String(1 - age / 1.3) : '0';
    }

    if (this.el.crash) this.el.crash.style.display = (vehicle.crashed && !(match && match.gameOver)) ? 'flex' : 'none';
  }

  _set(el, v) { if (el && el.textContent !== String(v)) el.textContent = v; }
}

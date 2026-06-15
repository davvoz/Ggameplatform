/**
 * InputManager — keyboard (→ gas, ← brake, ↑/Space boost, R reset) and touch
 * (BRAKE / GAS / BOOST buttons). Exposes `input` (-1/0/+1) and `boosting`.
 */
export class InputManager {
  constructor({ onReset } = {}) {
    this.input = 0;
    this.boosting = false;
    this.onReset = onReset || (() => {});
    this._keys = {};

    // Keys we handle — block their default (page scroll, button activation on Space)
    const HANDLED = new Set([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

    window.addEventListener('keydown', (e) => {
      if (HANDLED.has(e.key)) e.preventDefault();
      this._keys[e.key] = true;
      if (e.key === 'r' || e.key === 'R') this.onReset();
      this._update();
    });
    window.addEventListener('keyup', (e) => {
      if (HANDLED.has(e.key)) e.preventDefault();
      this._keys[e.key] = false;
      this._update();
    });
  }

  _update() {
    if (this._keys['ArrowRight']) this.input = 1;
    else if (this._keys['ArrowLeft']) this.input = -1;
    else this.input = 0;
    this.boosting = !!(this._keys[' '] || this._keys['ArrowUp']);
  }

  /** Wire the touch/mouse buttons (call after the DOM is ready). */
  bindButtons({ brakeId = 'btn-brake', gasId = 'btn-gas', boostId = 'btn-boost' } = {}) {
    this._bindHold(brakeId, () => { this.input = -1; }, () => { if (this.input === -1) this.input = 0; });
    this._bindHold(gasId, () => { this.input = 1; }, () => { if (this.input === 1) this.input = 0; });
    const boostEl = document.getElementById(boostId);
    this._bindHold(boostId,
      () => { this.boosting = true; boostEl && boostEl.classList.add('on'); },
      () => { this.boosting = false; boostEl && boostEl.classList.remove('on'); });
  }

  _bindHold(id, on, off) {
    const el = document.getElementById(id);
    if (!el) return;
    const onE = (e) => { e.preventDefault(); on(); };
    const offE = (e) => { e.preventDefault(); off(); };
    el.addEventListener('touchstart', onE, { passive: false });
    el.addEventListener('touchend', offE, { passive: false });
    el.addEventListener('mousedown', onE);
    el.addEventListener('mouseup', offE);
    el.addEventListener('mouseleave', offE);
  }
}

/**
 * Menu — title screen + FREE RIDE map grid (locks + personal bests) + RANKED
 * (weekly map) + GARAGE (buy/select cars with platform coins). Pure DOM; the
 * game world keeps rendering behind the overlay.
 */
import { MAPS, weeklyMapIndex } from '../config/maps.js';
import { Progress } from '../core/Progress.js';
import { CARS } from '../config/cars.js';
import { getWeek } from '../platform/RankedApi.js';

export class Menu {
  /** @param {import('../core/Garage.js').Garage} garage */
  constructor(garage) {
    this.garage = garage;
    this.el = {
      root: document.getElementById('menu'),
      home: document.getElementById('menu-home'),
      gridWrap: document.getElementById('menu-grid-wrap'),
      grid: document.getElementById('menu-grid'),
      garageWrap: document.getElementById('menu-garage-wrap'),
      carGrid: document.getElementById('menu-car-grid'),
      balance: document.getElementById('garage-balance'),
      story: document.getElementById('btn-story'),
      ranked: document.getElementById('btn-ranked'),
      garageBtn: document.getElementById('btn-garage'),
      rankedMap: document.getElementById('ranked-map'),
      back: document.getElementById('btn-menu-back'),
      garageBack: document.getElementById('btn-garage-back'),
    };
    this.onPlay = null;   // (mapIndex, 'story'|'ranked', rankedMeta?) => void
    this._week = null;    // server week { week_id, map_index, map_name, seed } (cached)

    if (this.el.story) this.el.story.addEventListener('click', () => this._showGrid());
    if (this.el.back) this.el.back.addEventListener('click', () => this._showHome());
    if (this.el.garageBtn) this.el.garageBtn.addEventListener('click', () => this._showGarage());
    if (this.el.garageBack) this.el.garageBack.addEventListener('click', () => this._showHome());
    if (this.el.ranked) {
      this.el.ranked.addEventListener('click', () => this._playRanked());
    }
  }

  show() {
    if (!this.el.root) return;
    // label the weekly map from the local roster immediately, then refine from
    // the server (the ranked backend dictates the real map+seed of the week).
    if (this.el.rankedMap) this.el.rankedMap.textContent = MAPS[weeklyMapIndex()].name;
    this._loadWeek();
    this._showHome();
    this.el.root.style.display = 'flex';
  }

  async _loadWeek() {
    const wk = await getWeek();
    if (!wk) return;
    this._week = wk;
    if (this.el.rankedMap) this.el.rankedMap.textContent = wk.map_name || MAPS[wk.map_index]?.name || '—';
  }

  /** Launch RANKED on the server-seeded weekly track (falls back to local if offline). */
  async _playRanked() {
    if (!this.onPlay) return;
    const wk = this._week || await getWeek();
    if (wk) this.onPlay(wk.map_index, 'ranked', wk);
    else this.onPlay(weeklyMapIndex(), 'ranked', null);   // offline: local weekly map, no server score
  }

  hide() { if (this.el.root) this.el.root.style.display = 'none'; }

  _showHome() {
    if (this.el.home) this.el.home.style.display = 'flex';
    if (this.el.gridWrap) this.el.gridWrap.style.display = 'none';
    if (this.el.garageWrap) this.el.garageWrap.style.display = 'none';
  }

  _showGrid() {
    this._buildGrid();
    if (this.el.home) this.el.home.style.display = 'none';
    if (this.el.garageWrap) this.el.garageWrap.style.display = 'none';
    if (this.el.gridWrap) this.el.gridWrap.style.display = 'flex';
  }

  async _showGarage() {
    if (this.el.home) this.el.home.style.display = 'none';
    if (this.el.gridWrap) this.el.gridWrap.style.display = 'none';
    if (this.el.garageWrap) this.el.garageWrap.style.display = 'flex';
    this._buildGarage();                       // render immediately (with cached data)
    if (this.garage) { await this.garage.fetchBalance(); await this.garage.syncPurchases(); this._buildGarage(); }
  }

  _buildGrid() {
    const grid = this.el.grid;
    if (!grid) return;
    grid.innerHTML = '';
    const unlocked = Progress.unlockedCount(MAPS.length);
    MAPS.forEach((m, i) => {
      const open = i < unlocked;
      const card = document.createElement('button');
      card.className = 'map-card' + (open ? '' : ' locked');
      card.style.background = `linear-gradient(160deg, rgb(${m.biome.skyTop[0].join(',')}), ${m.biome.grassMid})`;
      const best = Progress.best(i);
      card.innerHTML = `
        <span class="map-num">${i + 1}</span>
        <span class="map-name">${m.name}</span>
        <span class="map-sub">${open ? (best ? 'BEST ' + best.toLocaleString('en-US') : 'not finished yet') : '🔒 finish the previous map'}</span>`;
      if (open) card.addEventListener('click', () => { if (this.onPlay) this.onPlay(i, 'story'); });
      grid.appendChild(card);
    });
  }

  _buildGarage() {
    const grid = this.el.carGrid, g = this.garage;
    if (!grid || !g) return;
    if (this.el.balance) this.el.balance.textContent = `🪙 ${g.balance.toLocaleString('en-US')}`;
    grid.innerHTML = '';
    const bar = (v) => Math.round(Math.max(0, Math.min(1, (v - 0.8) / 0.45)) * 100);  // 0.8..1.25 → 0..100%
    for (const car of CARS) {
      const owned = g.isOwned(car.id), sel = g.selectedId === car.id;
      const card = document.createElement('div');
      card.className = 'car-card' + (sel ? ' selected' : '');
      const s = car.stats;
      card.innerHTML = `
        <canvas class="car-canvas" width="240" height="92"></canvas>
        <div class="car-head"><span class="car-name">${car.name}</span></div>
        <div class="car-blurb">${car.blurb}</div>
        <div class="car-stats">
          ${[['ACC', s.accel], ['SPD', s.maxSpeed], ['GRIP', s.grip], ['BST', s.boost]]
            .map(([k, v]) => `<div class="car-stat"><span>${k}</span><i><b style="width:${bar(v)}%"></b></i></div>`).join('')}
        </div>
        <button class="car-action">${sel ? 'SELECTED' : owned ? 'SELECT' : '🪙 ' + car.price}</button>`;
      const cv = card.querySelector('.car-canvas');
      if (cv && this.previewCar) this.previewCar(cv, car.id);
      const btn = card.querySelector('.car-action');
      if (sel) {
        btn.disabled = true;
      } else if (owned) {
        btn.addEventListener('click', () => { g.select(car.id); this._buildGarage(); });
      } else {
        btn.addEventListener('click', async () => {
          btn.disabled = true; btn.textContent = '…';
          const res = await g.purchase(car.id);
          if (res.ok) { g.select(car.id); }
          else if (res.reason === 'insufficient') { btn.textContent = 'NOT ENOUGH 🪙'; setTimeout(() => this._buildGarage(), 1200); return; }
          else { btn.textContent = 'ERROR'; setTimeout(() => this._buildGarage(), 1200); return; }
          this._buildGarage();
        });
      }
      grid.appendChild(card);
    }
  }
}

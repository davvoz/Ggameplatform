/**
 * Garage — owns the player's cars: balance, purchases and selection.
 *
 * Cars are bought with PLATFORM coins via the shared REST API (same pattern as
 * survivor-arena), NOT local progress:
 *   GET  /api/coins/{userId}/balance               → { balance }
 *   GET  /api/coins/{userId}/purchases/stunthill   → { purchased_themes: [carId] }
 *   POST /api/coins/{userId}/spend                 → { balance_after }   (400 = insufficient)
 *     body: { amount, transaction_type:'shop_purchase', source_id:'stunthill_theme_<id>', ... }
 * (The backend keys purchases off source_id LIKE 'stunthill_theme_%'.)
 *
 * Ownership lives on the server; only the SELECTED car id is cached locally.
 */
import { CARS, CAR_BY_ID, setActiveCar } from '../config/cars.js';

const GAME_KEY = 'stunthill';                 // must match the source_id prefix + /purchases/<key>
const SEL_KEY = 'stunt_hill_selected_car';

export class Garage {
  constructor() {
    this.owned = new Set(['rookie']);         // rookie is free / always owned
    this.balance = 0;
    this.selectedId = 'rookie';
    this._retries = 0;
  }

  /** Load the saved selection and sync ownership from the server. */
  async init() {
    try {
      const saved = localStorage.getItem(SEL_KEY);
      if (saved && CAR_BY_ID[saved]) this.selectedId = saved;
    } catch { /* sandboxed */ }
    setActiveCar(this.selectedId);
    await this.syncPurchases();
    // if the saved car isn't actually owned (e.g. cleared server-side), fall back
    if (!this.owned.has(this.selectedId)) this.select('rookie');
    return this;
  }

  _userId() {
    return (typeof globalThis !== 'undefined' && globalThis.platformConfig?.userId) || null;
  }

  async fetchBalance() {
    const uid = this._userId();
    if (!uid) return 0;
    try {
      const r = await fetch(`/api/coins/${encodeURIComponent(uid)}/balance`);
      if (r.ok) { this.balance = (await r.json()).balance || 0; }
    } catch (e) { console.warn('[Garage] balance error', e); }
    return this.balance;
  }

  async syncPurchases() {
    const uid = this._userId();
    if (!uid) {                               // platform config not ready yet → retry a few times
      if (this._retries < 20) { this._retries++; setTimeout(() => this.syncPurchases(), 1000); }
      return;
    }
    try {
      const r = await fetch(`/api/coins/${encodeURIComponent(uid)}/purchases/${GAME_KEY}`);
      if (r.ok) {
        const data = await r.json();
        this.owned = new Set(['rookie']);
        for (const id of (data.purchased_themes || [])) if (CAR_BY_ID[id]) this.owned.add(id);
      }
    } catch (e) { console.warn('[Garage] purchases error', e); }
  }

  isOwned(id) { return this.owned.has(id); }
  selected() { return CAR_BY_ID[this.selectedId] || CARS[0]; }

  /** Select an owned car (becomes the active car for Vehicle/Renderer). */
  select(id) {
    if (!CAR_BY_ID[id] || !this.owned.has(id)) return false;
    this.selectedId = id;
    setActiveCar(id);
    try { localStorage.setItem(SEL_KEY, id); } catch { /* sandboxed */ }
    return true;
  }

  /**
   * Buy a car with platform coins.
   * @returns {Promise<{ok:boolean, reason?:string, balance?:number}>}
   */
  async purchase(id) {
    const car = CAR_BY_ID[id];
    if (!car) return { ok: false, reason: 'unknown' };
    if (this.owned.has(id)) return { ok: true, reason: 'owned' };
    const uid = this._userId();
    if (!uid) return { ok: false, reason: 'no_user' };

    // re-check server ownership before spending (avoid double-charge)
    try {
      const chk = await fetch(`/api/coins/${encodeURIComponent(uid)}/purchases/${GAME_KEY}`);
      if (chk.ok && (await chk.json()).purchased_themes?.includes(id)) {
        this.owned.add(id); return { ok: true, reason: 'owned' };
      }
    } catch { /* continue */ }

    try {
      const r = await fetch(`/api/coins/${encodeURIComponent(uid)}/spend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: car.price,
          transaction_type: 'shop_purchase',
          source_id: `${GAME_KEY}_theme_${id}`,
          description: `Stunt Hill - ${car.name}`,
          extra_data: { game: 'stunt_hill', car_id: id },
        }),
      });
      if (r.ok) {
        const data = await r.json();
        this.owned.add(id);
        this.balance = data.balance_after ?? (this.balance - car.price);
        return { ok: true, balance: this.balance };
      }
      if (r.status === 400) return { ok: false, reason: 'insufficient' };
    } catch (e) { console.error('[Garage] purchase error', e); }
    return { ok: false, reason: 'error' };
  }
}

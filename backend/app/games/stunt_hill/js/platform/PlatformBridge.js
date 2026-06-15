/**
 * PlatformBridge — integration layer with the platform (SDK over postMessage).
 *
 * Mirrors the altitude pattern:
 *   - init(): initializes the SDK (sends `ready`, receives `config` with the user).
 *   - startRun(): signals a new run (creates the session on the platform side).
 *   - gameOver(score, stats, mode): ends the run.
 *
 * RANKED-ONLY LEADERBOARD: in any mode other than 'ranked' the submitted score is 0,
 * so the platform leaderboard is never touched (Free Ride = practice).
 */
export class PlatformBridge {
  #sdk = null;
  #initialized = false;
  #player = { username: 'Player', id: null };

  constructor() {
    this.#sdk = globalThis.PlatformSDK || null;
  }

  get isConnected() { return this.#sdk !== null && this.#initialized; }
  get player() { return this.#player; }

  async init(callbacks = {}) {
    if (this.#initialized) return true;
    if (!this.#sdk) {
      console.warn('[StuntHill] SDK not loaded — standalone mode');
      this.#initialized = true;
      return false;
    }
    try {
      // Capture the config (userId/username) when it arrives from the platform
      if (typeof this.#sdk.on === 'function') {
        this.#sdk.on('config', (cfg) => this.#applyConfig(cfg));
      }
      await this.#sdk.init({
        onStart:  callbacks.onStart  || (() => {}),
        onPause:  callbacks.onPause  || (() => {}),
        onResume: callbacks.onResume || (() => {}),
        onExit:   callbacks.onExit   || (() => {}),
      });
      // The config may have already arrived
      if (globalThis.platformConfig) this.#applyConfig(globalThis.platformConfig);
      this.#initialized = true;
      return true;
    } catch (err) {
      console.error('[StuntHill] SDK init error:', err);
      this.#initialized = true;
      return false;
    }
  }

  #applyConfig(cfg) {
    if (!cfg) return;
    this.#player = {
      username: cfg.username || cfg.user_name || 'Player',
      id: cfg.userId || cfg.user_id || null,
    };
  }

  /** Tell the platform a new run is starting (creates the session). */
  async startRun() {
    if (this.#sdk && typeof this.#sdk.resetSession === 'function') {
      try { await this.#sdk.resetSession(); } catch (e) { console.error(e); }
    }
  }

  /** Live score update (platform HUD). Informational only. */
  sendScore(score) {
    if (this.#sdk && typeof this.#sdk.sendScore === 'function') {
      this.#sdk.sendScore(Math.floor(score));
    }
  }

  /**
   * End the run — ALWAYS sends a session (so the player earns XP), like altitude.
   * The platform's cumulative XP system reads `extra_data` (distance, coins, …);
   * the LEADERBOARD reads the `score` argument.
   *
   * RANKED: real score + real distance → counts on the leaderboard.
   * FREE RIDE: score 0 + distance 0 → NOT on the leaderboard, but coins/tricks/
   *   levels are still sent so the run still grants XP.
   *
   * @param {number} score final score
   * @param {Object} stats { distance, coins, tricks, levelsCompleted, map }
   * @param {('free'|'ranked')} mode
   */
  gameOver(score, stats = {}, mode = 'free') {
    if (!this.#sdk || typeof this.#sdk.gameOver !== 'function') return;
    const ranked = mode === 'ranked';
    // extra_data drives the platform XP (distance/coins/levels) → SENT IN BOTH MODES
    // so free ride still earns XP. Only the leaderboard `score` arg is zeroed in free.
    const extra_data = {
      distance:         Math.floor(stats.distance ?? 0),
      coins_collected:  Math.floor(stats.coins ?? 0),
      levels_completed: Math.floor(stats.levelsCompleted ?? 0),
      tricks:           Math.floor(stats.tricks ?? 0),
      map:              stats.map,
      car:              stats.car,
      mode,
    };
    this.#sdk.gameOver(ranked ? Math.floor(score) : 0, { extra_data });
  }
}

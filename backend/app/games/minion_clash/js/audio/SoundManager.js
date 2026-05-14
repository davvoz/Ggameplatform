import { GameConfig } from '../config/GameConfig.js';

/**
 * Web Audio API sound manager.
 *
 * Responsibilities:
 *  - Own the AudioContext (lazily created on first play — browser requires a
 *    user gesture before constructing it).
 *  - Load a JSON manifest at boot: stores sound defs (volume, throttle,
 *    procedural type or file src) but does NOT allocate AudioBuffers yet.
 *  - On first play of a key: generate the AudioBuffer (procedural) or fetch
 *    the file, then cache it.
 *  - Per-key throttle: prevents audio spam during intense combat.
 *  - Master gain node: single point for volume control.
 *  - suspend() / resume(): called by Game on pause / resume.
 *
 * Integration:
 *  - Created and owned by Game (game.sound).
 *  - BattleWorld receives it via constructor options; exposes world.sound.
 *  - All callers use: world.sound?.play(SoundEvent.X)  (optional-chained).
 *
 * To swap procedural sounds for real audio files, change the manifest entry:
 *   "unit_attack_melee": { "src": "assets/audio/melee.ogg", "volume": 0.5 }
 */
export class SoundManager {
    /** @type {AudioContext|null} */
    _ctx = null;
    /** @type {GainNode|null} */
    _masterGain = null;
    /** @type {Map<string, AudioBuffer>} cached decoded buffers */
    _buffers = new Map();
    /**
     * @type {Map<string, {volume:number, throttle:number, procedural:string|null, src:string|null}>}
     */
    _defs = new Map();
    /** @type {Map<string, number>} last play timestamp (performance.now()) per key */
    _lastPlay = new Map();
    /** @type {Set<string>} keys whose file fetch is in progress */
    _fetching = new Set();
    _masterVolume = GameConfig.AUDIO.MASTER;

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Load sound manifest. Safe to call before any user gesture.
     * No AudioContext is created here.
     * @param {string} manifestPath  Relative URL to sounds.json
     */
    async load(manifestPath) {
        let manifest;
        try {
            const res = await fetch(manifestPath);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            manifest = await res.json();
        } catch (err) {
            console.warn('[SoundManager] manifest load failed, using defaults', err.message);
            manifest = this._defaultManifest();
        }
        if (typeof manifest.master === 'number') {
            this._masterVolume = manifest.master;
        }
        for (const [key, def] of Object.entries(manifest.sounds ?? {})) {
            this._defs.set(key, {
                volume:     def.volume     ?? 1,
                throttle:   def.throttle   ?? 0,
                procedural: def.procedural ?? null,
                src:        def.src        ?? null,
            });
        }
    }

    /**
     * Play a sound by event key. Silent no-op when the key is unknown,
     * the context is blocked, or the throttle gate is closed.
     * @param {string} key  A SoundEvent constant
     * @param {{volume?:number, detune?:number}} [opts]
     */
    play(key, opts = {}) {
        this._ensureContext();
        if (!this._ctx) return;

        const def = this._defs.get(key);
        if (!def) return;

        if (def.throttle > 0) {
            const now = performance.now();
            const last = this._lastPlay.get(key) ?? -Infinity;
            if (now - last < def.throttle) return;
            this._lastPlay.set(key, now);
        }

        const vol = def.volume * (opts.volume ?? 1);
        const detune = opts.detune ?? 0;

        if (this._buffers.has(key)) {
            this._playBuffer(this._buffers.get(key), vol, detune);
            return;
        }

        if (def.procedural) {
            // Lazily generate on first call; subsequent calls use the cache.
            const buf = this._generateProcedural(def.procedural);
            if (buf) {
                this._buffers.set(key, buf);
                this._playBuffer(buf, vol, detune);
            }
            return;
        }

        if (def.src && !this._fetching.has(key)) {
            this._fetching.add(key);
            this._fetchAndCache(key, def.src, vol, detune);
        }
    }

    /** @param {number} v  0–1 */
    setMasterVolume(v) {
        this._masterVolume = Math.max(0, Math.min(1, v));
        if (this._masterGain && this._ctx) {
            this._masterGain.gain.setTargetAtTime(
                this._masterVolume, this._ctx.currentTime, 0.02);
        }
    }

    async suspend() {
        if (this._ctx?.state === 'running') {
            await this._ctx.suspend().catch(() => {});
        }
    }

    async resume() {
        if (this._ctx?.state === 'suspended') {
            await this._ctx.resume().catch(() => {});
        }
    }

    // ── Private — context ────────────────────────────────────────────────────

    _ensureContext() {
        if (this._ctx) return;
        try {
            const Ctor = globalThis.AudioContext ?? globalThis.webkitAudioContext;
            if (!Ctor) return;
            this._ctx = new Ctor();
            this._masterGain = this._ctx.createGain();
            this._masterGain.gain.value = this._masterVolume;
            this._masterGain.connect(this._ctx.destination);
        } catch (err) {
            console.warn('[SoundManager] AudioContext unavailable', err.message);
        }
    }

    _playBuffer(buffer, volume, detune) {
        if (!this._ctx || !this._masterGain) return;
        if (this._ctx.state === 'suspended') {
            this._ctx.resume().catch(() => {});
        }
        try {
            const src = this._ctx.createBufferSource();
            src.buffer = buffer;
            if (detune) src.detune.value = detune;
            const gain = this._ctx.createGain();
            gain.gain.value = Math.max(0, Math.min(2, volume));
            src.connect(gain);
            gain.connect(this._masterGain);
            src.start();
        } catch {
            // Context may have been suspended by browser; silent fail.
        }
    }

    async _fetchAndCache(key, src, vol, detune) {
        try {
            const res = await fetch(src);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const ab = await res.arrayBuffer();
            const buf = await this._ctx.decodeAudioData(ab);
            this._buffers.set(key, buf);
            this._playBuffer(buf, vol, detune);
        } catch (err) {
            console.warn(`[SoundManager] failed to load "${src}", trying procedural fallback`, err.message);
            const def = this._defs.get(key);
            if (def?.procedural) {
                const buf = this._generateProcedural(def.procedural);
                if (buf) {
                    this._buffers.set(key, buf);
                    this._playBuffer(buf, vol, detune);
                }
            }
        } finally {
            this._fetching.delete(key);
        }
    }

    // ── Private — procedural synthesis ──────────────────────────────────────

    /**
     * Dispatch to the appropriate generator.
     * Returns null if the context is unavailable.
     * @param {string} type
     * @returns {AudioBuffer|null}
     */
    _generateProcedural(type) {
        if (!this._ctx) return null;
        const sr = this._ctx.sampleRate;
        switch (type) {
            case 'click':         return this._genClick(sr);
            case 'summon':        return this._genSummon(sr);
            case 'spell':         return this._genSpell(sr);
            case 'melee':         return this._genMelee(sr);
            case 'ranged':        return this._genRanged(sr);
            case 'death':         return this._genDeath(sr);
            case 'tower_hit':     return this._genTowerHit(sr);
            case 'tower_destroy': return this._genTowerDestroy(sr);
            case 'impact':        return this._genImpact(sr);
            case 'spell_aoe':     return this._genSpellAoe(sr);
            case 'battle_start':  return this._genBattleStart(sr);
            case 'battle_win':    return this._genBattleWin(sr);
            case 'battle_lose':   return this._genBattleLose(sr);
            default:
                console.warn(`[SoundManager] unknown procedural type "${type}"`);
                return this._genClick(sr);
        }
    }

    /** Minimal PRNG (xorshift32) — avoids Math.random allocation in generators. */
    static _xorshift(seed) {
        let s = Math.trunc(seed) || 1;
        return () => {
            s ^= s << 13; s ^= s >> 17; s ^= s << 5;
            return (s & 0x7fffffff) / 0x7fffffff * 2 - 1;
        };
    }

    // ── DSP helpers (shared by all generators) ──────────────────────────────

    /** Soft saturation: gentle tanh, prevents harsh clipping. */
    static _soft(x) { return Math.tanh(x); }

    /** One-pole LP coefficient for cutoff `fc` Hz at sample-rate `sr`. */
    static _lpA(fc, sr) { return 1 - Math.exp(-2 * Math.PI * fc / sr); }

    /** One-pole HP coefficient for cutoff `fc` Hz at sample-rate `sr`. */
    static _hpA(fc, sr) { return Math.exp(-2 * Math.PI * fc / sr); }

    /** Click-free linear attack [0..1] over `rise` seconds (≥3 ms safe). */
    static _atk(t, rise) { return t >= rise ? 1 : t / rise; }

    /** Allocate a mono buffer of `dur` seconds; returns [buf, samples, N]. */
    _alloc(sr, dur) {
        const N = Math.ceil(sr * dur);
        const buf = this._ctx.createBuffer(1, N, sr);
        return [buf, buf.getChannelData(0), N];
    }

    /**
     * UI click — glassy, modern, premium.
     * L1: HP-noise transient (≈3 ms tick); L2: detuned sine pluck ~2.2 kHz.
     */
    _genClick(sr) {
        const [buf, d, N] = this._alloc(sr, 0.06);
        const rand = SoundManager._xorshift(0xC1C);
        const hpA = SoundManager._hpA(3000, sr);
        let hpX = 0, hpY = 0;
        for (let i = 0; i < N; i++) {
            const t = i / sr;
            // L1 — HP-filtered noise transient: "tick" character
            const nRaw = rand();
            const nHp = hpA * (hpY + nRaw - hpX);
            hpX = nRaw; hpY = nHp;
            const transient = nHp * Math.exp(-t * 600) * 0.6;
            // L2 — detuned sine pluck (3 ms attack, fast decay)
            const env = SoundManager._atk(t, 0.003) * Math.exp(-t * 70);
            const tone =
                Math.sin(2 * Math.PI * 2180 * t) * 0.32 +
                Math.sin(2 * Math.PI * 2225 * t) * 0.26;
            d[i] = SoundManager._soft(transient + tone * env);
        }
        return buf;
    }

    /**
     * Card summon — magical appearance.
     * L1: 60 Hz sub thump; L2: LP-noise whoosh sweeping 200→4000 Hz;
     * L3: FM bell (carrier 660, mod 990, index 4→1); L4: shimmer triad with tremolo.
     */
    _genSummon(sr) {
        const dur = 0.35;
        const [buf, d, N] = this._alloc(sr, dur);
        const rand = SoundManager._xorshift(0x5044);
        let lpY = 0;
        for (let i = 0; i < N; i++) {
            const t = i / sr;
            const tn = t / dur;
            // L1 — sub thump (impact at start)
            const sub = Math.sin(2 * Math.PI * 60 * t)
                * SoundManager._atk(t, 0.005) * Math.exp(-t * 30) * 0.5;
            // L2 — LP-noise whoosh: cutoff sweeps up to convey "materialization"
            const fc = 200 + 3800 * tn;
            lpY += SoundManager._lpA(fc, sr) * (rand() - lpY);
            const whoosh = lpY * Math.sin(Math.PI * tn) * 0.45;
            // L3 — FM bell: index drops from 4 to 1 → metallic-to-pure transition
            const idx = 4 - 3 * tn;
            const mod = Math.sin(2 * Math.PI * 990 * t) * idx;
            const bell = Math.sin(2 * Math.PI * 660 * t + mod)
                * SoundManager._atk(t, 0.01) * Math.exp(-t * 6) * 0.35;
            // L4 — shimmer triad with 14 Hz tremolo (joins after first 15 % of duration)
            const trem = 0.6 + 0.4 * Math.sin(2 * Math.PI * 14 * t);
            const shim = (
                Math.sin(2 * Math.PI * 1320 * t) +
                Math.sin(2 * Math.PI * 1980 * t) * 0.7 +
                Math.sin(2 * Math.PI * 2640 * t) * 0.5
            ) * trem * Math.max(0, tn - 0.15) * Math.exp(-t * 4) * 0.16;
            d[i] = SoundManager._soft(sub + whoosh + bell + shim);
        }
        return buf;
    }

    /**
     * Spell cast — mystical incantation.
     * L1: low sub bed; L2: 5-voice detuned chorus cluster; L3: LP air-noise wash;
     * L4: late shimmer crystals.
     */
    _genSpell(sr) {
        const dur = 0.45;
        const [buf, d, N] = this._alloc(sr, dur);
        const rand = SoundManager._xorshift(0x5E11);
        // Slight detune for choral width (cents-level beating gives "alive" feel)
        const f   = [261.63, 392, 523.25, 659.25, 880];
        const det = [1,    1.003,  0.998,  1.002,  0.997 ];
        let lpY = 0;
        for (let i = 0; i < N; i++) {
            const t = i / sr;
            const tn = t / dur;
            // L1 — sub C2 bed for grounding
            const sub = Math.sin(2 * Math.PI * 65.4 * t)
                * SoundManager._atk(t, 0.02) * Math.exp(-t * 5) * 0.35;
            // L2 — 5-voice chorus cluster (linear fade-out for ethereal feel)
            let chorus = 0;
            for (let k = 0; k < f.length; k++) {
                chorus += Math.sin(2 * Math.PI * f[k] * det[k] * t);
            }
            chorus = (chorus / f.length)
                * SoundManager._atk(t, 0.04) * (1 - tn) * 0.6;
            // L3 — LP air noise wash, cutoff opens 600→4600 Hz
            const fc = 600 + 4000 * tn;
            lpY += SoundManager._lpA(fc, sr) * (rand() - lpY);
            const air = lpY * Math.sin(Math.PI * tn) * 0.18;
            // L4 — shimmer crystals, enter only in second half
            const sparkle = (
                Math.sin(2 * Math.PI * 2093 * t) * 0.5 +
                Math.sin(2 * Math.PI * 3136 * t) * 0.4
            ) * Math.max(0, tn - 0.3) * Math.exp(-t * 3) * 0.15;
            d[i] = SoundManager._soft(sub + chorus + air + sparkle);
        }
        return buf;
    }

    /**
     * Melee hit — visceral sword/punch impact.
     * L1: HP-noise slap (high sizzle); L2: 110→55 Hz pitch-drop punch;
     * L3: 380 Hz mid-band wood/leather crack.
     */
    _genMelee(sr) {
        const dur = 0.12;
        const [buf, d, N] = this._alloc(sr, dur);
        const rand = SoundManager._xorshift(0xBE12);
        const hpA = SoundManager._hpA(6000, sr);
        let hpX = 0, hpY = 0;
        for (let i = 0; i < N; i++) {
            const t = i / sr;
            // L1 — HP-noise slap: high-frequency sizzle, decays in ≈10 ms
            const nRaw = rand();
            const nHp = hpA * (hpY + nRaw - hpX);
            hpX = nRaw; hpY = nHp;
            const slap = nHp * Math.exp(-t * 350) * 0.55;
            // L2 — punch body: sine with fast pitch drop 110→55 Hz (weight)
            const fPunch = 55 + 55 * Math.exp(-t * 60);
            const punch = Math.sin(2 * Math.PI * fPunch * t)
                * SoundManager._atk(t, 0.002) * Math.exp(-t * 35) * 0.7;
            // L3 — mid wood crack (380 Hz × noise mod for grit)
            const wood = Math.sin(2 * Math.PI * 380 * t)
                * (rand() * 0.4 + 0.6) * Math.exp(-t * 80) * 0.25;
            d[i] = SoundManager._soft(slap + punch + wood);
        }
        return buf;
    }

    /**
     * Ranged shot — bowstring twang + air whoosh.
     * L1: Karplus-Strong plucked string (~280 Hz); L2: HP-noise air burst;
     * L3: low woody body (80 Hz) for shaft impulse.
     */
    _genRanged(sr) {
        const dur = 0.18;
        const [buf, d, N] = this._alloc(sr, dur);
        const rand = SoundManager._xorshift(0xA770);
        // Karplus-Strong: noise burst → delay line → averaging LP filter (damping)
        const ksFreq = 280;
        const ksLen  = Math.max(2, Math.floor(sr / ksFreq));
        const ks = new Float32Array(ksLen);
        for (let k = 0; k < ksLen; k++) ks[k] = rand() * 0.7;
        let ksIdx = 0;
        const hpA = SoundManager._hpA(2500, sr);
        let hpX = 0, hpY = 0;
        for (let i = 0; i < N; i++) {
            const t = i / sr;
            // L1 — Karplus-Strong twang (averaging filter with 0.996 damping)
            const cur  = ks[ksIdx];
            const next = (ksIdx + 1) % ksLen;
            ks[ksIdx] = (cur + ks[next]) * 0.5 * 0.996;
            ksIdx = next;
            const twang = cur * SoundManager._atk(t, 0.002) * Math.exp(-t * 12) * 0.7;
            // L2 — air whoosh: HP-noise burst, decays in ≈100 ms
            const nRaw = rand();
            const nHp = hpA * (hpY + nRaw - hpX);
            hpX = nRaw; hpY = nHp;
            const air = nHp * Math.exp(-t * 30) * 0.35;
            // L3 — low body (shaft release impulse)
            const body = Math.sin(2 * Math.PI * 80 * t)
                * SoundManager._atk(t, 0.003) * Math.exp(-t * 40) * 0.3;
            d[i] = SoundManager._soft(twang + air + body);
        }
        return buf;
    }

    /**
     * Unit/hero death — creature groan with vibrato and final exhale.
     * L1: 180→70 Hz growl (3 harmonics) with 5 Hz vibrato;
     * L2: LP-noise rasp (formant-like, cutoff 1200→400 Hz); L3: low rumble tail.
     */
    _genDeath(sr) {
        const dur = 0.5;
        const [buf, d, N] = this._alloc(sr, dur);
        const rand = SoundManager._xorshift(0xD3A7);
        let lpY = 0;
        for (let i = 0; i < N; i++) {
            const t = i / sr;
            const tn = t / dur;
            // L1 — growl: descending pitch with vibrato + 3 harmonics
            const vib = Math.sin(2 * Math.PI * 5 * t) * 6;
            const fGrowl = (180 - 110 * tn) + vib;
            const growlEnv = SoundManager._atk(t, 0.02) * Math.exp(-t * 5);
            const growl = (
                Math.sin(2 * Math.PI * fGrowl * t) +
                Math.sin(2 * Math.PI * fGrowl * 2 * t) * 0.4 +
                Math.sin(2 * Math.PI * fGrowl * 3 * t) * 0.2
            ) * growlEnv * 0.3;
            // L2 — LP-noise rasp (formant sweep down)
            const fc = 1200 - 800 * tn;
            lpY += SoundManager._lpA(fc, sr) * (rand() - lpY);
            const rasp = lpY * growlEnv * 0.35;
            // L3 — final low exhale (only in last half of duration)
            const tail = Math.sin(2 * Math.PI * 50 * t)
                * Math.max(0, tn - 0.5) * Math.exp(-t * 2) * 0.4;
            d[i] = SoundManager._soft(growl + rasp + tail);
        }
        return buf;
    }

    /**
     * Tower hit — heavy stone strike with splinter and dust.
     * L1: HP-noise crack (splinter); L2: 80→45 Hz pitch-drop thud (mass);
     * L3: LP-noise rumble tail (settling dust).
     */
    _genTowerHit(sr) {
        const dur = 0.18;
        const [buf, d, N] = this._alloc(sr, dur);
        const rand = SoundManager._xorshift(0x70AE);
        const hpA = SoundManager._hpA(4000, sr);
        let hpX = 0, hpY = 0, lpY = 0;
        const lpAlpha = SoundManager._lpA(300, sr);
        for (let i = 0; i < N; i++) {
            const t = i / sr;
            // L1 — HP-noise crack (splinter, ≈15 ms)
            const nRaw = rand();
            const nHp = hpA * (hpY + nRaw - hpX);
            hpX = nRaw; hpY = nHp;
            const crack = nHp * Math.exp(-t * 250) * 0.45;
            // L2 — thud: 80→45 Hz drop conveys massive object
            const fThud = 45 + 35 * Math.exp(-t * 25);
            const thud = Math.sin(2 * Math.PI * fThud * t)
                * SoundManager._atk(t, 0.003) * Math.exp(-t * 18) * 0.75;
            // L3 — LP-noise dust rumble
            lpY += lpAlpha * (rand() - lpY);
            const rumble = lpY * Math.exp(-t * 12) * 0.35;
            d[i] = SoundManager._soft(crack + thud + rumble);
        }
        return buf;
    }

    /**
     * Tower destroy — massive collapse with debris and feedback-delay tail.
     * L1: 40→25 Hz sub-bass slam; L2: LP-noise debris cascade with 7 Hz mod;
     * L3: HP-noise high crackle; L4: short feedback delay (≈70 ms, 0.45 fb)
     * for natural rumble tail without convolver overhead.
     */
    _genTowerDestroy(sr) {
        const dur = 1.1;
        const [buf, d, N] = this._alloc(sr, dur);
        const rand1 = SoundManager._xorshift(0xC011);
        const rand2 = SoundManager._xorshift(0xC0DE);
        const hpA = SoundManager._hpA(5000, sr);
        const lpAlpha = SoundManager._lpA(800, sr);
        let lpY = 0, hpX = 0, hpY = 0;
        // Feedback delay line for rumble tail
        const dlyLen = Math.floor(sr * 0.07);
        const dly = new Float32Array(dlyLen);
        let dlyIdx = 0;
        for (let i = 0; i < N; i++) {
            const t = i / sr;
            // L1 — sub-bass slam: pitch drops 40→25 Hz over ≈170 ms
            const fSub = 25 + 15 * Math.exp(-t * 6);
            const slam = Math.sin(2 * Math.PI * fSub * t)
                * SoundManager._atk(t, 0.005) * Math.exp(-t * 4) * 0.85;
            // L2 — debris: LP-noise modulated by 7 Hz wobble
            lpY += lpAlpha * (rand1() - lpY);
            const debris = lpY
                * (0.6 + 0.4 * Math.sin(2 * Math.PI * 7 * t))
                * Math.exp(-t * 2.5) * 0.5;
            // L3 — HP-noise crackle (high-frequency debris snaps)
            const nRaw = rand2();
            const nHp = hpA * (hpY + nRaw - hpX);
            hpX = nRaw; hpY = nHp;
            const crackle = nHp * Math.exp(-t * 6) * 0.25;
            // L4 — feedback delay rumble (fb = 0.45 → stable, natural decay)
            const dryMix = slam + debris + crackle;
            const delayed = dly[dlyIdx];
            const out = dryMix + delayed * 0.45;
            dly[dlyIdx] = dryMix * 0.6 + delayed * 0.45;
            dlyIdx = (dlyIdx + 1) % dlyLen;
            d[i] = SoundManager._soft(out * 0.85);
        }
        return buf;
    }

    /**
     * Projectile impact — crisp hit with material body.
     * L1: LP-noise thud (impact body); L2: 800→200 Hz tonal ping (penetration);
     * L3: 1.5 kHz metal ring (resonant residue).
     */
    _genImpact(sr) {
        const dur = 0.1;
        const [buf, d, N] = this._alloc(sr, dur);
        const rand = SoundManager._xorshift(0x1A77);
        const lpAlpha = SoundManager._lpA(800, sr);
        let lpY = 0;
        for (let i = 0; i < N; i++) {
            const t = i / sr;
            // L1 — LP-noise thud (5 ms attack via natural filter rise)
            lpY += lpAlpha * (rand() - lpY);
            const thud = lpY * Math.exp(-t * 80) * 0.6;
            // L2 — tonal ping with strong pitch drop
            const fPing = 200 + 600 * Math.exp(-t * 70);
            const ping = Math.sin(2 * Math.PI * fPing * t)
                * SoundManager._atk(t, 0.002) * Math.exp(-t * 35) * 0.5;
            // L3 — short metal ring (residue)
            const ring = Math.sin(2 * Math.PI * 1500 * t)
                * Math.exp(-t * 60) * 0.18;
            d[i] = SoundManager._soft(thud + ping + ring);
        }
        return buf;
    }

    /**
     * Spell AoE — magic explosion (charge → detonation → shimmer tail).
     * L1: rising LP-noise whoosh (charge phase); L2: noise detonation burst;
     * L3: 50 Hz sub bass thump on detonation; L4: shimmer triad with 9 Hz tremolo.
     */
    _genSpellAoe(sr) {
        const dur = 0.7;
        const [buf, d, N] = this._alloc(sr, dur);
        const rand1 = SoundManager._xorshift(0xA0E0);
        const rand2 = SoundManager._xorshift(0xA0E1);
        let lpY = 0;
        const detT = 0.18;  // detonation onset (charge length)
        for (let i = 0; i < N; i++) {
            const t = i / sr;
            // L1 — rising whoosh: cutoff 300→4000 Hz over the charge phase
            const tnW = Math.min(t / detT, 1);
            const fc = 300 + 3700 * tnW;
            lpY += SoundManager._lpA(fc, sr) * (rand1() - lpY);
            const whoosh = lpY * tnW * (1 - tnW * 0.3) * 0.5;
            // L2 — detonation: noise burst after charge, exponential decay
            const td = Math.max(0, t - detT);
            const det = (rand2() * Math.exp(-td * 8)) * 0.6;
            // L3 — sub bass thump (only after detonation)
            const sub = (t > detT)
                ? Math.sin(2 * Math.PI * 50 * t)
                    * SoundManager._atk(td, 0.003) * Math.exp(-td * 12) * 0.7
                : 0;
            // L4 — shimmer triad with 9 Hz tremolo (tail magic)
            const trem = 0.6 + 0.4 * Math.sin(2 * Math.PI * 9 * t);
            const shim = (t > detT)
                ? (Math.sin(2 * Math.PI * 660 * t)
                 + Math.sin(2 * Math.PI * 880 * t) * 0.7
                 + Math.sin(2 * Math.PI * 1320 * t) * 0.5)
                  * trem * Math.exp(-td * 3) * 0.18
                : 0;
            d[i] = SoundManager._soft(whoosh + det + sub + shim);
        }
        return buf;
    }

    /**
     * Battle start — heroic brass fanfare (C E G C).
     * Per-note: detuned sawtooth (brass) + sine body, dynamic LP filter envelope
     * (cutoff opens with attack, closes with decay). Final note sustained longer.
     */
    _genBattleStart(sr) {
        const notes      = [261.63, 329.63, 392, 523.25]; // C4 E4 G4 C5
        const noteDur    = 0.18;
        const finalBoost = 0.15; // last note sustains 0.33 s total
        const dur = notes.length * noteDur + finalBoost;
        const [buf, d, N] = this._alloc(sr, dur);
        for (let n = 0; n < notes.length; n++) {
            const f = notes[n];
            const samp0 = Math.floor(n * noteDur * sr);
            const len = (n === notes.length - 1) ? noteDur + finalBoost : noteDur;
            const sampN = Math.min(N, samp0 + Math.ceil(len * sr));
            let lpY = 0;
            for (let i = samp0; i < sampN; i++) {
                const t = (i - samp0) / sr;
                // Detuned sawtooth pair (brass-like beating)
                const ph1 = (f * t) - Math.floor(f * t);
                const ph2 = (f * 1.005 * t) - Math.floor(f * 1.005 * t);
                const saw = ((2 * ph1 - 1) + (2 * ph2 - 1)) * 0.5;
                // LP filter envelope: cutoff opens 600→3600 Hz, closes with decay
                const env = SoundManager._atk(t, 0.012) * Math.exp(-t * 4);
                const fc = 600 + 3000 * env;
                lpY += SoundManager._lpA(fc, sr) * (saw - lpY);
                // Sine body for warmth (compensates for filtered saw thinness)
                const body = Math.sin(2 * Math.PI * f * t) * 0.3;
                d[i] += SoundManager._soft((lpY * 0.55 + body) * env * 0.65);
            }
        }
        return buf;
    }

    /**
     * Battle win — joyful arpeggio + triumphant final chord.
     * Phase 1: 6-note brass arpeggio (C E G C E G); Phase 2: sustained C-major
     * chord (C5 E5 G5 C6) with 6 Hz tremolo for triumph.
     */
    _genBattleWin(sr) {
        const notes    = [261.63, 329.63, 392, 523.25, 659.25, 783.99];
        const noteDur  = 0.11;
        const finalDur = 0.45;
        const dur = notes.length * noteDur + finalDur;
        const [buf, d, N] = this._alloc(sr, dur);
        // Phase 1 — ascending arpeggio
        for (let n = 0; n < notes.length; n++) {
            const f = notes[n];
            const samp0 = Math.floor(n * noteDur * sr);
            const sampN = Math.min(N, samp0 + Math.ceil(noteDur * sr));
            let lpY = 0;
            for (let i = samp0; i < sampN; i++) {
                const t = (i - samp0) / sr;
                const ph1 = (f * t) - Math.floor(f * t);
                const ph2 = (f * 1.004 * t) - Math.floor(f * 1.004 * t);
                const saw = ((2 * ph1 - 1) + (2 * ph2 - 1)) * 0.5;
                const env = SoundManager._atk(t, 0.008) * Math.exp(-t * 8);
                const fc = 800 + 3500 * env;
                lpY += SoundManager._lpA(fc, sr) * (saw - lpY);
                const body = Math.sin(2 * Math.PI * f * t) * 0.3;
                d[i] += SoundManager._soft((lpY * 0.5 + body) * env * 0.55);
            }
        }
        // Phase 2 — final triumphant C-major chord with tremolo
        const chord = [523.25, 659.25, 783.99, 1046.5];
        const cSamp0 = Math.floor(notes.length * noteDur * sr);
        let lpY2 = 0;
        for (let i = cSamp0; i < N; i++) {
            const t = (i - cSamp0) / sr;
            let saw = 0;
            for (const f of chord) {
                const ph1 = (f * t) - Math.floor(f * t);
                const ph2 = (f * 1.005 * t) - Math.floor(f * 1.005 * t);
                saw += ((2 * ph1 - 1) + (2 * ph2 - 1)) * 0.5;
            }
            saw /= chord.length;
            const env = SoundManager._atk(t, 0.015) * Math.exp(-t * 3);
            const fc = 700 + 3000 * env;
            lpY2 += SoundManager._lpA(fc, sr) * (saw - lpY2);
            const trem = 0.85 + 0.15 * Math.sin(2 * Math.PI * 6 * t);
            d[i] += SoundManager._soft(lpY2 * env * trem * 0.6);
        }
        return buf;
    }

    /**
     * Battle lose — somber descending dirge (G F Eb C, minor flavour).
     * Per-note: detuned sine pair with 4.5 Hz vibrato + sub octave, dark LP @ 900 Hz,
     * slow attack (40 ms) and long sustain (1.5/s decay). Final note rings out.
     */
    _genBattleLose(sr) {
        const notes   = [392, 349.23, 311.13, 261.63]; // G4 F4 Eb4 C4
        const noteDur = 0.22;
        const tailDur = 0.35;
        const dur = notes.length * noteDur + tailDur;
        const [buf, d, N] = this._alloc(sr, dur);
        const lpAlpha = SoundManager._lpA(900, sr);
        for (let n = 0; n < notes.length; n++) {
            const f = notes[n];
            const samp0 = Math.floor(n * noteDur * sr);
            const isLast = (n === notes.length - 1);
            const len = noteDur + (isLast ? tailDur : 0);
            const sampN = Math.min(N, samp0 + Math.ceil(len * sr));
            let lpY = 0;
            for (let i = samp0; i < sampN; i++) {
                const t = (i - samp0) / sr;
                // 4.5 Hz vibrato (sub-cents) for organic feel
                const vib = Math.sin(2 * Math.PI * 4.5 * t) * 0.003;
                const f1 = f * (1 + vib);
                const f2 = f * (1 - vib) * 1.005;
                // Detuned pair + sub octave (dark, heavy)
                const tone =
                    Math.sin(2 * Math.PI * f1 * t) +
                    Math.sin(2 * Math.PI * f2 * t) * 0.85 +
                    Math.sin(2 * Math.PI * f * 0.5 * t) * 0.4;
                // Slow attack, long sustain
                const env = SoundManager._atk(t, 0.04) * Math.exp(-t * 1.5);
                // Dark LP filter (cutoff fixed at 900 Hz → no brightness)
                lpY += lpAlpha * (tone * 0.35 - lpY);
                d[i] += SoundManager._soft(lpY * env * 0.7);
            }
        }
        return buf;
    }

    // ── Private — default manifest ───────────────────────────────────────────

    /**
     * Built-in manifest used when sounds.json fails to load.
     * Each entry supports two shapes:
     *   { procedural: 'type', volume, throttle }   ← synthesised
     *   { src: 'assets/audio/x.ogg', volume, throttle }  ← file-based
     */
    _defaultManifest() {
        return {
            master: GameConfig.AUDIO.MASTER,
            sounds: {
                ui_click:           { procedural: 'click',         volume: 0.4,  throttle: 100 },
                card_play_summon:   { procedural: 'summon',        volume: 0.6,  throttle: 0   },
                card_play_spell:    { procedural: 'spell',         volume: 0.7,  throttle: 0   },
                unit_attack_melee:  { procedural: 'melee',         volume: 0.45, throttle: 80  },
                unit_attack_ranged: { procedural: 'ranged',        volume: 0.35, throttle: 60  },
                unit_death:         { procedural: 'death',         volume: 0.5,  throttle: 100 },
                tower_hit:          { procedural: 'tower_hit',     volume: 0.55, throttle: 150 },
                tower_destroy:      { procedural: 'tower_destroy', volume: 0.9,  throttle: 0   },
                hero_death:         { procedural: 'death',         volume: 0.6,  throttle: 0   },
                projectile_impact:  { procedural: 'impact',        volume: 0.3,  throttle: 50  },
                spell_aoe:          { procedural: 'spell_aoe',     volume: 0.65, throttle: 200 },
                battle_start:       { procedural: 'battle_start',  volume: 0.8,  throttle: 0   },
                battle_win:         { procedural: 'battle_win',    volume: 0.9,  throttle: 0   },
                battle_lose:        { procedural: 'battle_lose',   volume: 0.9,  throttle: 0   },
            },
        };
    }
}

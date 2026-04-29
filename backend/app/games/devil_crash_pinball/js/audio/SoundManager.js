import { GameConfig as C } from '../config/GameConfig.js';

/**
 * Procedural SFX engine — Web Audio API.
 *
 * Signal chain (per voice):
 *   OSC ← [FM modulator → osc.frequency]
 *     → env  (ADSR GainNode)
 *       → [WaveShaper]  optional saturation / distortion (per-preset)
 *         → _lp          master lowpass — section-biased cutoff  ──→ _comp
 *         → _reverb      optional wet send ──→ _reverbGain       ──→ _comp
 *                                                                     ↓
 *                                                              master gain
 *                                                                     ↓
 *                                                              destination
 *
 * Noise voices share the same chain but skip the oscillator stack.
 *
 * Key improvements over v1:
 *  — DynamicsCompressor: prevents inter-voice clipping on chord bursts, adds punch.
 *  — Synthetic ConvolverNode reverb (pre-computed stereo IR): spatial depth on
 *    rewarding / dramatic sounds.
 *  — Pre-allocated 2 s noise buffer: zero GC pressure; random playback offset
 *    per call for texture variation.
 *  — Full ADSR envelopes per preset: precise transient shaping (attack / decay /
 *    sustain / release) instead of a single fixed curve.
 *  — FM synthesis: carrier + modulator oscillator pair for metallic / watery
 *    timbres on warp and boss sounds.
 *  — WaveShaper saturation: arctangent soft-clip, memoised per distinct drive
 *    value, for grit on sling / tilt / boss.
 *  — Coloured noise: optional per-preset BiquadFilter on noise burst (bandpass
 *    for bumper click, lowpass for tilt thud).
 */
export class SoundManager {

    /** @type {AudioContext|null} */
    ctx = null;

    /** @type {GainNode|null} */
    master = null;

    /** @type {BiquadFilterNode|null} Master lowpass — section-biased. */
    _lp = null;

    /** @type {DynamicsCompressorNode|null} Glue compressor / limiter. */
    _comp = null;

    /** @type {ConvolverNode|null} Synthetic room reverb. */
    _reverb = null;

    /** @type {GainNode|null} Reverb wet bus gain — section-biased. */
    _reverbGain = null;

    /**
     * Pre-allocated 2 s white-noise buffer.
     * Reused across all _noise() calls — no allocation in the hot path.
     * @type {AudioBuffer|null}
     */
    _noiseBuf = null;

    /**
     * Cached WaveShaper curves keyed by drive amount (2-decimal string).
     * @type {Map<string, Float32Array>}
     */
    static _distortionCache = new Map();

    muted = false;

    /**
     * Pre-built reverb impulse responses, one per profile.
     * Populated by _buildAllReverbIRs() at init time — zero allocation on section change.
     * @type {Map<string, AudioBuffer>|null}
     */
    _reverbIRs = null;

    /** Currently applied profile id — stored for external introspection only. */
    _activeProfileId = null;

    /** @type {BiquadFilterNode|null} High-shelf — adds air or darkness per profile. */
    _hiShelf = null;

    /**
     * Tremolo amplitude modulator (GainNode).
     * Its gain AudioParam receives the LFO signal via _tremoloDepth.
     * Its intrinsic value is permanently 1 — only the connected LFO swings it.
     * @type {GainNode|null}
     */
    _tremoloMod = null;

    /**
     * Sine-wave LFO source. Runs continuously after init().
     * Frequency and depth are driven per profile.
     * @type {OscillatorNode|null}
     */
    _tremoloLFO = null;

    /**
     * Scales the LFO output before it hits _tremoloMod.gain.
     * gain = 0 → tremolo off; gain = 0.3 → ±30 % amplitude swing.
     * @type {GainNode|null}
     */
    _tremoloDepth = null;

    /** @type {AudioBuffer|null} Decoded background music buffer — loaded once at init. */
    _bgmBuffer = null;

    /** @type {AudioBufferSourceNode|null} Currently active looping BGM source. */
    _bgmSource = null;

    /** @type {GainNode|null} Volume lane for the BGM channel. */
    _bgmGain = null;

    /** True when playBgm() was called before _bgmBuffer finished loading. */
    _bgmPending = false;

    /** Whether the BGM channel is independently muted. */
    bgmMuted = false;

    // ── Initialisation ────────────────────────────────────────────────────────

    /** Must be called from a user-gesture handler. */
    init() {
        if (this.ctx) return;
        const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!Ctx) return;
        this.ctx = new Ctx();
        this._buildMasterChain();
        this._preallocateNoise();
        this._buildAllReverbIRs();
        this.muted = C.AUDIO_DEFAULT_MUTED;
        this._loadBgm();
    }

    /**
     * Constructs the static portion of the signal chain (built once on init):
     *
     *   _lp → _hiShelf → _tremoloMod → _comp → master → destination
     *                    _reverb → _reverbGain ↗
     *   _tremoloLFO → _tremoloDepth → _tremoloMod.gain
     *
     * Individual voices connect their tail to _lp and, optionally, to _reverb.
     */
    _buildMasterChain() {
        const ctx = this.ctx;

        // ── Section-biasable master lowpass (brightness / warmth control)
        this._lp               = ctx.createBiquadFilter();
        this._lp.type          = 'lowpass';
        this._lp.frequency.value = 5800;
        this._lp.Q.value       = 0.707; // Butterworth — maximally flat passband

        // ── Dynamics compressor
        //    Threshold at −18 dB catches the loudest chord-burst peaks.
        //    Fast attack (3 ms) grabs transients; moderate release (180 ms)
        //    lets tails breathe. 4:1 ratio provides glue without killing punch.
        this._comp = ctx.createDynamicsCompressor();
        this._comp.threshold.value = -18;
        this._comp.knee.value      =   8; // soft knee — transparent transition
        this._comp.ratio.value     =   4;
        this._comp.attack.value    =   0.003;
        this._comp.release.value   =   0.18;

        // ── Master output gain
        this.master            = ctx.createGain();
        this.master.gain.value = C.AUDIO_DEFAULT_MUTED ? 0 : C.AUDIO_MASTER;

        // ── Synthetic reverb (ConvolverNode with pre-computed stereo IR)
        this._reverb        = ctx.createConvolver();
        this._reverb.buffer = this._buildReverbIR(0.02, 1.6);
        this._reverbGain    = ctx.createGain();
        this._reverbGain.gain.value = 0; // dry by default; biased per section

        // ── High-shelf (brightness / air per profile)
        this._hiShelf               = ctx.createBiquadFilter();
        this._hiShelf.type          = 'highshelf';
        this._hiShelf.frequency.value = 6000;
        this._hiShelf.gain.value    = 0;    // flat by default; biased per profile

        // ── Tremolo: LFO → depthGain → tremoloMod.gain
        //    tremoloMod.gain stays at 1.0 (DC); LFO adds ±depth around it.
        //    depth = 0 → tremolo silent; depth = 0.25 → ±25 % amplitude swing.
        this._tremoloMod            = ctx.createGain();
        this._tremoloMod.gain.value = 1;    // DC component — never changed after init

        this._tremoloLFO            = ctx.createOscillator();
        this._tremoloLFO.type       = 'sine';
        this._tremoloLFO.frequency.value = 2;   // Hz — overridden by applyProfile

        this._tremoloDepth          = ctx.createGain();
        this._tremoloDepth.gain.value = 0;  // silent until first applyProfile

        this._tremoloLFO.connect(this._tremoloDepth);
        this._tremoloDepth.connect(this._tremoloMod.gain);
        this._tremoloLFO.start();

        // Chain: _lp → _hiShelf → _tremoloMod → _comp → master → destination
        //                _reverb → _reverbGain ─────────────↗
        this._lp.connect(this._hiShelf);
        this._hiShelf.connect(this._tremoloMod);
        this._tremoloMod.connect(this._comp);
        this._reverb.connect(this._reverbGain);
        this._reverbGain.connect(this._comp);
        this._comp.connect(this.master);
        this.master.connect(ctx.destination);

        // ── Background music gain — feeds into _lp so it shares the master chain
        //    (section profile LP/tremolo/compressor colour the BGM too).
        this._bgmGain            = ctx.createGain();
        this._bgmGain.gain.value = C.AUDIO_BGM_VOLUME;
        this._bgmGain.connect(ctx.destination);
    }

    /**
     * Generates a synthetic stereo reverb impulse response.
     *
     * Uses exponential-decay white noise — the simplest IR that still sounds
     * natural and is cheap to compute at init time (< 1 ms on desktop).
     * Slight channel decorrelation (offset on ch-1 decay curve) adds stereo width.
     *
     * @param {number} preDelay  — silence before reverb onset (s)
     * @param {number} decayTime — time to reach approx −60 dB (s)
     * @returns {AudioBuffer}
     */
    _buildReverbIR(preDelay, decayTime) {
        const ctx        = this.ctx;
        const sr         = ctx.sampleRate;
        const preSamples = Math.floor(sr * preDelay);
        const decSamples = Math.floor(sr * decayTime);
        const totalLen   = preSamples + decSamples;
        const buf        = ctx.createBuffer(2, totalLen, sr);

        for (let ch = 0; ch < 2; ch++) {
            const data     = buf.getChannelData(ch);
            const chOffset = ch * 0.05; // decorrelate R channel for stereo width
            for (let i = 0; i < totalLen; i++) {
                if (i < preSamples) {
                    data[i] = 0;
                } else {
                    const progress = (i - preSamples) / decSamples; // 0 → 1
                    // ln(1000) ≈ 6.9 → reaches −60 dB at progress = 1
                    data[i] = (Math.random() * 2 - 1)
                            * Math.exp(-(progress + chOffset) * 6.9);
                }
            }
        }
        return buf;
    }

    /**
     * Pre-allocates a 2 s white-noise buffer once at startup.
     * _noise() draws random windows from this buffer instead of allocating.
     */
    _preallocateNoise() {
        const sr  = this.ctx.sampleRate;
        const len = sr * 2;
        this._noiseBuf = this.ctx.createBuffer(1, len, sr);
        const ch = this._noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    }

    /**
     * Pre-builds one reverb IR per profile at init time.
     * applyProfile() simply looks up the pre-built AudioBuffer from _reverbIRs —
     * no allocation occurs on section change.
     */
    _buildAllReverbIRs() {
        this._reverbIRs = new Map();
        for (const [id, prof] of Object.entries(SoundManager.PROFILES)) {
            const { preDelay, decay } = prof.reverbIR;
            this._reverbIRs.set(id, this._buildReverbIR(preDelay, decay));
        }
    }

    // ── Public API ────────────────────────────────────────────────────────────

    setMuted(on) {
        this.muted = !!on;
        if (this.master) this.master.gain.value = on ? 0 : C.AUDIO_MASTER;
    }

    setBgmMuted(on) {
        this.bgmMuted = !!on;
        if (this._bgmGain) this._bgmGain.gain.value = on ? 0 : C.AUDIO_BGM_VOLUME;
    }

    toggleBgm() { this.setBgmMuted(!this.bgmMuted); return this.bgmMuted; }

    toggleMute() { this.setMuted(!this.muted); return this.muted; }

    /**
     * Smoothly bias the master DSP chain to match the audio character of a section.
     *
     * Transitions LP cutoff/Q, hi-shelf, reverb depth, tremolo flicker, and
     * compressor behaviour over transitionTime seconds using click-free AudioParam
     * ramps. Tremolo frequency and compressor values snap immediately (below
     * perceptual sensitivity for LFO rates and envelope coefficients).
     *
     * @param {string} profileId            — key from SoundManager.PROFILES
     * @param {number} [transitionTime=0.5] — crossfade duration in seconds; 0 = instant
     */
    applyProfile(profileId, transitionTime = 0.5) {
        if (!this.ctx || !this._reverbIRs) return;
        const prof = SoundManager.PROFILES[profileId];
        if (!prof) return;
        this._activeProfileId = profileId;

        const t = this.ctx.currentTime;
        const T = Math.max(0, transitionTime);

        if (T === 0) {
            // Instant — schedule everything at t to avoid any automation stacking
            this._lp.frequency.setValueAtTime(prof.lpFreq, t);
            this._lp.Q.setValueAtTime(prof.lpQ, t);
            this._hiShelf.frequency.setValueAtTime(prof.hiShelfFreq, t);
            this._hiShelf.gain.setValueAtTime(prof.hiShelfGain, t);
            this._reverbGain.gain.setValueAtTime(prof.reverbWet, t);
            this._tremoloDepth.gain.setValueAtTime(prof.tremoloDepth, t);
            if (!this.muted) this.master.gain.setValueAtTime(C.AUDIO_MASTER * prof.masterGain, t);
        } else {
            // Smooth crossfade: cancel → anchor current value → linear ramp to target
            // LP
            this._lp.frequency.cancelScheduledValues(t);
            this._lp.frequency.setValueAtTime(this._lp.frequency.value, t);
            this._lp.frequency.linearRampToValueAtTime(prof.lpFreq, t + T);
            this._lp.Q.cancelScheduledValues(t);
            this._lp.Q.setValueAtTime(this._lp.Q.value, t);
            this._lp.Q.linearRampToValueAtTime(prof.lpQ, t + T);

            // Hi-shelf (brightness / air)
            this._hiShelf.frequency.cancelScheduledValues(t);
            this._hiShelf.frequency.setValueAtTime(this._hiShelf.frequency.value, t);
            this._hiShelf.frequency.linearRampToValueAtTime(prof.hiShelfFreq, t + T);
            this._hiShelf.gain.cancelScheduledValues(t);
            this._hiShelf.gain.setValueAtTime(this._hiShelf.gain.value, t);
            this._hiShelf.gain.linearRampToValueAtTime(prof.hiShelfGain, t + T);

            // Reverb wet
            this._reverbGain.gain.cancelScheduledValues(t);
            this._reverbGain.gain.setValueAtTime(this._reverbGain.gain.value, t);
            this._reverbGain.gain.linearRampToValueAtTime(prof.reverbWet, t + T);

            // Tremolo depth (fade in / out smoothly)
            this._tremoloDepth.gain.cancelScheduledValues(t);
            this._tremoloDepth.gain.setValueAtTime(this._tremoloDepth.gain.value, t);
            this._tremoloDepth.gain.linearRampToValueAtTime(prof.tremoloDepth, t + T);

            // Master
            if (!this.muted) {
                const target = C.AUDIO_MASTER * prof.masterGain;
                this.master.gain.cancelScheduledValues(t);
                this.master.gain.setValueAtTime(this.master.gain.value, t);
                this.master.gain.linearRampToValueAtTime(target, t + T);
            }
        }

        // Always-immediate: compressor (low perceptual sensitivity to crossfade)
        this._comp.threshold.setValueAtTime(prof.compThreshold, t);
        this._comp.ratio.setValueAtTime(prof.compRatio, t);
        this._comp.attack.setValueAtTime(prof.compAttack, t);
        this._comp.release.setValueAtTime(prof.compRelease, t);

        // LFO frequency snaps immediately (nobody hears a slow-LFO pitch glide)
        this._tremoloLFO.frequency.setValueAtTime(prof.tremoloFreq, t);

        // Swap pre-built IR — inaudible during wet-gain ramp
        this._reverb.buffer = this._reverbIRs.get(profileId) ?? this._reverb.buffer;
    }

    /**
     * Fetch and decode the background music MP3.
     * Fire-and-forget: called once from init(). Non-fatal on failure.
     * Starts playback immediately if playBgm() was called while loading.
     */
    async _loadBgm() {
        try {
            const resp = await fetch(C.AUDIO_BGM_PATH);
            if (!resp.ok) return;
            const arrayBuf = await resp.arrayBuffer();
            this._bgmBuffer = await this.ctx.decodeAudioData(arrayBuf);
            if (this._bgmPending) {
                this._bgmPending = false;
                this._startBgmSource();
            }
        } catch (err) {
            console.error('[devil_crash_pinball] BGM load error', err);
        }
    }

    /**
     * Begin looped background music playback.
     * Safe to call while _bgmBuffer is still loading — playback defers until ready.
     */
    playBgm() {
        if (!this.ctx) return;
        this.stopBgm();
        if (!this._bgmBuffer) {
            this._bgmPending = true;
            return;
        }
        this._startBgmSource();
    }

    /** Stop background music and release the source node. */
    stopBgm() {
        this._bgmPending = false;
        if (!this._bgmSource) return;
        try { this._bgmSource.stop(0); } catch (err) { console.warn('[devil_crash_pinball] BGM stop error', err); }
        this._bgmSource.disconnect();
        this._bgmSource = null;
    }

    /**
     * Create and start a looping AudioBufferSourceNode connected to _bgmGain.
     * @private
     */
    _startBgmSource() {
        if (!this.ctx || !this._bgmBuffer || !this._bgmGain) return;
        const src  = this.ctx.createBufferSource();
        src.buffer = this._bgmBuffer;
        src.loop   = true;
        src.connect(this._bgmGain);
        src.start(0);
        this._bgmSource = src;
    }

    /**
     * Play a one-shot SFX.
     * @param {string} type — key from PRESETS
     */
    sfx(type) {
        if (!this.ctx || this.muted) return;
        const p = SoundManager.PRESETS[type];
        if (!p) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const t      = this.ctx.currentTime;
        const jitter = 1 + (Math.random() * 0.16 - 0.08); // ±8 % pitch humanisation
        const vol    = p.vol ?? 1;

        if (p.chord) {
            const n = p.chord.length;
            for (const semi of p.chord) {
                this._tone(t, p, p.f * Math.pow(2, semi / 12) * jitter, vol, n);
            }
        } else {
            this._tone(t, p, p.f * jitter, vol, 1);
        }

        if (p.noise > 0) {
            this._noise(t, Math.min(0.12, p.dur * 0.75), p.noise, p.noiseFilter);
        }
    }

    // ── Preset catalogue ──────────────────────────────────────────────────────

    static PRESETS = {

        // ── Gameplay impacts ──────────────────────────────────────────────────

        // «Devil's Clangor» — infernal metallic ring: FM shimmer gives a
        // hellish overtone stack; descending sweep snaps back like a spring.
        bumper: {
            f: 680,  dur: 0.11, type: 'square', sweep: -440, noise: 0.22,
            fm: { ratio: 5.8, depth: 120 },
            adsr: { a: 0.001, d: 0.035, s: 0.12, r: 0.06 },
            noiseFilter: { type: 'bandpass', freq: 1600 },
        },

        // «Iron Claw» — hard mechanical snap; bandpass noise adds click body.
        flipper: {
            f: 140,  dur: 0.055, type: 'triangle', sweep: -90, noise: 0.16, vol: 0.8,
            adsr: { a: 0.001, d: 0.018, s: 0, r: 0.028 },
            noiseFilter: { type: 'bandpass', freq: 700 },
        },

        // «Hellfire Spark» — sharp metallic ping; FM ratio 4.2 produces an
        // inharmonic bell-like ring before the descending sweep decays.
        target: {
            f: 940,  dur: 0.1,  type: 'square', sweep: -520, noise: 0.14,
            fm: { ratio: 4.2, depth: 90 },
            adsr: { a: 0.001, d: 0.032, s: 0.08, r: 0.05 },
        },

        // «Shatter» — crumbling brick impact; large negative sweep + bandpass
        // noise recreates the splintering texture of breaking masonry.
        brick: {
            f: 820,  dur: 0.065, type: 'square', sweep: -680, noise: 0.22, vol: 0.95,
            adsr: { a: 0.001, d: 0.022, s: 0.04, r: 0.035 },
            noiseFilter: { type: 'bandpass', freq: 1100 },
        },

        // «Whiplash» — explosive slingshot snap; highpass noise above 1.8 kHz
        // gives the sizzle of a leather whip cracking in a hellish hall.
        sling: {
            f: 280,  dur: 0.07, type: 'sawtooth', sweep: 820, noise: 0.32,
            dist: 0.5,
            adsr: { a: 0.001, d: 0.022, s: 0.08, r: 0.038 },
            noiseFilter: { type: 'highpass', freq: 1800 },
        },

        // «Hellkick» — deep power kick; sub-FM (ratio 0.5) adds low-end warmth,
        // distortion keeps the snap punchy through the mix.
        kicker: {
            f: 220,  dur: 0.25, type: 'sawtooth', sweep: 860, noise: 0.18,
            dist: 0.28, fm: { ratio: 0.5, depth: 35 },
            adsr: { a: 0.003, d: 0.08, s: 0.22, r: 0.14 },
        },

        // «Ricochet» — clean, neutral wall bounce; intentionally uncoloured
        // so it never competes with the thematic impacts above.
        wall: {
            f: 260,  dur: 0.038, type: 'triangle', sweep: -70, noise: 0.05, vol: 0.5,
            adsr: { a: 0.001, d: 0.012, s: 0, r: 0.018 },
        },

        // «Pendulum Sweep» — low whooshing hit with lowpass-coloured body;
        // the slow attack mimics the heavy arc of the swinging arm.
        pendulum: {
            f: 200,  dur: 0.2,  type: 'triangle', sweep: -80, noise: 0.18, vol: 0.88,
            adsr: { a: 0.003, d: 0.065, s: 0.18, r: 0.11 },
            noiseFilter: { type: 'lowpass', freq: 650 },
        },

        // «Gear Grind» — mechanical click-crunch; sawtooth + bandpass noise
        // captures the tooth-skip of a spinning cog catching the ball.
        gear: {
            f: 340,  dur: 0.085, type: 'sawtooth', sweep: 150, noise: 0.28, vol: 0.72,
            dist: 0.22,
            adsr: { a: 0.001, d: 0.028, s: 0.1, r: 0.042 },
            noiseFilter: { type: 'bandpass', freq: 920 },
        },

        // «Hellspring» — classic «boing»: sine starts high (880 Hz) and sweeps
        // steeply downward (−660 Hz) over 0.38 s — the pitch-drop that defines the
        // sound. FM (ratio 4, depth 180) adds a metallic spring-coil transient on
        // the attack before the clean tone takes over on the release tail.
        spring: {
            f: 880,  dur: 0.38, type: 'sine', sweep: -660, noise: 0.02, vol: 0.92,
            fm: { ratio: 4, depth: 180 },
            adsr: { a: 0.001, d: 0.07, s: 0.08, r: 0.28 },
        },

        // «Creaking Gate» — heavy mechanical gate; slow FM (ratio 1.2) modulates
        // pitch like a rusty hinge; lowpass noise grounds the creak in wood.
        gate: {
            f: 110,  dur: 0.32, type: 'sawtooth', sweep: 200, noise: 0.22, vol: 0.82,
            dist: 0.18, fm: { ratio: 1.2, depth: 25 },
            adsr: { a: 0.012, d: 0.09, s: 0.28, r: 0.2 },
            noiseFilter: { type: 'lowpass', freq: 750 },
        },

        // ── Warp / portal ─────────────────────────────────────────────────────

        // «Occult Vortex» — supernatural portal shimmer; FM ratio 4.5 with
        // depth 240 produces dense sidebands that evoke a spinning vortex.
        // Reverb sends the tail into the room — the hole feels spatial.
        warp: {
            f: 240,  dur: 0.7,  type: 'sine', sweep: 940, noise: 0.06, vol: 1.15,
            fm: { ratio: 4.5, depth: 240 },
            adsr: { a: 0.045, d: 0.12, s: 0.5, r: 0.45 },
            reverb: true,
        },

        // «Consumed by Darkness» — three-voice open-fifth surge (root + octave +
        // 5th-above-octave) rises from 90 Hz to 1430 Hz — the feeling of being
        // sucked through a portal at acceleration.
        warp_enter: {
            f: 90,   dur: 1,    type: 'sawtooth', sweep: 1340, noise: 0.14, vol: 1.35,
            chord: [0, 12, 19],
            fm: { ratio: 2.2, depth: 85 },
            adsr: { a: 0.05, d: 0.2, s: 0.42, r: 0.52 },
            reverb: true,
        },

        // ── Boss ──────────────────────────────────────────────────────────────

        // Generic boss impact — sub-FM (ratio 0.5) reinforces the low end;
        // heavy WaveShaper drive (0.78) gives the saturated demonic slam.
        boss: {
            f: 95,   dur: 0.35, type: 'sawtooth', sweep: -75, noise: 0.32,
            dist: 0.78, fm: { ratio: 0.5, depth: 45 },
            adsr: { a: 0.004, d: 0.09, s: 0.32, r: 0.2 },
            noiseFilter: { type: 'lowpass', freq: 480 },
        },

        // Boss vanquished — stacked power-fifth chord [0-7-12-19-24]; sawtooth
        // with FM keeps it dark and heavy despite the triumphant interval stack.
        boss_kill: {
            f: 160,  dur: 0.75, type: 'sawtooth', sweep: 380, noise: 0.08, vol: 1.35,
            chord: [0, 7, 12, 19, 24],
            fm: { ratio: 1.5, depth: 45 },
            adsr: { a: 0.012, d: 0.14, s: 0.42, r: 0.5 },
            reverb: true,
        },

        // «Demon Screech» — high-pitched infernal cry; FM (ratio 1.5, depth 180)
        // produces the chaotic inharmonic sidebands of a demonic shriek.
        boss_demon: {
            f: 360,  dur: 0.32, type: 'sawtooth', sweep: 540, noise: 0.18, vol: 1.1,
            dist: 0.72, fm: { ratio: 1.5, depth: 180 },
            adsr: { a: 0.003, d: 0.07, s: 0.28, r: 0.2 },
        },

        // «Dragon Roar» — deep sub-FM (ratio 0.28) gives sub-harmonic rumble;
        // slow attack + reverb tail simulates the acoustic bloom of a large space.
        boss_dragon: {
            f: 75,   dur: 0.6,  type: 'sawtooth', sweep: 240, noise: 0.28, vol: 1.3,
            dist: 0.58, fm: { ratio: 0.28, depth: 65 },
            adsr: { a: 0.012, d: 0.11, s: 0.44, r: 0.42 },
            reverb: true,
        },

        // «Golem Rumble» — massive stone thud; 55 Hz triangle + heavy lowpass
        // noise (cut at 280 Hz) is all body and no pitch — pure seismic mass.
        boss_golem: {
            f: 55,   dur: 0.5,  type: 'triangle', sweep: -35, noise: 0.55, vol: 1.25,
            dist: 0.35,
            adsr: { a: 0.008, d: 0.13, s: 0.38, r: 0.3 },
            noiseFilter: { type: 'lowpass', freq: 280 },
        },

        // «Witch Cackle» — FM ratio 7.2, depth 320: dense high-frequency
        // sidebands create an eerie sparkle; reverb tail extends the magic.
        boss_witch: {
            f: 580,  dur: 0.42, type: 'sine', sweep: 920, noise: 0.08, vol: 1.05,
            fm: { ratio: 7.2, depth: 320 },
            adsr: { a: 0.01, d: 0.11, s: 0.32, r: 0.26 },
            reverb: true,
        },

        // ── Player actions ────────────────────────────────────────────────────

        // «Hellspring Launch» — FM + light distortion + large sweep (980 Hz)
        // conveys the spring unloading and the ball accelerating down the lane.
        launch: {
            f: 150,  dur: 0.54, type: 'sawtooth', sweep: 980, noise: 0.15, vol: 1.1,
            fm: { ratio: 2, depth: 55 }, dist: 0.22,
            adsr: { a: 0.005, d: 0.1, s: 0.28, r: 0.38 },
        },

        // ── Rewards & feedback ────────────────────────────────────────────────

        // «Dark Triumph» — minor tetrachord [0-3-7-12] (root, m3, P5, octave);
        // victory sounds earned, not cheerful — this is the underworld.
        mission: {
            f: 550,  dur: 0.42, type: 'square', sweep: 720, noise: 0, vol: 1.25,
            chord: [0, 3, 7, 12],
            adsr: { a: 0.007, d: 0.1, s: 0.48, r: 0.28 },
            reverb: true,
        },

        // «Swift Strike» — perfect-fifth dyad [0-7]; quick and satisfying,
        // the hollow fifth lands without sweetness — appropriate for a combo.
        combo: {
            f: 680,  dur: 0.16, type: 'square', sweep: 460, noise: 0.04, vol: 0.95,
            chord: [0, 7],
            adsr: { a: 0.002, d: 0.045, s: 0.16, r: 0.09 },
        },

        // «Hellbound Jackpot» — pentachord FM ignition; FM shimmer (ratio 3)
        // turns the square-wave chord into a blazing harmonic eruption.
        extra: {
            f: 880,  dur: 0.5,  type: 'square', sweep: 1100, noise: 0, vol: 1.45,
            chord: [0, 4, 7, 12, 16],
            fm: { ratio: 3, depth: 60 },
            adsr: { a: 0.006, d: 0.1, s: 0.44, r: 0.34 },
            reverb: true,
        },

        // «Target Cleared» — open-fifth triad [0-7-12] with clean sustain;
        // brighter than combo but darker than extra — a mid-tier reward.
        target_bank: {
            f: 740,  dur: 0.52, type: 'square', sweep: 880, noise: 0, vol: 1.22,
            chord: [0, 7, 12],
            adsr: { a: 0.005, d: 0.11, s: 0.38, r: 0.35 },
            reverb: true,
        },

        // «Multiball Ignition» — hexachord [0-4-7-12-16-24] with FM surge;
        // the wide voicing and two-octave span fills the stereo field completely.
        multiball: {
            f: 330,  dur: 0.75, type: 'square', sweep: 1200, noise: 0, vol: 1.4,
            chord: [0, 4, 7, 12, 16, 24],
            fm: { ratio: 2.5, depth: 80 },
            adsr: { a: 0.008, d: 0.14, s: 0.44, r: 0.48 },
            reverb: true,
        },

        // ── Negative / warning ────────────────────────────────────────────────

        // «Descent to Hell» — tritone dyad [0+6] = «diabolus in musica»;
        // the augmented fourth is the most dissonant classical interval,
        // perfect for signalling ball loss in a devil-themed game.
        lost: {
            f: 260,  dur: 0.88, type: 'sawtooth', sweep: -190, noise: 0.1, vol: 1.15,
            chord: [0, 6],
            fm: { ratio: 0.75, depth: 28 },
            adsr: { a: 0.015, d: 0.15, s: 0.38, r: 0.62 },
            reverb: true,
        },

        // «Hellalert» — low tense warning pulse; minor fall in sweep conveys
        // urgency without full drama — the drain hasn't happened yet.
        drain_warn: {
            f: 130,  dur: 0.22, type: 'square', sweep: -55, noise: 0.07, vol: 0.85,
            adsr: { a: 0.003, d: 0.06, s: 0.22, r: 0.12 },
        },

        // «TILT — Infernal Judgment» — extreme WaveShaper drive (0.88) turns
        // the oscillator into broadband distortion; lowpass noise below 600 Hz
        // makes it a crushing floor of hellish static.
        tilt: {
            f: 80,   dur: 0.62, type: 'square', sweep: 0, noise: 0.42, vol: 1.15,
            dist: 0.88,
            adsr: { a: 0.004, d: 0.1, s: 0.42, r: 0.45 },
            noiseFilter: { type: 'lowpass', freq: 600 },
        },

        // «Infernal Reprieve» — octave dyad [0-12] with FM shimmer (ratio 4);
        // bright and uplifting despite the theme — salvation feels earned here.
        ball_save: {
            f: 880,  dur: 0.34, type: 'square', sweep: 480, noise: 0, vol: 1.25,
            chord: [0, 12],
            fm: { ratio: 4, depth: 80 },
            adsr: { a: 0.004, d: 0.08, s: 0.38, r: 0.22 },
            reverb: true,
        },
    };

    // ── Section audio profiles ─────────────────────────────────────────────────

    static PROFILES = {

        inferno: {
            lpFreq: 2600,  lpQ: 1.6,
            hiShelfFreq: 3800,  hiShelfGain: -7,
            reverbWet: 0.22,
            reverbIR: { preDelay: 0.03, decay: 2.4 },
            compThreshold: -14, compRatio: 5.5, compAttack: 0.006, compRelease: 0.22,
            tremoloFreq: 0.65, tremoloDepth: 0.1,
            masterGain: 1.05,
        },
        abyss: {
            lpFreq: 580,   lpQ: 2.6,
            hiShelfFreq: 1800,  hiShelfGain: -16,
            reverbWet: 0.65,
            reverbIR: { preDelay: 0.14, decay: 8 },
            compThreshold: -8,  compRatio: 8,   compAttack: 0.015, compRelease: 0.38,
            tremoloFreq: 0.22, tremoloDepth: 0.28,
            masterGain: 0.72,
        },


        crystal_vault: {
            lpFreq: 20000, lpQ: 0.1,
            hiShelfFreq: 6000,  hiShelfGain: 9,
            reverbWet: 0.06,
            reverbIR: { preDelay: 0.002, decay: 0.1 },
            compThreshold: -28, compRatio: 1.4, compAttack: 0.001, compRelease: 0.05,
            tremoloFreq: 16,   tremoloDepth: 0.07,
            masterGain: 1.25,
        },

        ritual_chamber: {
            lpFreq: 3200,  lpQ: 2.2,
            hiShelfFreq: 5500,  hiShelfGain: -12,
            reverbWet: 0.72,
            reverbIR: { preDelay: 0.2, decay: 7.5 },
            compThreshold: -24, compRatio: 2.8, compAttack: 0.018, compRelease: 0.5,
            tremoloFreq: 3.3,  tremoloDepth: 0.32,
            masterGain: 0.78,
        },

        
        demon_forge: {
            lpFreq: 1900,   lpQ: 3.6,
            hiShelfFreq: 2800,  hiShelfGain: 5,
            reverbWet: 0,
            reverbIR: { preDelay: 0.003, decay: 1.15 },
            compThreshold: -4,  compRatio: 20,  compAttack: 0.0005, compRelease: 0.04,
            tremoloFreq: 11,   tremoloDepth: 0.9,
            masterGain: 1.38,
        },
    };

    // ── Private synthesis helpers ─────────────────────────────────────────────

    /**
     * Synthesise one tonal voice with ADSR envelope, optional FM, optional
     * WaveShaper distortion, and optional reverb send.
     *
     * ADSR convention (all values in seconds / linear ratios):
     *   a — attack  : t → t+a          (0 → peak)
     *   d — decay   : t+a → t+a+d      (peak → peak·s)
     *   s — sustain : 0-1 ratio; held at peak·s until t+dur
     *   r — release : t+dur → t+dur+r  (peak·s → silence)
     *
     * @param {number} t       AudioContext.currentTime
     * @param {Object} p       preset descriptor
     * @param {number} freq    carrier frequency Hz (post-jitter)
     * @param {number} volMult preset volume multiplier
     * @param {number} voices  simultaneous voice count (gain normalisation)
     */
    _tone(t, p, freq, volMult, voices) {
        const ctx  = this.ctx;
        const adsr = p.adsr ?? {};
        const atk  = adsr.a ?? 0.006;
        const dec  = adsr.d ?? 0.04;
        const sus  = adsr.s ?? 0.3;
        const rel  = adsr.r ?? 0.03;
        const end  = t + p.dur + rel;

        // Peak gain normalised across chord voices to avoid loudness stacking
        const peak = 0.3 * (volMult ?? 1) / Math.max(1, voices ?? 1);
        const susG = Math.max(0.0001, peak * sus);

        // ── Carrier oscillator
        const osc = ctx.createOscillator();
        osc.type            = p.type;
        osc.frequency.value = freq;
        if (p.sweep) {
            osc.frequency.linearRampToValueAtTime(freq + p.sweep, t + p.dur);
        }

        // ── Optional FM modulator
        //    Modulator oscillator feeds directly into osc.frequency AudioParam,
        //    producing classic FM synthesis without an extra node in the audio path.
        if (p.fm) {
            const mod = ctx.createOscillator();
            mod.type            = 'sine';
            mod.frequency.value = freq * p.fm.ratio;
            const modG          = ctx.createGain();
            modG.gain.value     = p.fm.depth;
            mod.connect(modG);
            modG.connect(osc.frequency);
            mod.start(t);
            mod.stop(end + 0.02);
        }

        // ── ADSR envelope
        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001,    t);
        env.gain.linearRampToValueAtTime(peak,  t + atk);
        env.gain.linearRampToValueAtTime(susG,  t + atk + dec);
        env.gain.setValueAtTime(susG,           t + p.dur);
        env.gain.exponentialRampToValueAtTime(0.0001, end);

        osc.connect(env);

        // ── Optional WaveShaper saturation (post-envelope)
        //    Placed after the ADSR so the dynamics shaping still applies;
        //    the shaper adds harmonics and colours the timbre.
        let tail = env;
        if (p.dist > 0) {
            const ws      = ctx.createWaveShaper();
            ws.curve      = SoundManager._distortionCurve(p.dist);
            ws.oversample = '2x';
            env.connect(ws);
            tail = ws;
        }

        // ── Route to dry path and optional reverb send
        tail.connect(this._lp);
        if (p.reverb) tail.connect(this._reverb);

        osc.start(t);
        osc.stop(end + 0.02);
    }

    /**
     * Noise burst using a random window from the pre-allocated buffer.
     * Random offset provides texture variation across calls with zero allocation.
     *
     * @param {number} t
     * @param {number} dur
     * @param {number} gainVal
     * @param {{ type: string, freq: number }|undefined} filterDesc
     */
    _noise(t, dur, gainVal, filterDesc) {
        if (!this._noiseBuf) return;
        const ctx    = this.ctx;
        const bufDur = this._noiseBuf.duration;
        const offset = Math.random() * Math.max(0, bufDur - dur - 0.02);

        const src = ctx.createBufferSource();
        src.buffer = this._noiseBuf;

        const g = ctx.createGain();
        g.gain.setValueAtTime(gainVal * 0.55, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

        src.connect(g);

        // Optional BiquadFilter colours the noise burst:
        //   bandpass → tight click / snap (bumper)
        //   lowpass  → muffled thud (tilt)
        if (filterDesc) {
            const bf           = ctx.createBiquadFilter();
            bf.type            = filterDesc.type;
            bf.frequency.value = filterDesc.freq;
            bf.Q.value         = 1.4;
            g.connect(bf);
            bf.connect(this._lp);
        } else {
            g.connect(this._lp);
        }

        src.start(t, offset);
        src.stop(t + dur + 0.01);
    }

    /**
     * Arctangent-based soft-clip WaveShaper curve.
     * Result is memoised: a given drive value is only computed once per session.
     *
     * Formula: y = (π + k) · x / (π + k · |x|)
     *   k ≈ 1   → subtle harmonic saturation
     *   k ≈ 300 → heavy clipping with preserved zero-crossing symmetry
     *
     * @param {number} amount — 0 (clean) to 1 (heavily clipped)
     * @returns {Float32Array}
     */
    static _distortionCurve(amount) {
        const key = amount.toFixed(2);
        if (SoundManager._distortionCache.has(key)) {
            return SoundManager._distortionCache.get(key);
        }
        const k     = Math.max(1, amount * 300);
        const n     = 256;
        const curve = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            const x  = (i * 2) / n - 1; // −1 → +1
            curve[i] = ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x));
        }
        SoundManager._distortionCache.set(key, curve);
        return curve;
    }

    destroy() {
        this.stopBgm();
        if (this._tremoloLFO) { this._tremoloLFO.stop(0); }
        if (this.ctx) { this.ctx.close().catch(() => { /* already closed */ }); }
        this.ctx = null;
    }
}

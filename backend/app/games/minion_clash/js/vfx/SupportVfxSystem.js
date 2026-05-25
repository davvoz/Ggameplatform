import { SUPPORT_VFX_CONFIGS, BURST_INTERVAL, PULSE_INTERVAL } from './SupportVfxConfig.js';

/**
 * Handles all VFX emission for support-type units (mana pumps, tower repair, etc.).
 *
 * SRP  : sole responsibility is timer tracking + VFX emission delegation.
 * OCP  : extend behaviour by adding entries to SupportVfxConfig — no changes here.
 * DIP  : depends on the VFXManager interface, not on concrete particle types.
 */
export class SupportVfxSystem {
    _burstTimer = 0;
    _pulseTimer = 0;

    /**
     * @param {number}      dt         - Delta time in seconds.
     * @param {Iterable}    entities   - All live entities in the world.
     * @param {string}      team       - The team owning this system ('player'|'enemy').
     * @param {object}      tower      - The team's tower entity.
     * @param {object|null} vfxManager - VFXManager instance (may be null during init).
     */
    update(dt, entities, team, tower, vfxManager) {
        if (!vfxManager) return;

        this._burstTimer += dt;
        this._pulseTimer += dt;

        const emitBurst = this._burstTimer >= BURST_INTERVAL;
        const emitPulse = this._pulseTimer >= PULSE_INTERVAL;

        if (!emitBurst && !emitPulse) return;

        if (emitBurst) this._burstTimer = 0;
        if (emitPulse) this._pulseTimer = 0;

        for (const entity of entities) {
            if (entity.isDead() || entity.team !== team) continue;
            for (const cfg of SUPPORT_VFX_CONFIGS) {
                this._processEntry(cfg, entity, tower, vfxManager, emitBurst, emitPulse);
            }
        }
    }

    // ─── Private ────────────────────────────────────────────────────────────────

    _processEntry(cfg, entity, tower, vfxManager, emitBurst, emitPulse) {
        if (!entity.def?.[cfg.trigger]) return;
        if (cfg.requiresTower && tower.isDead()) return;

        const burstSrc = cfg.burstOrigin === 'tower' ? tower : entity;
        const pulseSrc = cfg.pulseOrigin === 'tower' ? tower : entity;

        if (emitBurst) this._emitBurst(cfg, burstSrc, vfxManager);
        if (emitPulse) this._emitPulse(cfg, pulseSrc, vfxManager);
    }

    _emitBurst(cfg, src, vfxManager) {
        const { burst } = cfg;
        for (let i = 0; i < burst.count; i++) {
            vfxManager.add({
                type:    cfg.burstType,
                x:       src.x + (Math.random() - 0.5) * burst.spreadX,
                y:       src.y + (Math.random() - 0.5) * burst.spreadY,
                vy:      -(burst.vyBase + Math.random() * burst.vyRange),
                vx:      (Math.random() - 0.5) * burst.vxSpread,
                maxLife: burst.lifeMin + Math.random() * (burst.lifeMax - burst.lifeMin),
            });
        }
    }

    _emitPulse(cfg, src, vfxManager) {
        vfxManager.add({
            type:    cfg.pulseType,
            x:       src.x,
            y:       src.y,
            vx:      0,
            vy:      0,
            maxLife: cfg.pulse.maxLife,
        });
    }
}

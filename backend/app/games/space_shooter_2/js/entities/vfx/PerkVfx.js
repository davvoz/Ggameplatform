const PERK_OVERLAY_SLOTS = {
    // ═══ SPINE (center axis, top to bottom) ═══
    piercing_rounds:    { dx: 0,   dy: -26, c: 'o' },
    thorns:             { dx: 0,   dy: -4,  c: 'd' },
    orbital_drone:      { dx: 0,   dy: 12,  c: 'u' },
    ultimate_engine:    { dx: 0,   dy: 26,  c: 'u' },

    // ═══ INNER RING (±12, hull-mounted) ═══
    critical_strike:    { dx: 12,  dy: -14, c: 'o' },
    explosive_rounds:   { dx: -12, dy: -14, c: 'o' },
    auto_shield:        { dx: 12,  dy: 4,   c: 'd' },
    phase_dodge:        { dx: -12, dy: 4,   c: 'd' },
    combo_master:       { dx: 12,  dy: 18,  c: 'u' },
    cool_exhaust:       { dx: -12, dy: 18,  c: 'u' },

    // ═══ OUTER RING (±26, wing hardpoints) ═══
    double_barrel:      { dx: 26,  dy: -18, c: 'o' },
    glass_cannon:       { dx: -26, dy: -18, c: 'o' },
    chain_lightning:    { dx: 26,  dy: -6,  c: 'o' },
    vampire_rounds:     { dx: -26, dy: -6,  c: 'o' },
    emergency_protocol: { dx: 26,  dy: 6,   c: 'd' },
    damage_converter:   { dx: -26, dy: 6,   c: 'd' },
    fortress_mode:      { dx: 26,  dy: 16,  c: 'd' },
    magnet_field:       { dx: -26, dy: 16,  c: 'u' },
    lucky_drops:        { dx: 26,  dy: 26,  c: 'u' },
    point_multiplier:   { dx: -26, dy: 26,  c: 'u' },

    // ═══ WORLD 2 — MID RING (±18, between inner & outer) ═══
    neural_hijack:      { dx: 18,  dy: -20, c: 'o' },
    predatore:          { dx: -18, dy: -20, c: 'o' },
    colpo_critico:      { dx: 18,  dy: -8,  c: 'o' },
    scia_infuocata:     { dx: -18, dy: -8,  c: 'd' },
    esploratore:        { dx: 18,  dy: 10,  c: 'u' },
    sovraccarico:       { dx: -18, dy: 10,  c: 'u' },

    // ═══ WORLD 3 — FAR RING (±32, outermost hardpoints) ═══
    packet_burst:       { dx: 32,  dy: -12, c: 'o' },
    virus_inject:       { dx: -32, dy: -12, c: 'o' },
    glitch_dash:        { dx: 32,  dy: 2,   c: 'd' },
    entropy_shield:     { dx: -32, dy: 2,   c: 'd' },
    data_leech:         { dx: 32,  dy: 16,  c: 'u' },

    // ═══ WORLD 4 — QUANTUM RING (±38, beyond far ring) ═══
    quantum_entangle:   { dx: 38,  dy: -16, c: 'o' },
    wave_collapse:      { dx: -38, dy: -16, c: 'o' },
    tunnel_shift:       { dx: 38,  dy: -2,  c: 'd' },
    probability_field:  { dx: -38, dy: -2,  c: 'd' },
    antimatter_harvest: { dx: 38,  dy: 12,  c: 'u' },
};

const GLOW_TINT = { o: '#ff5030', d: '#3388ff', u: '#33dd77' };

class PerkVfx {

    static shouldRender(_player, perkSystem) {
        return !!perkSystem;
    }

    static render(ctx, { player, cx, cy, perkSystem, assets }) {
        PerkVfx._renderOverlays(ctx, perkSystem, assets, cx, cy);
        PerkVfx._renderThorns(ctx, perkSystem, cx, cy);
    }

    // ─── Perk device overlays ────────────────────

    static _renderOverlays(ctx, perkSystem, assets, cx, cy) {
        const activePerks = perkSystem.getActivePerks();
        const t = Date.now() * 0.002;

        const sorted = activePerks
            .filter(p => PERK_OVERLAY_SLOTS[p.id])
            .sort((a, b) => {
                const sa = PERK_OVERLAY_SLOTS[a.id];
                const sb = PERK_OVERLAY_SLOTS[b.id];
                return (sb.dx * sb.dx + sb.dy * sb.dy)
                    - (sa.dx * sa.dx + sa.dy * sa.dy);
            });

        for (const { id, stacks } of sorted) {
            const slot = PERK_OVERLAY_SLOTS[id];
            const spriteKey = `perk_${id}_${Math.min(stacks, 3)}`;
            const devSprite = assets.getSprite(spriteKey);
            if (!devSprite) continue;

            const float = Math.sin(t + slot.dx * 0.07 + slot.dy * 0.05) * 0.8;
            const devCx = cx + slot.dx;
            const devCy = cy + slot.dy + float;

            ctx.save();
            ctx.shadowColor = GLOW_TINT[slot.c] || '#fff';
            ctx.shadowBlur = 6;
            ctx.globalAlpha = 0.9;
            ctx.drawImage(devSprite,
                devCx - devSprite.width / 2,
                devCy - devSprite.height / 2);
            ctx.restore();
        }
    }

    // ─── Thorns perk effect ──────────────────────

    static _renderThorns(ctx, perkSystem, cx, cy) {
        if (!perkSystem?.hasThorns()) return;

        ctx.save();
        const thornCount = 10;
        const baseR = 38;
        const spikeLen = 16;
        const rotBase = perkSystem.thornsAngle;
        const tTime = perkSystem.thornsTime;
        const pulse = 0.6 + 0.3 * Math.sin(tTime * 4);

        ctx.lineWidth = 2;
        ctx.lineCap = 'round';

        PerkVfx._renderThornSpikes(ctx, cx, { cy, count: thornCount, baseR, spikeLen, rotBase, tTime, pulse });
        PerkVfx._renderThornRing(ctx, cx, cy, baseR, pulse);

        ctx.restore();
    }

    static _renderThornSpikes(ctx, cx, options) {
        const { cy, count, baseR, spikeLen, rotBase, tTime, pulse } = options;
        for (let i = 0; i < count; i++) {
            const angle = rotBase + (i / count) * Math.PI * 2;
            const wobble = Math.sin(tTime * 6 + i * 1.2) * 3;
            const innerR = baseR + wobble;
            const outerR = innerR + spikeLen;

            const ix = cx + Math.cos(angle) * innerR;
            const iy = cy + Math.sin(angle) * innerR;
            const ox = cx + Math.cos(angle) * outerR;
            const oy = cy + Math.sin(angle) * outerR;

            ctx.globalAlpha = pulse * 0.7;
            ctx.strokeStyle = '#aadd55';
            ctx.shadowColor = '#88ff33';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.moveTo(ix, iy);
            ctx.lineTo(ox, oy);
            ctx.stroke();

            ctx.globalAlpha = pulse;
            ctx.fillStyle = '#eeffaa';
            ctx.beginPath();
            ctx.arc(ox, oy, 1.8, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    static _renderThornRing(ctx, cx, cy, baseR, pulse) {
        ctx.globalAlpha = pulse * 0.25;
        ctx.strokeStyle = '#88cc44';
        ctx.shadowColor = '#66ff22';
        ctx.shadowBlur = 10;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, baseR, 0, Math.PI * 2);
        ctx.stroke();
    }
}

export default PerkVfx;

import { C_MEDIUM_BLUE, C_SLATE } from '../../entities/LevelsThemes.js';

import { outlineAndFill } from './Helper.js';

    // ================================================================
    //  PERK DEVICE SPRITES — Visual ship attachments for each perk
    //  Each perk has 3 stack levels → slightly bigger each level
    //  Stored as perk_<id>_1, perk_<id>_2, perk_<id>_3
    // ================================================================

    function generatePerkDeviceSprites(sprites) {
        const defs = [
            // ── OFFENSIVE ──
            { id:'piercing_rounds',  draw: _drawDev_piercingRounds },
            { id:'critical_strike',  draw: _drawDev_criticalStrike },
            { id:'explosive_rounds', draw: _drawDev_explosiveRounds },
            { id:'chain_lightning',  draw: _drawDev_chainLightning },
            { id:'vampire_rounds',   draw: _drawDev_vampireRounds },
            { id:'double_barrel',    draw: _drawDev_doubleBarrel },
            { id:'glass_cannon',     draw: _drawDev_glassCannon },
            // ── DEFENSIVE ──
            { id:'auto_shield',      draw: _drawDev_autoShield },
            { id:'phase_dodge',      draw: _drawDev_phaseDodge },
            { id:'emergency_protocol', draw: _drawDev_emergencyProtocol },
            { id:'damage_converter', draw: _drawDev_damageConverter },
            { id:'thorns',           draw: _drawDev_thorns },
            { id:'fortress_mode',    draw: _drawDev_fortressMode },
            // ── UTILITY ──
            { id:'magnet_field',     draw: _drawDev_magnetField },
            { id:'combo_master',     draw: _drawDev_comboMaster },
            { id:'ultimate_engine',  draw: _drawDev_ultimateEngine },
            { id:'cool_exhaust',     draw: _drawDev_coolExhaust },
            { id:'lucky_drops',      draw: _drawDev_luckyDrops },
            { id:'point_multiplier', draw: _drawDev_pointMultiplier },
            { id:'orbital_drone',    draw: _drawDev_orbitalDrone },
            // ── WORLD 2 PERKS ──
            { id:'neural_hijack',   draw: _drawDev_ricochetMaster },
            { id:'predatore',        draw: _drawDev_predatore },
            { id:'colpo_critico',    draw: _drawDev_colpoCritico },
            { id:'scia_infuocata',   draw: _drawDev_sciaInfuocata },
            { id:'esploratore',      draw: _drawDev_esploratore },
            { id:'sovraccarico',     draw: _drawDev_sovraccarico },
            // ── WORLD 3 PERKS ──
            { id:'packet_burst',     draw: _drawDev_packetBurst },
            { id:'virus_inject',     draw: _drawDev_virusInject },
            { id:'glitch_dash',      draw: _drawDev_glitchDash },
            { id:'entropy_shield',   draw: _drawDev_entropyShield },
            { id:'data_leech',       draw: _drawDev_dataLeech },
        ];

        for (const def of defs) {
            for (let stack = 1; stack <= 3; stack++) {
                const scale = 0.85 + stack * 0.15;     // 1.0, 1.15, 1.3
                const S = Math.ceil(20 * scale);          // base 20px → 20, 23, 26
                const cv = document.createElement('canvas');
                cv.width = S; cv.height = S;
                const ctx = cv.getContext('2d');
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                def.draw(ctx, S, scale, stack);
                sprites[`perk_${def.id}_${stack}`] = cv;
            }
        }
    }

    // ── Individual device draw methods ──
    // All receive (ctx, S=canvas size, scale, stack)
    // Device should be centered in the S×S canvas

    /** Piercing Rounds: pointed drill/arrowhead tip */
    function _drawDev_piercingRounds(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.38;
        ctx.beginPath();
        ctx.moveTo(cx, cy-r); ctx.lineTo(cx+r*0.5, cy+r*0.6);
        ctx.lineTo(cx, cy+r*0.3); ctx.lineTo(cx-r*0.5, cy+r*0.6);
        ctx.closePath();
        outlineAndFill(ctx, '#ccccdd', '#111', 2);
        // Inner groove
        ctx.strokeStyle='#889'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(cx,cy-r*0.6); ctx.lineTo(cx,cy+r*0.2); ctx.stroke();
        // Tip glow
        ctx.fillStyle='rgba(100,200,255,0.5)';
        ctx.beginPath(); ctx.arc(cx, cy-r*0.5, r*0.2, 0, Math.PI*2); ctx.fill();
    }

    /** Critical Strike: crosshair reticle */
    function _drawDev_criticalStrike(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.35;
        ctx.strokeStyle='#ff4444'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx-r*1.2,cy); ctx.lineTo(cx-r*0.4,cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx+r*0.4,cy); ctx.lineTo(cx+r*1.2,cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx,cy-r*1.2); ctx.lineTo(cx,cy-r*0.4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx,cy+r*0.4); ctx.lineTo(cx,cy+r*1.2); ctx.stroke();
        ctx.fillStyle='#ff4444'; ctx.beginPath();
        ctx.arc(cx,cy,r*0.2,0,Math.PI*2); ctx.fill();
    }

    /** Explosive Rounds: small bomb/grenade */
    function _drawDev_explosiveRounds(ctx, S, sc) {
        const cx=S/2, cy=S/2+1, r=S*0.3;
        ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
        outlineAndFill(ctx, '#cc4400', '#111', 2);
        // Fuse
        ctx.strokeStyle='#886644'; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(cx,cy-r); ctx.quadraticCurveTo(cx+r*0.5,cy-r*1.6,cx+r*0.3,cy-r*1.3); ctx.stroke();
        // Spark
        ctx.fillStyle='#ffdd44';
        ctx.beginPath(); ctx.arc(cx+r*0.3,cy-r*1.3,r*0.2,0,Math.PI*2); ctx.fill();
        // Band
        ctx.strokeStyle='#111'; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(cx-r*0.7,cy-r*0.2); ctx.lineTo(cx+r*0.7,cy-r*0.2); ctx.stroke();
    }

    /** Chain Lightning: small tesla coil */
    function _drawDev_chainLightning(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.32;
        // Base cylinder
        ctx.beginPath();
        ctx.roundRect(cx-r*0.4, cy, r*0.8, r*0.9, 2);
        outlineAndFill(ctx, '#556677', '#111', 2);
        // Coil sphere
        ctx.beginPath(); ctx.arc(cx, cy, r*0.45, 0, Math.PI*2);
        outlineAndFill(ctx, C_MEDIUM_BLUE, '#111', 1.5);
        // Lightning bolts
        ctx.strokeStyle='#88ddff'; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(cx,cy-r*0.4); ctx.lineTo(cx-r*0.4,cy-r*0.8);
        ctx.lineTo(cx-r*0.1,cy-r*0.6); ctx.lineTo(cx-r*0.5,cy-r*1.1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx+r*0.1,cy-r*0.3);
        ctx.lineTo(cx+r*0.5,cy-r*0.7); ctx.stroke();
    }

    /** Vampire Rounds: blood fang / red vial */
    function _drawDev_vampireRounds(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.3;
        // Vial body
        ctx.beginPath();
        ctx.roundRect(cx-r*0.5, cy-r*0.6, r, r*1.5, 3);
        outlineAndFill(ctx, '#880022', '#111', 2);
        // Vial neck
        ctx.beginPath();
        ctx.roundRect(cx-r*0.3, cy-r, r*0.6, r*0.5, 2);
        outlineAndFill(ctx, '#aa3344', '#111', 1.5);
        // Blood level
        ctx.fillStyle='rgba(255,0,50,0.6)';
        ctx.beginPath(); ctx.roundRect(cx-r*0.35, cy, r*0.7, r*0.7, 2); ctx.fill();
        // Highlight
        ctx.fillStyle='rgba(255,255,255,0.3)';
        ctx.beginPath(); ctx.ellipse(cx-r*0.15, cy-r*0.3, r*0.1, r*0.3, 0, 0, Math.PI*2); ctx.fill();
    }

    /** Double Barrel: twin gun barrels */
    function _drawDev_doubleBarrel(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.35;
        for (const sx of [-1,1]) {
            ctx.beginPath();
            ctx.roundRect(cx+sx*r*0.3-r*0.2, cy-r, r*0.4, r*2, 3);
            outlineAndFill(ctx, C_SLATE, '#111', 2);
            // Barrel bore
            ctx.fillStyle='#222';
            ctx.beginPath(); ctx.arc(cx+sx*r*0.3, cy-r*0.8, r*0.15, 0, Math.PI*2); ctx.fill();
        }
        // Mount plate
        ctx.beginPath();
        ctx.roundRect(cx-r*0.6, cy+r*0.3, r*1.2, r*0.45, 2);
        outlineAndFill(ctx, '#556', '#111', 1.5);
    }

    /** Glass Cannon: cracked crystal skull */
    function _drawDev_glassCannon(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.35;
        ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
        const g=ctx.createRadialGradient(cx-r*0.2,cy-r*0.2,0,cx,cy,r);
        g.addColorStop(0,'#ffeecc'); g.addColorStop(0.5,'#ff6644'); g.addColorStop(1,'#882200');
        ctx.fillStyle=g; ctx.fill();
        ctx.strokeStyle='#111'; ctx.lineWidth=2; ctx.stroke();
        // Skull eyes
        ctx.fillStyle='#111';
        ctx.beginPath(); ctx.arc(cx-r*0.3,cy-r*0.1,r*0.15,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx+r*0.3,cy-r*0.1,r*0.15,0,Math.PI*2); ctx.fill();
        // Crack lines
        ctx.strokeStyle='rgba(0,0,0,0.5)'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(cx,cy-r); ctx.lineTo(cx-r*0.2,cy-r*0.3);
        ctx.lineTo(cx+r*0.1,cy); ctx.stroke();
    }

    /** Auto Shield: small satellite dish */
    function _drawDev_autoShield(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.36;
        // Dish
        ctx.beginPath();
        ctx.ellipse(cx, cy-r*0.1, r, r*0.6, 0, 0, Math.PI);
        outlineAndFill(ctx, '#4488cc', '#111', 2);
        // Inner arc
        ctx.strokeStyle='#88ccff'; ctx.lineWidth=1; ctx.globalAlpha=0.5;
        ctx.beginPath(); ctx.ellipse(cx, cy-r*0.05, r*0.6, r*0.35, 0, 0.2, Math.PI-0.2); ctx.stroke();
        ctx.globalAlpha=1;
        // Stem
        ctx.beginPath(); ctx.roundRect(cx-2, cy+r*0.1, 4, r*0.6, 1);
        outlineAndFill(ctx, '#556', '#111', 1.5);
        // Focus dot
        ctx.fillStyle='#aaddff'; ctx.beginPath(); ctx.arc(cx,cy-r*0.1,r*0.15,0,Math.PI*2); ctx.fill();
    }

    /** Phase Dodge: phase-shift ring */
    function _drawDev_phaseDodge(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.35;
        ctx.setLineDash([3,3]);
        ctx.strokeStyle='#66aaff'; ctx.lineWidth=2.5;
        ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
        ctx.setLineDash([]);
        // Inner ghost circle
        ctx.globalAlpha=0.3; ctx.fillStyle=C_MEDIUM_BLUE;
        ctx.beginPath(); ctx.arc(cx,cy,r*0.6,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=1;
        // Dashes
        ctx.strokeStyle='#aaccff'; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.arc(cx,cy,r*0.4,0.5,2); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx,cy,r*0.4,3.5,5); ctx.stroke();
    }

    /** Emergency Protocol: exclamation warning beacon */
    function _drawDev_emergencyProtocol(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.33;
        // Triangular warning shape
        ctx.beginPath();
        ctx.moveTo(cx,cy-r); ctx.lineTo(cx+r*0.9,cy+r*0.8);
        ctx.lineTo(cx-r*0.9,cy+r*0.8); ctx.closePath();
        outlineAndFill(ctx, '#ffcc00', '#111', 2);
        // Exclamation mark
        ctx.fillStyle='#111';
        ctx.beginPath(); ctx.roundRect(cx-2, cy-r*0.4, 4, r*0.8, 1); ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy+r*0.55, 2.5, 0, Math.PI*2); ctx.fill();
    }

    /** Damage Converter: recycling / converter coil */
    function _drawDev_damageConverter(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.34;
        // Outer ring
        ctx.strokeStyle='#44aa88'; ctx.lineWidth=3;
        ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
        // Arrows forming cycle (3 arcs)
        ctx.strokeStyle='#66ffbb'; ctx.lineWidth=2;
        for (let i=0;i<3;i++) {
            const a = i*Math.PI*2/3 - Math.PI/2;
            ctx.beginPath(); ctx.arc(cx,cy,r*0.6,a,a+1.5); ctx.stroke();
            // Arrow tip
            const tx=cx+Math.cos(a+1.5)*r*0.6, ty=cy+Math.sin(a+1.5)*r*0.6;
            ctx.fillStyle='#66ffbb';
            ctx.beginPath(); ctx.arc(tx,ty,r*0.12,0,Math.PI*2); ctx.fill();
        }
    }

    /** Thorns: spiked ring collar */
    function _drawDev_thorns(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.42;
        // Center hub
        ctx.beginPath(); ctx.arc(cx,cy,r*0.35,0,Math.PI*2);
        outlineAndFill(ctx, '#557744', '#111', 2);
        // Spikes — long and aggressive
        const spikes=8;
        ctx.beginPath();
        for (let i=0;i<spikes;i++) {
            const a=i*Math.PI*2/spikes;
            const ir=r*0.4, or=r*1.15;
            const a1=a-Math.PI/spikes*0.5, a2=a+Math.PI/spikes*0.5;
            ctx.lineTo(cx+Math.cos(a1)*ir, cy+Math.sin(a1)*ir);
            ctx.lineTo(cx+Math.cos(a)*or, cy+Math.sin(a)*or);
            ctx.lineTo(cx+Math.cos(a2)*ir, cy+Math.sin(a2)*ir);
        }
        ctx.closePath();
        outlineAndFill(ctx, '#aacc77', '#111', 1.5);
        // Spike tips glow
        ctx.shadowColor='#ccff66'; ctx.shadowBlur=4;
        for (let i=0;i<spikes;i++) {
            const a=i*Math.PI*2/spikes;
            const tipX=cx+Math.cos(a)*r*1.15, tipY=cy+Math.sin(a)*r*1.15;
            ctx.fillStyle='#eeffaa';
            ctx.beginPath(); ctx.arc(tipX,tipY,1.2,0,Math.PI*2); ctx.fill();
        }
        ctx.shadowBlur=0;
    }

    /** Fortress Mode: heavy armor plate */
    function _drawDev_fortressMode(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.38;
        // Shield plate
        ctx.beginPath();
        ctx.moveTo(cx,cy-r); ctx.lineTo(cx+r*0.8,cy-r*0.5);
        ctx.lineTo(cx+r*0.7,cy+r*0.7); ctx.lineTo(cx,cy+r);
        ctx.lineTo(cx-r*0.7,cy+r*0.7); ctx.lineTo(cx-r*0.8,cy-r*0.5);
        ctx.closePath();
        outlineAndFill(ctx, '#5566aa', '#111', 2);
        // Cross  emblem
        ctx.strokeStyle='#8899cc'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.moveTo(cx,cy-r*0.4); ctx.lineTo(cx,cy+r*0.4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx-r*0.3,cy); ctx.lineTo(cx+r*0.3,cy); ctx.stroke();
    }

    /** Magnet Field: horseshoe magnet */
    function _drawDev_magnetField(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.34;
        // U-shape magnet
        ctx.lineWidth=r*0.35;
        ctx.strokeStyle='#cc2222'; ctx.lineCap='round';
        ctx.beginPath(); ctx.arc(cx,cy+r*0.1,r*0.55,Math.PI,Math.PI*2); ctx.stroke();
        // Red poles
        ctx.fillStyle='#cc2222';
        ctx.beginPath(); ctx.roundRect(cx-r*0.55-r*0.17,cy+r*0.1,r*0.35,r*0.6,2); ctx.fill();
        // Blue pole
        ctx.fillStyle='#2244cc';
        ctx.beginPath(); ctx.roundRect(cx+r*0.55-r*0.17,cy+r*0.1,r*0.35,r*0.6,2); ctx.fill();
        // Outlines
        ctx.strokeStyle='#111'; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.roundRect(cx-r*0.55-r*0.17,cy+r*0.1,r*0.35,r*0.6,2); ctx.stroke();
        ctx.beginPath(); ctx.roundRect(cx+r*0.55-r*0.17,cy+r*0.1,r*0.35,r*0.6,2); ctx.stroke();
        // Field lines
        ctx.strokeStyle='rgba(100,150,255,0.4)'; ctx.lineWidth=1; ctx.setLineDash([2,2]);
        ctx.beginPath(); ctx.arc(cx,cy+r*0.1,r*0.85,Math.PI+0.3,Math.PI*2-0.3); ctx.stroke();
        ctx.setLineDash([]);
    }

    /** Combo Master: multiplier badge / star counter */
    function _drawDev_comboMaster(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.34;
        // Badge background
        ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
        outlineAndFill(ctx, '#dd8800', '#111', 2);
        // × symbol
        ctx.strokeStyle='#fff'; ctx.lineWidth=2.5;
        ctx.beginPath(); ctx.moveTo(cx-r*0.35,cy-r*0.35); ctx.lineTo(cx+r*0.35,cy+r*0.35); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx+r*0.35,cy-r*0.35); ctx.lineTo(cx-r*0.35,cy+r*0.35); ctx.stroke();
    }

    /** Ultimate Engine: glowing star reactor */
    function _drawDev_ultimateEngine(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.34;
        // Outer ring
        ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
        outlineAndFill(ctx, '#334', '#111', 2);
        // Inner glow
        const g=ctx.createRadialGradient(cx,cy,0,cx,cy,r*0.7);
        g.addColorStop(0,'#ffff88'); g.addColorStop(0.5,'#ffaa00'); g.addColorStop(1,'rgba(255,150,0,0)');
        ctx.fillStyle=g;
        ctx.beginPath(); ctx.arc(cx,cy,r*0.7,0,Math.PI*2); ctx.fill();
        // Star
        ctx.fillStyle='#fff';
        ctx.beginPath();
        for (let i=0;i<5;i++) {
            const a=i*Math.PI*2/5-Math.PI/2;
            const ir=r*0.15, or=r*0.4;
            ctx.lineTo(cx+Math.cos(a)*or, cy+Math.sin(a)*or);
            const a2=a+Math.PI/5;
            ctx.lineTo(cx+Math.cos(a2)*ir, cy+Math.sin(a2)*ir);
        }
        ctx.closePath(); ctx.fill();
    }

    /** Cool Exhaust: radiator / heat fin */
    function _drawDev_coolExhaust(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.36;
        // Radiator fins
        const fins=5;
        for (let i=0;i<fins;i++) {
            const fx=cx-r*0.7 + i*(r*1.4/(fins-1));
            ctx.beginPath();
            ctx.roundRect(fx-1.5, cy-r*0.6, 3, r*1.2, 1);
            ctx.fillStyle=i%2===0?'#4488aa':'#55aacc'; ctx.fill();
            ctx.strokeStyle='#111'; ctx.lineWidth=1; ctx.stroke();
        }
        // Frame
        ctx.strokeStyle='#556'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.roundRect(cx-r*0.8,cy-r*0.7,r*1.6,r*1.4,3); ctx.stroke();
        // Snowflake icon
        ctx.strokeStyle='#aaddff'; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(cx,cy-r*0.35); ctx.lineTo(cx,cy+r*0.35); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx-r*0.3,cy-r*0.15); ctx.lineTo(cx+r*0.3,cy+r*0.15); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx-r*0.3,cy+r*0.15); ctx.lineTo(cx+r*0.3,cy-r*0.15); ctx.stroke();
    }

    /** Lucky Drops: four-leaf clover / dice */
    function _drawDev_luckyDrops(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.28;
        // Four leaves
        ctx.fillStyle='#33aa44';
        for (let i=0;i<4;i++) {
            const a=i*Math.PI/2;
            const lx=cx+Math.cos(a)*r*0.4, ly=cy+Math.sin(a)*r*0.4;
            ctx.beginPath(); ctx.arc(lx,ly,r*0.4,0,Math.PI*2); ctx.fill();
        }
        // Outline all
        ctx.strokeStyle='#111'; ctx.lineWidth=1.5;
        for (let i=0;i<4;i++) {
            const a=i*Math.PI/2;
            const lx=cx+Math.cos(a)*r*0.4, ly=cy+Math.sin(a)*r*0.4;
            ctx.beginPath(); ctx.arc(lx,ly,r*0.4,0,Math.PI*2); ctx.stroke();
        }
        // Center
        ctx.fillStyle='#228833';
        ctx.beginPath(); ctx.arc(cx,cy,r*0.2,0,Math.PI*2); ctx.fill();
        // Stem
        ctx.strokeStyle='#226633'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.moveTo(cx,cy+r*0.2); ctx.lineTo(cx+r*0.2,cy+r*1.1); ctx.stroke();
    }

    /** Point Multiplier: diamond gem */
    function _drawDev_pointMultiplier(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.35;
        // Diamond shape
        ctx.beginPath();
        ctx.moveTo(cx,cy-r); ctx.lineTo(cx+r*0.7,cy-r*0.2);
        ctx.lineTo(cx+r*0.4,cy+r); ctx.lineTo(cx-r*0.4,cy+r);
        ctx.lineTo(cx-r*0.7,cy-r*0.2); ctx.closePath();
        outlineAndFill(ctx, '#44aaff', '#111', 2);
        // Facet lines
        ctx.strokeStyle='rgba(255,255,255,0.4)'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(cx-r*0.7,cy-r*0.2); ctx.lineTo(cx,cy+r); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx+r*0.7,cy-r*0.2); ctx.lineTo(cx,cy+r); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx-r*0.35,cy-r*0.2); ctx.lineTo(cx+r*0.35,cy-r*0.2); ctx.stroke();
        // Sparkle
        ctx.fillStyle='rgba(255,255,255,0.6)';
        ctx.beginPath(); ctx.arc(cx-r*0.15,cy-r*0.35,r*0.12,0,Math.PI*2); ctx.fill();
    }

    /** Orbital Drone: mini satellite */
    function _drawDev_orbitalDrone(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.32;
        // Main body cube
        ctx.beginPath(); ctx.roundRect(cx-r*0.4,cy-r*0.4,r*0.8,r*0.8,3);
        outlineAndFill(ctx, '#778899', '#111', 2);
        // Solar panels
        for (const sx of [-1,1]) {
            ctx.beginPath();
            ctx.roundRect(cx+sx*r*0.5,cy-r*0.25,r*0.5*sx,r*0.5,2);
            outlineAndFill(ctx, '#2244aa', '#111', 1.5);
            // Panel lines
            ctx.strokeStyle='#4466cc'; ctx.lineWidth=0.8;
            ctx.beginPath(); ctx.moveTo(cx+sx*r*0.75,cy-r*0.15); ctx.lineTo(cx+sx*r*0.75,cy+r*0.15); ctx.stroke();
        }
        // Antenna
        ctx.strokeStyle='#aaa'; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(cx,cy-r*0.4); ctx.lineTo(cx,cy-r*0.8); ctx.stroke();
        ctx.fillStyle='#ff4444'; ctx.beginPath(); ctx.arc(cx,cy-r*0.8,r*0.12,0,Math.PI*2); ctx.fill();
    }

    // ═══════════════════════════════════════
    //  WORLD 2 PERK DEVICE DRAW METHODS
    // ═══════════════════════════════════════

    /** Ricochet Master: angular bouncing arrow */
    function _drawDev_ricochetMaster(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.36;
        // Bouncing path arrows
        ctx.strokeStyle='#ff8800'; ctx.lineWidth=2.5;
        ctx.beginPath();
        ctx.moveTo(cx-r*0.8, cy-r*0.6);
        ctx.lineTo(cx-r*0.1, cy+r*0.3);
        ctx.lineTo(cx+r*0.5, cy-r*0.5);
        ctx.lineTo(cx+r*0.9, cy+r*0.6);
        ctx.stroke();
        // Arrow tip
        ctx.fillStyle='#ff8800';
        ctx.beginPath();
        ctx.moveTo(cx+r*0.9, cy+r*0.6);
        ctx.lineTo(cx+r*0.5, cy+r*0.4);
        ctx.lineTo(cx+r*0.7, cy+r*0.2);
        ctx.closePath(); ctx.fill();
        // Bounce dots at vertices
        ctx.fillStyle='#ffcc44';
        ctx.beginPath(); ctx.arc(cx-r*0.1, cy+r*0.3, r*0.12, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx+r*0.5, cy-r*0.5, r*0.12, 0, Math.PI*2); ctx.fill();
    }

    /** Predatore: hunter eye / targeting scope */
    function _drawDev_predatore(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.36;
        // Scope ring
        ctx.strokeStyle='#22cc66'; ctx.lineWidth=2.5;
        ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
        // Crosshair
        ctx.strokeStyle='#33ff88'; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(cx-r*1.1,cy); ctx.lineTo(cx-r*0.3,cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx+r*0.3,cy); ctx.lineTo(cx+r*1.1,cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx,cy-r*1.1); ctx.lineTo(cx,cy-r*0.3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx,cy+r*0.3); ctx.lineTo(cx,cy+r*1.1); ctx.stroke();
        // Predator eye center
        ctx.fillStyle='#44ff88';
        ctx.beginPath(); ctx.ellipse(cx,cy,r*0.25,r*0.15,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#111';
        ctx.beginPath(); ctx.arc(cx,cy,r*0.08,0,Math.PI*2); ctx.fill();
    }

    /** Colpo Critico: shockwave explosion ring */
    function _drawDev_colpoCritico(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.35;
        // Impact star burst
        ctx.fillStyle='#ff6644';
        ctx.beginPath();
        for (let i=0;i<6;i++) {
            const a=i*Math.PI*2/6-Math.PI/2;
            const ir=r*0.3, or=r*1.05;
            ctx.lineTo(cx+Math.cos(a)*or, cy+Math.sin(a)*or);
            const a2=a+Math.PI/6;
            ctx.lineTo(cx+Math.cos(a2)*ir, cy+Math.sin(a2)*ir);
        }
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle='#111'; ctx.lineWidth=1.5; ctx.stroke();
        // Shockwave ring
        ctx.strokeStyle='#ffaa44'; ctx.lineWidth=2; ctx.globalAlpha=0.6;
        ctx.beginPath(); ctx.arc(cx,cy,r*0.7,0,Math.PI*2); ctx.stroke();
        ctx.globalAlpha=1;
        // Center
        ctx.fillStyle='#ffdd44';
        ctx.beginPath(); ctx.arc(cx,cy,r*0.2,0,Math.PI*2); ctx.fill();
    }

    /** Scia Infuocata: fire trail flame */
    function _drawDev_sciaInfuocata(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.38;
        // Flame shape
        ctx.beginPath();
        ctx.moveTo(cx, cy-r);
        ctx.bezierCurveTo(cx+r*0.5,cy-r*0.4, cx+r*0.7,cy+r*0.2, cx+r*0.3,cy+r*0.7);
        ctx.bezierCurveTo(cx+r*0.1,cy+r, cx-r*0.1,cy+r, cx-r*0.3,cy+r*0.7);
        ctx.bezierCurveTo(cx-r*0.7,cy+r*0.2, cx-r*0.5,cy-r*0.4, cx,cy-r);
        ctx.closePath();
        const fg=ctx.createLinearGradient(cx,cy-r,cx,cy+r);
        fg.addColorStop(0,'#ffee44'); fg.addColorStop(0.4,'#ff6600'); fg.addColorStop(1,'#cc2200');
        ctx.fillStyle=fg; ctx.fill();
        ctx.strokeStyle='#111'; ctx.lineWidth=1.5; ctx.stroke();
        // Inner flame
        ctx.fillStyle='rgba(255,255,200,0.5)';
        ctx.beginPath();
        ctx.ellipse(cx, cy-r*0.2, r*0.2, r*0.4, 0, 0, Math.PI*2); ctx.fill();
    }

    /** Esploratore: compass / radar scanner */
    function _drawDev_esploratore(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.35;
        // Radar circle
        ctx.strokeStyle='#44aadd'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
        // Sweep arc
        ctx.fillStyle='rgba(68,170,221,0.3)';
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r*0.9,-Math.PI/2,0); ctx.closePath(); ctx.fill();
        // Rings
        ctx.strokeStyle='rgba(68,170,221,0.4)'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.arc(cx,cy,r*0.6,0,Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx,cy,r*0.3,0,Math.PI*2); ctx.stroke();
        // Crosshair lines
        ctx.strokeStyle='rgba(68,170,221,0.5)'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(cx-r,cy); ctx.lineTo(cx+r,cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx,cy-r); ctx.lineTo(cx,cy+r); ctx.stroke();
        // Sweep line
        ctx.strokeStyle='#88ddff'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+r*0.7,cy-r*0.7); ctx.stroke();
        // Center dot
        ctx.fillStyle='#88ddff';
        ctx.beginPath(); ctx.arc(cx,cy,r*0.1,0,Math.PI*2); ctx.fill();
    }

    /** Sovraccarico: overload energy pulse */
    function _drawDev_sovraccarico(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.36;
        // Lightning bolt center
        ctx.fillStyle='#ffdd00';
        ctx.beginPath();
        ctx.moveTo(cx-r*0.15, cy-r*0.9);
        ctx.lineTo(cx+r*0.4, cy-r*0.1);
        ctx.lineTo(cx+r*0.05, cy-r*0.05);
        ctx.lineTo(cx+r*0.3, cy+r*0.9);
        ctx.lineTo(cx-r*0.25, cy+r*0.15);
        ctx.lineTo(cx-r*0.05, cy+r*0.1);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle='#111'; ctx.lineWidth=1.5; ctx.stroke();
        // Pulse rings
        ctx.strokeStyle='rgba(255,220,0,0.4)'; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.arc(cx,cy,r*0.8,0,Math.PI*2); ctx.stroke();
        ctx.strokeStyle='rgba(255,220,0,0.25)'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.arc(cx,cy,r*1.1,0,Math.PI*2); ctx.stroke();
    }

    // ══════════════════════════════════
    //  WORLD 3 — SIMULATION BREAK
    // ══════════════════════════════════

    /** Packet Burst: three stacked data blocks */
    function _drawDev_packetBurst(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.32;
        const bw=r*0.6, bh=r*0.35;
        // Three offset rectangles (data packets)
        const cols = ['#00eebb','#00ccaa','#009988'];
        for (let i = 0; i < 3; i++) {
            const ox = (i-1)*r*0.25;
            const oy = (i-1)*r*0.3;
            ctx.fillStyle = cols[i];
            ctx.fillRect(cx+ox-bw/2, cy+oy-bh/2, bw, bh);
            ctx.strokeStyle='#111'; ctx.lineWidth=1.2;
            ctx.strokeRect(cx+ox-bw/2, cy+oy-bh/2, bw, bh);
            // Data lines
            ctx.strokeStyle='rgba(0,0,0,0.3)'; ctx.lineWidth=0.8;
            ctx.beginPath(); ctx.moveTo(cx+ox-bw*0.3, cy+oy); ctx.lineTo(cx+ox+bw*0.3, cy+oy); ctx.stroke();
        }
        // Burst arrows
        ctx.fillStyle='rgba(0,238,187,0.5)';
        for (let a = 0; a < 4; a++) {
            const ang = a * Math.PI/2;
            const ax = cx + Math.cos(ang)*r*1.1;
            const ay = cy + Math.sin(ang)*r*1.1;
            ctx.beginPath(); ctx.arc(ax,ay,r*0.12,0,Math.PI*2); ctx.fill();
        }
    }

    /** Virus Inject: biohazard symbol with purple glow */
    function _drawDev_virusInject(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.36;
        // Purple glow backdrop
        ctx.fillStyle='rgba(180,0,255,0.15)';
        ctx.beginPath(); ctx.arc(cx, cy, r*1.1, 0, Math.PI*2); ctx.fill();
        // Biohazard: 3 arcs
        ctx.strokeStyle='#b400ff'; ctx.lineWidth=2;
        for (let i = 0; i < 3; i++) {
            const a = i * Math.PI * 2 / 3 - Math.PI / 2;
            ctx.beginPath();
            ctx.arc(cx + Math.cos(a)*r*0.3, cy + Math.sin(a)*r*0.3, r*0.45, a - 0.8, a + 0.8);
            ctx.stroke();
        }
        // Center circle
        ctx.fillStyle='#d060ff';
        ctx.beginPath(); ctx.arc(cx, cy, r*0.18, 0, Math.PI*2); ctx.fill();
        // Center hole
        ctx.fillStyle='#1a0028';
        ctx.beginPath(); ctx.arc(cx, cy, r*0.08, 0, Math.PI*2); ctx.fill();
    }

    /** Glitch Dash: phasing ship silhouette with motion lines */
    function _drawDev_glitchDash(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.36;
        // Ghost silhouette (shifted)
        ctx.globalAlpha=0.3;
        ctx.fillStyle='#00ffcc';
        ctx.beginPath();
        ctx.moveTo(cx-r*0.6, cy+r*0.5);
        ctx.lineTo(cx-r*0.1, cy-r*0.7);
        ctx.lineTo(cx+r*0.4, cy+r*0.5);
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha=1;
        // Main silhouette
        ctx.fillStyle='#00ffaa';
        ctx.beginPath();
        ctx.moveTo(cx-r*0.4, cy+r*0.5);
        ctx.lineTo(cx+r*0.1, cy-r*0.7);
        ctx.lineTo(cx+r*0.6, cy+r*0.5);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle='#111'; ctx.lineWidth=1.2; ctx.stroke();
        // Speed lines
        ctx.strokeStyle='rgba(0,255,170,0.5)'; ctx.lineWidth=1;
        for (let i = 0; i < 3; i++) {
            const ly = cy - r*0.3 + i*r*0.3;
            ctx.beginPath(); ctx.moveTo(cx-r*1.1, ly); ctx.lineTo(cx-r*0.5, ly); ctx.stroke();
        }
    }

    /** Entropy Shield: hexagonal barrier with digital noise */
    function _drawDev_entropyShield(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.38;
        // Hexagon
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = Math.PI/6 + i * Math.PI/3;
            const px = cx + Math.cos(a)*r;
            const py = cy + Math.sin(a)*r;
            if (i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
        }
        ctx.closePath();
        ctx.fillStyle='rgba(0,200,255,0.15)';
        ctx.fill();
        ctx.strokeStyle='#00ccff'; ctx.lineWidth=2; ctx.stroke();
        // Inner hex
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = Math.PI/6 + i * Math.PI/3;
            ctx.lineTo(cx + Math.cos(a)*r*0.55, cy + Math.sin(a)*r*0.55);
        }
        ctx.closePath();
        ctx.strokeStyle='rgba(0,200,255,0.4)'; ctx.lineWidth=1; ctx.stroke();
        // Center pip
        ctx.fillStyle='#00eeff';
        ctx.beginPath(); ctx.arc(cx,cy,r*0.12,0,Math.PI*2); ctx.fill();
    }

    /** Data Leech: suction/drain symbol — two curved arrows into center */
    function _drawDev_dataLeech(ctx, S, sc) {
        const cx=S/2, cy=S/2, r=S*0.36;
        // Outer glow ring
        ctx.strokeStyle='rgba(170,0,255,0.3)'; ctx.lineWidth=3;
        ctx.beginPath(); ctx.arc(cx,cy,r*0.95,0,Math.PI*2); ctx.stroke();
        // Two curved arrows
        ctx.strokeStyle='#bb44ff'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.arc(cx, cy, r*0.6, -Math.PI*0.8, -Math.PI*0.2); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, r*0.6, Math.PI*0.2, Math.PI*0.8); ctx.stroke();
        // Arrow tips pointing inward
        const tipR = r*0.15;
        ctx.fillStyle='#bb44ff';
        ctx.beginPath(); ctx.arc(cx+r*0.15, cy-r*0.35, tipR, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx-r*0.15, cy+r*0.35, tipR, 0, Math.PI*2); ctx.fill();
        // Center core
        ctx.fillStyle='#dd66ff';
        ctx.beginPath(); ctx.arc(cx,cy,r*0.18,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='#111'; ctx.lineWidth=1; ctx.stroke();
    }

export { generatePerkDeviceSprites };
import { outlineAndFill, drawHighlight, drawEnemyEye, _drawPartEye } from './Helper.js';
// ================================================================
//  ENEMIES  (each drawn large with outlines and glowing eyes)
// ================================================================

function generateEnemySprites(sprites) {
    const configs = [
        { name: 'scout', color: '#ee3333', accent: '#ff7777', dark: '#991111', size: 56 },
        { name: 'fighter', color: '#ee7700', accent: '#ffaa44', dark: '#994400', size: 64 },
        { name: 'heavy', color: '#ddaa00', accent: '#ffdd44', dark: '#886600', size: 80 },
        { name: 'phantom', color: '#9933ee', accent: '#cc77ff', dark: '#551199', size: 60 },
        { name: 'sentinel', color: '#2288ee', accent: '#55bbff', dark: '#114488', size: 72 },
        { name: 'swarm', color: '#33cc44', accent: '#77ff88', dark: '#117722', size: 44 },
        // ── WORLD 2 ENEMIES ──
        { name: 'stalker', color: '#228844', accent: '#55cc77', dark: '#115522', size: 58 },
        { name: 'nest', color: '#886633', accent: '#bbaa66', dark: '#553311', size: 72 },
        { name: 'jungle_vine', color: '#33bb55', accent: '#66ee88', dark: '#117733', size: 60 },
        { name: 'lava_golem', color: '#dd4400', accent: '#ff7733', dark: '#882200', size: 74 },
        { name: 'frost_elemental', color: '#44bbff', accent: '#88ddff', dark: '#2266aa', size: 64 },
        { name: 'sand_wurm', color: '#ccaa44', accent: '#eedd88', dark: '#886622', size: 76 },
        { name: 'mech_drone', color: '#7799bb', accent: '#aaccdd', dark: '#445566', size: 56 },
        { name: 'toxic_blob', color: '#88ee22', accent: '#bbff66', dark: '#449911', size: 62 },
        // ── WORLD 3 ENEMIES ──
        { name: 'glitch_drone', color: '#00ccbb', accent: '#44ffee', dark: '#006655', size: 50 },
        { name: 'data_cube', color: '#7733ee', accent: '#aa66ff', dark: '#441199', size: 66 },
        { name: 'fragment_shard', color: '#ee2266', accent: '#ff5599', dark: '#881133', size: 58 },
        { name: 'warp_bug', color: '#33dd77', accent: '#77ffaa', dark: '#117744', size: 54 },
        { name: 'error_node', color: '#ee7700', accent: '#ffaa44', dark: '#884400', size: 74 },
        { name: 'mirror_ghost', color: '#aaaaee', accent: '#ddddff', dark: '#555588', size: 56 }
    ];
    for (const cfg of configs) {
        sprites[`enemy_${cfg.name}`] = createEnemySprite(cfg);
    }
}

function createEnemySprite(cfg) {
    const pad = 16;
    const S = cfg.size + pad * 2;
    const cv = document.createElement('canvas');
    cv.width = S; cv.height = S;
    const ctx = cv.getContext('2d');
    const cx = S / 2, cy = S / 2;
    const r = cfg.size / 2;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (cfg.name) {

        case 'scout': {
            ctx.beginPath();
            ctx.moveTo(cx, cy + r);
            ctx.lineTo(cx - r * 0.9, cy - r * 0.4);
            ctx.bezierCurveTo(cx - r * 0.7, cy - r * 0.8, cx - r * 0.2, cy - r, cx, cy - r * 0.6);
            ctx.bezierCurveTo(cx + r * 0.2, cy - r, cx + r * 0.7, cy - r * 0.8, cx + r * 0.9, cy - r * 0.4);
            ctx.closePath();
            outlineAndFill(ctx, cfg.color, '#111', 3);
            ctx.strokeStyle = cfg.dark;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx - r * 0.5, cy - r * 0.1); ctx.lineTo(cx - r * 0.7, cy - r * 0.6);
            ctx.moveTo(cx + r * 0.5, cy - r * 0.1); ctx.lineTo(cx + r * 0.7, cy - r * 0.6);
            ctx.stroke();
            drawHighlight(ctx, cx - r * 0.4, cy - r * 0.6, r * 0.8, r * 0.5);
            drawEnemyEye(ctx, cx, cy - 2, r * 0.22, cfg.color);
            break;
        }

        case 'fighter': {
            ctx.beginPath();
            ctx.moveTo(cx, cy + r);
            ctx.lineTo(cx - r, cy + r * 0.1);
            ctx.lineTo(cx - r * 0.7, cy - r * 0.4);
            ctx.bezierCurveTo(cx - r * 0.4, cy - r * 0.9, cx + r * 0.4, cy - r * 0.9, cx + r * 0.7, cy - r * 0.4);
            ctx.lineTo(cx + r, cy + r * 0.1);
            ctx.closePath();
            outlineAndFill(ctx, cfg.color, '#111', 3);
            ctx.strokeStyle = cfg.dark;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(cx - r * 0.5, cy - r * 0.4); ctx.lineTo(cx - r * 0.6, cy + r * 0.4);
            ctx.moveTo(cx + r * 0.5, cy - r * 0.4); ctx.lineTo(cx + r * 0.6, cy + r * 0.4);
            ctx.stroke();
            for (const sx of [-1, 1]) {
                ctx.beginPath();
                ctx.roundRect(cx + sx * r * 0.8 - 3, cy + r * 0.2, 6, 14, 2);
                ctx.fillStyle = '#444';
                ctx.fill();
                ctx.strokeStyle = '#111';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            drawHighlight(ctx, cx - r * 0.4, cy - r * 0.7, r * 0.8, r * 0.6);
            drawEnemyEye(ctx, cx, cy - r * 0.1, r * 0.24, cfg.color);
            break;
        }

        case 'heavy': {
            ctx.beginPath();
            ctx.moveTo(cx, cy + r);
            ctx.lineTo(cx - r * 0.85, cy + r * 0.5);
            ctx.lineTo(cx - r, cy - r * 0.2);
            ctx.lineTo(cx - r * 0.6, cy - r * 0.85);
            ctx.lineTo(cx + r * 0.6, cy - r * 0.85);
            ctx.lineTo(cx + r, cy - r * 0.2);
            ctx.lineTo(cx + r * 0.85, cy + r * 0.5);
            ctx.closePath();
            outlineAndFill(ctx, cfg.color, '#111', 3.5);
            ctx.strokeStyle = cfg.dark;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(cx - r * 0.5, cy - r * 0.6); ctx.lineTo(cx - r * 0.5, cy + r * 0.5);
            ctx.moveTo(cx + r * 0.5, cy - r * 0.6); ctx.lineTo(cx + r * 0.5, cy + r * 0.5);
            ctx.moveTo(cx - r * 0.7, cy); ctx.lineTo(cx + r * 0.7, cy);
            ctx.stroke();
            for (const sx of [-1, 1]) {
                ctx.beginPath();
                ctx.roundRect(cx + sx * r * 0.95 - 4, cy - r * 0.3, 8, 24, 3);
                ctx.fillStyle = '#555';
                ctx.fill();
                ctx.strokeStyle = '#111';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            drawHighlight(ctx, cx - r * 0.4, cy - r * 0.7, r * 0.8, r * 0.5, 0.18);
            drawEnemyEye(ctx, cx, cy - r * 0.15, r * 0.28, cfg.color);
            break;
        }

        case 'phantom': {
            ctx.save();
            ctx.globalAlpha = 0.85;
            ctx.beginPath();
            ctx.moveTo(cx, cy + r);
            ctx.bezierCurveTo(cx - r * 0.3, cy + r * 0.7, cx - r * 0.6, cy + r * 0.9, cx - r * 0.8, cy + r * 0.5);
            ctx.bezierCurveTo(cx - r, cy, cx - r * 0.8, cy - r * 0.6, cx - r * 0.4, cy - r * 0.9);
            ctx.bezierCurveTo(cx - r * 0.1, cy - r, cx + r * 0.1, cy - r, cx + r * 0.4, cy - r * 0.9);
            ctx.bezierCurveTo(cx + r * 0.8, cy - r * 0.6, cx + r, cy, cx + r * 0.8, cy + r * 0.5);
            ctx.bezierCurveTo(cx + r * 0.6, cy + r * 0.9, cx + r * 0.3, cy + r * 0.7, cx, cy + r);
            ctx.closePath();
            outlineAndFill(ctx, cfg.color, '#22114488', 2.5);
            ctx.restore();
            const pg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.7);
            pg.addColorStop(0, 'rgba(255,255,255,0.15)');
            pg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = pg;
            ctx.fill();
            for (const sx of [-1, 1]) {
                ctx.save();
                ctx.shadowColor = '#ff44ff';
                ctx.shadowBlur = 8;
                ctx.fillStyle = '#ff88ff';
                ctx.beginPath();
                ctx.ellipse(cx + sx * r * 0.3, cy - r * 0.15, r * 0.14, r * 0.1, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(cx + sx * r * 0.3, cy - r * 0.15, r * 0.06, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            break;
        }

        case 'sentinel': {
            ctx.beginPath();
            ctx.moveTo(cx, cy - r);
            ctx.lineTo(cx + r, cy);
            ctx.lineTo(cx, cy + r);
            ctx.lineTo(cx - r, cy);
            ctx.closePath();
            outlineAndFill(ctx, cfg.color, '#111', 3.5);
            ctx.beginPath();
            ctx.moveTo(cx, cy - r * 0.6);
            ctx.lineTo(cx + r * 0.6, cy);
            ctx.lineTo(cx, cy + r * 0.6);
            ctx.lineTo(cx - r * 0.6, cy);
            ctx.closePath();
            ctx.strokeStyle = cfg.accent;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.strokeStyle = cfg.dark;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r);
            ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy);
            ctx.stroke();
            drawHighlight(ctx, cx - r * 0.3, cy - r * 0.6, r * 0.6, r * 0.5, 0.2);
            drawEnemyEye(ctx, cx, cy, r * 0.26, cfg.color);
            break;
        }

        case 'swarm': {
            ctx.beginPath();
            ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2);
            outlineAndFill(ctx, cfg.color, '#111', 2.5);
            for (const sx of [-1, 1]) {
                ctx.beginPath();
                ctx.moveTo(cx + sx * r * 0.4, cy - r * 0.3);
                ctx.lineTo(cx + sx * r, cy - r * 0.1);
                ctx.lineTo(cx + sx * r * 0.9, cy + r * 0.4);
                ctx.lineTo(cx + sx * r * 0.4, cy + r * 0.3);
                ctx.closePath();
                outlineAndFill(ctx, cfg.accent, '#111', 2);
            }
            drawHighlight(ctx, cx - r * 0.3, cy - r * 0.5, r * 0.6, r * 0.4);
            for (const sx of [-1, 1]) {
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(cx + sx * r * 0.2, cy - r * 0.1, r * 0.15, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#111';
                ctx.beginPath();
                ctx.arc(cx + sx * r * 0.22, cy - r * 0.1, r * 0.07, 0, Math.PI * 2);
                ctx.fill();
            }
            break;
        }

        // ═══════════════════════════════════════
        //  WORLD 2 ENEMY SPRITES
        // ═══════════════════════════════════════

        case 'stalker': {
            // Sleek stealth hunter — angular, low-profile, chameleon-like
            ctx.save();
            ctx.globalAlpha = 0.88;
            ctx.beginPath();
            ctx.moveTo(cx, cy + r);
            ctx.lineTo(cx - r * 0.95, cy + r * 0.15);
            ctx.lineTo(cx - r * 0.6, cy - r * 0.7);
            ctx.bezierCurveTo(cx - r * 0.2, cy - r, cx + r * 0.2, cy - r, cx + r * 0.6, cy - r * 0.7);
            ctx.lineTo(cx + r * 0.95, cy + r * 0.15);
            ctx.closePath();
            outlineAndFill(ctx, cfg.color, '#11332288', 2.5);
            ctx.restore();
            // Camo stripe pattern
            ctx.strokeStyle = cfg.dark; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.5;
            ctx.beginPath(); ctx.moveTo(cx - r * 0.6, cy - r * 0.2); ctx.lineTo(cx + r * 0.3, cy - r * 0.4); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx - r * 0.3, cy + r * 0.1); ctx.lineTo(cx + r * 0.7, cy); ctx.stroke();
            ctx.globalAlpha = 1;
            // Predator eyes — twin glowing slits
            for (const sx of [-1, 1]) {
                ctx.save();
                ctx.shadowColor = '#44ff88'; ctx.shadowBlur = 8;
                ctx.fillStyle = '#44ff88';
                ctx.beginPath();
                ctx.ellipse(cx + sx * r * 0.25, cy - r * 0.2, r * 0.12, r * 0.06, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(cx + sx * r * 0.25, cy - r * 0.2, r * 0.04, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            break;
        }

        case 'nest': {
            // Organic spawner hive — bulbous, textured, with spawn ports
            ctx.beginPath();
            ctx.ellipse(cx, cy, r * 0.9, r * 0.85, 0, 0, Math.PI * 2);
            outlineAndFill(ctx, cfg.color, '#111', 3);
            // Organic texture rings
            ctx.strokeStyle = cfg.dark; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.6, r * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.3, r * 0.28, 0, 0, Math.PI * 2); ctx.stroke();
            // Spawn ports (3 glowing holes)
            for (let i = 0; i < 3; i++) {
                const a = (Math.PI * 2 / 3) * i - Math.PI / 2;
                const px = cx + Math.cos(a) * r * 0.5, py = cy + Math.sin(a) * r * 0.5;
                ctx.save();
                ctx.shadowColor = '#ffaa44'; ctx.shadowBlur = 6;
                ctx.fillStyle = '#ffaa44';
                ctx.beginPath(); ctx.arc(px, py, r * 0.12, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#fff8e0';
                ctx.beginPath(); ctx.arc(px, py, r * 0.06, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            }
            drawHighlight(ctx, cx - r * 0.4, cy - r * 0.7, r * 0.8, r * 0.4, 0.12);
            drawEnemyEye(ctx, cx, cy, r * 0.18, cfg.accent);
            break;
        }

        case 'jungle_vine': {
            // Whip-like vine creature — elongated, organic
            ctx.beginPath();
            ctx.moveTo(cx, cy + r);
            ctx.bezierCurveTo(cx - r * 0.4, cy + r * 0.6, cx - r * 0.7, cy, cx - r * 0.5, cy - r * 0.5);
            ctx.bezierCurveTo(cx - r * 0.3, cy - r * 0.9, cx + r * 0.3, cy - r * 0.9, cx + r * 0.5, cy - r * 0.5);
            ctx.bezierCurveTo(cx + r * 0.7, cy, cx + r * 0.4, cy + r * 0.6, cx, cy + r);
            ctx.closePath();
            outlineAndFill(ctx, cfg.color, '#111', 2.5);
            // Leaf veins
            ctx.strokeStyle = cfg.dark; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.7); ctx.lineTo(cx, cy + r * 0.5); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx - r * 0.4, cy - r * 0.1); ctx.lineTo(cx, cy - r * 0.35); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx + r * 0.4, cy - r * 0.1); ctx.lineTo(cx, cy - r * 0.35); ctx.stroke();
            // Thorn tips
            for (const sx of [-1, 1]) {
                ctx.fillStyle = '#446633';
                ctx.beginPath();
                ctx.moveTo(cx + sx * r * 0.55, cy); ctx.lineTo(cx + sx * r * 0.8, cy - r * 0.15);
                ctx.lineTo(cx + sx * r * 0.6, cy + r * 0.1); ctx.closePath(); ctx.fill();
            }
            drawHighlight(ctx, cx - r * 0.3, cy - r * 0.7, r * 0.6, r * 0.4);
            drawEnemyEye(ctx, cx, cy - r * 0.15, r * 0.2, '#66ff44');
            break;
        }

        case 'lava_golem': {
            // Bulky molten rock creature — angular, glowing cracks
            ctx.beginPath();
            ctx.moveTo(cx, cy - r);
            ctx.lineTo(cx + r * 0.8, cy - r * 0.5);
            ctx.lineTo(cx + r, cy + r * 0.2);
            ctx.lineTo(cx + r * 0.7, cy + r * 0.8);
            ctx.lineTo(cx + r * 0.2, cy + r);
            ctx.lineTo(cx - r * 0.2, cy + r);
            ctx.lineTo(cx - r * 0.7, cy + r * 0.8);
            ctx.lineTo(cx - r, cy + r * 0.2);
            ctx.lineTo(cx - r * 0.8, cy - r * 0.5);
            ctx.closePath();
            outlineAndFill(ctx, cfg.color, '#111', 3);
            // Lava crack lines (glowing)
            ctx.save(); ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 5;
            ctx.strokeStyle = '#ffcc33'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(cx - r * 0.3, cy - r * 0.6); ctx.lineTo(cx + r * 0.1, cy + r * 0.2);
            ctx.lineTo(cx - r * 0.2, cy + r * 0.7); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx + r * 0.4, cy - r * 0.3); ctx.lineTo(cx + r * 0.5, cy + r * 0.5); ctx.stroke();
            ctx.restore();
            drawHighlight(ctx, cx - r * 0.4, cy - r * 0.8, r * 0.8, r * 0.4, 0.1);
            drawEnemyEye(ctx, cx, cy - r * 0.1, r * 0.25, '#ff6600');
            break;
        }

        case 'frost_elemental': {
            // Crystalline ice entity — geometric, translucent
            ctx.save(); ctx.globalAlpha = 0.9;
            // Main crystal body
            ctx.beginPath();
            ctx.moveTo(cx, cy - r);
            ctx.lineTo(cx + r * 0.6, cy - r * 0.4);
            ctx.lineTo(cx + r * 0.8, cy + r * 0.3);
            ctx.lineTo(cx + r * 0.3, cy + r);
            ctx.lineTo(cx - r * 0.3, cy + r);
            ctx.lineTo(cx - r * 0.8, cy + r * 0.3);
            ctx.lineTo(cx - r * 0.6, cy - r * 0.4);
            ctx.closePath();
            outlineAndFill(ctx, cfg.color, '#111', 2.5);
            ctx.restore();
            // Ice facet lines
            ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r * 0.5); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx - r * 0.6, cy - r * 0.4); ctx.lineTo(cx + r * 0.3, cy + r * 0.5); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx + r * 0.6, cy - r * 0.4); ctx.lineTo(cx - r * 0.3, cy + r * 0.5); ctx.stroke();
            // Frost shimmer
            const fg = ctx.createRadialGradient(cx, cy - r * 0.2, 0, cx, cy, r * 0.6);
            fg.addColorStop(0, 'rgba(255,255,255,0.2)'); fg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = fg;
            ctx.beginPath(); ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2); ctx.fill();
            drawEnemyEye(ctx, cx, cy - r * 0.1, r * 0.22, '#88eeff');
            break;
        }

        case 'sand_wurm': {
            // Segmented burrowing worm — elongated, ridged
            ctx.beginPath();
            ctx.moveTo(cx, cy - r);
            ctx.bezierCurveTo(cx + r * 0.8, cy - r * 0.7, cx + r * 0.9, cy - r * 0.1, cx + r * 0.7, cy + r * 0.5);
            ctx.bezierCurveTo(cx + r * 0.4, cy + r * 0.9, cx - r * 0.4, cy + r * 0.9, cx - r * 0.7, cy + r * 0.5);
            ctx.bezierCurveTo(cx - r * 0.9, cy - r * 0.1, cx - r * 0.8, cy - r * 0.7, cx, cy - r);
            ctx.closePath();
            outlineAndFill(ctx, cfg.color, '#111', 3);
            // Segment ridges
            ctx.strokeStyle = cfg.dark; ctx.lineWidth = 2;
            for (let i = 0; i < 4; i++) {
                const sy = cy - r * 0.5 + i * r * 0.35;
                const sw = r * (0.6 + i * 0.05);
                ctx.beginPath(); ctx.moveTo(cx - sw, sy); ctx.lineTo(cx + sw, sy); ctx.stroke();
            }
            // Mandible jaws at top
            for (const sx of [-1, 1]) {
                ctx.fillStyle = '#776633';
                ctx.beginPath();
                ctx.moveTo(cx + sx * r * 0.15, cy - r * 0.8);
                ctx.lineTo(cx + sx * r * 0.45, cy - r * 1.05);
                ctx.lineTo(cx + sx * r * 0.35, cy - r * 0.7);
                ctx.closePath(); ctx.fill();
                ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.stroke();
            }
            drawHighlight(ctx, cx - r * 0.3, cy - r * 0.6, r * 0.6, r * 0.4, 0.12);
            drawEnemyEye(ctx, cx, cy - r * 0.3, r * 0.22, '#ffdd44');
            break;
        }

        case 'mech_drone': {
            // Compact military drone — boxy, antennae, thruster
            ctx.beginPath();
            ctx.roundRect(cx - r * 0.65, cy - r * 0.55, r * 1.3, r * 1.1, r * 0.15);
            outlineAndFill(ctx, cfg.color, '#111', 2.5);
            // Panel lines
            ctx.strokeStyle = cfg.dark; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.55); ctx.lineTo(cx, cy + r * 0.55); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx - r * 0.65, cy); ctx.lineTo(cx + r * 0.65, cy); ctx.stroke();
            // Antennae
            for (const sx of [-1, 1]) {
                ctx.strokeStyle = '#999'; ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(cx + sx * r * 0.4, cy - r * 0.55);
                ctx.lineTo(cx + sx * r * 0.55, cy - r * 0.85);
                ctx.stroke();
                ctx.fillStyle = '#ff3333'; ctx.beginPath();
                ctx.arc(cx + sx * r * 0.55, cy - r * 0.85, r * 0.06, 0, Math.PI * 2); ctx.fill();
            }
            // Thruster vents bottom
            for (const sx of [-1, 0, 1]) {
                ctx.fillStyle = '#444'; ctx.beginPath();
                ctx.roundRect(cx + sx * r * 0.35 - 3, cy + r * 0.4, 6, 10, 2); ctx.fill();
                ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.stroke();
            }
            drawHighlight(ctx, cx - r * 0.3, cy - r * 0.4, r * 0.6, r * 0.3, 0.15);
            drawEnemyEye(ctx, cx, cy - r * 0.1, r * 0.2, '#88ccff');
            break;
        }

        case 'toxic_blob': {
            // Amorphous toxic mass — blobby, dripping, splits on death
            ctx.save();
            ctx.globalAlpha = 0.9;
            ctx.beginPath();
            ctx.moveTo(cx + r * 0.6, cy - r * 0.5);
            ctx.bezierCurveTo(cx + r, cy - r * 0.2, cx + r * 0.9, cy + r * 0.5, cx + r * 0.4, cy + r * 0.8);
            ctx.bezierCurveTo(cx + r * 0.1, cy + r, cx - r * 0.3, cy + r * 0.9, cx - r * 0.6, cy + r * 0.6);
            ctx.bezierCurveTo(cx - r, cy + r * 0.3, cx - r * 0.9, cy - r * 0.3, cx - r * 0.5, cy - r * 0.6);
            ctx.bezierCurveTo(cx - r * 0.2, cy - r, cx + r * 0.3, cy - r * 0.8, cx + r * 0.6, cy - r * 0.5);
            ctx.closePath();
            outlineAndFill(ctx, cfg.color, '#33660088', 2.5);
            ctx.restore();
            // Toxic glow
            const tg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.6);
            tg.addColorStop(0, 'rgba(200,255,100,0.25)'); tg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = tg;
            ctx.beginPath(); ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2); ctx.fill();
            // Drip bubbles
            for (let i = 0; i < 3; i++) {
                const bx = cx + (i - 1) * r * 0.35, by = cy + r * 0.4 + i * r * 0.15;
                ctx.fillStyle = 'rgba(150,255,50,0.4)';
                ctx.beginPath(); ctx.arc(bx, by, r * 0.1, 0, Math.PI * 2); ctx.fill();
            }
            // Menacing eye
            drawEnemyEye(ctx, cx, cy - r * 0.1, r * 0.22, '#ccff33');
            break;
        }

        // ═══════════════════════════════════════════════
        //  WORLD 3 — Simulation Break enemies (cartoon-style)
        // ═══════════════════════════════════════════════

        case 'glitch_drone': {
            // Rounded robo-bee body with digital wings and glitch static
            // Body — squircle shape
            ctx.beginPath();
            ctx.moveTo(cx - r * 0.4, cy - r * 0.65);
            ctx.bezierCurveTo(cx - r * 0.1, cy - r * 0.85, cx + r * 0.1, cy - r * 0.85, cx + r * 0.4, cy - r * 0.65);
            ctx.bezierCurveTo(cx + r * 0.75, cy - r * 0.45, cx + r * 0.75, cy + r * 0.45, cx + r * 0.4, cy + r * 0.65);
            ctx.bezierCurveTo(cx + r * 0.1, cy + r * 0.85, cx - r * 0.1, cy + r * 0.85, cx - r * 0.4, cy + r * 0.65);
            ctx.bezierCurveTo(cx - r * 0.75, cy + r * 0.45, cx - r * 0.75, cy - r * 0.45, cx - r * 0.4, cy - r * 0.65);
            ctx.closePath();
            outlineAndFill(ctx, cfg.color, '#111', 3);
            // Digital wings — left
            ctx.save();
            ctx.globalAlpha = 0.45;
            ctx.fillStyle = cfg.accent;
            ctx.beginPath();
            ctx.moveTo(cx - r * 0.5, cy - r * 0.2);
            ctx.lineTo(cx - r, cy - r * 0.7);
            ctx.lineTo(cx - r * 0.9, cy - r * 0.1);
            ctx.closePath();
            ctx.fill();
            // Right wing
            ctx.beginPath();
            ctx.moveTo(cx + r * 0.5, cy - r * 0.2);
            ctx.lineTo(cx + r, cy - r * 0.7);
            ctx.lineTo(cx + r * 0.9, cy - r * 0.1);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
            // Glitch static bars across body
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            for (let i = 0; i < 4; i++) {
                const y = cy - r * 0.4 + i * r * 0.22;
                const offset = ((i * 7 + 3) % 5) * r * 0.08;
                ctx.fillStyle = i % 2 === 0 ? 'rgba(0,255,200,0.15)' : 'rgba(255,255,255,0.1)';
                ctx.fillRect(cx - r * 0.35 + offset, y, r * 0.7, 2);
            }
            ctx.restore();
            // Cute round eyes
            drawEnemyEye(ctx, cx - r * 0.18, cy - r * 0.12, r * 0.16, cfg.accent);
            drawEnemyEye(ctx, cx + r * 0.18, cy - r * 0.12, r * 0.16, cfg.accent);
            // Antenna
            ctx.strokeStyle = cfg.accent;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy - r * 0.65);
            ctx.quadraticCurveTo(cx + r * 0.1, cy - r, cx, cy - r * 0.95);
            ctx.stroke();
            ctx.fillStyle = cfg.accent;
            ctx.beginPath(); ctx.arc(cx, cy - r * 0.95, 3, 0, Math.PI * 2); ctx.fill();
            drawHighlight(ctx, cx - r * 0.25, cy - r * 0.65, r * 0.5, r * 0.35);
            break;
        }

        case 'data_cube': {
            // Cute isometric cube with face and data streams — cartoon Rubik's feel
            const faceW = r * 0.85;
            // Top face (lighter)
            ctx.beginPath();
            ctx.moveTo(cx, cy - r * 0.75);
            ctx.lineTo(cx + faceW * 0.75, cy - r * 0.3);
            ctx.lineTo(cx, cy + r * 0.05);
            ctx.lineTo(cx - faceW * 0.75, cy - r * 0.3);
            ctx.closePath();
            outlineAndFill(ctx, cfg.accent, '#111', 2.5);
            // Front-left face
            ctx.beginPath();
            ctx.moveTo(cx - faceW * 0.75, cy - r * 0.3);
            ctx.lineTo(cx, cy + r * 0.05);
            ctx.lineTo(cx, cy + r * 0.75);
            ctx.lineTo(cx - faceW * 0.75, cy + r * 0.4);
            ctx.closePath();
            outlineAndFill(ctx, cfg.color, '#111', 2.5);
            // Front-right face (darker)
            ctx.beginPath();
            ctx.moveTo(cx + faceW * 0.75, cy - r * 0.3);
            ctx.lineTo(cx, cy + r * 0.05);
            ctx.lineTo(cx, cy + r * 0.75);
            ctx.lineTo(cx + faceW * 0.75, cy + r * 0.4);
            ctx.closePath();
            outlineAndFill(ctx, cfg.dark, '#111', 2.5);
            // Grid dots on front-left face
            ctx.fillStyle = cfg.accent;
            for (let gx = 0; gx < 3; gx++) {
                for (let gy = 0; gy < 3; gy++) {
                    const dotX = cx - faceW * 0.45 + gx * faceW * 0.25;
                    const dotY = cy - r * 0.05 + gy * r * 0.2;
                    ctx.beginPath(); ctx.arc(dotX, dotY, 2, 0, Math.PI * 2); ctx.fill();
                }
            }
            // Cute face on front — on the front-left face
            drawEnemyEye(ctx, cx - r * 0.3, cy + r * 0.1, r * 0.13, cfg.accent);
            drawEnemyEye(ctx, cx - r * 0.08, cy + r * 0.1, r * 0.13, cfg.accent);
            // Small frown mouth
            ctx.strokeStyle = cfg.accent;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(cx - r * 0.19, cy + r * 0.32, r * 0.12, 0.2, Math.PI - 0.2);
            ctx.stroke();
            drawHighlight(ctx, cx - r * 0.3, cy - r * 0.7, r * 0.55, r * 0.35);
            break;
        }

        case 'fragment_shard': {
            // Cracked crystal/gem with inner glow — like a shattered candy
            // Draw main crystal facets
            ctx.beginPath();
            ctx.moveTo(cx, cy - r * 0.9);
            ctx.lineTo(cx + r * 0.55, cy - r * 0.45);
            ctx.lineTo(cx + r * 0.75, cy + r * 0.15);
            ctx.lineTo(cx + r * 0.35, cy + r * 0.8);
            ctx.lineTo(cx - r * 0.3, cy + r * 0.75);
            ctx.lineTo(cx - r * 0.7, cy + r * 0.2);
            ctx.lineTo(cx - r * 0.6, cy - r * 0.4);
            ctx.closePath();
            outlineAndFill(ctx, cfg.color, '#111', 3);
            // Inner facet lines to show crystal structure
            ctx.strokeStyle = cfg.accent;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(cx, cy - r * 0.9);
            ctx.lineTo(cx + r * 0.1, cy + r * 0.1);
            ctx.lineTo(cx + r * 0.35, cy + r * 0.8);
            ctx.moveTo(cx + r * 0.1, cy + r * 0.1);
            ctx.lineTo(cx - r * 0.3, cy + r * 0.75);
            ctx.moveTo(cx + r * 0.1, cy + r * 0.1);
            ctx.lineTo(cx + r * 0.75, cy + r * 0.15);
            ctx.moveTo(cx, cy - r * 0.9);
            ctx.lineTo(cx - r * 0.6, cy - r * 0.4);
            ctx.stroke();
            // Inner glow
            const ig = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.6);
            ig.addColorStop(0, 'rgba(255,100,150,0.35)');
            ig.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = ig;
            ctx.beginPath(); ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2); ctx.fill();
            // Crack lines (white, thin)
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx - r * 0.15, cy - r * 0.3);
            ctx.lineTo(cx + r * 0.05, cy); ctx.lineTo(cx - r * 0.1, cy + r * 0.25);
            ctx.moveTo(cx + r * 0.05, cy);
            ctx.lineTo(cx + r * 0.3, cy + r * 0.1);
            ctx.stroke();
            // Single menacing eye
            drawEnemyEye(ctx, cx, cy - r * 0.1, r * 0.2, cfg.accent);
            drawHighlight(ctx, cx - r * 0.3, cy - r * 0.75, r * 0.6, r * 0.4);
            break;
        }

        case 'warp_bug': {
            // Cute beetle-like bug with spiral warp portal on back
            // Rounded body
            ctx.beginPath();
            ctx.ellipse(cx, cy + r * 0.1, r * 0.55, r * 0.65, 0, 0, Math.PI * 2);
            outlineAndFill(ctx, cfg.color, '#111', 3);
            // Wing split line
            ctx.strokeStyle = cfg.dark;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy - r * 0.55);
            ctx.lineTo(cx, cy + r * 0.75);
            ctx.stroke();
            // Warp spiral on back (portal)
            ctx.save();
            ctx.strokeStyle = cfg.accent;
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = 0.6;
            for (let ring = 0; ring < 3; ring++) {
                const rr = r * 0.15 + ring * r * 0.12;
                ctx.beginPath();
                ctx.arc(cx, cy + r * 0.05, rr, ring * 0.5, ring * 0.5 + Math.PI * 1.5);
                ctx.stroke();
            }
            ctx.restore();
            // Head (smaller circle on top)
            ctx.beginPath();
            ctx.arc(cx, cy - r * 0.55, r * 0.25, 0, Math.PI * 2);
            outlineAndFill(ctx, cfg.dark, '#111', 2.5);
            // Cute antenna
            ctx.strokeStyle = cfg.accent;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(cx - r * 0.1, cy - r * 0.75);
            ctx.quadraticCurveTo(cx - r * 0.3, cy - r, cx - r * 0.35, cy - r * 0.9);
            ctx.moveTo(cx + r * 0.1, cy - r * 0.75);
            ctx.quadraticCurveTo(cx + r * 0.3, cy - r, cx + r * 0.35, cy - r * 0.9);
            ctx.stroke();
            ctx.fillStyle = cfg.accent;
            ctx.beginPath(); ctx.arc(cx - r * 0.35, cy - r * 0.9, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(cx + r * 0.35, cy - r * 0.9, 2.5, 0, Math.PI * 2); ctx.fill();
            // Eyes on head
            drawEnemyEye(ctx, cx - r * 0.1, cy - r * 0.58, r * 0.1, cfg.accent);
            drawEnemyEye(ctx, cx + r * 0.1, cy - r * 0.58, r * 0.1, cfg.accent);
            // Tiny legs
            ctx.strokeStyle = cfg.dark;
            ctx.lineWidth = 1.5;
            for (let side = -1; side <= 1; side += 2) {
                for (let leg = 0; leg < 3; leg++) {
                    const ly = cy - r * 0.15 + leg * r * 0.25;
                    ctx.beginPath();
                    ctx.moveTo(cx + side * r * 0.5, ly);
                    ctx.lineTo(cx + side * r * 0.75, ly + r * 0.12);
                    ctx.stroke();
                }
            }
            drawHighlight(ctx, cx - r * 0.25, cy - r * 0.45, r * 0.5, r * 0.3);
            break;
        }

        case 'error_node': {
            // Angry octagonal warning sign with face — like a cartoon stop sign
            // Octagon body
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const a = (Math.PI / 4) * i - Math.PI / 8;
                const px = cx + r * 0.8 * Math.cos(a);
                const py = cy + r * 0.8 * Math.sin(a);
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath();
            outlineAndFill(ctx, cfg.color, '#111', 3.5);
            // Inner border ring (warning style)
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const a = (Math.PI / 4) * i - Math.PI / 8;
                const px = cx + r * 0.6 * Math.cos(a);
                const py = cy + r * 0.6 * Math.sin(a);
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.strokeStyle = cfg.accent;
            ctx.lineWidth = 2;
            ctx.stroke();
            // Angry eyes
            drawEnemyEye(ctx, cx - r * 0.2, cy - r * 0.15, r * 0.17, cfg.accent);
            drawEnemyEye(ctx, cx + r * 0.2, cy - r * 0.15, r * 0.17, cfg.accent);
            // Angry eyebrow lines
            ctx.strokeStyle = cfg.dark;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(cx - r * 0.38, cy - r * 0.38);
            ctx.lineTo(cx - r * 0.08, cy - r * 0.28);
            ctx.moveTo(cx + r * 0.38, cy - r * 0.38);
            ctx.lineTo(cx + r * 0.08, cy - r * 0.28);
            ctx.stroke();
            // Error "!" mouth
            ctx.fillStyle = cfg.accent;
            ctx.fillRect(cx - 2.5, cy + r * 0.08, 5, r * 0.28);
            ctx.beginPath(); ctx.arc(cx, cy + r * 0.5, 3.5, 0, Math.PI * 2); ctx.fill();
            // Beacon pulse rings (decorative)
            ctx.save();
            ctx.globalAlpha = 0.2;
            ctx.strokeStyle = cfg.accent;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(cx, cy, r * 0.95, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath(); ctx.arc(cx, cy, r * 1.05, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
            drawHighlight(ctx, cx - r * 0.3, cy - r * 0.65, r * 0.55, r * 0.35);
            break;
        }

        case 'mirror_ghost': {
            // Cute chibi ghost with mirror shimmer — rounded top, wavy bottom
            // Ghost body — rounded top, wavy bottom edge
            ctx.beginPath();
            ctx.moveTo(cx - r * 0.6, cy + r * 0.6);
            ctx.bezierCurveTo(cx - r * 0.65, cy - r * 0.1, cx - r * 0.55, cy - r * 0.7, cx, cy - r * 0.8);
            ctx.bezierCurveTo(cx + r * 0.55, cy - r * 0.7, cx + r * 0.65, cy - r * 0.1, cx + r * 0.6, cy + r * 0.6);
            // Wavy bottom
            ctx.quadraticCurveTo(cx + r * 0.4, cy + r * 0.35, cx + r * 0.2, cy + r * 0.65);
            ctx.quadraticCurveTo(cx, cy + r * 0.4, cx - r * 0.2, cy + r * 0.7);
            ctx.quadraticCurveTo(cx - r * 0.4, cy + r * 0.4, cx - r * 0.6, cy + r * 0.6);
            ctx.closePath();
            outlineAndFill(ctx, cfg.color, '#22224488', 3);
            // Mirror shimmer gradient overlay
            const mg = ctx.createLinearGradient(cx - r * 0.5, cy - r * 0.5, cx + r * 0.5, cy + r * 0.5);
            mg.addColorStop(0, 'rgba(255,255,255,0.3)');
            mg.addColorStop(0.3, 'rgba(255,255,255,0.05)');
            mg.addColorStop(0.7, 'rgba(200,200,255,0.2)');
            mg.addColorStop(1, 'rgba(255,255,255,0.1)');
            ctx.fillStyle = mg;
            ctx.beginPath();
            ctx.moveTo(cx - r * 0.55, cy + r * 0.5);
            ctx.bezierCurveTo(cx - r * 0.6, cy - r * 0.1, cx - r * 0.5, cy - r * 0.65, cx, cy - r * 0.75);
            ctx.bezierCurveTo(cx + r * 0.5, cy - r * 0.65, cx + r * 0.6, cy - r * 0.1, cx + r * 0.55, cy + r * 0.5);
            ctx.lineTo(cx - r * 0.55, cy + r * 0.5);
            ctx.fill();
            // Big cute ghost eyes
            // White sclera
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.ellipse(cx - r * 0.2, cy - r * 0.2, r * 0.16, r * 0.2, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(cx + r * 0.2, cy - r * 0.2, r * 0.16, r * 0.2, 0, 0, Math.PI * 2); ctx.fill();
            // Pupils
            ctx.fillStyle = '#333366';
            ctx.beginPath(); ctx.arc(cx - r * 0.18, cy - r * 0.15, r * 0.08, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(cx + r * 0.22, cy - r * 0.15, r * 0.08, 0, Math.PI * 2); ctx.fill();
            // Eye shine dots
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(cx - r * 0.22, cy - r * 0.22, r * 0.04, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(cx + r * 0.18, cy - r * 0.22, r * 0.04, 0, Math.PI * 2); ctx.fill();
            // Small "o" mouth
            ctx.strokeStyle = '#555588';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(cx, cy + r * 0.15, r * 0.08, 0, Math.PI * 2);
            ctx.stroke();
            // Blush circles
            ctx.save();
            ctx.globalAlpha = 0.2;
            ctx.fillStyle = '#ff88aa';
            ctx.beginPath(); ctx.ellipse(cx - r * 0.35, cy + r * 0.02, r * 0.1, r * 0.06, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(cx + r * 0.35, cy + r * 0.02, r * 0.1, r * 0.06, 0, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
            drawHighlight(ctx, cx - r * 0.3, cy - r * 0.7, r * 0.55, r * 0.4);
            break;
        }
    }
    return cv;
}



export { generateEnemySprites };
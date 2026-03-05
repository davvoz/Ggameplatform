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
        { name: 'toxic_blob', color: '#88ee22', accent: '#bbff66', dark: '#449911', size: 62 }
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
    }
    return cv;
}



export { generateEnemySprites };
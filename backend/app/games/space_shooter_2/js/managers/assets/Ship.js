import { outlineAndFill, drawHighlight, drawCockpit, drawEngineNozzle } from './Helper.js';

// ================================================================
//  PLAYER SHIPS  (128×128 canvas, drawn big and cartoon-like)
// ================================================================

function generateShipSprites(sprites) {
    const ships = {
        vanguard: { body: '#3377ee', accent: '#66aaff', dark: '#1a4499', wing: '#2266cc', engine: '#44bbff' },
        interceptor: { body: '#22cc66', accent: '#66ffaa', dark: '#117744', wing: '#11aa55', engine: '#44ffaa' },
        fortress: { body: '#6666dd', accent: '#9999ff', dark: '#3333aa', wing: '#5555cc', engine: '#8888ff' },
        striker: { body: '#ee7722', accent: '#ffaa55', dark: '#aa4400', wing: '#cc6611', engine: '#ffcc44' },
        titan: { body: '#dd3366', accent: '#ff77aa', dark: '#991144', wing: '#cc2255', engine: '#ff88bb' }
    };
    for (const [name, col] of Object.entries(ships)) {
        sprites[`ship_${name}`] = createShipSprite(name, col);
    }
}

function createShipSprite(name, c) {
    const S = 128;
    const cv = document.createElement('canvas');
    cv.width = S; cv.height = S;
    const ctx = cv.getContext('2d');
    const cx = S / 2, cy = S / 2;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (name) {

        // ── VANGUARD ──────────────────────────────
        case 'vanguard': {
            // Wings
            ctx.beginPath();
            ctx.moveTo(cx, 18);
            ctx.lineTo(cx + 42, cy + 20);
            ctx.lineTo(cx + 38, cy + 34);
            ctx.lineTo(cx + 10, cy + 14);
            ctx.closePath();
            outlineAndFill(ctx, c.wing);
            ctx.beginPath();
            ctx.moveTo(cx, 18);
            ctx.lineTo(cx - 42, cy + 20);
            ctx.lineTo(cx - 38, cy + 34);
            ctx.lineTo(cx - 10, cy + 14);
            ctx.closePath();
            outlineAndFill(ctx, c.wing);

            // Wing tip pylons
            ctx.fillStyle = c.accent;
            ctx.strokeStyle = '#111';
            ctx.lineWidth = 2;
            for (const sx of [-1, 1]) {
                ctx.beginPath();
                ctx.roundRect(cx + sx * 36 - 3, cy + 20, 6, 16, 2);
                ctx.fill(); ctx.stroke();
            }

            // Main body
            ctx.beginPath();
            ctx.moveTo(cx, 10);
            ctx.bezierCurveTo(cx + 18, 20, cx + 16, cy + 10, cx + 12, cy + 36);
            ctx.lineTo(cx + 6, cy + 40);
            ctx.lineTo(cx, cy + 34);
            ctx.lineTo(cx - 6, cy + 40);
            ctx.lineTo(cx - 12, cy + 36);
            ctx.bezierCurveTo(cx - 16, cy + 10, cx - 18, 20, cx, 10);
            ctx.closePath();
            outlineAndFill(ctx, c.body);

            // Panel lines
            ctx.strokeStyle = c.dark;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx - 8, 30); ctx.lineTo(cx - 10, cy + 20);
            ctx.moveTo(cx + 8, 30); ctx.lineTo(cx + 10, cy + 20);
            ctx.stroke();

            drawHighlight(ctx, cx - 12, 16, 24, 50);
            drawCockpit(ctx, cx, cy - 10, 7, 12);

            // Engines
            drawEngineNozzle(ctx, cx - 6, cy + 42, 8, 8, c.engine);
            drawEngineNozzle(ctx, cx + 6, cy + 42, 8, 8, c.engine);
            break;
        }

        // ── INTERCEPTOR ──────────────────────────
        case 'interceptor': {
            // Swept razor wings
            ctx.beginPath();
            ctx.moveTo(cx + 6, cy - 10);
            ctx.lineTo(cx + 52, cy + 6);
            ctx.lineTo(cx + 48, cy + 18);
            ctx.lineTo(cx + 14, cy + 10);
            ctx.closePath();
            outlineAndFill(ctx, c.wing);
            ctx.beginPath();
            ctx.moveTo(cx - 6, cy - 10);
            ctx.lineTo(cx - 52, cy + 6);
            ctx.lineTo(cx - 48, cy + 18);
            ctx.lineTo(cx - 14, cy + 10);
            ctx.closePath();
            outlineAndFill(ctx, c.wing);

            // Wing details
            ctx.strokeStyle = c.dark;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(cx + 20, cy); ctx.lineTo(cx + 44, cy + 10);
            ctx.moveTo(cx - 20, cy); ctx.lineTo(cx - 44, cy + 10);
            ctx.stroke();

            // Slim fuselage
            ctx.beginPath();
            ctx.moveTo(cx, 8);
            ctx.bezierCurveTo(cx + 10, 18, cx + 10, cy + 14, cx + 8, cy + 36);
            ctx.lineTo(cx + 4, cy + 40);
            ctx.lineTo(cx, cy + 36);
            ctx.lineTo(cx - 4, cy + 40);
            ctx.lineTo(cx - 8, cy + 36);
            ctx.bezierCurveTo(cx - 10, cy + 14, cx - 10, 18, cx, 8);
            ctx.closePath();
            outlineAndFill(ctx, c.body);

            drawHighlight(ctx, cx - 8, 14, 16, 50);
            drawCockpit(ctx, cx, cy - 12, 5, 10, '#88ffcc');

            // Wing-tip guns
            for (const sx of [-1, 1]) {
                ctx.beginPath();
                ctx.roundRect(cx + sx * 48 - 3, cy + 2, 6, 18, 2);
                ctx.fillStyle = '#555';
                ctx.fill();
                ctx.strokeStyle = '#111';
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            // Single big engine
            drawEngineNozzle(ctx, cx, cy + 42, 12, 10, c.engine);
            break;
        }

        // ── FORTRESS ─────────────────────────────
        case 'fortress': {
            // Heavy side armor blocks
            for (const sx of [-1, 1]) {
                ctx.beginPath();
                ctx.moveTo(cx + sx * 14, cy - 16);
                ctx.lineTo(cx + sx * 40, cy - 6);
                ctx.lineTo(cx + sx * 44, cy + 20);
                ctx.lineTo(cx + sx * 36, cy + 32);
                ctx.lineTo(cx + sx * 14, cy + 24);
                ctx.closePath();
                outlineAndFill(ctx, c.wing);
                ctx.strokeStyle = c.dark;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(cx + sx * 20, cy - 10);
                ctx.lineTo(cx + sx * 22, cy + 18);
                ctx.moveTo(cx + sx * 30, cy - 2);
                ctx.lineTo(cx + sx * 30, cy + 24);
                ctx.stroke();
            }

            // Turrets on armor
            for (const sx of [-1, 1]) {
                ctx.beginPath();
                ctx.arc(cx + sx * 36, cy + 4, 6, 0, Math.PI * 2);
                ctx.fillStyle = '#555';
                ctx.fill();
                ctx.strokeStyle = '#111';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.beginPath();
                ctx.roundRect(cx + sx * 34, cy - 10, 4, 14, 1);
                ctx.fillStyle = '#444';
                ctx.fill();
                ctx.strokeStyle = '#111';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }

            // Thick body
            ctx.beginPath();
            ctx.moveTo(cx, 16);
            ctx.bezierCurveTo(cx + 20, 22, cx + 18, cy + 16, cx + 14, cy + 36);
            ctx.lineTo(cx + 8, cy + 40);
            ctx.lineTo(cx, cy + 34);
            ctx.lineTo(cx - 8, cy + 40);
            ctx.lineTo(cx - 14, cy + 36);
            ctx.bezierCurveTo(cx - 18, cy + 16, cx - 20, 22, cx, 16);
            ctx.closePath();
            outlineAndFill(ctx, c.body);

            // Front shield plate
            ctx.beginPath();
            ctx.moveTo(cx - 12, 22);
            ctx.lineTo(cx, 14);
            ctx.lineTo(cx + 12, 22);
            ctx.lineTo(cx + 10, 30);
            ctx.lineTo(cx - 10, 30);
            ctx.closePath();
            outlineAndFill(ctx, c.accent, c.dark, 2);

            drawHighlight(ctx, cx - 14, 18, 28, 40, 0.2);
            drawCockpit(ctx, cx, cy - 4, 8, 10, '#aaaaff');

            drawEngineNozzle(ctx, cx - 8, cy + 42, 10, 10, c.engine);
            drawEngineNozzle(ctx, cx + 8, cy + 42, 10, 10, c.engine);
            break;
        }

        // ── STRIKER ──────────────────────────────
        case 'striker': {
            // Forward-swept angular wings
            ctx.beginPath();
            ctx.moveTo(cx + 8, cy - 8);
            ctx.lineTo(cx + 48, cy - 14);
            ctx.lineTo(cx + 44, cy + 2);
            ctx.lineTo(cx + 26, cy + 16);
            ctx.lineTo(cx + 12, cy + 8);
            ctx.closePath();
            outlineAndFill(ctx, c.wing);
            ctx.beginPath();
            ctx.moveTo(cx - 8, cy - 8);
            ctx.lineTo(cx - 48, cy - 14);
            ctx.lineTo(cx - 44, cy + 2);
            ctx.lineTo(cx - 26, cy + 16);
            ctx.lineTo(cx - 12, cy + 8);
            ctx.closePath();
            outlineAndFill(ctx, c.wing);

            // Gatling pods on wings
            for (const sx of [-1, 1]) {
                ctx.beginPath();
                ctx.roundRect(cx + sx * 30 - 4, cy - 18, 8, 22, 3);
                ctx.fillStyle = '#555';
                ctx.fill();
                ctx.strokeStyle = '#111';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.fillStyle = '#222';
                ctx.beginPath();
                ctx.arc(cx + sx * 30, cy - 16, 2, 0, Math.PI * 2);
                ctx.fill();
            }

            // Narrow aggressive body
            ctx.beginPath();
            ctx.moveTo(cx, 6);
            ctx.bezierCurveTo(cx + 14, 14, cx + 12, cy + 6, cx + 10, cy + 32);
            ctx.lineTo(cx + 6, cy + 38);
            ctx.lineTo(cx, cy + 32);
            ctx.lineTo(cx - 6, cy + 38);
            ctx.lineTo(cx - 10, cy + 32);
            ctx.bezierCurveTo(cx - 12, cy + 6, cx - 14, 14, cx, 6);
            ctx.closePath();
            outlineAndFill(ctx, c.body);

            // Warning stripes
            ctx.save();
            ctx.globalAlpha = 0.15;
            ctx.fillStyle = '#000';
            for (let i = 0; i < 4; i++) {
                ctx.fillRect(cx - 8, 28 + i * 8, 16, 3);
            }
            ctx.restore();

            drawHighlight(ctx, cx - 10, 12, 20, 46);
            drawCockpit(ctx, cx, cy - 12, 5, 9, '#ffddaa');

            drawEngineNozzle(ctx, cx, cy + 40, 10, 10, c.engine);
            break;
        }

        // ── TITAN ────────────────────────────────
        case 'titan': {
            // Massive shoulder plates
            for (const sx of [-1, 1]) {
                ctx.beginPath();
                ctx.moveTo(cx + sx * 16, 20);
                ctx.lineTo(cx + sx * 50, cy - 8);
                ctx.lineTo(cx + sx * 54, cy + 14);
                ctx.lineTo(cx + sx * 46, cy + 30);
                ctx.lineTo(cx + sx * 32, cy + 36);
                ctx.lineTo(cx + sx * 16, cy + 28);
                ctx.closePath();
                outlineAndFill(ctx, c.wing);
                // Reinforcement bolts
                ctx.fillStyle = c.accent;
                for (let i = 0; i < 3; i++) {
                    ctx.beginPath();
                    ctx.arc(cx + sx * (26 + i * 10), cy + 2 + i * 8, 3, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#111';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                }
            }

            // Heavy body
            ctx.beginPath();
            ctx.moveTo(cx, 12);
            ctx.bezierCurveTo(cx + 22, 22, cx + 20, cy + 16, cx + 16, cy + 38);
            ctx.lineTo(cx + 10, cy + 44);
            ctx.lineTo(cx, cy + 38);
            ctx.lineTo(cx - 10, cy + 44);
            ctx.lineTo(cx - 16, cy + 38);
            ctx.bezierCurveTo(cx - 20, cy + 16, cx - 22, 22, cx, 12);
            ctx.closePath();
            outlineAndFill(ctx, c.body);

            // Front ram plate
            ctx.beginPath();
            ctx.moveTo(cx - 16, 20);
            ctx.lineTo(cx, 10);
            ctx.lineTo(cx + 16, 20);
            ctx.lineTo(cx + 14, 32);
            ctx.lineTo(cx - 14, 32);
            ctx.closePath();
            outlineAndFill(ctx, c.accent, c.dark, 2);

            // Armor grooves on body
            ctx.strokeStyle = c.dark;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(cx - 14, 34); ctx.lineTo(cx - 14, cy + 20);
            ctx.moveTo(cx + 14, 34); ctx.lineTo(cx + 14, cy + 20);
            ctx.moveTo(cx - 10, cy + 8); ctx.lineTo(cx + 10, cy + 8);
            ctx.stroke();

            drawHighlight(ctx, cx - 16, 16, 32, 50, 0.18);
            drawCockpit(ctx, cx, cy - 2, 9, 12, '#ffaacc');

            // Tri-engine
            drawEngineNozzle(ctx, cx - 10, cy + 46, 10, 10, c.engine);
            drawEngineNozzle(ctx, cx, cy + 48, 12, 12, c.engine);
            drawEngineNozzle(ctx, cx + 10, cy + 46, 10, 10, c.engine);
            break;
        }
    }

    return cv;
}

export { generateShipSprites };   
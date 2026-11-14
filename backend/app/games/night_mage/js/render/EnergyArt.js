/**
 * The mage's energy over his head: one small crystal per charge. Full ones
 * glow orange like the bolts, the one coming back fills from the bottom,
 * empty ones blink red after a tap with nothing left.
 */
const PX = 4;
const CRYSTAL = ['0110', '1231', '1221', '0110'];
const SIZE = CRYSTAL.length * PX;
const GAP = 4;
const FULL = ['#3a1020', '#ff8a3c', '#ffe0a0'];
const EMPTY = ['#14081e', '#3a2a3a', '#4a3a4a'];
const DENIED = ['#3a0a10', '#ff3b3b', '#ff9a9a'];

function crystal(ctx, x, y, colors) {
    CRYSTAL.forEach((row, r) => [...row].forEach((cell, c) => {
        if (cell === '0') return;
        ctx.fillStyle = colors[Number(cell) - 1];
        ctx.fillRect(x + c * PX, y + r * PX, PX, PX);
    }));
}

/**
 * @param {number} cx centre of the row
 * @param {number} y top of the row
 * @param {{energy: number, max: number, denied: boolean}} state
 */
export function drawEnergy(ctx, cx, y, { energy, max, denied }) {
    const width = max * SIZE + (max - 1) * GAP;
    const left = Math.round(cx - width / 2);
    for (let i = 0; i < max; i++) {
        const x = left + i * (SIZE + GAP);
        const part = Math.max(0, Math.min(1, energy - i));
        crystal(ctx, x, y, denied && part < 1 ? DENIED : EMPTY);
        if (part <= 0) continue;
        const shown = part >= 1 ? SIZE : Math.floor((part * SIZE) / PX) * PX;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y + SIZE - shown, SIZE, shown);
        ctx.clip();
        crystal(ctx, x, y, FULL);
        ctx.restore();
    }
}

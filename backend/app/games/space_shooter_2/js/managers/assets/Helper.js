// ===== HELPER: cartoon outline path =====
function outlineAndFill(ctx, fillColor, outlineColor = '#111', lineWidth = 3) {
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
}

// ===== HELPER: inner highlight strip =====
function drawHighlight(ctx, x, y, w, h, alpha = 0.25) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.35, y + h * 0.2, w * 0.22, h * 0.12, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

// ===== HELPER: cockpit bubble =====
function drawCockpit(ctx, cx, cy, rx, ry, tint = '#88ddff') {
    const cg = ctx.createRadialGradient(cx - rx * 0.3, cy - ry * 0.3, 0, cx, cy, Math.max(rx, ry));
    cg.addColorStop(0, '#ffffff');
    cg.addColorStop(0.3, tint);
    cg.addColorStop(0.7, '#2255aa');
    cg.addColorStop(1, '#112244');
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = cg;
    ctx.fill();
    ctx.strokeStyle = '#11223366';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(cx - rx * 0.25, cy - ry * 0.3, Math.min(rx, ry) * 0.3, 0, Math.PI * 2);
    ctx.fill();
}

// ===== HELPER: engine nozzle =====
function drawEngineNozzle(ctx, cx, by, width, height, color) {
    ctx.beginPath();
    ctx.moveTo(cx - width / 2, by - height);
    ctx.lineTo(cx - width * 0.65, by);
    ctx.lineTo(cx + width * 0.65, by);
    ctx.lineTo(cx + width / 2, by - height);
    ctx.closePath();
    ctx.fillStyle = '#333';
    ctx.fill();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    ctx.stroke();
    const eg = ctx.createLinearGradient(cx, by - height, cx, by);
    eg.addColorStop(0, 'rgba(0,0,0,0)');
    eg.addColorStop(0.5, color);
    eg.addColorStop(1, '#fff');
    ctx.fillStyle = eg;
    ctx.beginPath();
    ctx.moveTo(cx - width * 0.3, by - height * 0.5);
    ctx.lineTo(cx - width * 0.45, by);
    ctx.lineTo(cx + width * 0.45, by);
    ctx.lineTo(cx + width * 0.3, by - height * 0.5);
    ctx.closePath();
    ctx.fill();
}

// Helper: draw a menacing eye
function _drawPartEye(ctx, cx, cy, r, color) {
    // Outer
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#111';
    ctx.fill();
    // Iris
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    // Pupil
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#000';
    ctx.fill();
    // Glint
    ctx.beginPath();
    ctx.arc(cx - r * 0.2, cy - r * 0.2, r * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
}
// Enemy glowing eye helper
function drawEnemyEye(ctx, cx, cy, radius, tint) {
    ctx.save();
    ctx.shadowColor = tint;
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = tint;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(cx - radius * 0.25, cy - radius * 0.25, radius * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

// Helper: make a canvas of given size
function _mkCanvas(w, h) {
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    return cv;
}

export { outlineAndFill, drawHighlight, drawCockpit, drawEngineNozzle, _drawPartEye, drawEnemyEye, _mkCanvas };
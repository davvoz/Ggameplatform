/**
 * Movement patterns
 */
const MOVEMENT = {
    straight: (enemy, dt) => {
        enemy.position.y += enemy.speed * dt;
    },
    sine: (enemy, dt) => {
        enemy.position.y += enemy.speed * dt;
        enemy.position.x = enemy.startX + Math.sin(enemy.moveTimer * 2) * 40;
    },
    zigzag: (enemy, dt) => {
        enemy.position.y += enemy.speed * dt;
        enemy.movePhase = enemy.movePhase || 1;
        enemy.position.x += enemy.movePhase * enemy.speed * 0.6 * dt;
        if (enemy.position.x < 20 || enemy.position.x > enemy.canvasWidth - 20) {
            enemy.movePhase *= -1;
        }
    },
    dive: (enemy, dt) => {
        enemy.position.y += enemy.speed * 1.5 * dt;
        if (enemy.targetX !== undefined) {
            const dx = enemy.targetX - enemy.position.x;
            enemy.position.x += Math.sign(dx) * Math.min(Math.abs(dx), enemy.speed * 0.5 * dt);
        }
    },
    circle: (enemy, dt) => {
        enemy.moveTimer += dt;
        const radius = 60;
        enemy.position.x = enemy.startX + Math.cos(enemy.moveTimer * 1.5) * radius;
        enemy.position.y = enemy.startY + Math.sin(enemy.moveTimer * 1.5) * radius + enemy.speed * 0.3 * dt;
        enemy.startY += enemy.speed * 0.3 * dt;
    },
    // New patterns for level variety
    spiral: (enemy, dt) => {
        enemy.moveTimer += dt;
        const radius = 40 + enemy.moveTimer * 8;
        enemy.position.x = enemy.startX + Math.cos(enemy.moveTimer * 2) * radius;
        enemy.position.y += enemy.speed * 0.5 * dt;
    },
    strafe: (enemy, dt) => {
        // Move down then strafe horizontally
        if (enemy.position.y < enemy.strafeY) {
            enemy.position.y += enemy.speed * dt;
        } else {
            enemy.movePhase = enemy.movePhase || 1;
            enemy.position.x += enemy.movePhase * enemy.speed * 0.8 * dt;
            if (enemy.position.x < 30 || enemy.position.x > enemy.canvasWidth - 30) {
                enemy.movePhase *= -1;
            }
        }
    },
    swoop: (enemy, dt) => {
        enemy.moveTimer += dt;
        // Swooping U-shaped dive
        const phase = enemy.moveTimer * 1.5;
        enemy.position.y = enemy.startY + Math.sin(phase) * 120 + enemy.speed * 0.3 * dt;
        enemy.position.x = enemy.startX + Math.sin(phase) * 70;
        enemy.startY += enemy.speed * 0.3 * dt;
    },
    pendulum: (enemy, dt) => {
        enemy.moveTimer += dt;
        enemy.position.y += enemy.speed * 0.7 * dt;
        const swing = Math.sin(enemy.moveTimer * 1.8) * 120;
        enemy.position.x = enemy.startX + swing;
    },

    // ═══════ WORLD 3 EXCLUSIVE MOVEMENT PATTERNS ═══════
    /** Blink teleport — moves normally then teleports randomly every ~2s */
    glitch_blink: (enemy, dt) => {
        enemy.position.y += enemy.speed * 0.6 * dt;
        enemy._blinkTimer = (enemy._blinkTimer || 1.5 + Math.random()) - dt;
        if (enemy._blinkTimer <= 0) {
            enemy._blinkTimer = 1.5 + Math.random() * 1.5;
            // Teleport within ±80px horizontally, ±30px vertically
            enemy.position.x += (Math.random() - 0.5) * 160;
            enemy.position.y += (Math.random() - 0.3) * 60;
            enemy.position.x = Math.max(10, Math.min(enemy.canvasWidth - 10, enemy.position.x));
            enemy._justBlinked = 6; // flash frames for visual feedback
        }
        if (enemy._justBlinked > 0) enemy._justBlinked--;
    },
    /** Orbit player — circles around the player's X position */
    orbit_player: (enemy, dt) => {
        enemy.moveTimer += dt;
        const orbitR = 70 + Math.sin(enemy.moveTimer * 0.5) * 20;
        const tx = (enemy.targetX || enemy.canvasWidth / 2);
        enemy.position.x += (tx + Math.cos(enemy.moveTimer * 1.8) * orbitR - enemy.position.x) * 2 * dt;
        enemy.position.y += enemy.speed * 0.35 * dt;
        enemy.position.y += Math.sin(enemy.moveTimer * 2.5) * 15 * dt;
    },
    /** Phase drift — smoothly phases left/right with ghost afterimages (handled in render) */
    phase_drift: (enemy, dt) => {
        enemy.moveTimer += dt;
        enemy.position.y += enemy.speed * 0.5 * dt;
        // Smooth sine with abrupt direction shifts
        const phase = Math.sin(enemy.moveTimer * 1.2) + 0.4 * Math.sin(enemy.moveTimer * 3.1);
        enemy.position.x = enemy.startX + phase * 80;
        // Store previous positions for afterimage rendering
        if (!enemy._afterimages) enemy._afterimages = [];
        enemy._afterimages.push({ x: enemy.position.x, y: enemy.position.y, alpha: 0.25 });
        if (enemy._afterimages.length > 4) enemy._afterimages.shift();
        for (const ai of enemy._afterimages) ai.alpha *= 0.92;
    },

    // ═══════ WORLD 4 EXCLUSIVE MOVEMENT PATTERNS ═══════
    /** Quantum tunnel — moves normally then teleports through screen edges */
    quantum_tunnel: (enemy, dt) => {
        enemy.position.y += enemy.speed * 0.5 * dt;
        enemy._tunnelTimer = (enemy._tunnelTimer || 2 + Math.random() * 2) - dt;
        if (enemy._tunnelTimer <= 0) {
            enemy._tunnelTimer = 2 + Math.random() * 2;
            // Tunnel through screen edge
            if (enemy.position.x < enemy.canvasWidth / 2) {
                enemy.position.x = enemy.canvasWidth - 30;
            } else {
                enemy.position.x = 30;
            }
            enemy._tunnelBaseX = enemy.position.x;
            enemy._justTunneled = 8; // flash frames
        }
        if (enemy._justTunneled > 0) enemy._justTunneled--;
        // Gentle oscillation between tunnels
        if (enemy._tunnelBaseX === undefined) enemy._tunnelBaseX = enemy.position.x;
        enemy.position.x = enemy._tunnelBaseX + Math.sin(enemy.moveTimer * 1.5) * 20;
    },
    /** Wave function — probability-based: exists in multiple possible positions, snaps randomly */
    wave_function: (enemy, dt) => {
        enemy.moveTimer += dt;
        enemy.position.y += enemy.speed * 0.4 * dt;
        // Superposition wobble — position shifts unpredictably
        enemy._wfTimer = (enemy._wfTimer || 1.5 + Math.random()) - dt;
        if (enemy._wfTimer <= 0) {
            enemy._wfTimer = 1.2 + Math.random() * 1.5;
            // "Collapse" to a random nearby position
            enemy.position.x = enemy.startX + (Math.random() - 0.5) * 120;
            enemy.position.x = Math.max(20, Math.min(enemy.canvasWidth - 20, enemy.position.x));
            enemy._wfBaseX = enemy.position.x;
            enemy._wfCollapse = 6; // visual feedback frames
        }
        if (enemy._wfCollapse > 0) enemy._wfCollapse--;
        // Between collapses, shimmer around last collapse position
        if (enemy._wfBaseX === undefined) enemy._wfBaseX = enemy.position.x;
        enemy.position.x = enemy._wfBaseX + Math.sin(enemy.moveTimer * 4) * 10;
    },
    /** Orbital — electron-like elliptical orbit path */
    orbital: (enemy, dt) => {
        enemy.moveTimer += dt;
        const orbitRx = 60 + Math.sin(enemy.moveTimer * 0.3) * 20;
        const orbitRy = 40;
        enemy.position.x = enemy.startX + Math.cos(enemy.moveTimer * 1.5) * orbitRx;
        enemy.position.y += enemy.speed * 0.25 * dt;
        enemy.position.y += Math.sin(enemy.moveTimer * 1.5) * orbitRy * 0.02;
        enemy.startY += enemy.speed * 0.25 * dt;
    },
    /** Superposition — exists in two positions simultaneously (render handles ghost) */
    superposition: (enemy, dt) => {
        enemy.moveTimer += dt;
        enemy.position.y += enemy.speed * 0.5 * dt;
        enemy.position.x = enemy.startX + Math.sin(enemy.moveTimer * 1.8) * 50;
        // Store ghost position (opposite phase)
        enemy._ghostX = enemy.startX - Math.sin(enemy.moveTimer * 1.8) * 50;
        enemy._ghostY = enemy.position.y + Math.cos(enemy.moveTimer * 0.5) * 15;
    }
};

export { MOVEMENT };
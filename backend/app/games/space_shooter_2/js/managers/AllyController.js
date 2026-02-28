/**
 * AllyController — Manages orbital formation, rotation, and shooting
 * for Neural Hijack converted enemies.
 *
 * Allies orbit the player in a harmonic ring, smoothly rotating
 * their sprite to face the nearest hostile enemy.
 */
class AllyController {
    constructor(game) {
        this.game = game;

        // ── Orbit parameters ──
        this.orbitRadius   = 90;   // px around player center
        this.orbitSpeed    = 1.0;  // rad/s base rotation
        this.orbitAngle    = 0;    // current base angle (advances each frame)

        // ── Combat parameters ──
        this.shootCooldown  = 1.0;  // seconds between shots
        this.detectionRange = 350;  // px scan radius
        this.bulletSpeed    = 300;  // px/s
    }

    // ────────────────────────────────────────────
    //  UPDATE — position, aim, shoot
    // ────────────────────────────────────────────
    update(deltaTime) {
        const g      = this.game;
        const player = g.entityManager.player;
        const perks  = g.perkSystem;
        if (!player || !player.active) return;
        if (!perks.alliedEnemies || perks.alliedEnemies.length === 0) return;

        // Purge dead allies (iterate backwards)
        for (let i = perks.alliedEnemies.length - 1; i >= 0; i--) {
            if (!perks.alliedEnemies[i].active) {
                perks.alliedEnemies.splice(i, 1);
            }
        }

        const allies = perks.alliedEnemies;
        const count  = allies.length;
        if (count === 0) return;

        // Advance orbit
        this.orbitAngle += this.orbitSpeed * deltaTime;

        const playerCx = player.position.x + player.width  / 2;
        const playerCy = player.position.y + player.height / 2;

        for (let i = 0; i < count; i++) {
            const ally = allies[i];

            // ── Orbital position ──
            const slotAngle = this.orbitAngle + (i * Math.PI * 2 / count);
            const targetX   = playerCx + Math.cos(slotAngle) * this.orbitRadius - ally.width  / 2;
            const targetY   = playerCy + Math.sin(slotAngle) * this.orbitRadius - ally.height / 2;

            // Smooth exponential lerp toward target slot
            const lerp = 1 - Math.pow(0.005, deltaTime);
            ally.position.x += (targetX - ally.position.x) * lerp;
            ally.position.y += (targetY - ally.position.y) * lerp;

            // ── Targeting ──
            const nearest = this._findNearestEnemy(ally);

            // Compute desired facing angle
            let desiredFacing = -Math.PI / 2; // default: face upward
            if (nearest) {
                const ax = ally.position.x + ally.width  / 2;
                const ay = ally.position.y + ally.height / 2;
                const tx = nearest.position.x + nearest.width  / 2;
                const ty = nearest.position.y + nearest.height / 2;
                desiredFacing = Math.atan2(ty - ay, tx - ax);
            }

            // Initialize facing on first frame
            if (ally._facing === undefined) ally._facing = -Math.PI / 2;

            // Smooth angle interpolation
            ally._facing = this._lerpAngle(ally._facing, desiredFacing, 5 * deltaTime);

            // ── Shooting ──
            ally._allyShootTimer = (ally._allyShootTimer || 0) - deltaTime;
            if (ally._allyShootTimer <= 0 && nearest) {
                ally._allyShootTimer = this.shootCooldown;
                this._shoot(ally, nearest);
            }

            // Decay hit flash (normally done in Enemy.update which we skip)
            if (ally.hitFlash > 0) ally.hitFlash -= deltaTime * 5;
        }
    }

    // ────────────────────────────────────────────
    //  RENDER — rotated sprite + cyan aura
    // ────────────────────────────────────────────
    render(ctx, assets) {
        const allies = this.game.perkSystem.alliedEnemies;
        if (!allies || allies.length === 0) return;

        const now = performance.now() * 0.001;

        for (const ally of allies) {
            if (!ally.active) continue;

            const cx = ally.position.x + ally.width  / 2;
            const cy = ally.position.y + ally.height / 2;
            const facing = ally._facing !== undefined ? ally._facing : -Math.PI / 2;

            ctx.save();

            // ── Rotate around center ──
            // Sprites face downward by default (angle π/2).
            // Rotation = desired facing − default facing.
            ctx.translate(cx, cy);
            ctx.rotate(facing - Math.PI / 2);
            ctx.translate(-cx, -cy);

            // ── Cyan ally glow aura (replaces enemy default glow) ──
            ctx.save();
            ctx.globalAlpha = 0.2;
            ctx.shadowColor = '#00ddff';
            ctx.shadowBlur  = 14;
            ctx.fillStyle   = '#00ddff';
            ctx.beginPath();
            ctx.arc(cx, cy, ally.width * 0.45, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // ── Sprite ──
            ctx.globalAlpha = ally.alpha;
            const sprite = assets.getSprite(`enemy_${ally.type}`);
            const pad = 8;
            if (sprite) {
                ctx.drawImage(
                    sprite,
                    ally.position.x - pad, ally.position.y - pad,
                    ally.width + pad * 2, ally.height + pad * 2
                );
            } else {
                ctx.fillStyle = ally.config.color;
                ctx.fillRect(ally.position.x, ally.position.y, ally.width, ally.height);
            }

            // ── Hit flash ──
            if (ally.hitFlash > 0) {
                ctx.save();
                ctx.globalAlpha = ally.hitFlash * 0.6;
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(cx, cy, ally.width * 0.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // ── Pulsing ring ──
            const pulse  = 0.6 + 0.4 * Math.sin(now * 4);
            const radius = ally.width * 0.55 + pulse * 4;
            ctx.globalAlpha = ally.alpha * 0.35 * pulse;
            ctx.strokeStyle = '#00ddff';
            ctx.lineWidth   = 2.5;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.stroke();

            // ── ⚡ icon (drawn without rotation so it's readable) ──
            ctx.restore(); // pop rotation
            ctx.save();
            ctx.globalAlpha = ally.alpha * 0.8;
            ctx.fillStyle   = '#00ffcc';
            ctx.font        = '12px sans-serif';
            ctx.textAlign   = 'center';
            ctx.fillText('⚡', cx, ally.position.y - 8);
            ctx.restore();
        }
    }

    // ────────────────────────────────────────────
    //  HELPERS
    // ────────────────────────────────────────────
    _findNearestEnemy(ally) {
        let nearest  = null;
        let nearDist = this.detectionRange;
        const ax = ally.position.x + ally.width  / 2;
        const ay = ally.position.y + ally.height / 2;

        for (const e of this.game.entityManager.enemies) {
            if (!e.active || e._isAlly) continue;
            const dx = (e.position.x + e.width  / 2) - ax;
            const dy = (e.position.y + e.height / 2) - ay;
            const d  = Math.sqrt(dx * dx + dy * dy);
            if (d < nearDist) { nearDist = d; nearest = e; }
        }
        return nearest;
    }

    _shoot(ally, target) {
        const ax = ally.position.x + ally.width  / 2;
        const ay = ally.position.y + ally.height / 2;
        const tx = target.position.x + target.width  / 2;
        const ty = target.position.y + target.height / 2;
        const angle = Math.atan2(ty - ay, tx - ax);

        this.game.entityManager.spawnBullet(
            ax, ay,
            Math.cos(angle) * this.bulletSpeed,
            Math.sin(angle) * this.bulletSpeed,
            'player', 1
        );
    }

    /** Smoothly interpolate between two angles (handles wrapping) */
    _lerpAngle(current, target, speed) {
        let diff = target - current;
        while (diff >  Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        if (Math.abs(diff) < 0.01) return target;
        return current + diff * Math.min(1, speed);
    }

    reset() {
        this.orbitAngle = 0;
    }
}

export default AllyController;

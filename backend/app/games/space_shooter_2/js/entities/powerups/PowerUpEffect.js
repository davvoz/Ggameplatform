const DETECTION_RANGE = 400;

class PowerUpEffect {
    active = false;
    time = 0;

    activate() {
        this.active = true;
    }

    update(_deltaTime, _player, _game) { /* override in subclass */ }

    deactivate(_player, _game) {
        this.active = false;
        this.time = 0;
    }

    static findNearestTarget(originX, originY, game) {
        const em = game.entityManager;
        let nearest = null;
        let bestDist = DETECTION_RANGE;

        for (const e of em.enemies) {
            if (!e.active || e._isAlly) continue;
            const dx = (e.position.x + e.width / 2) - originX;
            const dy = (e.position.y + e.height / 2) - originY;
            const d = Math.hypot(dx, dy);
            if (d < bestDist) { bestDist = d; nearest = e; }
        }

        nearest = PowerUpEffect.checkBossTarget(em.miniBoss, originX, originY, bestDist, nearest);
        nearest = PowerUpEffect.checkBossTarget(em.boss, originX, originY, bestDist, nearest);
        return nearest;
    }

    static checkBossTarget(boss, originX, originY, bestDist, currentBest) {
        if (!boss?.active || boss.entering) return currentBest;
        const dx = (boss.position.x + boss.width / 2) - originX;
        const dy = (boss.position.y + boss.height / 2) - originY;
        const d = Math.hypot(dx, dy);
        return d < bestDist ? boss : currentBest;
    }

    static getAimDirection(originX, originY, speed, game) {
        const target = PowerUpEffect.findNearestTarget(originX, originY, game);
        if (!target) return { vx: 0, vy: -speed };
        const tx = (target.position.x + target.width / 2) - originX;
        const ty = (target.position.y + target.height / 2) - originY;
        const angle = Math.atan2(ty, tx);
        return { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
    }
}

export default PowerUpEffect;

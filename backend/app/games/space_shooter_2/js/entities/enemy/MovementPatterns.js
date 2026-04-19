const MOVE_PATTERNS = {
    sweep(boss, dt) {
        boss.centerX += boss.moveDir * boss.speed * dt;
        if (boss.centerX < 80 || boss.centerX > boss.canvasWidth - 80) boss.moveDir *= -1;
    },

    slowSweep(boss, dt) {
        boss.centerX += boss.moveDir * boss.speed * 0.7 * dt;
        if (boss.centerX < 100 || boss.centerX > boss.canvasWidth - 100) boss.moveDir *= -1;
    },

    weave(boss, dt) {
        boss.centerX += Math.sin(boss.moveTimer * 0.8) * boss.speed * 1.2 * dt;
        boss.centerY = boss.targetY + Math.sin(boss.moveTimer * 0.5) * 25;
    },

    figure8(boss) {
        boss.centerX = boss.canvasWidth / 2 + Math.sin(boss.moveTimer * 0.6) * 100;
        boss.centerY = boss.targetY + Math.sin(boss.moveTimer * 1.2) * 30;
    },

    chase(boss, dt, game) {
        if (game.player?.active) {
            const px = game.player.position.x + game.player.width / 2;
            const diff = px - boss.centerX;
            boss.centerX += Math.sign(diff) * Math.min(Math.abs(diff), boss.speed * dt);
        }
        boss.centerY = boss.targetY + Math.sin(boss.moveTimer * 1.5) * 20;
    },

    erratic(boss, dt) {
        boss.centerX += Math.sin(boss.moveTimer * 1.2) * boss.speed * dt;
        boss.centerX += Math.cos(boss.moveTimer * 0.7) * boss.speed * 0.5 * dt;
        boss.centerY = boss.targetY + Math.sin(boss.moveTimer * 0.9) * 35;
        boss.centerX = Math.max(100, Math.min(boss.canvasWidth - 100, boss.centerX));
    },

    zigzag(boss, dt) {
        boss.centerX += boss.moveDir * boss.speed * dt;
        boss.centerY = boss.targetY + Math.sin(boss.moveTimer * 2.5) * 18;
        if (boss.centerX < 60 || boss.centerX > boss.canvasWidth - 60) boss.moveDir *= -1;
    }
};

export default MOVE_PATTERNS;

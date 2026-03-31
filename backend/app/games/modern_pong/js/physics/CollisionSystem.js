/**
 * Collision detection and resolution for all game entities.
 */
export class CollisionSystem {

    /**
     * Check ball vs character collision and deflect.
     * Returns true if collision occurred.
     */
    static checkBallCharacter(ball, character) {
        const dx = ball.x - character.x;
        const dy = ball.y - character.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = ball.radius + character.hitboxRadius;

        if (dist >= minDist) return false;

        // Deflection angle based on hit position
        const normalX = dx / dist;
        const normalY = dy / dist;

        // Reflect velocity
        const dot = ball.vx * normalX + ball.vy * normalY;
        ball.vx -= 2 * dot * normalX;
        ball.vy -= 2 * dot * normalY;

        // Apply character's hit strength
        const strengthMultiplier = character.hitStrength;
        ball.vx *= strengthMultiplier;
        ball.vy *= strengthMultiplier;

        // Apply spin (curve the ball based on character's spin stat)
        const spinAmount = character.spinFactor;
        ball.vx += spinAmount * (character.x > ball.x ? -50 : 50);

        // Ensure ball moves away from character's half
        if (character.isTopPlayer && ball.vy < 0) {
            ball.vy = Math.abs(ball.vy);
        } else if (!character.isTopPlayer && ball.vy > 0) {
            ball.vy = -Math.abs(ball.vy);
        }

        // Separate ball from character
        const overlap = minDist - dist;
        ball.x += normalX * (overlap + 1);
        ball.y += normalY * (overlap + 1);

        ball.accelerate();
        ball.triggerImpact();
        // Clear shadow blaze on any hit — phantom strike only lasts one pass
        if (ball.isShadowBlaze) ball.clearShadowBlaze();
        return true;
    }

    /**
     * Check ball vs power-up collision.
     * Returns the collected power-up or null.
     */
    static checkBallPowerUp(ball, powerUp) {
        if (!powerUp.alive) return null;

        const dx = ball.x - powerUp.x;
        const dy = ball.y - powerUp.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < ball.radius + powerUp.radius) {
            powerUp.collect();
            return powerUp;
        }
        return null;
    }

    /**
     * Check character vs power-up collision.
     * Returns the collected power-up or null.
     */
    static checkCharacterPowerUp(character, powerUp) {
        if (!powerUp.alive) return null;

        const dx = character.x - powerUp.x;
        const dy = character.y - powerUp.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < character.hitboxRadius + powerUp.radius) {
            powerUp.collect();
            return powerUp;
        }
        return null;
    }
}

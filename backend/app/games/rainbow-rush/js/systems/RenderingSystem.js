/**
 * RenderingSystem - Handles all game entity rendering
 * Follows Single Responsibility and Open/Closed Principles
 */
import { WebGLRenderer } from '../core/WebGLRenderer.js';

export class RenderingSystem {
    constructor(gl) {
        this.renderer = new WebGLRenderer(gl);
    }

    render(gl, entities) {
        for (const entity of entities) {
            this.renderEntity(entity);
        }
    }

    renderEntity(entity) {
        switch (entity.type) {
            case 'platform':
                this.renderPlatform(entity);
                break;
            case 'player':
                this.renderPlayer(entity);
                break;
            case 'collectible':
                this.renderCollectible(entity);
                break;
            case 'spike':
            case 'enemy':
                this.renderObstacle(entity);
                break;
        }
    }

    renderPlatform(platform) {
        this.renderer.drawRect(
            platform.x,
            platform.y,
            platform.width,
            platform.height,
            platform.color
        );
    }

    renderPlayer(player) {
        if (!player.alive) {
            // Render dead state with fade
            const fadedColor = [...player.color];
            fadedColor[3] = 0.3;
            this.renderer.drawRect(
                player.x,
                player.y,
                player.width,
                player.height,
                fadedColor
            );
        } else {
            this.renderer.drawRect(
                player.x,
                player.y,
                player.width,
                player.height,
                player.color
            );
            
            // Draw eyes
            const eyeColor = [1.0, 1.0, 1.0, 1.0];
            this.renderer.drawCircle(
                player.x + player.width * 0.3,
                player.y + player.height * 0.3,
                3,
                eyeColor
            );
            this.renderer.drawCircle(
                player.x + player.width * 0.7,
                player.y + player.height * 0.3,
                3,
                eyeColor
            );
        }
    }

    renderCollectible(collectible) {
        // Pulsing effect
        const pulseRadius = collectible.radius + Math.sin(Date.now() / 200) * 3;
        this.renderer.drawCircle(
            collectible.x,
            collectible.y,
            pulseRadius,
            collectible.color
        );
        
        // Inner glow
        const glowColor = [1.0, 1.0, 0.8, 0.6];
        this.renderer.drawCircle(
            collectible.x,
            collectible.y,
            pulseRadius * 0.6,
            glowColor
        );
    }

    renderObstacle(obstacle) {
        if (obstacle.type === 'spike') {
            this.renderSpike(obstacle);
        } else {
            this.renderEnemy(obstacle);
        }
    }

    renderSpike(spike) {
        // Draw triangular spike
        this.renderer.drawRect(
            spike.x,
            spike.y,
            spike.width,
            spike.height,
            spike.color
        );
    }

    renderEnemy(enemy) {
        // Draw enemy as rectangle with animation
        const offset = Math.sin(Date.now() / 300) * 2;
        this.renderer.drawRect(
            enemy.x,
            enemy.y + offset,
            enemy.width,
            enemy.height,
            enemy.color
        );
    }
}

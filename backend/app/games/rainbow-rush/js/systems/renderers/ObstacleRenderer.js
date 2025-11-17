/**
 * ObstacleRenderer - Renders spikes and enemies
 * Single Responsibility: Obstacle visualization
 */
import { IEntityRenderer } from './IEntityRenderer.js';
import { RenderingUtils } from './RenderingUtils.js';

export class ObstacleRenderer extends IEntityRenderer {
    constructor(renderer) {
        super(renderer);
    }

    render(obstacle, context) {
        const { time } = context;
        
        if (obstacle.type === 'spike' || obstacle.entityType === 'spike') {
            this.renderSpike(obstacle, time);
        } else if (obstacle.type === 'enemy' || obstacle.entityType === 'enemy') {
            this.renderEnemy(obstacle, time);
        }
    }

    renderSpike(spike, time) {
        const offset = spike.animationOffset || 0;
        const wobble = Math.sin(time * 4 + offset) * 2;
        const pulse = Math.sin(time * 6 + offset) * 0.15 + 0.85;

        // Shadow
        RenderingUtils.drawShadow(this.renderer, spike.x + wobble, spike.y, spike.width, spike.height);

        // Danger glow
        for (let i = 0; i < 4; i++) {
            this.renderer.drawRect(
                spike.x + wobble - i * 2,
                spike.y - i * 2,
                spike.width + i * 4,
                spike.height + i * 4,
                [1.0, 0.2, 0.2, pulse * 0.15 / (i + 1)]
            );
        }

        // Body gradient
        const topColor = [0.6 * pulse, 0.1, 0.1, 1.0];
        const bottomColor = [1.0 * pulse, 0.3, 0.2, 1.0];
        this.renderer.drawRect(spike.x + wobble, spike.y, spike.width, spike.height * 0.5, topColor);
        this.renderer.drawRect(spike.x + wobble, spike.y + spike.height * 0.5, spike.width, spike.height * 0.5, bottomColor);

        // Spikes on top
        this.renderSpikePoints(spike, time, wobble, offset);

        // Highlights
        const shimmer = Math.sin(time * 10 + offset) * 0.4 + 0.6;
        this.renderer.drawRect(spike.x + wobble, spike.y, 2, spike.height, [1.0, 0.5, 0.4, shimmer]);
        this.renderer.drawRect(spike.x + wobble + spike.width - 2, spike.y, 2, spike.height, [1.0, 0.5, 0.4, shimmer]);
        
        // Sparkles
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + time * 3 + offset;
            const radius = 12 + Math.sin(time * 5 + i) * 3;
            const px = spike.x + wobble + spike.width / 2 + Math.cos(angle) * radius;
            const py = spike.y + spike.height / 2 + Math.sin(angle) * radius;
            const sparkleSize = 1.5 + Math.sin(time * 12 + i) * 0.8;
            this.renderer.drawCircle(px, py, sparkleSize, [1.0, 0.3, 0.2, 0.7]);
        }
    }

    renderSpikePoints(spike, time, wobble, offset) {
        const numSpikes = 5;
        for (let i = 0; i < numSpikes; i++) {
            const spikeX = spike.x + wobble + (spike.width / numSpikes) * i + spike.width / (numSpikes * 2);
            const spikeHeight = 8 + Math.sin(time * 8 + offset + i) * 2;
            const spikeY = spike.y - spikeHeight;
            const spikeWidth = 4;
            
            this.renderer.drawRect(spikeX - spikeWidth/2, spikeY + spikeHeight * 0.7, spikeWidth, spikeHeight * 0.3, [1.0, 0.4, 0.3, 1.0]);
            this.renderer.drawRect(spikeX - spikeWidth * 0.3, spikeY + spikeHeight * 0.4, spikeWidth * 0.6, spikeHeight * 0.3, [1.0, 0.6, 0.4, 1.0]);
            this.renderer.drawRect(spikeX - 1, spikeY, 2, spikeHeight * 0.4, [1.0, 0.8, 0.6, 1.0]);
        }
    }

    renderEnemy(enemy, time) {
        const offset = enemy.animationOffset || 0;
        const bounce = Math.sin(time * 3 + offset) * 5;
        const squish = Math.abs(Math.sin(time * 3 + offset)) * 0.15 + 0.85;

        // Dynamic shadow
        const shadowWidth = enemy.width * (1.2 - Math.abs(bounce) * 0.02);
        this.renderer.drawRect(
            enemy.x + (enemy.width - shadowWidth) / 2,
            enemy.y + enemy.height + Math.abs(bounce) * 0.5,
            shadowWidth,
            4,
            [0.0, 0.0, 0.0, 0.35]
        );

        // Glow
        const glowPulse = Math.sin(time * 5 + offset) * 0.3 + 0.5;
        RenderingUtils.drawGlow(this.renderer, enemy.x + enemy.width/2, enemy.y + bounce + enemy.height * squish / 2,
                               enemy.width/2, [0.6, 0.3, 1.0, 1.0], 3, glowPulse * 0.2, 0.07);

        // Body
        const bodyTopColor = [0.5, 0.2, 0.8, 1.0];
        const bodyBottomColor = [0.3, 0.1, 0.6, 1.0];
        this.renderer.drawRect(enemy.x, enemy.y + bounce, enemy.width, enemy.height * squish * 0.5, bodyTopColor);
        this.renderer.drawRect(enemy.x, enemy.y + bounce + enemy.height * squish * 0.5, enemy.width, enemy.height * squish * 0.5, bodyBottomColor);

        // Border
        const borderGlow = Math.sin(time * 8 + offset) * 0.3 + 0.6;
        this.renderer.drawRect(enemy.x, enemy.y + bounce, enemy.width, 1, [0.8, 0.5, 1.0, borderGlow]);
        this.renderer.drawRect(enemy.x, enemy.y + bounce + enemy.height * squish - 1, enemy.width, 1, [0.8, 0.5, 1.0, borderGlow]);

        // Face
        this.renderEnemyEyes(enemy, time, offset, bounce, squish);
        this.renderEnemyMouth(enemy, bounce, squish);
        
        // Evil particles
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + time * 4 + offset;
            const radius = 18 + Math.sin(time * 6 + i) * 4;
            const px = enemy.x + enemy.width / 2 + Math.cos(angle) * radius;
            const py = enemy.y + bounce + enemy.height * squish / 2 + Math.sin(angle) * radius;
            const pSize = 1 + Math.sin(time * 15 + i) * 0.5;
            this.renderer.drawCircle(px, py, pSize, [0.7, 0.4, 1.0, 0.6]);
        }
    }

    renderEnemyEyes(enemy, time, offset, bounce, squish) {
        const eyeScale = 1.0 + Math.sin(time * 10 + offset) * 0.2;
        const eyeY = enemy.y + bounce + enemy.height * squish * 0.35;
        
        // Eyes
        this.renderer.drawCircle(enemy.x + enemy.width * 0.3, eyeY, 4 * eyeScale, [1.0, 1.0, 1.0, 1.0]);
        this.renderer.drawCircle(enemy.x + enemy.width * 0.7, eyeY, 4 * eyeScale, [1.0, 1.0, 1.0, 1.0]);
        
        // Pupils
        const pupilOffsetX = Math.sin(time * 2 + offset) * 1.5;
        const pupilOffsetY = Math.cos(time * 3 + offset) * 1;
        this.renderer.drawCircle(enemy.x + enemy.width * 0.3 + pupilOffsetX, eyeY + pupilOffsetY, 2, [1.0, 0.0, 0.0, 1.0]);
        this.renderer.drawCircle(enemy.x + enemy.width * 0.7 + pupilOffsetX, eyeY + pupilOffsetY, 2, [1.0, 0.0, 0.0, 1.0]);
        
        // Highlights
        this.renderer.drawCircle(enemy.x + enemy.width * 0.3 - 1, eyeY - 1, 1.5, [1.0, 1.0, 1.0, 0.9]);
        this.renderer.drawCircle(enemy.x + enemy.width * 0.7 - 1, eyeY - 1, 1.5, [1.0, 1.0, 1.0, 0.9]);
    }

    renderEnemyMouth(enemy, bounce, squish) {
        const mouthY = enemy.y + bounce + enemy.height * squish * 0.65;
        const mouthWidth = enemy.width * 0.5;
        const mouthX = enemy.x + (enemy.width - mouthWidth) / 2;
        this.renderer.drawRect(mouthX, mouthY, mouthWidth, 2, [0.2, 0.0, 0.0, 1.0]);
        
        // Teeth
        for (let i = 0; i < 4; i++) {
            const toothX = mouthX + (mouthWidth / 4) * i + mouthWidth / 8;
            this.renderer.drawRect(toothX - 1, mouthY - 3, 2, 3, [1.0, 1.0, 1.0, 0.9]);
        }
    }
}

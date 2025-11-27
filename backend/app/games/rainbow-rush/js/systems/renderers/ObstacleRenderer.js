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
        // Gli ostacoli possono avere type: 'obstacle', 'spike', o entityType: 'spike'
        if (obstacle.type === 'obstacle' || obstacle.type === 'spike' || obstacle.entityType === 'spike' || obstacle.obstacleType === 'spike') {
            this.renderSpike(obstacle, time);
        } else if (obstacle.type === 'enemy' || obstacle.entityType === 'enemy') {
            this.renderEnemy(obstacle, time);
        }
    }

    renderSpike(spike, time) {
        const offset = spike.animationOffset || 0;
        const pulse = Math.sin(time * 3 + offset) * 0.2 + 0.8;
        const glow = Math.sin(time * 5 + offset) * 0.5 + 0.5;
        
        // Calculate center position
        const centerX = spike.x + spike.width / 2;
        const centerY = spike.y + spike.height / 2;
        
        // Render label
        this.renderObstacleLabel(centerX, spike.y - 8, 'SPIKE');

        // Shadow sotto lo spike
        RenderingUtils.drawShadow(this.renderer, spike.x, spike.y, spike.width, spike.height);

        // Glow di pericolo rosso-arancione (lava style)
        const glowRadius = spike.width * 0.7;
        this.renderer.drawCircle(
            centerX,
            centerY,
            glowRadius * (1 + glow * 0.3),
            [1.0, 0.3, 0.0, 0.3 * glow]
        );

        // Corpo centrale - sfera rossa metallica
        const radius = Math.min(spike.width, spike.height) / 2;

        // Cerchio esterno scuro (bordo)
        this.renderer.drawCircle(centerX, centerY, radius * pulse, [0.5, 0.1, 0.1, 1.0]);

        // Cerchio principale rosso
        this.renderer.drawCircle(centerX, centerY, radius * 0.9 * pulse, [1.0, 0.2, 0.1, 1.0]);

        // Cerchio interno rosso brillante
        this.renderer.drawCircle(centerX, centerY, radius * 0.7 * pulse, [1.0, 0.4, 0.2, 1.0]);

        // Riflesso metallico (highlight)
        const highlightX = centerX - radius * 0.3;
        const highlightY = centerY - radius * 0.3;
        this.renderer.drawCircle(highlightX, highlightY, radius * 0.4, [1.0, 0.9, 0.7, 0.6]);
        this.renderer.drawCircle(highlightX, highlightY, radius * 0.25, [1.0, 1.0, 1.0, 0.8]);

        // Spuntoni metallici intorno (8 spine)
        const numSpikes = 8;
        for (let i = 0; i < numSpikes; i++) {
            const angle = (i / numSpikes) * Math.PI * 2 + time * 0.5;
            const spikeLength = radius * (1.4 + Math.sin(time * 4 + i) * 0.1);
            const spikeWidth = 3;

            // Punta dello spuntone
            const tipX = centerX + Math.cos(angle) * spikeLength;
            const tipY = centerY + Math.sin(angle) * spikeLength;

            // Base dello spuntone
            const baseX = centerX + Math.cos(angle) * radius * 0.8;
            const baseY = centerY + Math.sin(angle) * radius * 0.8;

            // Disegna spuntone come triangolo (usando cerchi sovrapposti)
            for (let j = 0; j < 5; j++) {
                const t = j / 5;
                const sx = baseX + (tipX - baseX) * t;
                const sy = baseY + (tipY - baseY) * t;
                const sw = spikeWidth * (1 - t * 0.7);

                // Gradiente dal rosso scuro alla punta metallica
                const r = 0.8 + t * 0.2;
                const g = 0.3 * (1 - t);
                const b = 0.1;

                this.renderer.drawCircle(sx, sy, sw, [r, g, b, 1.0]);
            }

            // Punta brillante
            this.renderer.drawCircle(tipX, tipY, 1.5, [1.0, 0.9, 0.7, 0.9]);
        }

        // Particelle di calore/energia che si irradiano
        if (Math.random() < 0.3) {
            for (let i = 0; i < 3; i++) {
                const particleAngle = Math.random() * Math.PI * 2;
                const particleDistance = radius * (1.5 + Math.random() * 0.5);
                const px = centerX + Math.cos(particleAngle) * particleDistance;
                const py = centerY + Math.sin(particleAngle) * particleDistance;
                const pSize = 1 + Math.random() * 1.5;

                this.renderer.drawCircle(px, py, pSize, [1.0, 0.5, 0.0, 0.6 + Math.random() * 0.4]);
            }
        }
    }

    // renderSpikePoints ora non serve più - spine integrate in renderSpike()

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
        RenderingUtils.drawGlow(this.renderer, enemy.x + enemy.width / 2, enemy.y + bounce + enemy.height * squish / 2,
            enemy.width / 2, [0.6, 0.3, 1.0, 1.0], 3, glowPulse * 0.2, 0.07);

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
    
    renderObstacleLabel(x, y, text) {
        if (!this.renderer.textCtx) return;
        
        const ctx = this.renderer.textCtx;
        ctx.save();
        ctx.font = 'bold 9px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        
        // Background
        const metrics = ctx.measureText(text);
        const padding = 3;
        const bgWidth = metrics.width + padding * 2;
        const bgHeight = 12;
        
        ctx.fillStyle = 'rgba(80, 0, 0, 0.8)';
        ctx.fillRect(x - bgWidth / 2, y - bgHeight, bgWidth, bgHeight);
        
        // Border
        ctx.strokeStyle = 'rgba(255, 50, 50, 0.9)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - bgWidth / 2, y - bgHeight, bgWidth, bgHeight);
        
        // Text
        ctx.fillStyle = '#ff3333';
        ctx.fillText(text, x, y);
        
        ctx.restore();
    }
}

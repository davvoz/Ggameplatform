/**
 * FaceRenderer - Gestisce il rendering del viso del player
 * Responsabilità: Eyes, Mouth, Expressions
 */
export class FaceRenderer {
    constructor(renderer) {
        this.renderer = renderer;
    }

    renderEyes(player, x, y, radiusY, scale = 1.0) {
        const emotion = player.emotion || 'happy';
        const emotionIntensity = player.emotionIntensity || 0;
        const winkProgress = player.winkProgress || 0;

        const expression = player.getExpression ? player.getExpression() : emotion;
        const isBlinking = player.isEyeBlinking ? player.isEyeBlinking() : false;

        const eyeY = y - radiusY * 0.2;
        const eyeConfig = this.getEyeConfig(expression, emotionIntensity);

        if (!isBlinking) {
            this.renderOpenEyes(x, eyeY, eyeConfig, emotionIntensity, winkProgress, scale);
        } else {
            this.renderClosedEyes(x, eyeY, scale);
        }
    }

    getEyeConfig(expression, intensity = 0) {
        const configs = {
            'worried': { eyeSize: 7, pupilSize: 4, pupilOffsetX: 0, pupilOffsetY: 2 },
            'excited': { eyeSize: 8, pupilSize: 4, pupilOffsetX: 0, pupilOffsetY: 0 },
            'surprised': { eyeSize: 9, pupilSize: 5, pupilOffsetX: 0, pupilOffsetY: 0 },
            'determined': { eyeSize: 5, pupilSize: 3, pupilOffsetX: 0, pupilOffsetY: -1 },
            'running': { eyeSize: 4, pupilSize: 2, pupilOffsetX: 0, pupilOffsetY: 0 },
            'lookingUp': { eyeSize: 7, pupilSize: 3, pupilOffsetX: 0, pupilOffsetY: -3 },
            'happy': {
                eyeSize: 6 + intensity * 2,
                pupilSize: 3 + intensity,
                pupilOffsetX: 0,
                pupilOffsetY: -intensity * 2
            }
        };
        return configs[expression] || configs['happy'];
    }

    renderOpenEyes(x, eyeY, config, intensity = 0, winkProgress = 0, scale = 1.0) {
        const eyeWhite = [1.0, 1.0, 1.0, 1.0];
        const eyeOutline = [0.0, 0.0, 0.0, 0.4];
        const pupilColor = [0.0, 0.0, 0.0, 1.0];

        const glintSize = (1.5 + intensity * 1.5) * scale;
        const glintColor = [1.0, 1.0, 1.0, 0.8 + intensity * 0.2];

        // Left eye
        this.renderer.drawCircle(x - 7 * scale, eyeY, (config.eyeSize + 1) * scale, eyeOutline);
        this.renderer.drawCircle(x - 7 * scale, eyeY, config.eyeSize * scale, eyeWhite);
        this.renderer.drawCircle(x - 7 * scale + config.pupilOffsetX * scale, eyeY + config.pupilOffsetY * scale, config.pupilSize * scale, pupilColor);
        this.renderer.drawCircle(x - 8 * scale, eyeY - 1 * scale, glintSize, glintColor);

        if (intensity > 0.5) {
            this.renderer.drawCircle(x - 6 * scale, eyeY + 1 * scale, glintSize * 0.6, glintColor);
        }

        // Right eye (with wink)
        if (winkProgress > 0) {
            this.renderWinkingEye(x, eyeY, config, winkProgress, scale);
        } else {
            this.renderer.drawCircle(x + 7 * scale, eyeY, (config.eyeSize + 1) * scale, eyeOutline);
            this.renderer.drawCircle(x + 7 * scale, eyeY, config.eyeSize * scale, eyeWhite);
            this.renderer.drawCircle(x + 7 * scale + config.pupilOffsetX * scale, eyeY + config.pupilOffsetY * scale, config.pupilSize * scale, pupilColor);
            this.renderer.drawCircle(x + 6 * scale, eyeY - 1 * scale, glintSize, glintColor);

            if (intensity > 0.5) {
                this.renderer.drawCircle(x + 8 * scale, eyeY + 1 * scale, glintSize * 0.6, glintColor);
            }
        }
    }

    renderWinkingEye(x, eyeY, config, winkProgress, scale) {
        const winkEyeSize = config.eyeSize * (1 - winkProgress) * scale;

        if (winkProgress < 0.95) {
            const eyeOutline = [0.0, 0.0, 0.0, 0.4];
            const eyeWhite = [1.0, 1.0, 1.0, 1.0];
            const pupilColor = [0.0, 0.0, 0.0, 1.0];

            this.renderer.drawCircle(x + 7 * scale, eyeY, winkEyeSize + 1 * scale, eyeOutline);
            this.renderer.drawCircle(x + 7 * scale, eyeY, winkEyeSize, eyeWhite);
            
            if (winkProgress < 0.5) {
                this.renderer.drawCircle(x + 7 * scale + config.pupilOffsetX * scale, eyeY + config.pupilOffsetY * scale, config.pupilSize * (1 - winkProgress * 2) * scale, pupilColor);
            }
        } else {
            const blinkColor = [0.0, 0.0, 0.0, 0.8];
            this.renderer.drawRect(x + 4 * scale, eyeY, 6 * scale, 2 * scale, blinkColor);
            this.renderer.drawCircle(x + 7 * scale, eyeY, 3 * scale, blinkColor);
        }
    }

    renderClosedEyes(x, eyeY, scale = 1.0) {
        const blinkColor = [0.0, 0.0, 0.0, 0.8];
        this.renderer.drawRect(x - 10 * scale, eyeY, 6 * scale, 2 * scale, blinkColor);
        this.renderer.drawCircle(x - 7 * scale, eyeY, 3 * scale, blinkColor);
        this.renderer.drawRect(x + 4 * scale, eyeY, 6 * scale, 2 * scale, blinkColor);
        this.renderer.drawCircle(x + 7 * scale, eyeY, 3 * scale, blinkColor);
    }

    renderMouth(player, x, y, radiusY, scale = 1.0) {
        const emotion = player.emotion || 'happy';
        const emotionIntensity = player.emotionIntensity || 0;

        const expression = player.getExpression ? player.getExpression() : emotion;
        const mouthY = y + radiusY * 0.4;
        const mouthColor = [0.0, 0.0, 0.0, 0.7];

        switch (expression) {
            case 'worried':
                this.renderWorriedMouth(x, mouthY, mouthColor, scale);
                break;
            case 'excited':
                this.renderExcitedMouth(x, mouthY, mouthColor, scale);
                break;
            case 'surprised':
                this.renderSurprisedMouth(x, mouthY, mouthColor, scale);
                break;
            case 'determined':
                this.renderDeterminedMouth(x, mouthY, mouthColor, scale);
                break;
            case 'running':
                this.renderRunningMouth(x, mouthY, mouthColor, scale);
                break;
            case 'lookingUp':
                this.renderLookingUpMouth(x, mouthY, mouthColor, scale);
                break;
            default:
                this.renderHappyMouth(x, mouthY, mouthColor, emotionIntensity, scale);
        }
    }

    renderHappyMouth(x, y, color, intensity = 0, scale = 1.0) {
        const points = 7 + Math.floor(intensity * 3);
        const smileRadius = (8 + intensity * 4) * scale;
        const curvature = 0.6 + intensity * 0.3;
        const pointSize = (1.5 + intensity * 0.5) * scale;

        for (let i = 0; i < points; i++) {
            const t = i / (points - 1);
            const angle = Math.PI * 0.2 + (t * Math.PI * 0.6);
            const sx = x + Math.cos(angle) * smileRadius;
            const sy = y + Math.sin(angle) * smileRadius * curvature;
            this.renderer.drawCircle(sx, sy, pointSize, color);
        }
    }

    renderWorriedMouth(x, y, color, scale = 1.0) {
        for (let i = 0; i < 7; i++) {
            const t = i / 6;
            const angle = Math.PI * 0.7 + (t * Math.PI * 0.6);
            const smileRadius = 8 * scale;
            const sx = x + Math.cos(angle) * smileRadius;
            const sy = y + 3 * scale + Math.sin(angle) * smileRadius * 0.6;
            this.renderer.drawCircle(sx, sy, 1.5 * scale, color);
        }
    }

    renderExcitedMouth(x, y, color, scale = 1.0) {
        for (let i = 0; i < 9; i++) {
            const t = i / 8;
            const angle = Math.PI * 0.15 + (t * Math.PI * 0.7);
            const smileRadius = 10 * scale;
            const sx = x + Math.cos(angle) * smileRadius;
            const sy = y + Math.sin(angle) * smileRadius * 0.7;
            this.renderer.drawCircle(sx, sy, 2 * scale, color);
        }
    }

    renderSurprisedMouth(x, y, color, scale = 1.0) {
        this.renderer.drawCircle(x, y + 2 * scale, 5 * scale, color);
        this.renderer.drawCircle(x, y + 2 * scale, 4 * scale, [0.4, 0.2, 0.2, 1.0]);
    }

    renderDeterminedMouth(x, y, color, scale = 1.0) {
        this.renderer.drawRect(x - 6 * scale, y, 12 * scale, 2 * scale, color);
    }

    renderRunningMouth(x, y, color, scale = 1.0) {
        this.renderer.drawCircle(x, y + 2 * scale, 4 * scale, color);
        this.renderer.drawCircle(x, y + 4 * scale, 3.5 * scale, color);
        this.renderer.drawCircle(x, y + 2 * scale, 3 * scale, [0.3, 0.1, 0.1, 1.0]);
    }

    renderLookingUpMouth(x, y, color, scale = 1.0) {
        this.renderer.drawCircle(x, y + 2 * scale, 5 * scale, color);
        this.renderer.drawCircle(x, y + 2 * scale, 4 * scale, [0.3, 0.1, 0.1, 1.0]);
    }
}

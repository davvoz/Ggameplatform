import { CONFIG, UI_CONFIG } from '../config.js';
import { Utils } from '../utils.js';

export class TutorialRenderer {
    constructor(graphics, canvas) {
        this.graphics = graphics;
        this.canvas = canvas;

        this.tutorialSkipButton = null;
    }

    isTutorialSkipButtonClicked(x, y) {
        if (!this.tutorialSkipButton) return false;
        const btn = this.tutorialSkipButton;
        return x >= btn.x && x <= btn.x + btn.width &&
            y >= btn.y && y <= btn.y + btn.height;
    }

    render(game, shopButtons) {
        if (!game.tutorial || !game.tutorial.isActive()) return;

        const ctx = this.graphics.ctx;
        const canvas = this.canvas;
        const width = canvas.width / (window.devicePixelRatio || 1);
        const height = canvas.height / (window.devicePixelRatio || 1);
        const currentStep = game.tutorial.getCurrentStep();

        if (!currentStep) return;

        // Dark overlay — exclude shop buttons area if highlighted
        if (currentStep.highlightShopButtons && shopButtons && shopButtons.length > 0) {
            const firstButton = shopButtons[0];
            const lastButton = shopButtons[shopButtons.length - 1];
            const shopAreaX = firstButton.x - 10;
            const shopAreaY = firstButton.y - 10;
            const shopAreaWidth = (lastButton.x + lastButton.width) - firstButton.x + 20;
            const shopAreaHeight = firstButton.height + 20;

            ctx.fillStyle = `rgba(0, 0, 0, ${0.6 * game.tutorial.dialogAlpha})`;
            ctx.fillRect(0, 0, width, shopAreaY);
            ctx.fillRect(0, shopAreaY, shopAreaX, shopAreaHeight);
            ctx.fillRect(shopAreaX + shopAreaWidth, shopAreaY, width - (shopAreaX + shopAreaWidth), shopAreaHeight);

            const bottomStartY = shopAreaY + shopAreaHeight;
            if (bottomStartY < height) {
                ctx.fillRect(0, bottomStartY, width, height - bottomStartY);
            }
        } else {
            ctx.fillStyle = `rgba(0, 0, 0, ${0.6 * game.tutorial.dialogAlpha})`;
            ctx.fillRect(0, 0, width, height);
        }

        // Highlight area
        if (currentStep.highlightArea) {
            const area = currentStep.highlightArea;
            ctx.save();
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = `rgba(0, 0, 0, ${0.7 * game.tutorial.highlightAlpha})`;
            Utils.drawRoundRect(ctx, area.x, area.y, area.width, area.height, 10);
            ctx.fill();
            ctx.restore();

            ctx.strokeStyle = `rgba(255, 215, 0, ${game.tutorial.highlightAlpha})`;
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 5]);
            Utils.drawRoundRect(ctx, area.x - 2, area.y - 2, area.width + 4, area.height + 4, 10);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Highlight circle
        if (currentStep.highlightCircle) {
            const circle = currentStep.highlightCircle;
            const cellSize = this.graphics.cellSize;
            const gridX = circle.col * cellSize + (UI_CONFIG.SIDEBAR_WIDTH || 64);
            const gridY = circle.row * cellSize + UI_CONFIG.TOP_BAR_HEIGHT;
            const radius = (circle.radius || 1) * cellSize;

            ctx.save();
            ctx.globalCompositeOperation = 'destination-out';
            ctx.beginPath();
            ctx.arc(gridX + cellSize / 2, gridY + cellSize / 2, radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 0, 0, ${0.7 * game.tutorial.highlightAlpha})`;
            ctx.fill();
            ctx.restore();

            ctx.strokeStyle = `rgba(255, 215, 0, ${game.tutorial.highlightAlpha})`;
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 5]);
            ctx.beginPath();
            ctx.arc(gridX + cellSize / 2, gridY + cellSize / 2, radius + 2, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Highlight shop buttons
        if (currentStep.highlightShopButtons && shopButtons && game.state) {
            const pulseScale = 1 + Math.sin(Date.now() * 0.008) * 0.15;
            const glowIntensity = 0.7 + Math.sin(Date.now() * 0.006) * 0.3;
            const playerCoins = game.state.coins;

            shopButtons.forEach((button) => {
                const cannonType = button.id;
                const cannonDef = button.cannon;
                if (!cannonDef) return;

                const baseCost = cannonDef.cost;
                let actualCost = baseCost;
                if (game.state.cannonPriceMultiplier && game.state.cannonPriceMultiplier[cannonType]) {
                    actualCost = Math.floor(baseCost * game.state.cannonPriceMultiplier[cannonType]);
                }

                const canAfford = playerCoins >= actualCost;

                if (!canAfford) {
                    ctx.save();
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                    Utils.drawRoundRect(ctx, button.x, button.y, button.width, button.height, 8);
                    ctx.fill();
                    ctx.restore();
                    return;
                }

                const centerX = button.x + button.width / 2;
                const centerY = button.y + button.height / 2;

                ctx.save();
                ctx.translate(centerX, centerY);
                ctx.scale(pulseScale, pulseScale);
                ctx.translate(-centerX, -centerY);

                for (let i = 0; i < 3; i++) {
                    ctx.shadowColor = `rgba(255, 215, 0, ${glowIntensity * 0.4})`;
                    ctx.shadowBlur = 20 + i * 10;
                    ctx.strokeStyle = `rgba(255, 215, 0, ${glowIntensity * 0.6})`;
                    ctx.lineWidth = 4;
                    Utils.drawRoundRect(ctx, button.x - 3, button.y - 3, button.width + 6, button.height + 6, 8);
                    ctx.stroke();
                }

                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.strokeStyle = `rgba(255, 215, 0, ${game.tutorial.highlightAlpha})`;
                ctx.lineWidth = 3;
                ctx.setLineDash([8, 4]);
                ctx.lineDashOffset = -Date.now() * 0.05;
                Utils.drawRoundRect(ctx, button.x - 2, button.y - 2, button.width + 4, button.height + 4, 8);
                ctx.stroke();
                ctx.setLineDash([]);

                const sparklePhase = (Date.now() * 0.01) % (Math.PI * 2);
                const sparkleAlpha = Math.abs(Math.sin(sparklePhase));
                ctx.fillStyle = `rgba(255, 255, 255, ${sparkleAlpha * 0.9})`;

                const sparkleSize = 6;
                const corners = [
                    { x: button.x, y: button.y },
                    { x: button.x + button.width, y: button.y },
                    { x: button.x, y: button.y + button.height },
                    { x: button.x + button.width, y: button.y + button.height }
                ];

                corners.forEach((corner, index) => {
                    const phase = sparklePhase + (index * Math.PI / 2);
                    if (Math.sin(phase) > 0.5) {
                        ctx.beginPath();
                        ctx.arc(corner.x, corner.y, sparkleSize, 0, Math.PI * 2);
                        ctx.fill();

                        ctx.strokeStyle = `rgba(255, 255, 255, ${sparkleAlpha * 0.7})`;
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.moveTo(corner.x - sparkleSize * 1.5, corner.y);
                        ctx.lineTo(corner.x + sparkleSize * 1.5, corner.y);
                        ctx.moveTo(corner.x, corner.y - sparkleSize * 1.5);
                        ctx.lineTo(corner.x, corner.y + sparkleSize * 1.5);
                        ctx.stroke();
                    }
                });

                ctx.restore();
            });
        }

        // Arrow
        if (currentStep.arrow) {
            const arrow = currentStep.arrow;
            const arrowSize = 30;
            let arrowX = arrow.x;
            let arrowY = arrow.y;

            if (arrow.direction === 'down') arrowY += game.tutorial.arrowBounce;
            else if (arrow.direction === 'up') arrowY -= game.tutorial.arrowBounce;
            else if (arrow.direction === 'right') arrowX += game.tutorial.arrowBounce;
            else if (arrow.direction === 'left') arrowX -= game.tutorial.arrowBounce;

            ctx.save();
            ctx.translate(arrowX, arrowY);

            if (arrow.direction === 'down') ctx.rotate(Math.PI);
            else if (arrow.direction === 'left') ctx.rotate(-Math.PI / 2);
            else if (arrow.direction === 'right') ctx.rotate(Math.PI / 2);

            ctx.fillStyle = `rgba(255, 215, 0, ${game.tutorial.highlightAlpha})`;
            ctx.beginPath();
            ctx.moveTo(0, -arrowSize);
            ctx.lineTo(-arrowSize / 2, 0);
            ctx.lineTo(arrowSize / 2, 0);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = `rgba(0, 0, 0, ${0.5 * game.tutorial.highlightAlpha})`;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        }

        // Tutorial dialog
        if (game.tutorial.showDialog) {
            const dialogWidth = Math.min(450, width - 40);
            const dialogPadding = 20;
            const maxContentWidth = dialogWidth - (dialogPadding * 2);

            const titleHeight = 50;
            const progressHeight = 30;
            const continueHintHeight = currentStep.waitForAction === 'tap' ? 35 : 10;
            const skipButtonHeight = 40;

            // Word wrap for description
            ctx.font = '16px Arial';
            const words = currentStep.description.split(' ');
            const wrappedLines = [];
            let currentLine = '';

            for (const word of words) {
                if (word.includes('\n')) {
                    const parts = word.split('\n');
                    for (let i = 0; i < parts.length; i++) {
                        const testLine = currentLine + (currentLine ? ' ' : '') + parts[i];
                        if (i < parts.length - 1) {
                            wrappedLines.push(testLine);
                            currentLine = '';
                        } else {
                            currentLine = parts[i];
                        }
                    }
                } else {
                    const testLine = currentLine + (currentLine ? ' ' : '') + word;
                    const metrics = ctx.measureText(testLine);
                    if (metrics.width > maxContentWidth && currentLine) {
                        wrappedLines.push(currentLine);
                        currentLine = word;
                    } else {
                        currentLine = testLine;
                    }
                }
            }
            if (currentLine) wrappedLines.push(currentLine);

            const lineHeight = 22;
            const descriptionHeight = wrappedLines.length * lineHeight + 20;
            const dialogHeight = titleHeight + descriptionHeight + progressHeight + continueHintHeight + skipButtonHeight;
            const dialogX = (width - dialogWidth) / 2;

            const shopButtonsY = height - UI_CONFIG.SHOP_HEIGHT + 10;
            const gameGridBottom = UI_CONFIG.TOP_BAR_HEIGHT + (CONFIG.ROWS * this.graphics.cellSize);
            const availableSpace = shopButtonsY - gameGridBottom;
            const dialogY = gameGridBottom + (availableSpace - dialogHeight) / 2;

            // Dialog background
            ctx.fillStyle = `rgba(26, 26, 46, ${0.95 * game.tutorial.dialogAlpha})`;
            Utils.drawRoundRect(ctx, dialogX, dialogY, dialogWidth, dialogHeight, 15);
            ctx.fill();

            ctx.strokeStyle = `rgba(233, 69, 96, ${game.tutorial.dialogAlpha})`;
            ctx.lineWidth = 3;
            Utils.drawRoundRect(ctx, dialogX, dialogY, dialogWidth, dialogHeight, 15);
            ctx.stroke();

            // Title
            this.graphics.drawText(currentStep.title, dialogX + dialogWidth / 2, dialogY + 30, {
                size: 22, color: '#e94560', align: 'center', baseline: 'middle',
                bold: true, shadow: true, alpha: game.tutorial.dialogAlpha
            });

            // Description lines
            const descStartY = dialogY + titleHeight + 10;
            wrappedLines.forEach((line, index) => {
                this.graphics.drawText(line, dialogX + dialogWidth / 2, descStartY + index * lineHeight, {
                    size: 15, color: '#ffffff', align: 'center', baseline: 'middle',
                    shadow: true, alpha: game.tutorial.dialogAlpha
                });
            });

            // Progress indicator
            const currentIndex = game.tutorial.currentStepIndex + 1;
            const totalSteps = game.tutorial.steps.length;
            this.graphics.drawText(`${currentIndex} / ${totalSteps}`, dialogX + dialogWidth - 15, dialogY + 15, {
                size: 13, color: '#a0a0a0', align: 'right', baseline: 'top',
                alpha: game.tutorial.dialogAlpha
            });

            // Continue hint
            if (currentStep.waitForAction === 'tap') {
                const hintY = dialogY + dialogHeight - skipButtonHeight - 20;
                const blinkAlpha = 0.5 + Math.sin(Date.now() * 0.005) * 0.5;
                this.graphics.drawText('[ Tap to continue ]', dialogX + dialogWidth / 2, hintY, {
                    size: 13, color: '#ffd700', align: 'center', baseline: 'middle',
                    alpha: blinkAlpha * game.tutorial.dialogAlpha
                });
            }

            // Skip button
            if (game.tutorial.currentStepIndex < game.tutorial.steps.length - 1) {
                const skipBtnWidth = 80;
                const skipBtnHeight = 30;
                const skipButtonX = dialogX + 15;
                const skipButtonY = dialogY + dialogHeight - skipBtnHeight - 15;

                ctx.fillStyle = `rgba(100, 100, 100, ${0.7 * game.tutorial.dialogAlpha})`;
                Utils.drawRoundRect(ctx, skipButtonX, skipButtonY, skipBtnWidth, skipBtnHeight, 5);
                ctx.fill();

                this.graphics.drawText('Salta', skipButtonX + skipBtnWidth / 2, skipButtonY + skipBtnHeight / 2, {
                    size: 13, color: '#ffffff', align: 'center', baseline: 'middle',
                    alpha: game.tutorial.dialogAlpha
                });

                this.tutorialSkipButton = {
                    x: skipButtonX, y: skipButtonY,
                    width: skipBtnWidth, height: skipBtnHeight
                };
            }
        }
    }
}

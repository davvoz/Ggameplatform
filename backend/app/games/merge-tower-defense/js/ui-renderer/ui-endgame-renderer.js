import { CONFIG } from '../config.js';
import { Utils } from '../utils.js';

export class EndgameRenderer {
    constructor(graphics, canvas) {
        this.graphics = graphics;
        this.canvas = canvas;

        this.retryButton = null;
        this.continueButton = null;
        this.exitFullscreenButton = null;
        this.victoryPlayAgainButton = null;
    }

    clearButtons() {
        this.retryButton = null;
        this.continueButton = null;
        this.exitFullscreenButton = null;
        this.victoryPlayAgainButton = null;
    }

    isContinueButtonClicked(screenX, screenY) {
        if (!this.continueButton) return false;
        return screenX >= this.continueButton.x &&
            screenX <= this.continueButton.x + this.continueButton.width &&
            screenY >= this.continueButton.y &&
            screenY <= this.continueButton.y + this.continueButton.height;
    }

    isRetryButtonClicked(screenX, screenY) {
        if (!this.retryButton) return false;
        return screenX >= this.retryButton.x &&
            screenX <= this.retryButton.x + this.retryButton.width &&
            screenY >= this.retryButton.y &&
            screenY <= this.retryButton.y + this.retryButton.height;
    }

    isExitFullscreenButtonClicked(screenX, screenY) {
        if (!this.exitFullscreenButton) return false;
        return screenX >= this.exitFullscreenButton.x &&
            screenX <= this.exitFullscreenButton.x + this.exitFullscreenButton.width &&
            screenY >= this.exitFullscreenButton.y &&
            screenY <= this.exitFullscreenButton.y + this.exitFullscreenButton.height;
    }

    isVictoryPlayAgainClicked(screenX, screenY) {
        if (!this.victoryPlayAgainButton) return false;
        return screenX >= this.victoryPlayAgainButton.x &&
            screenX <= this.victoryPlayAgainButton.x + this.victoryPlayAgainButton.width &&
            screenY >= this.victoryPlayAgainButton.y &&
            screenY <= this.victoryPlayAgainButton.y + this.victoryPlayAgainButton.height;
    }

    showGameOver(gameState, platformBalance = 0, continueCost = 100) {
        const ctx = this.graphics.ctx;
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);

        platformBalance = Number(platformBalance) || 0;
        continueCost = Number(continueCost) || 100;

        // Overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(0, 0, width, height);

        // Popup box
        const popupWidth = Math.min(420, width * 0.85);
        const popupHeight = Math.min(540, height * 0.75);
        const popupX = (width - popupWidth) / 2;
        const popupY = (height - popupHeight) / 2;

        ctx.fillStyle = 'rgba(15, 15, 20, 0.98)';
        ctx.fillRect(popupX, popupY, popupWidth, popupHeight);

        ctx.strokeStyle = CONFIG.COLORS.TEXT_DANGER;
        ctx.lineWidth = 4;
        ctx.strokeRect(popupX, popupY, popupWidth, popupHeight);

        ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(popupX + 6, popupY + 6, popupWidth - 12, popupHeight - 12);

        this.graphics.drawText('💀 GAME OVER 💀', width / 2, popupY + 55, {
            size: 40,
            color: CONFIG.COLORS.TEXT_DANGER,
            align: 'center',
            bold: true,
            shadow: true
        });

        // Stats
        const statsY = popupY + 110;
        ctx.fillStyle = 'rgba(0, 255, 136, 0.1)';
        ctx.fillRect(popupX + 20, statsY, popupWidth - 40, 160);
        ctx.strokeStyle = CONFIG.COLORS.TEXT_PRIMARY;
        ctx.lineWidth = 1;
        ctx.strokeRect(popupX + 20, statsY, popupWidth - 40, 160);

        const stats = [
            `Wave Reached: ${gameState.wave}`,
            `Score: ${Utils.formatNumber(gameState.score)}`,
            `Kills: ${gameState.kills}`,
            `Time: ${Utils.formatTime(gameState.playTime)}`
        ];

        let y = statsY + 28;
        stats.forEach(stat => {
            this.graphics.drawText(stat, width / 2, y, {
                size: 20,
                color: CONFIG.COLORS.TEXT_PRIMARY,
                align: 'center',
                shadow: true
            });
            y += 35;
        });

        const buttonWidth = 200;
        const buttonHeight = 55;
        const isFullscreen = globalThis._gameFullscreenState === true ||
            ((globalThis.PlatformSDK && typeof globalThis.PlatformSDK.isFullscreen === 'function')
                ? globalThis.PlatformSDK.isFullscreen()
                : (document.body.classList.contains('game-fullscreen') || document.body.classList.contains('ios-game-fullscreen')));
        const spacing = 12;
        const canAffordContinue = platformBalance >= continueCost;

        // Can't afford info box
        if (!canAffordContinue) {
            const infoY = popupY + popupHeight - 200;
            const infoWidth = popupWidth - 40;
            const infoHeight = 50;
            const infoX = popupX + 20;

            ctx.fillStyle = 'rgba(255, 170, 0, 0.1)';
            ctx.fillRect(infoX, infoY, infoWidth, infoHeight);
            ctx.strokeStyle = CONFIG.COLORS.TEXT_WARNING;
            ctx.lineWidth = 2;
            ctx.strokeRect(infoX, infoY, infoWidth, infoHeight);

            this.graphics.drawText('💎 Need Platform Coins to Continue', width / 2, infoY + 18, {
                size: 14, color: CONFIG.COLORS.TEXT_WARNING, align: 'center', baseline: 'middle', bold: true, shadow: false
            });
            this.graphics.drawText(`You have ${platformBalance} • Need ${continueCost}`, width / 2, infoY + 35, {
                size: 12, color: '#aaaaaa', align: 'center', baseline: 'middle', shadow: false
            });
        }

        let buttonY;
        if (isFullscreen) {
            const totalHeight = buttonHeight * 3 + spacing * 2;
            buttonY = popupY + popupHeight - totalHeight - 25;

            const continueButtonX = (width - buttonWidth) / 2;
            if (canAffordContinue) {
                this.continueButton = { x: continueButtonX, y: buttonY, width: buttonWidth, height: buttonHeight };

                ctx.fillStyle = 'rgba(0, 200, 100, 0.95)';
                Utils.drawRoundRect(ctx, continueButtonX, buttonY, buttonWidth, buttonHeight, 8);
                ctx.fill();
                ctx.strokeStyle = CONFIG.COLORS.TEXT_PRIMARY;
                ctx.lineWidth = 3;
                Utils.drawRoundRect(ctx, continueButtonX, buttonY, buttonWidth, buttonHeight, 8);
                ctx.stroke();

                this.graphics.drawText('💎 CONTINUE', width / 2, buttonY + buttonHeight / 2 - 8, {
                    size: 22, color: '#000000', align: 'center', baseline: 'middle', bold: true, shadow: false
                });
                this.graphics.drawText(`${continueCost} Platform Coins`, width / 2, buttonY + buttonHeight / 2 + 12, {
                    size: 13, color: 'rgba(0, 0, 0, 0.7)', align: 'center', baseline: 'middle', bold: false, shadow: false
                });

                buttonY += buttonHeight + spacing;
            } else {
                this.continueButton = null;
            }

            const retryButtonX = (width - buttonWidth) / 2;
            this.retryButton = { x: retryButtonX, y: buttonY, width: buttonWidth, height: buttonHeight };

            ctx.fillStyle = 'rgba(200, 40, 40, 0.9)';
            Utils.drawRoundRect(ctx, retryButtonX, buttonY, buttonWidth, buttonHeight, 8);
            ctx.fill();
            ctx.strokeStyle = CONFIG.COLORS.TEXT_DANGER;
            ctx.lineWidth = 2;
            Utils.drawRoundRect(ctx, retryButtonX, buttonY, buttonWidth, buttonHeight, 8);
            ctx.stroke();

            this.graphics.drawText('🔄 RETRY', width / 2, buttonY + buttonHeight / 2, {
                size: 24, color: CONFIG.COLORS.TEXT_PRIMARY, align: 'center', baseline: 'middle', bold: true, shadow: false
            });

            const exitButtonY = buttonY + buttonHeight + spacing;
            this.exitFullscreenButton = { x: retryButtonX, y: exitButtonY, width: buttonWidth, height: buttonHeight };

            ctx.fillStyle = 'rgba(50, 60, 70, 0.9)';
            Utils.drawRoundRect(ctx, retryButtonX, exitButtonY, buttonWidth, buttonHeight, 8);
            ctx.fill();
            ctx.strokeStyle = 'rgba(100, 120, 140, 0.8)';
            ctx.lineWidth = 2;
            Utils.drawRoundRect(ctx, retryButtonX, exitButtonY, buttonWidth, buttonHeight, 8);
            ctx.stroke();

            this.graphics.drawText('EXIT FULLSCREEN', width / 2, exitButtonY + buttonHeight / 2, {
                size: 18, color: CONFIG.COLORS.TEXT_PRIMARY, align: 'center', baseline: 'middle', bold: true, shadow: false
            });
        } else {
            const totalHeight = canAffordContinue ? buttonHeight * 2 + spacing : buttonHeight;
            buttonY = popupY + popupHeight - totalHeight - 25;

            if (canAffordContinue) {
                const continueButtonX = (width - buttonWidth) / 2;
                this.continueButton = { x: continueButtonX, y: buttonY, width: buttonWidth, height: buttonHeight };

                ctx.fillStyle = 'rgba(0, 200, 100, 0.95)';
                Utils.drawRoundRect(ctx, continueButtonX, buttonY, buttonWidth, buttonHeight, 8);
                ctx.fill();
                ctx.strokeStyle = CONFIG.COLORS.TEXT_PRIMARY;
                ctx.lineWidth = 3;
                Utils.drawRoundRect(ctx, continueButtonX, buttonY, buttonWidth, buttonHeight, 8);
                ctx.stroke();

                this.graphics.drawText('💎 CONTINUE', width / 2, buttonY + buttonHeight / 2 - 8, {
                    size: 22, color: '#000000', align: 'center', baseline: 'middle', bold: true, shadow: false
                });
                this.graphics.drawText(`${continueCost} Platform Coins`, width / 2, buttonY + buttonHeight / 2 + 12, {
                    size: 13, color: 'rgba(0, 0, 0, 0.7)', align: 'center', baseline: 'middle', bold: false, shadow: false
                });

                buttonY += buttonHeight + spacing;
            } else {
                this.continueButton = null;
            }

            const buttonX = (width - buttonWidth) / 2;
            this.retryButton = { x: buttonX, y: buttonY, width: buttonWidth, height: buttonHeight };
            this.exitFullscreenButton = null;

            ctx.fillStyle = 'rgba(200, 40, 40, 0.9)';
            Utils.drawRoundRect(ctx, buttonX, buttonY, buttonWidth, buttonHeight, 8);
            ctx.fill();
            ctx.strokeStyle = CONFIG.COLORS.TEXT_DANGER;
            ctx.lineWidth = 2;
            Utils.drawRoundRect(ctx, buttonX, buttonY, buttonWidth, buttonHeight, 8);
            ctx.stroke();

            this.graphics.drawText('🔄 RETRY', width / 2, buttonY + buttonHeight / 2, {
                size: 24, color: CONFIG.COLORS.TEXT_PRIMARY, align: 'center', baseline: 'middle', bold: true, shadow: false
            });
        }
    }

    showVictory(gameState, coinReward = 0, rewardAwarded = false) {
        const ctx = this.graphics.ctx;
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);

        ctx.fillStyle = 'rgba(20, 15, 0, 0.92)';
        ctx.fillRect(0, 0, width, height);

        const popupWidth = Math.min(400, width * 0.85);
        const popupHeight = Math.min(480, height * 0.7);
        const popupX = (width - popupWidth) / 2;
        const popupY = (height - popupHeight) / 2;

        ctx.fillStyle = 'rgba(15, 12, 5, 0.98)';
        ctx.fillRect(popupX, popupY, popupWidth, popupHeight);

        ctx.strokeStyle = '#ffdd00';
        ctx.lineWidth = 4;
        ctx.strokeRect(popupX, popupY, popupWidth, popupHeight);

        ctx.strokeStyle = 'rgba(255, 221, 0, 0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(popupX + 6, popupY + 6, popupWidth - 12, popupHeight - 12);

        this.graphics.drawText('🏆 VICTORY! 🏆', width / 2, popupY + 55, {
            size: 42, color: '#ffdd00', align: 'center', bold: true, shadow: true
        });

        this.graphics.drawText(`Completed ${gameState.targetWaves} Waves!`, width / 2, popupY + 95, {
            size: 20, color: CONFIG.COLORS.TEXT_PRIMARY, align: 'center', shadow: true
        });

        const statsY = popupY + 130;
        ctx.fillStyle = 'rgba(255, 221, 0, 0.1)';
        ctx.fillRect(popupX + 20, statsY, popupWidth - 40, 140);
        ctx.strokeStyle = '#ffdd00';
        ctx.lineWidth = 1;
        ctx.strokeRect(popupX + 20, statsY, popupWidth - 40, 140);

        const stats = [
            `Score: ${Utils.formatNumber(gameState.score)}`,
            `Kills: ${gameState.kills}`,
            `Time: ${Utils.formatTime(gameState.playTime)}`,
            `Highest Tower: Lv.${gameState.highestLevel}`
        ];

        let y = statsY + 28;
        stats.forEach(stat => {
            this.graphics.drawText(stat, width / 2, y, {
                size: 18, color: CONFIG.COLORS.TEXT_PRIMARY, align: 'center', shadow: true
            });
            y += 30;
        });

        const rewardY = statsY + 160;
        ctx.fillStyle = 'rgba(0, 255, 136, 0.15)';
        ctx.fillRect(popupX + 20, rewardY, popupWidth - 40, 60);
        ctx.strokeStyle = CONFIG.COLORS.TEXT_PRIMARY;
        ctx.lineWidth = 2;
        ctx.strokeRect(popupX + 20, rewardY, popupWidth - 40, 60);

        this.graphics.drawText('🎁 REWARD', width / 2, rewardY + 20, {
            size: 14, color: CONFIG.COLORS.TEXT_SECONDARY, align: 'center', bold: true
        });

        const rewardText = rewardAwarded ?
            `+${coinReward} Platform Coins Awarded!` :
            `+${coinReward} Platform Coins`;
        this.graphics.drawText(rewardText, width / 2, rewardY + 42, {
            size: 22, color: '#ffdd00', align: 'center', bold: true, shadow: true
        });

        const buttonWidth = 180;
        const buttonHeight = 50;
        const buttonX = (width - buttonWidth) / 2;
        const buttonY = popupY + popupHeight - 80;

        this.victoryPlayAgainButton = { x: buttonX, y: buttonY, width: buttonWidth, height: buttonHeight };

        ctx.fillStyle = 'rgba(0, 200, 100, 0.9)';
        Utils.drawRoundRect(ctx, buttonX, buttonY, buttonWidth, buttonHeight, 8);
        ctx.fill();
        ctx.strokeStyle = CONFIG.COLORS.TEXT_PRIMARY;
        ctx.lineWidth = 2;
        Utils.drawRoundRect(ctx, buttonX, buttonY, buttonWidth, buttonHeight, 8);
        ctx.stroke();

        this.graphics.drawText('🔄 Play Again', width / 2, buttonY + buttonHeight / 2, {
            size: 22, color: '#ffffff', align: 'center', baseline: 'middle', bold: true
        });
    }
}

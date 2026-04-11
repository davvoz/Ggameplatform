/**
 * TargetingRenderer
 * Handles all rendering and state for bomb/stun targeting overlay mode.
 * Owns: bombTargetingMode, targetingCallback, targetingAbilityType,
 *       targetingCursorPos, targetingHasTouch, targetingAnimTime, bombCancelButton
 */

import { CONFIG, UI_CONFIG, SPECIAL_ABILITIES } from '../config.js';
import { Utils } from '../utils.js';

export class TargetingRenderer {
    constructor(graphics, canvas) {
        this.graphics = graphics;
        this.canvas = canvas;

        this.bombTargetingMode = false;
        this.targetingCallback = null;
        this.targetingAbilityType = null;  // 'BOMB', 'STUN', etc.
        this.targetingCursorPos = { x: 0, y: 0 };
        this.targetingHasTouch = false;
        this.targetingAnimTime = 0;
        this.bombCancelButton = null;
    }

    // -------------------------------------------------------------------------
    // State management
    // -------------------------------------------------------------------------

    enter(callback, abilityType = 'BOMB') {
        this.bombTargetingMode = true;
        this.targetingCallback = callback;
        this.targetingAbilityType = abilityType;
        this.targetingAnimTime = 0;
        this.targetingHasTouch = false;
        this.targetingCursorPos = { x: 0, y: 0 };

        const isMobile = 'ontouchstart' in globalThis || navigator.maxTouchPoints > 0;
        if (!isMobile) {
            this.canvas.style.cursor = 'none';
        }
    }

    exit() {
        this.bombTargetingMode = false;
        this.targetingCallback = null;
        this.targetingAbilityType = null;
        this.targetingHasTouch = false;
        this.bombCancelButton = null;
        this.canvas.style.cursor = 'default';
    }

    updateCursor(x, y, isTouch = false, touchEnded = false) {
        this.targetingCursorPos.x = x;
        this.targetingCursorPos.y = y;

        if (touchEnded) {
            this.targetingHasTouch = false;
        } else if (isTouch) {
            this.targetingHasTouch = true;
        }
    }

    isCancelButtonClicked(screenX, screenY) {
        if (!this.bombCancelButton) return false;
        return Utils.pointInRect(
            screenX, screenY,
            this.bombCancelButton.x, this.bombCancelButton.y,
            this.bombCancelButton.width, this.bombCancelButton.height
        );
    }

    // -------------------------------------------------------------------------
    // Rendering
    // -------------------------------------------------------------------------

    renderBombTargeting(gameState) {
        const ctx = this.graphics.ctx;
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        const time = Date.now() * 0.001;
        this.targetingAnimTime += 0.016; // ~60fps

        const abilityType = this.targetingAbilityType || 'BOMB';
        const abilityConfig = SPECIAL_ABILITIES[abilityType];
        const abilityColor = abilityConfig?.color || '#ff4400';

        const isMobile = 'ontouchstart' in globalThis || navigator.maxTouchPoints > 0;
        const hasTouchPosition = this.targetingHasTouch && this.targetingCursorPos.x > 0;

        // Semi-transparent overlay
        ctx.fillStyle = Utils.colorWithAlpha(abilityColor, 0.08);
        ctx.fillRect(0, 0, width, height);

        // Animated border pulse
        ctx.save();
        const borderPulse = Math.sin(time * 4) * 0.3 + 0.7;
        ctx.strokeStyle = Utils.colorWithAlpha(abilityColor, borderPulse * 0.5);
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, width - 4, height - 4);
        ctx.restore();

        // Instruction text
        ctx.save();
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = abilityColor;
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 8;
        const pulse = Math.sin(time * 5) * 0.2 + 0.8;
        ctx.globalAlpha = pulse;

        let instructionText = 'TAP TO ACTIVATE';
        if (abilityType === 'BOMB') {
            instructionText = isMobile ? '👆 TAP WHERE TO DROP BOMB' : 'TAP TO DROP BOMB';
        } else if (abilityType === 'STUN') {
            instructionText = isMobile ? '👆 TAP WHERE TO STUN' : 'TAP TO STUN ENEMIES';
        }
        ctx.fillText(instructionText, width / 2, UI_CONFIG.TOP_BAR_HEIGHT + 35);
        ctx.restore();

        // Mobile: show hint in grid centre if no touch yet
        if (isMobile && !hasTouchPosition) {
            this.handleMobileHint(ctx, abilityType, time);
        } else {
            this.handleDesktopHint(ctx, abilityType, time, isMobile, hasTouchPosition);
        }

        // Cancel button
        const cancelBtnWidth = 130;
        const cancelBtnHeight = 44;
        const cancelBtnX = width / 2 - cancelBtnWidth / 2;
        const cancelBtnY = height - UI_CONFIG.SHOP_HEIGHT - 65;

        ctx.save();
        const cancelGradient = ctx.createLinearGradient(cancelBtnX, cancelBtnY, cancelBtnX, cancelBtnY + cancelBtnHeight);
        cancelGradient.addColorStop(0, '#4a2020');
        cancelGradient.addColorStop(0.5, '#2a1010');
        cancelGradient.addColorStop(1, '#3a1515');
        ctx.fillStyle = cancelGradient;
        Utils.drawRoundRect(ctx, cancelBtnX, cancelBtnY, cancelBtnWidth, cancelBtnHeight, 10);
        ctx.fill();

        ctx.shadowColor = '#ff4444';
        ctx.shadowBlur = 8;
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 2;
        Utils.drawRoundRect(ctx, cancelBtnX, cancelBtnY, cancelBtnWidth, cancelBtnHeight, 10);
        ctx.stroke();
        ctx.restore();

        ctx.font = 'bold 15px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('✕ CANCEL', width / 2, cancelBtnY + cancelBtnHeight / 2);

        this.bombCancelButton = {
            x: cancelBtnX,
            y: cancelBtnY,
            width: cancelBtnWidth,
            height: cancelBtnHeight
        };
    }

    handleDesktopHint(ctx, abilityType, time, isMobile, hasTouchPosition) {
        const cursorGridPos = this.graphics.screenToGrid(this.targetingCursorPos.x, this.targetingCursorPos.y);
        const cursorScreenPos = this.graphics.gridToScreen(cursorGridPos.col, cursorGridPos.row);

        if (cursorGridPos.col >= 0 && cursorGridPos.col < CONFIG.COLS &&
            cursorGridPos.row >= 0 && cursorGridPos.row < CONFIG.ROWS) {
            this.renderTargetingAreaPreview(ctx, cursorScreenPos.x, cursorScreenPos.y, abilityType, time);

            if (isMobile && hasTouchPosition) {
                this.renderMobileTouchIndicator(ctx, this.targetingCursorPos.x, this.targetingCursorPos.y, abilityType, time);
            }
        }

        if (!isMobile) {
            this.renderTargetingCursor(ctx, this.targetingCursorPos.x, this.targetingCursorPos.y, abilityType, time);
        }
    }

    handleMobileHint(ctx, abilityType, time) {
        const gridCenterX = this.graphics.offsetX + (CONFIG.COLS * this.graphics.cellSize) / 2;
        const gridCenterY = this.graphics.offsetY + (CONFIG.ROWS * this.graphics.cellSize) / 2;
        this.renderMobileTargetingHint(ctx, gridCenterX, gridCenterY, abilityType, time);
    }

    renderMobileTargetingHint(ctx, x, y, abilityType, time) {
        const abilityConfig = SPECIAL_ABILITIES[abilityType];
        const color = abilityConfig?.color || '#ff4400';
        const cellSize = this.graphics.cellSize;
        const radius = abilityConfig?.baseRadius || 2;

        ctx.save();

        const pulseScale = 1 + Math.sin(time * 3) * 0.1;
        const areaRadius = radius * cellSize * pulseScale;

        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.setLineDash([12, 8]);
        ctx.lineDashOffset = -time * 40;
        ctx.globalAlpha = 0.6 + Math.sin(time * 4) * 0.2;
        ctx.beginPath();
        ctx.arc(x, y, areaRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, areaRadius);
        gradient.addColorStop(0, Utils.colorWithAlpha(color, 0.25));
        gradient.addColorStop(0.7, Utils.colorWithAlpha(color, 0.1));
        gradient.addColorStop(1, Utils.colorWithAlpha(color, 0));
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, areaRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.85 + Math.sin(time * 5) * 0.15;
        ctx.font = `${cellSize * 1.5}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const bounce = Math.sin(time * 4) * 10;
        const fingerY = y + bounce;
        ctx.fillText('👆', x, fingerY);

        ctx.shadowColor = color;
        ctx.shadowBlur = 20;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(x, fingerY, cellSize * 0.9, 0, Math.PI * 2);
        ctx.stroke();

        ctx.shadowBlur = 10;
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.9;
        ctx.fillText('TAP TO TARGET', x, y + cellSize * 2);

        ctx.restore();
    }

    renderMobileTouchIndicator(ctx, x, y, abilityType, time) {
        const abilityConfig = SPECIAL_ABILITIES[abilityType];
        const color = abilityConfig?.color || '#ff4400';

        ctx.save();
        ctx.translate(x, y);

        const pulseSize = 35 + Math.sin(time * 6) * 8;

        ctx.shadowColor = color;
        ctx.shadowBlur = 25;
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(0, 0, pulseSize, 0, Math.PI * 2);
        ctx.stroke();

        const expandRing = ((time * 1.5) % 1);
        ctx.globalAlpha = 1 - expandRing;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, pulseSize * (0.5 + expandRing * 0.8), 0, Math.PI * 2);
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        const crossSize = 15;
        ctx.beginPath();
        ctx.moveTo(-crossSize, 0);
        ctx.lineTo(-8, 0);
        ctx.moveTo(crossSize, 0);
        ctx.lineTo(8, 0);
        ctx.moveTo(0, -crossSize);
        ctx.lineTo(0, -8);
        ctx.moveTo(0, crossSize);
        ctx.lineTo(0, 8);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 1;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.globalAlpha = 0.9;
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const floatY = -pulseSize - 25 + Math.sin(time * 4) * 4;
        
        let icon = '🎯';
        if (abilityType === 'BOMB') {
            icon = '💣';
        } else if (abilityType === 'STUN') {
            icon = '⚡';
        }
        ctx.fillText(icon, 0, floatY);

        ctx.restore();
    }

    renderTargetingAreaPreview(ctx, x, y, abilityType, time) {
        const cellSize = this.graphics.cellSize;
        const abilityConfig = SPECIAL_ABILITIES[abilityType];
        const radius = abilityConfig?.baseRadius || 2;
        const color = abilityConfig?.color || '#ff4400';

        ctx.save();

        const pulseScale = 1 + Math.sin(time * 6) * 0.08;
        const areaRadius = radius * cellSize * pulseScale;

        ctx.shadowColor = color;
        ctx.shadowBlur = 20;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, areaRadius);
        gradient.addColorStop(0, Utils.colorWithAlpha(color, 0.4));
        gradient.addColorStop(0.6, Utils.colorWithAlpha(color, 0.2));
        gradient.addColorStop(1, Utils.colorWithAlpha(color, 0.05));

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, areaRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(x, y, areaRadius, 0, Math.PI * 2);
        ctx.stroke();

        const innerPulse = (time * 2) % 1;
        ctx.globalAlpha = 1 - innerPulse;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, areaRadius * innerPulse, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        const crossSize = cellSize * 0.4;
        ctx.beginPath();
        ctx.moveTo(x - crossSize, y);
        ctx.lineTo(x + crossSize, y);
        ctx.moveTo(x, y - crossSize);
        ctx.lineTo(x, y + crossSize);
        ctx.stroke();

        ctx.restore();
    }

    renderTargetingCursor(ctx, x, y, abilityType, time) {
        ctx.save();
        ctx.translate(x, y);

        const size = 60;
        const s = size / 2;
        const rotation = time * 0.5;

        switch (abilityType) {
            case 'BOMB':
                this.renderBombCursor(ctx, s, time, rotation);
                break;
            case 'STUN':
                this.renderStunCursor(ctx, s, time, rotation);
                break;
            default:
                this.renderGenericCursor(ctx, s, time, rotation);
        }

        ctx.restore();
    }

    renderBombCursor(ctx, s, time, rotation) {
        // Outer rotating danger rings
        ctx.save();
        ctx.rotate(rotation);
        ctx.strokeStyle = '#ff4400';
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.6 + Math.sin(time * 8) * 0.2;

        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI / 4) - Math.PI / 8;
            const px = Math.cos(angle) * s * 1.1;
            const py = Math.sin(angle) * s * 1.1;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();

        // Counter-rotating dashed ring
        ctx.save();
        ctx.rotate(-rotation * 1.5);
        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.75, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // Bomb body
        const bounce = Math.sin(time * 10) * 3;
        ctx.save();
        ctx.translate(0, bounce);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(2, s * 0.4, s * 0.35, s * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#222222';
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.45, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#444444';
        ctx.beginPath();
        ctx.arc(-s * 0.15, -s * 0.15, s * 0.15, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#555555';
        ctx.fillRect(-s * 0.08, -s * 0.55, s * 0.16, s * 0.15);

        ctx.strokeStyle = '#aa7744';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.55);
        const fuseWave = Math.sin(time * 12) * s * 0.1;
        ctx.quadraticCurveTo(fuseWave, -s * 0.7, s * 0.1 + fuseWave * 0.5, -s * 0.8);
        ctx.stroke();

        const flameSize = s * 0.2 + Math.sin(time * 20) * s * 0.08;
        const flameX = s * 0.1 + Math.sin(time * 12) * s * 0.05;

        const flameGradient = ctx.createRadialGradient(flameX, -s * 0.8, 0, flameX, -s * 0.8, flameSize);
        flameGradient.addColorStop(0, '#ffffff');
        flameGradient.addColorStop(0.3, '#ffff00');
        flameGradient.addColorStop(0.6, '#ff8800');
        flameGradient.addColorStop(1, 'rgba(255, 50, 0, 0)');
        ctx.fillStyle = flameGradient;
        ctx.beginPath();
        ctx.arc(flameX, -s * 0.8, flameSize, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffff88';
        for (let i = 0; i < 5; i++) {
            const sparkAngle = time * 15 + i * 1.2;
            const sparkDist = s * 0.15 + Math.sin(time * 20 + i) * s * 0.1;
            const sparkX = flameX + Math.cos(sparkAngle) * sparkDist;
            const sparkY = -s * 0.8 + Math.sin(sparkAngle) * sparkDist - s * 0.1;
            const sparkSize = 2 + Math.sin(time * 25 + i * 2) * 1.5;
            ctx.beginPath();
            ctx.arc(sparkX, sparkY, sparkSize, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // Warning triangles
        ctx.save();
        ctx.rotate(rotation * 2);
        ctx.fillStyle = '#ffcc00';
        for (let i = 0; i < 3; i++) {
            ctx.save();
            ctx.rotate(i * Math.PI * 2 / 3);
            ctx.translate(s * 0.9, 0);
            ctx.beginPath();
            ctx.moveTo(0, -6);
            ctx.lineTo(5, 5);
            ctx.lineTo(-5, 5);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 8px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('!', 0, 4);
            ctx.fillStyle = '#ffcc00';
            ctx.restore();
        }
        ctx.restore();
    }

    renderStunCursor(ctx, s, time, rotation) {
        // Electric field hexagon
        ctx.save();
        ctx.rotate(rotation * 0.8);

        ctx.strokeStyle = '#ffee00';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#ffff88';
        ctx.shadowBlur = 15;

        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI / 3) + Math.sin(time * 3) * 0.1;
            const dist = s * (0.95 + Math.sin(time * 8 + i) * 0.1);
            const px = Math.cos(angle) * dist;
            const py = Math.sin(angle) * dist;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();

        // Inner rotating arcs
        ctx.save();
        ctx.rotate(-rotation * 1.2);
        ctx.strokeStyle = '#88ddff';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.7;

        for (let i = 0; i < 4; i++) {
            ctx.save();
            ctx.rotate(i * Math.PI / 2);
            ctx.beginPath();
            ctx.arc(0, 0, s * 0.6, -0.3, 0.3);
            ctx.stroke();
            ctx.restore();
        }
        ctx.restore();

        // Central lightning bolt
        ctx.save();
        const boltScale = 1 + Math.sin(time * 12) * 0.15;
        ctx.scale(boltScale, boltScale);
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 20;

        ctx.fillStyle = '#ffee00';
        ctx.beginPath();
        ctx.moveTo(-s * 0.1, -s * 0.55);
        ctx.lineTo(s * 0.25, -s * 0.05);
        ctx.lineTo(0, -s * 0.05);
        ctx.lineTo(s * 0.15, s * 0.55);
        ctx.lineTo(-s * 0.15, s * 0.05);
        ctx.lineTo(s * 0.05, s * 0.05);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-s * 0.05, -s * 0.4);
        ctx.lineTo(s * 0.12, -s * 0.02);
        ctx.lineTo(-s * 0.02, -s * 0.02);
        ctx.lineTo(s * 0.08, s * 0.4);
        ctx.lineTo(-s * 0.08, s * 0.05);
        ctx.lineTo(s * 0.02, s * 0.05);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Electric sparks
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 8; i++) {
            const sparkTime = time * 6 + i * 0.8;
            const sparkAngle = sparkTime % (Math.PI * 2);
            const sparkDist = s * (0.7 + Math.sin(sparkTime * 3) * 0.2);
            const sparkX = Math.cos(sparkAngle) * sparkDist;
            const sparkY = Math.sin(sparkAngle) * sparkDist;

            ctx.globalAlpha = 0.5 + Math.sin(sparkTime * 5) * 0.5;
            ctx.beginPath();
            ctx.arc(sparkX, sparkY, 2 + Math.sin(sparkTime * 8), 0, Math.PI * 2);
            ctx.fill();

            if (Math.sin(sparkTime * 10) > 0.7) {
                ctx.strokeStyle = '#ffff88';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(sparkX, sparkY);
                const endX = sparkX + (Math.random() - 0.5) * s * 0.3;
                const endY = sparkY + (Math.random() - 0.5) * s * 0.3;
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
        }

        // Circular pulse wave
        ctx.globalAlpha = 1;
        const pulsePhase = (time * 2) % 1;
        ctx.strokeStyle = '#ffee00';
        ctx.lineWidth = 3 * (1 - pulsePhase);
        ctx.globalAlpha = 1 - pulsePhase;
        ctx.beginPath();
        ctx.arc(0, 0, s * pulsePhase * 1.2, 0, Math.PI * 2);
        ctx.stroke();
    }

    renderGenericCursor(ctx, s, time, rotation) {
        ctx.save();
        ctx.rotate(rotation);

        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 10;

        ctx.beginPath();
        ctx.arc(0, 0, s * 0.9, 0, Math.PI * 2);
        ctx.stroke();

        const crossSize = s * 0.6;
        ctx.beginPath();
        ctx.moveTo(-crossSize, 0);
        ctx.lineTo(-s * 0.3, 0);
        ctx.moveTo(crossSize, 0);
        ctx.lineTo(s * 0.3, 0);
        ctx.moveTo(0, -crossSize);
        ctx.lineTo(0, -s * 0.3);
        ctx.moveTo(0, crossSize);
        ctx.lineTo(0, s * 0.3);
        ctx.stroke();

        ctx.fillStyle = '#00ff88';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

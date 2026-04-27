/**
 * Altitude - Main Entry Point
 * Single Responsibility: Bootstrap application and wire SDK.
 */

import { Game } from './core/Game.js';

let game = null;
let parentOrigin = null;

// ═══════════════════════════════════════════════════════════════
// PLATFORM MESSAGE LISTENER (XP banner, level-up modal)
// ═══════════════════════════════════════════════════════════════

window.addEventListener('message', (event) => {
    try {
        const msg = event.data;
        if (!msg?.type) return;
        if (msg.protocolVersion !== '1.0.0') return;
        if (parentOrigin && event.origin !== parentOrigin) {
            console.warn('[Altitude] Rejected message from untrusted origin:', event.origin);
            return;
        }
        if (!parentOrigin && event.origin) {
            parentOrigin = event.origin;
        }
        if (msg.type === 'showXPBanner' && msg.payload) {
            showXPBanner(msg.payload.xp_earned, msg.payload);
        }
        if (msg.type === 'showLevelUpModal' && msg.payload) {
            showLevelUpNotification(msg.payload);
        }
    } catch (e) { console.error('[Altitude] platform msg error', e); }
});

function showXPBanner(xpAmount, payload) {
    if (!document.querySelector('#alt-xp-styles')) {
        const s = document.createElement('style');
        s.id = 'alt-xp-styles';
        s.textContent = `
            .game-xp-banner {
                position: fixed; top: 60px; right: 16px; z-index: 10000;
                animation: xpSlideIn 0.5s ease; pointer-events: none;
            }
            .game-xp-banner.hiding { animation: xpSlideOut 0.5s ease forwards; }
            .game-xp-badge {
                background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
                padding: 14px 22px; border-radius: 12px;
                box-shadow: 0 4px 20px rgba(255,215,0,0.4);
                display: flex; align-items: center; gap: 10px;
            }
            .game-xp-icon { font-size: 1.4em; }
            .game-xp-amount { font-size: 1.1em; font-weight: 700; color: #1a1a1a; }
            @keyframes xpSlideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            @keyframes xpSlideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(400px); opacity: 0; } }
        `;
        document.head.appendChild(s);
    }
    const banner = document.createElement('div');
    banner.className = 'game-xp-banner';

    const badge = document.createElement('div');
    badge.className = 'game-xp-badge';

    const icon = document.createElement('span');
    icon.className = 'game-xp-icon';
    icon.textContent = '⭐';

    const amount = document.createElement('span');
    amount.className = 'game-xp-amount';
    amount.textContent = `+${Number(xpAmount).toFixed(2)} XP`;

    badge.appendChild(icon);
    badge.appendChild(amount);
    banner.appendChild(badge);
    document.body.appendChild(banner);

    setTimeout(() => { banner.classList.add('hiding'); setTimeout(() => banner.remove(), 500); }, 2500);
}

function showLevelUpNotification(data) {
    const { old_level, new_level, title = '', badge = '', coins_awarded = 0, is_milestone = false, user_data = {} } = data;
    const isAnonymous = user_data?.is_anonymous === true;

    if (!document.querySelector('#level-up-styles')) {
        const link = document.createElement('link');
        link.id = 'level-up-styles';
        link.rel = 'stylesheet';
        link.href = '/css/level-widget.css';
        document.head.appendChild(link);
    }

    const modal = document.createElement('div');
    modal.className = 'level-up-modal';

    const content = document.createElement('div');
    content.className = `level-up-content ${is_milestone ? 'milestone' : ''}`;

    const animation = document.createElement('div');
    animation.className = 'level-up-animation';
    const rays = document.createElement('div');
    rays.className = 'level-up-rays';
    const badgeContainer = document.createElement('div');
    badgeContainer.className = 'level-up-badge-container';
    const badgeSpan = document.createElement('span');
    badgeSpan.className = 'level-up-badge';
    badgeSpan.textContent = badge || '🏅';
    badgeContainer.appendChild(badgeSpan);
    animation.appendChild(rays);
    animation.appendChild(badgeContainer);
    content.appendChild(animation);

    const titleEl = document.createElement('h2');
    titleEl.className = 'level-up-title';
    titleEl.textContent = '🎉 LEVEL UP! 🎉';
    content.appendChild(titleEl);

    const levels = document.createElement('div');
    levels.className = 'level-up-levels';
    const oldLevel = document.createElement('span');
    oldLevel.className = 'old-level';
    oldLevel.textContent = old_level ?? '-';
    const arrow = document.createElement('span');
    arrow.className = 'level-arrow';
    arrow.textContent = '→';
    const newLevelEl = document.createElement('span');
    newLevelEl.className = 'new-level';
    newLevelEl.textContent = new_level ?? '-';
    levels.appendChild(oldLevel);
    levels.appendChild(arrow);
    levels.appendChild(newLevelEl);
    content.appendChild(levels);

    const newTitle = document.createElement('div');
    newTitle.className = 'level-up-new-title';
    newTitle.textContent = title;
    content.appendChild(newTitle);

    if (is_milestone) {
        const milestone = document.createElement('div');
        milestone.className = 'level-up-milestone-badge';
        milestone.textContent = '✨ MILESTONE ✨';
        content.appendChild(milestone);
    }

    if (!isAnonymous && coins_awarded > 0) {
        const reward = document.createElement('div');
        reward.className = 'level-up-reward';
        const rewardIcon = document.createElement('span');
        rewardIcon.className = 'reward-icon';
        rewardIcon.textContent = '🪙';
        const rewardAmount = document.createElement('span');
        rewardAmount.className = 'reward-amount';
        rewardAmount.textContent = `+${coins_awarded} Coins`;
        reward.appendChild(rewardIcon);
        reward.appendChild(rewardAmount);
        content.appendChild(reward);
    }

    const btn = document.createElement('button');
    btn.className = 'level-up-close';
    btn.textContent = 'Continue';
    content.appendChild(btn);

    modal.appendChild(content);
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);

    btn.addEventListener('click', () => {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    });
    setTimeout(() => {
        if (modal.parentElement) { modal.classList.remove('show'); setTimeout(() => modal.remove(), 300); }
    }, 6000);
}

// Global exports for platform
globalThis.showXPBanner = showXPBanner;
globalThis.showLevelUpNotification = showLevelUpNotification;

// ═══════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
    const canvas = document.getElementById('game-canvas');

    if (!canvas) {
        console.error('[Altitude] Canvas not found!');
        return;
    }

    const fullscreenBtn = document.getElementById('fullscreen-btn');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => {
            const sdk = globalThis.PlatformSDK;
            if (sdk && typeof sdk.toggleFullscreen === 'function') sdk.toggleFullscreen();
            else if (document.fullscreenElement) document.exitFullscreen();
            else document.documentElement.requestFullscreen().catch(() => {});
        });
    }

    game = await Game.create(canvas);
    globalThis.game = game;

    // Hide loading screen
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.classList.add('fade-out');
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }
});

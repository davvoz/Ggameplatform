import CommunityAPI from './CommunityAPI.js';
import { PrivateMessageAPI } from './PrivateMessageManager.js';
import AuthManager from './auth.js';
import { getCommunityWS, setCommunityWS, getCurrentCommunityManager, getPMWS, setPMWS } from './state.js';

/**
 * Check for unclaimed quest rewards and update badge
 */
async function checkUnclaimedQuests() {

    // Only check if user is logged in and not anonymous
    if (!AuthManager.isLoggedIn()) {
        removeQuestBadge();
        return;
    }

    const user = AuthManager.getUser();
    if (!user || user.is_anonymous) {
        removeQuestBadge();
        return;
    }


    try {
        const apiUrl = globalThis.ENV?.API_URL || globalThis.location.origin || 'http://localhost:8000';
        const timestamp = Date.now();
        const response = await fetch(`${apiUrl}/quests/user/${user.user_id}?_t=${timestamp}`, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
            }
        });

        if (!response.ok) {
            removeQuestBadge();
            return;
        }

        const quests = await response.json();

        // Count quests ready to claim (completed but not claimed)
        const unclaimedCount = quests.filter(quest => {
            const progress = quest.progress || {};
            return progress.is_completed === true &&
                (progress.is_claimed === false || progress.is_claimed === 0);
        }).length;


        if (unclaimedCount > 0) {
            updateQuestBadge(unclaimedCount);
        } else {
            removeQuestBadge();
        }
    } catch (error) {
        console.error('Error checking unclaimed quests:', error);
        removeQuestBadge();
    }
}

/**
 * Update or create quest notification badge
 */
function updateQuestBadge(count) {
    const questsLink = document.getElementById('questsLink');
    if (!questsLink) return;

    let badge = questsLink.querySelector('.quest-notification-badge');

    if (!badge) {
        badge = document.createElement('span');
        badge.className = 'quest-notification-badge';
        questsLink.appendChild(badge);
    }

    badge.textContent = count > 9 ? '9+' : count;
    badge.classList.add('pulse-animation');

    // Also show a small badge on the mobile menu toggle so users see it when
    // the navbar is hidden on small screens. We clone the badge so both
    // elements can exist independently in the DOM.
    const navToggle = document.getElementById('navToggle');
    if (navToggle) {
        let toggleBadge = navToggle.querySelector('.quest-notification-badge');
        const label = count > 9 ? '9+ unclaimed quests' : `${count} unclaimed quests`;
        if (toggleBadge) {
            toggleBadge.setAttribute('aria-label', label);
            toggleBadge.title = label;
            toggleBadge.textContent = '';
        } else {
            // Create a small circular badge for the toggle without visible text
            toggleBadge = document.createElement('span');
            toggleBadge.className = 'quest-notification-badge';
            toggleBadge.setAttribute('aria-label', label);
            toggleBadge.title = label;
            // no visible number inside the toggle badge
            toggleBadge.textContent = '';
            navToggle.appendChild(toggleBadge);
        }
    }
}

/**
 * Remove quest notification badge
 */
function removeQuestBadge() {
    const questsLink = document.getElementById('questsLink');
    if (!questsLink) return;

    const badge = questsLink.querySelector('.quest-notification-badge');
    if (badge) {
        badge.remove();
    }

    // Also remove any badge on the mobile nav toggle
    const navToggle = document.getElementById('navToggle');
    if (navToggle) {
        const toggleBadge = navToggle.querySelector('.quest-notification-badge');
        if (toggleBadge) toggleBadge.remove();
    }
}

/**
 * Initialize quest notification checker
 */
function initQuestNotifications() {

    // Check when auth state changes (login/logout)
    globalThis.addEventListener('auth-state-changed', () => {
        checkUnclaimedQuests();
    });

    // Check when navigating to quests page
    globalThis.addEventListener('hashchange', () => {
        if (globalThis.location.hash.includes('quest')) {
            checkUnclaimedQuests();
        }
    });

    // Check when a game session ends (quests may have been completed)
    globalThis.addEventListener('gameSessionEnded', () => {
        // Small delay to allow backend to process quest updates
        setTimeout(() => {
            checkUnclaimedQuests();
        }, 1000);
    });

    // Check when page becomes visible
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            checkUnclaimedQuests();
        }
    });

    // Initial check - wait for AuthManager to be ready
    const tryInitialCheck = () => {
        if (AuthManager.isLoggedIn()) {
            checkUnclaimedQuests();
        } else {
            setTimeout(tryInitialCheck, 500);
        }
    };

    // Start checking after DOM is ready
    if (document.readyState === 'complete') {
        setTimeout(tryInitialCheck, 100);
    } else {
        window.addEventListener('load', () => setTimeout(tryInitialCheck, 100));
    }
}

/**
 * DB Viewer link removed for security reasons
 * Access db-viewer directly via protected endpoint: /admin/db-viewer
 */

function initMobileNav() {

    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');


    if (!navToggle || !navMenu) {

        return false;
    }


    // Remove any existing listeners by cloning
    const newNavToggle = navToggle.cloneNode(true);
    navToggle.parentNode.replaceChild(newNavToggle, navToggle);

    // Toggle menu on hamburger click
    newNavToggle.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        const isActive = navMenu.classList.contains('active');

        if (isActive) {
            newNavToggle.classList.remove('active');
            navMenu.classList.remove('active');
        } else {
            newNavToggle.classList.add('active');
            navMenu.classList.add('active');
        }

    });

    // Close menu when clicking on a link
    const navLinks = navMenu.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        link.addEventListener('click', function () {

            newNavToggle.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });

    // Close menu when clicking outside
    document.addEventListener('click', function (e) {
        if (!newNavToggle.contains(e.target) && !navMenu.contains(e.target)) {
            if (navMenu.classList.contains('active')) {
                newNavToggle.classList.remove('active');
                navMenu.classList.remove('active');
            }
        }
    });

    return true;
}

// ES6 modules are deferred by default - DOM is already ready
initMobileNav();
initQuestNotifications();
let _communityNotificationsInitialized = false;
initCommunityNotifications();

// ═══════════════════════════════════════════════════════════════════════
// Community Chat Notification Badge  (WebSocket-driven, no polling)
//
// A single global CommunityAPI instance (window._communityWS) stays
// connected at all times.  When the user is NOT on the Community page
// the lightweight handlers below show/hide the nav badge.  When the
// CommunityManager takes over (user opens the page) it swaps in its
// own callbacks; on destroy it hands control back here.
// ═══════════════════════════════════════════════════════════════════════

/**
 * Show the community notification badge on the nav link
 */
function updateCommunityBadge() {
    const communityLink = document.getElementById('communityLink');
    if (!communityLink) return;

    if (!communityLink.querySelector('.community-notification-badge')) {
        const badge = document.createElement('span');
        badge.className = 'community-notification-badge pulse-animation';
        badge.textContent = '';
        badge.setAttribute('aria-label', 'New chat messages');
        badge.title = 'New chat messages';
        communityLink.appendChild(badge);
    }

    // Mobile nav toggle
    const navToggle = document.getElementById('navToggle');
    if (navToggle && !navToggle.querySelector('.community-notification-badge')) {
        const tb = document.createElement('span');
        tb.className = 'community-notification-badge pulse-animation';
        tb.textContent = '';
        tb.setAttribute('aria-label', 'New chat messages');
        tb.title = 'New chat messages';
        navToggle.appendChild(tb);
    }
}

/**
 * Remove the community notification badge
 */
function removeCommunityBadge() {
    document.querySelectorAll('.community-notification-badge').forEach(b => b.remove());
}

/**
 * Mark latest message as seen in localStorage & clear badge
 */
function markCommunityAsSeen() {
    const ws = getCommunityWS();
    if (ws?._lastKnownMsgId) {
        localStorage.setItem('community_last_seen_msg', ws._lastKnownMsgId);
    }
    removeCommunityBadge();
}

/* ── Lightweight WebSocket callbacks used by the global notifier ──── */

function _navOnMessage(message) {
    const ws = getCommunityWS();
    if (message?.id) {
        ws._lastKnownMsgId = message.id;
    }
    // User is viewing the chat page → don't show badge
    if (globalThis.location.hash === '#/community') return;
    // Compare with last seen
    const seenId = localStorage.getItem('community_last_seen_msg');
    if (!seenId || seenId !== (message?.id)) {
        updateCommunityBadge();
    }
}

function _navOnHistoryLoad(messages) {
    if (!messages || messages.length === 0) return;
    // The backend sends newest-first; pick the newest
    const newest = messages[0];
    const ws = getCommunityWS();
    if (newest?.id) {
        ws._lastKnownMsgId = newest.id;
    }
    // If user has never seen any message yet, seed localStorage
    if (!localStorage.getItem('community_last_seen_msg') && newest) {
        localStorage.setItem('community_last_seen_msg', newest.id);
    }
    // Check if there's something unseen
    const seenId = localStorage.getItem('community_last_seen_msg');
    if (seenId !== (newest?.id) && globalThis.location.hash !== '#/community') {
        updateCommunityBadge();
    }
}

/**
 * Install the lightweight (badge-only) callbacks on the global WS.
 * Called at startup and every time CommunityManager hands control back.
 */
function installNavCommunityHandlers() {
    const ws = getCommunityWS();
    if (!ws) return;
    ws.onMessage = _navOnMessage;
    ws.onHistoryLoad = _navOnHistoryLoad;
    ws.onConnect = () => { };
    ws.onDisconnect = () => { };
    ws.onError = () => { };
    ws.onUserJoin = () => { };
    ws.onUserLeave = () => { };
    ws.onStatsUpdate = () => { };
}

/**
 * Boot (or reboot) the global community WebSocket.
 * Connects if user is logged in and not anonymous.
 */
async function bootCommunityWS() {
    // Never interfere while CommunityManager owns the WS
    if (getCurrentCommunityManager()) return;

    // Tear down previous instance if user changed
    if (getCommunityWS()) {
        getCommunityWS().disconnect();
        setCommunityWS(null);
    }
    removeCommunityBadge();

    if (!AuthManager.isLoggedIn()) return;
    const user = AuthManager.getUser();
    if (!user || user.is_anonymous) return;

    const api = new CommunityAPI({
        userId: user.user_id,
        username: user.username || 'Anonymous'
    });
    // Extra property to track latest known message id
    api._lastKnownMsgId = null;
    setCommunityWS(api);

    installNavCommunityHandlers();

    try {
        await api.connect();
    } catch (e) {
        // Connection failed (e.g. network error) - keep the global instance but it will be disconnected
        console.error('Error connecting to community WS:', e);
    }

}

/**
 * Initialize community chat + PM notification system
 */
function initCommunityNotifications() {
    if (_communityNotificationsInitialized) return;
    _communityNotificationsInitialized = true;

    // Boot on auth changes (login / logout / user switch)
    globalThis.addEventListener('auth-state-changed', () => {
        // If CommunityManager is active it owns the WS — skip
        if (getCurrentCommunityManager()) return;
        bootCommunityWS();
        bootPMWS();
    });

    // When navigating TO community, mark as seen (CommunityManager will
    // take over the WS in its own init).  When navigating AWAY the
    // CommunityManager.destroy() hands control back.
    globalThis.addEventListener('hashchange', () => {
        if (globalThis.location.hash === '#/community') {
            markCommunityAsSeen();
        }
    });

    // Listen for PM notifications from PrivateMessageManager (fires when
    // a new message or connection request arrives in real-time).
    // If the user is NOT on the community page, show the community nav badge.
    globalThis.addEventListener('pm:notification', () => {
        if (globalThis.location.hash !== '#/community') {
            updateCommunityBadge();
        }
    });

    // Initial boot — wait for AuthManager
    const tryBoot = () => {
        if (getCurrentCommunityManager()) return; // CM is active, skip
        if (AuthManager.isLoggedIn()) {
            bootCommunityWS();
            bootPMWS();
        } else {
            setTimeout(tryBoot, 500);
        }
    };
    if (document.readyState === 'complete') {
        setTimeout(tryBoot, 200);
    } else {
        window.addEventListener('load', () => setTimeout(tryBoot, 200));
    }
}

// ═══════════════════════════════════════════════════════════════════════
// Private Messages Global WebSocket  (always-on, like community WS)
//
// A single PrivateMessageAPI instance stays connected at all times.
// Lightweight handlers show the community nav badge on incoming
// messages/connection requests.  When PrivateMessageManager takes
// over (user opens Messages tab) it swaps in its own callbacks;
// on destroy it hands control back here.
// ═══════════════════════════════════════════════════════════════════════

/* ── Lightweight PM WebSocket callbacks ── */

function _navPMOnMessage(_msg) {
    if (globalThis.location.hash !== '#/community') {
        updateCommunityBadge();
    }
    globalThis.dispatchEvent(new CustomEvent('pm:notification', {
        detail: { reason: 'message' },
    }));
}

function _navPMOnConnectionRequest(_conn) {
    if (globalThis.location.hash !== '#/community') {
        updateCommunityBadge();
    }
    globalThis.dispatchEvent(new CustomEvent('pm:notification', {
        detail: { reason: 'connection_request' },
    }));
}

function _navPMOnUnreadSummary(data) {
    const total = (data.unread_messages || 0) + (data.pending_connections || 0);
    if (total > 0 && globalThis.location.hash !== '#/community') {
        updateCommunityBadge();
    }
    if (total > 0) {
        globalThis.dispatchEvent(new CustomEvent('pm:notification', {
            detail: { reason: 'unread_summary', total },
        }));
    }
}

/**
 * Install the lightweight (badge-only) callbacks on the global PM WS.
 * Called at startup and every time PrivateMessageManager hands control back.
 */
function installNavPMHandlers() {
    const ws = getPMWS();
    if (!ws) return;
    ws.onMessage = _navPMOnMessage;
    ws.onConnectionRequest = _navPMOnConnectionRequest;
    ws.onUnreadSummary = _navPMOnUnreadSummary;
    ws.onError = () => { };
}

/**
 * Boot (or reboot) the global PM WebSocket.
 * Connects if user is logged in and not anonymous.
 */
async function bootPMWS() {
    // Tear down previous instance if user changed
    if (getPMWS()) {
        getPMWS().disconnect();
        setPMWS(null);
    }

    if (!AuthManager.isLoggedIn()) return;
    const user = AuthManager.getUser();
    if (!user || user.is_anonymous) return;

    const api = new PrivateMessageAPI({ userId: user.user_id });
    setPMWS(api);
    installNavPMHandlers();

    try {
        await api.connect();
    } catch (e) {
        console.error('Error connecting to PM WS:', e);
        // Connection failed — keep the instance but it will be disconnected
    }
}



export {
    markCommunityAsSeen,//comunity manager
    installNavCommunityHandlers,//comunity manager
    bootCommunityWS,
    removeCommunityBadge,
    checkUnclaimedQuests,
    installNavPMHandlers,
    bootPMWS,
};


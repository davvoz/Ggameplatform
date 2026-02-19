
/**
 * Check for unclaimed quest rewards and update badge
 */
async function checkUnclaimedQuests() {
    
    // Only check if user is logged in and not anonymous
    if (!window.AuthManager || !window.AuthManager.isLoggedIn()) {
        removeQuestBadge();
        return;
    }
    
    const user = window.AuthManager.getUser();
    if (!user || user.is_anonymous) {
        removeQuestBadge();
        return;
    }
    
    
    try {
        const apiUrl = window.ENV?.API_URL || window.location.origin || 'http://localhost:8000';
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
        if (!toggleBadge) {
            // Create a small circular badge for the toggle without visible text
            toggleBadge = document.createElement('span');
            toggleBadge.className = 'quest-notification-badge';
            toggleBadge.setAttribute('aria-label', label);
            toggleBadge.title = label;
            // no visible number inside the toggle badge
            toggleBadge.textContent = '';
            navToggle.appendChild(toggleBadge);
        } else {
            toggleBadge.setAttribute('aria-label', label);
            toggleBadge.title = label;
            toggleBadge.textContent = '';
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
    window.addEventListener('auth-state-changed', () => {
        checkUnclaimedQuests();
    });
    
    // Check when navigating to quests page
    window.addEventListener('hashchange', () => {
        if (window.location.hash.includes('quest')) {
            checkUnclaimedQuests();
        }
    });

    // Check when a game session ends (quests may have been completed)
    window.addEventListener('gameSessionEnded', () => {
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
        if (window.AuthManager && window.AuthManager.isLoggedIn()) {
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
    newNavToggle.addEventListener('click', function(e) {
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
        link.addEventListener('click', function() {

            newNavToggle.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
        if (!newNavToggle.contains(e.target) && !navMenu.contains(e.target)) {
            if (navMenu.classList.contains('active')) {
                newNavToggle.classList.remove('active');
                navMenu.classList.remove('active');
            }
        }
    });
    
    return true;
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        initMobileNav();
        initQuestNotifications();
        initCommunityNotifications();
    });
} else {
    initMobileNav();
    initQuestNotifications();
    initCommunityNotifications();
}

// Backup initialization after a delay
setTimeout(function() {
    if (document.getElementById('navToggle') && document.getElementById('navMenu')) {
        initMobileNav();
        initQuestNotifications();
        initCommunityNotifications();
    }
}, 500);

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
    const ws = window._communityWS;
    if (ws && ws._lastKnownMsgId) {
        localStorage.setItem('community_last_seen_msg', ws._lastKnownMsgId);
    }
    removeCommunityBadge();
}

/* ── Lightweight WebSocket callbacks used by the global notifier ──── */

function _navOnMessage(message) {
    const ws = window._communityWS;
    if (message && message.id) {
        ws._lastKnownMsgId = message.id;
    }
    // User is viewing the chat page → don't show badge
    if (window.location.hash === '#/community') return;
    // Compare with last seen
    const seenId = localStorage.getItem('community_last_seen_msg');
    if (!seenId || seenId !== (message && message.id)) {
        updateCommunityBadge();
    }
}

function _navOnHistoryLoad(messages) {
    if (!messages || messages.length === 0) return;
    // The backend sends newest-first; pick the newest
    const newest = messages[0];
    const ws = window._communityWS;
    if (newest && newest.id) {
        ws._lastKnownMsgId = newest.id;
    }
    // If user has never seen any message yet, seed localStorage
    if (!localStorage.getItem('community_last_seen_msg') && newest) {
        localStorage.setItem('community_last_seen_msg', newest.id);
    }
    // Check if there's something unseen
    const seenId = localStorage.getItem('community_last_seen_msg');
    if (seenId !== (newest && newest.id) && window.location.hash !== '#/community') {
        updateCommunityBadge();
    }
}

/**
 * Install the lightweight (badge-only) callbacks on the global WS.
 * Called at startup and every time CommunityManager hands control back.
 */
function installNavCommunityHandlers() {
    const ws = window._communityWS;
    if (!ws) return;
    ws.onMessage    = _navOnMessage;
    ws.onHistoryLoad = _navOnHistoryLoad;
    ws.onConnect    = () => { console.log('[CommunityNotifier] connected'); };
    ws.onDisconnect = () => { console.log('[CommunityNotifier] disconnected'); };
    ws.onError      = () => {};
    ws.onUserJoin   = () => {};
    ws.onUserLeave  = () => {};
    ws.onStatsUpdate = () => {};
}

/**
 * Boot (or reboot) the global community WebSocket.
 * Connects if user is logged in and not anonymous.
 */
async function bootCommunityWS() {
    // Never interfere while CommunityManager owns the WS
    if (window.currentCommunityManager) return;

    // Tear down previous instance if user changed
    if (window._communityWS) {
        window._communityWS.disconnect();
        window._communityWS = null;
    }
    removeCommunityBadge();

    if (!window.AuthManager || !window.AuthManager.isLoggedIn()) return;
    const user = window.AuthManager.getUser();
    if (!user || user.is_anonymous) return;

    const api = new CommunityAPI({
        userId: user.user_id,
        username: user.username || 'Anonymous'
    });
    // Extra property to track latest known message id
    api._lastKnownMsgId = null;
    window._communityWS = api;

    installNavCommunityHandlers();

    try {
        await api.connect();
    } catch (e) {
        console.warn('[CommunityNotifier] initial connect failed, will retry', e);
    }
}

/**
 * Initialize community chat notification system
 */
let _communityNotificationsInitialized = false;
function initCommunityNotifications() {
    if (_communityNotificationsInitialized) return;
    _communityNotificationsInitialized = true;

    // Boot on auth changes (login / logout / user switch)
    window.addEventListener('auth-state-changed', () => {
        // If CommunityManager is active it owns the WS — skip
        if (window.currentCommunityManager) return;
        bootCommunityWS();
    });

    // When navigating TO community, mark as seen (CommunityManager will
    // take over the WS in its own init).  When navigating AWAY the
    // CommunityManager.destroy() hands control back.
    window.addEventListener('hashchange', () => {
        if (window.location.hash === '#/community') {
            markCommunityAsSeen();
        }
    });

    // Initial boot — wait for AuthManager
    const tryBoot = () => {
        if (window.currentCommunityManager) return; // CM is active, skip
        if (window.AuthManager && window.AuthManager.isLoggedIn()) {
            bootCommunityWS();
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

// Export for external use
window.refreshQuestBadge = checkUnclaimedQuests;
window.markCommunityAsSeen = markCommunityAsSeen;
window.installNavCommunityHandlers = installNavCommunityHandlers;
window.removeCommunityBadge = removeCommunityBadge;
window.bootCommunityWS = bootCommunityWS;


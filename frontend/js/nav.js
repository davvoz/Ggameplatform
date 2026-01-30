
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
    });
} else {
    initMobileNav();
    initQuestNotifications();
}

// Backup initialization after a delay
setTimeout(function() {
    if (document.getElementById('navToggle') && document.getElementById('navMenu')) {
        initMobileNav();
        initQuestNotifications();
    }
}, 500);

// Export for external use
window.refreshQuestBadge = checkUnclaimedQuests;


/**
 * Mobile Navigation Handler
 */
console.log('nav.js loaded');

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
    if (user.is_anonymous) {
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
}

/**
 * Initialize quest notification checker
 */
function initQuestNotifications() {
    // Check immediately
    checkUnclaimedQuests();
    
    // Check every 30 seconds
    setInterval(checkUnclaimedQuests, 30000);
    
    // Check when user logs in/out
    window.addEventListener('auth-state-changed', checkUnclaimedQuests);
    
    // Check when returning to quests page
    window.addEventListener('hashchange', () => {
        if (window.location.hash.includes('quest')) {
            setTimeout(checkUnclaimedQuests, 1000);
        }
    });
}

/**
 * Initialize DB Viewer link with dynamic URL
 */
function initDbViewerLink() {
    const dbViewerLink = document.getElementById('dbViewerLink');
    if (dbViewerLink) {
        // Get API URL from window.ENV (set by env.js)
        const apiUrl = window.ENV?.API_URL || window.location.origin || 'http://localhost:8000';
        const dbViewerUrl = `${apiUrl}/admin/db-viewer`;
        
        dbViewerLink.href = dbViewerUrl;
        dbViewerLink.target = '_blank';
        dbViewerLink.rel = 'noopener';
        
        // Prevent SPA router from intercepting
        dbViewerLink.addEventListener('click', (e) => {
            e.stopPropagation();
            // Don't call window.open - href already handles it
        });
        
    }
}

function initMobileNav() {
    
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    
    
    if (!navToggle || !navMenu) {
        console.warn('Nav elements not found');
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
        initDbViewerLink();
        initQuestNotifications();
    });
} else {
    initMobileNav();
    initDbViewerLink();
    initQuestNotifications();
}

// Backup initialization after a delay
setTimeout(function() {
    if (document.getElementById('navToggle') && document.getElementById('navMenu')) {
        initMobileNav();
        initDbViewerLink();
        initQuestNotifications();
    }
}, 500);

// Export for external use
window.refreshQuestBadge = checkUnclaimedQuests;


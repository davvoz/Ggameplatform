import { renderCatalog, renderGameDetail, renderGamePlayer, renderAbout, renderQuests, render404, renderWallet, renderCommunity } from './main.js';
import { renderLeaderboard } from './LeaderboardRenderer.js';
import { renderProfile } from './ProfileRenderer.js';
import { renderUserProfile } from './UserProfileRenderer.js';
import {
    getCurrentGameRuntime, setCurrentGameRuntime,
    getCurrentCommunityManager, setCurrentCommunityManager
} from './state.js';

/**
 * Router configuration
 */
const routes = {
    '/': renderCatalog,
    '/about': renderAbout,
    '/profile': renderProfile,
    '/wallet': renderWallet,
    '/leaderboard': renderLeaderboard,
    '/quests': renderQuests,
    '/community': renderCommunity,
    '/game/:id': renderGameDetail,
    '/play/:id': renderGamePlayer,
    '/user/:id': renderUserProfile
};



/**
 * Initialize the router
 */
export function initRouter() {
    // Listen for hash changes
    globalThis.addEventListener('hashchange', handleRoute);
    
    // Handle initial load
    handleRoute();
}

/**
 * Handle route changes
 */
function handleRoute() {
    const hash = globalThis.window.location.hash.slice(1) || '/';
    const route = matchRoute(hash);
    
    // Cleanup previous game runtime when navigating away from player
    if (!hash.startsWith('/play/') && getCurrentGameRuntime()) {
        // Skip session end when navigating away - no XP awarded
        getCurrentGameRuntime().cleanup(false, true);
        setCurrentGameRuntime(null);
    }
    
    // Cleanup community manager when navigating away from community
    if (hash !== '/community' && getCurrentCommunityManager()) {
        getCurrentCommunityManager().destroy();
        setCurrentCommunityManager(null);
    }
    
    if (route) {
        route.handler(route.params);
        updateActiveNavLink(hash);
    } else {
        render404();
    }
}

/**
 * Match the current hash to a route
 */
function matchRoute(path) {
    // Try exact match first
    if (routes[path]) {
        return { handler: routes[path], params: {} };
    }
    
    // Try pattern matching
    for (const [pattern, handler] of Object.entries(routes)) {
        const regex = new RegExp('^' + pattern.replaceAll(/:[^\s/]+/g, String.raw`([\w-]+)`) + '$');
        const match = path.match(regex);
        
        if (match) {
            const paramNames = pattern.match(/:[^\s/]+/g) || [];
            const params = {};
            
            paramNames.forEach((name, index) => {
                params[name.slice(1)] = match[index + 1];
            });
            
            return { handler, params };
        }
    }
    
    return null;
}

/**
 * Navigate to a new route
 */
export function navigateTo(path) {
    globalThis.location.hash = path;
}

/**
 * Update active navigation link
 */
function updateActiveNavLink(currentPath) {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        const route = link.dataset.route;
        if (route === currentPath || (currentPath.startsWith('/game') && route === '/')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

/**
 * Get current route
 */
export function getCurrentRoute() {
    return globalThis.location.hash.slice(1) || '/';
}

/**
 * Get route parameters
 */
export function getRouteParams() {
    const hash = globalThis.location.hash.slice(1) || '/';
    const route = matchRoute(hash);
    return route ? route.params : {};
}

export default {
    initRouter,
    navigateTo,
    getCurrentRoute,
    getRouteParams
};

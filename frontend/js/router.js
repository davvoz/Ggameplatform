import { renderCatalog, renderGameDetail, renderGamePlayer, renderAbout, renderProfile, render404 } from './main.js';

/**
 * Router configuration
 */
const routes = {
    '/': renderCatalog,
    '/about': renderAbout,
    '/profile': renderProfile,
    '/game/:id': renderGameDetail,
    '/play/:id': renderGamePlayer
};

// Flag to prevent duplicate route handling
let isHandlingRoute = false;

/**
 * Initialize the router
 */
export function initRouter() {
    // Listen for hash changes
    window.addEventListener('hashchange', handleRoute);
    
    // Handle initial load
    handleRoute();
}

/**
 * Handle route changes
 */
function handleRoute() {
    // Prevent duplicate handling
    if (isHandlingRoute) {
        console.log('Route handling already in progress, skipping...');
        return;
    }
    
    isHandlingRoute = true;
    
    const hash = window.location.hash.slice(1) || '/';
    const route = matchRoute(hash);
    
    console.log('Handling route:', hash);
    
    // Cleanup previous game runtime when navigating away from player
    if (!hash.startsWith('/play/') && window.currentGameRuntime) {
        window.currentGameRuntime.cleanup();
        window.currentGameRuntime = null;
    }
    
    if (route) {
        route.handler(route.params);
        updateActiveNavLink(hash);
    } else {
        render404();
    }
    
    // Reset flag after a short delay to allow next navigation
    setTimeout(() => {
        isHandlingRoute = false;
    }, 100);
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
        const regex = new RegExp('^' + pattern.replace(/:[^\s/]+/g, '([\\w-]+)') + '$');
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
    window.location.hash = path;
}

/**
 * Update active navigation link
 */
function updateActiveNavLink(currentPath) {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        const route = link.getAttribute('data-route');
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
    return window.location.hash.slice(1) || '/';
}

/**
 * Get route parameters
 */
export function getRouteParams() {
    const hash = window.location.hash.slice(1) || '/';
    const route = matchRoute(hash);
    return route ? route.params : {};
}

export default {
    initRouter,
    navigateTo,
    getCurrentRoute,
    getRouteParams
};

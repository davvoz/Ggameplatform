/**
 * Production Environment Configuration
 * Domain: games.cur8.fun
 * Server: 95.216.27.123 (Hetzner)
 */

window.ENV = {
    // Backend API URL
    API_URL: 'https://games.cur8.fun',
    
    // Frontend URL
    FRONTEND_URL: 'https://games.cur8.fun',
    
    // Environment mode
    MODE: 'production',
    
    // Push Notifications - VAPID public key fetched dynamically from backend
    PUSH_NOTIFICATIONS_ENABLED: true
};

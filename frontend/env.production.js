/**
 * Production Environment Configuration
 * Domain: games.cur8.fun
 * Server: 
 */

globalThis.ENV = {
    // Backend API URL
    API_URL: 'https://games.cur8.fun',
    
    // Frontend URL
    FRONTEND_URL: 'https://games.cur8.fun',
    
    // Environment mode
    MODE: 'production',
    
    // Push Notifications - VAPID public key fetched dynamically from backend
    PUSH_NOTIFICATIONS_ENABLED: true
};

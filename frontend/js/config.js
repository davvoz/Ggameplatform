/**
 * Configuration module for environment variables
 * Supports both build-time and runtime configuration
 */

// Fallback to window.ENV for runtime configuration (no bundler)
const runtimeEnv = typeof window !== 'undefined' && window.ENV ? window.ENV : {};

export const config = {
    // API base URL - priority: window.ENV > same origin > default
    API_URL: runtimeEnv.API_URL || window.location.origin || 'http://localhost:8000',
    
    // Frontend URL - priority: window.ENV > current origin > default
    FRONTEND_URL: runtimeEnv.FRONTEND_URL || window.location.origin || 'http://localhost:3000',
    
    /**
     * Helper method to get full API endpoint
     * @param {string} path - API path (with or without leading slash)
     * @returns {string} Full API URL
     */
    getApiEndpoint(path) {
        const cleanPath = path.startsWith('/') ? path : '/' + path;
        return `${this.API_URL}${cleanPath}`;
    },
    
    /**
     * Get the current environment mode
     * @returns {string} 'development' | 'production'
     */
    getMode() {
        return runtimeEnv.MODE || (this.API_URL.includes('localhost') ? 'development' : 'production');
    },
    
    /**
     * Check if running in development mode
     * @returns {boolean}
     */
    isDevelopment() {
        return this.getMode() === 'development';
    },
    
    /**
     * Check if running in production mode
     * @returns {boolean}
     */
    isProduction() {
        return this.getMode() === 'production';
    }
};

// Log configuration in development
if (config.isDevelopment()) {
   
}

export default config;

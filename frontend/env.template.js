/**
 * Environment configuration template
 * 
 * INSTRUCTIONS:
 * 1. Copy this file to env.js
 * 2. Update the values with your production URLs
 * 3. Include env.js in your HTML BEFORE other scripts
 * 
 * Example in HTML:
 * <script src="/env.js"></script>
 * <script type="module" src="/js/main.js"></script>
 */

window.ENV = {
    // Backend API URL - update this for production
    API_URL: 'http://localhost:8000',
    
    // Frontend URL - update this for production  
    FRONTEND_URL: 'http://localhost:3000',
    
    // Environment mode
    MODE: 'development'
};

// Production example:
// window.ENV = {
//     API_URL: 'https://api.yourdomain.com',
//     FRONTEND_URL: 'https://yourdomain.com',
//     MODE: 'production'
// };

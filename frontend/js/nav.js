/**
 * Mobile Navigation Handler
 */
console.log('nav.js loaded');

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
    });
} else {
    initMobileNav();
    initDbViewerLink();
}

// Backup initialization after a delay
setTimeout(function() {
    if (document.getElementById('navToggle') && document.getElementById('navMenu')) {
        initMobileNav();
        initDbViewerLink();
    }
}, 500);


/**
 * Mobile Navigation Handler
 */
console.log('nav.js loaded');

function initMobileNav() {
    console.log('initMobileNav called');
    
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    
    console.log('navToggle:', navToggle);
    console.log('navMenu:', navMenu);
    
    if (!navToggle || !navMenu) {
        console.warn('Nav elements not found');
        return false;
    }
    
    console.log('Setting up mobile navigation...');
    
    // Remove any existing listeners by cloning
    const newNavToggle = navToggle.cloneNode(true);
    navToggle.parentNode.replaceChild(newNavToggle, navToggle);
    
    // Toggle menu on hamburger click
    newNavToggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const isActive = navMenu.classList.contains('active');
        console.log('Hamburger clicked! Current state:', isActive ? 'active' : 'inactive');
        
        if (isActive) {
            newNavToggle.classList.remove('active');
            navMenu.classList.remove('active');
            console.log('Menu closed');
        } else {
            newNavToggle.classList.add('active');
            navMenu.classList.add('active');
            console.log('Menu opened');
        }
        
        console.log('navToggle classes:', newNavToggle.classList.toString());
        console.log('navMenu classes:', navMenu.classList.toString());
    });
    
    // Close menu when clicking on a link
    const navLinks = navMenu.querySelectorAll('.nav-link');
    console.log('Found nav links:', navLinks.length);
    
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            console.log('Nav link clicked, closing menu');
            newNavToggle.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
        if (!newNavToggle.contains(e.target) && !navMenu.contains(e.target)) {
            if (navMenu.classList.contains('active')) {
                console.log('Clicked outside, closing menu');
                newNavToggle.classList.remove('active');
                navMenu.classList.remove('active');
            }
        }
    });
    
    console.log('Mobile navigation initialized successfully ✓');
    return true;
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    console.log('Waiting for DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOMContentLoaded fired');
        initMobileNav();
    });
} else {
    console.log('DOM already loaded, initializing immediately');
    initMobileNav();
}

// Backup initialization after a delay
setTimeout(function() {
    console.log('Backup initialization check');
    if (document.getElementById('navToggle') && document.getElementById('navMenu')) {
        initMobileNav();
    }
}, 500);


// Authentication Manager
const AuthManager = {
    currentUser: null,
    apiBase: 'http://localhost:8000/users',
    
    init() {
        this.loadUserFromStorage();
        this.attachEventListeners();
        this.updateUI();
    },
    
    attachEventListeners() {
        // Login button
        document.getElementById('loginBtn')?.addEventListener('click', () => {
            this.showAuthModal();
        });
        
        // Logout button
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            this.logout();
        });
        
        // Modal close
        document.querySelector('.close-modal')?.addEventListener('click', () => {
            this.hideAuthModal();
        });
        
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
        
        // Keychain login
        document.getElementById('keychainLoginBtn')?.addEventListener('click', () => {
            this.loginWithKeychain();
        });
        
        // Anonymous login
        document.getElementById('anonymousBtn')?.addEventListener('click', () => {
            this.loginAnonymous();
        });
        
        // Close modal on outside click
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('authModal');
            if (e.target === modal) {
                this.hideAuthModal();
            }
        });
    },
    
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`)?.classList.add('active');
    },
    
    showAuthModal() {
        document.getElementById('authModal').style.display = 'block';
    },
    
    hideAuthModal() {
        document.getElementById('authModal').style.display = 'none';
        // Clear status messages
        document.getElementById('keychainStatus').textContent = '';
        document.getElementById('anonymousStatus').textContent = '';
    },
    
    async loginWithKeychain() {
        const username = document.getElementById('steemUsername').value.trim();
        const multiplier = parseFloat(document.getElementById('steemMultiplier').value);
        const statusEl = document.getElementById('keychainStatus');
        
        if (!username) {
            statusEl.textContent = '⚠️ Please enter your Steem username';
            statusEl.className = 'status-message error';
            return;
        }
        
        // Remove @ if present
        const cleanUsername = username.replace('@', '');
        
        statusEl.textContent = '🔄 Checking Steem Keychain...';
        statusEl.className = 'status-message info';
        
        // Check if Keychain is installed
        if (!window.steem_keychain) {
            statusEl.textContent = '❌ Steem Keychain not found. Please install it first.';
            statusEl.className = 'status-message error';
            
            setTimeout(() => {
                window.open('https://chrome.google.com/webstore/detail/steem-keychain/lkcjlnjfpbikmcmbachjpdbijejflpcm', '_blank');
            }, 2000);
            return;
        }
        
        try {
            // Request Keychain signature for authentication
            statusEl.textContent = '🔐 Please sign with Keychain...';
            
            const message = `Login to Game Platform - ${Date.now()}`;
            
            window.steem_keychain.requestSignBuffer(
                cleanUsername,
                message,
                'Posting',
                async (response) => {
                    if (response.success) {
                        statusEl.textContent = '✅ Signature verified! Creating account...';
                        statusEl.className = 'status-message success';
                        
                        // Register/Login user on backend
                        try {
                            const registerResponse = await fetch(`${this.apiBase}/register`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    username: cleanUsername,
                                    email: `${cleanUsername}@steem.local`,
                                    password: response.result,
                                    cur8_multiplier: multiplier
                                })
                            });
                            
                            let userData;
                            
                            if (registerResponse.ok) {
                                const data = await registerResponse.json();
                                userData = data.user;
                                statusEl.textContent = '✅ Account created successfully!';
                            } else if (registerResponse.status === 400) {
                                // User exists, try login
                                const loginResponse = await fetch(`${this.apiBase}/login`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        username: cleanUsername,
                                        password: response.result
                                    })
                                });
                                
                                if (loginResponse.ok) {
                                    const data = await loginResponse.json();
                                    userData = data.user;
                                    statusEl.textContent = '✅ Welcome back!';
                                } else {
                                    throw new Error('Login failed');
                                }
                            } else {
                                throw new Error('Registration failed');
                            }
                            
                            // Store user data
                            userData.steemUsername = cleanUsername;
                            this.setUser(userData);
                            
                            setTimeout(() => {
                                this.hideAuthModal();
                            }, 1500);
                            
                        } catch (error) {
                            console.error('Backend error:', error);
                            statusEl.textContent = `❌ Error: ${error.message}`;
                            statusEl.className = 'status-message error';
                        }
                    } else {
                        statusEl.textContent = '❌ Signature cancelled or failed';
                        statusEl.className = 'status-message error';
                    }
                }
            );
        } catch (error) {
            console.error('Keychain error:', error);
            statusEl.textContent = `❌ Error: ${error.message}`;
            statusEl.className = 'status-message error';
        }
    },
    
    async loginAnonymous() {
        const statusEl = document.getElementById('anonymousStatus');
        
        statusEl.textContent = '🔄 Creating anonymous session...';
        statusEl.className = 'status-message info';
        
        try {
            const response = await fetch(`${this.apiBase}/anonymous`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cur8_multiplier: 1.0
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                this.setUser(data.user);
                
                statusEl.textContent = '✅ Anonymous session created!';
                statusEl.className = 'status-message success';
                
                setTimeout(() => {
                    this.hideAuthModal();
                }, 1500);
            } else {
                throw new Error('Failed to create anonymous user');
            }
        } catch (error) {
            console.error('Anonymous login error:', error);
            statusEl.textContent = `❌ Error: ${error.message}`;
            statusEl.className = 'status-message error';
        }
    },
    
    setUser(userData) {
        this.currentUser = userData;
        localStorage.setItem('gameplatform_user', JSON.stringify(userData));
        this.updateUI();
        
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('userLogin', { detail: userData }));
    },
    
    loadUserFromStorage() {
        const stored = localStorage.getItem('gameplatform_user');
        if (stored) {
            try {
                this.currentUser = JSON.parse(stored);
            } catch (e) {
                console.error('Failed to parse stored user:', e);
                localStorage.removeItem('gameplatform_user');
            }
        }
    },
    
    logout() {
        this.currentUser = null;
        localStorage.removeItem('gameplatform_user');
        this.updateUI();
        
        // Dispatch custom event
        window.dispatchEvent(new Event('userLogout'));
        
        // Redirect to home if needed
        if (window.location.hash.includes('play')) {
            window.location.hash = '/';
        }
    },
    
    updateUI() {
        const loginBtn = document.getElementById('loginBtn');
        const userInfo = document.getElementById('userInfo');
        const userName = document.getElementById('userName');
        const userCur8 = document.getElementById('userCur8');
        
        if (this.currentUser) {
            // User logged in
            loginBtn.style.display = 'none';
            userInfo.style.display = 'flex';
            
            if (this.currentUser.is_anonymous) {
                userName.textContent = `Guest ${this.currentUser.user_id.slice(-6)}`;
            } else if (this.currentUser.steemUsername) {
                userName.textContent = `@${this.currentUser.steemUsername}`;
            } else {
                userName.textContent = this.currentUser.username || 'User';
            }
            
            userCur8.textContent = `💰 ${this.currentUser.total_cur8_earned.toFixed(2)} CUR8 (${this.currentUser.cur8_multiplier}x)`;
        } else {
            // User not logged in
            loginBtn.style.display = 'block';
            userInfo.style.display = 'none';
        }
    },
    
    getUser() {
        return this.currentUser;
    },
    
    isLoggedIn() {
        return this.currentUser !== null;
    },
    
    requireAuth(callback) {
        if (!this.isLoggedIn()) {
            this.showAuthModal();
            return false;
        }
        if (callback) callback();
        return true;
    }
};

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AuthManager.init());
} else {
    AuthManager.init();
}

// Export for use in other modules
window.AuthManager = AuthManager;

// Authentication Manager
const AuthManager = {
    currentUser: null,

    // Get API base URL from window.ENV (set by env.js)
    get apiBase() {
        const apiUrl = window.ENV?.API_URL || window.location.origin || 'http://localhost:8000';
        return `${apiUrl}/users`;
    },

    init() {
        // Pulisci eventuali banner residui da vecchie sessioni
        document.querySelectorAll('.auth-banner').forEach(el => el.remove());
        document.body.classList.remove('has-auth-banner');

        this.loadUserFromStorage();
        this.attachEventListeners();
        this.updateUI().catch(err => console.error('Failed to update UI:', err));


        // Force UI update after a short delay to ensure DOM is ready
        setTimeout(() => {
            this.updateUI().catch(err => console.error('Failed to update UI:', err));
        }, 100);
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
        // Usa la stessa chiave usata da authManager.js per compatibilità
        localStorage.setItem('currentUser', JSON.stringify(userData));
        localStorage.setItem('gameplatform_user', JSON.stringify(userData));


        this.updateUI().catch(err => console.error('Failed to update UI:', err));

        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('userLogin', { detail: userData }));
    },

    loadUserFromStorage() {
        // Prova prima con 'gameplatform_user', poi con 'currentUser' per compatibilità
        let stored = localStorage.getItem('gameplatform_user');
        if (!stored) {
            stored = localStorage.getItem('currentUser');
        }
        if (stored) {
            try {
                this.currentUser = JSON.parse(stored);
            } catch (e) {
                console.error('Failed to parse stored user:', e);
                localStorage.removeItem('gameplatform_user');
                localStorage.removeItem('currentUser');
            }
        } else {
            console.log('AuthManager: nessun utente salvato in localStorage');
        }
    },

    logout() {
        this.currentUser = null;
        localStorage.removeItem('gameplatform_user');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authMethod');
        this.updateUI().catch(err => console.error('Failed to update UI:', err));

        // Dispatch custom event
        window.dispatchEvent(new Event('userLogout'));

        // Redirect to auth page
        window.location.href = '/auth.html';
    },

    async updateUI() {
        const userInfo = document.getElementById('userInfo');
        const userName = document.getElementById('userName');
        const userCur8 = document.getElementById('userCur8');
        const profileLink = document.getElementById('profileLink');
        const questsLink = document.getElementById('questsLink');



        // Verifica che gli elementi esistano (potrebbero non essere presenti in tutte le pagine)
        if (!userInfo || !userName || !userCur8) {
            return;
        }


        if (this.currentUser) {
            // User logged in
            userInfo.style.display = 'flex';

            // Show profile link
            if (profileLink) {
                profileLink.classList.remove('auth-required');
                profileLink.style.display = 'inline-block';
            }

            // Show Quests link only for non-anonymous users
            if (questsLink) {
                if (this.currentUser.is_anonymous) {
                    questsLink.classList.add('auth-required');
                    questsLink.style.display = 'none';
                } else {
                    questsLink.classList.remove('auth-required');
                    questsLink.style.display = 'inline-block';
                }
            } else {
                console.log('AuthManager: questsLink NON trovato nel DOM');
            }

            let displayName = '';
            let badge = '';

            if (this.currentUser.is_anonymous) {
                badge = '👤 ';
                displayName = `Guest #${this.currentUser.user_id.slice(-6)}`;
            } else if (this.currentUser.steemUsername) {
                badge = '⚡ ';
                displayName = this.currentUser.steemUsername;
            } else {
                displayName = this.currentUser.username || 'User';
            }

            userName.textContent = badge + displayName;

            // Carica info livello
            try {
                const API_URL = window.ENV?.API_URL || window.location.origin;
                const response = await fetch(`${API_URL}/api/levels/${this.currentUser.user_id}`);
                if (response.ok) {
                    const levelInfo = await response.json();
                    userCur8.style.backgroundColor = levelInfo.color;
                    
                    userCur8.innerHTML = `
                        <div class="level-badge-container">
                            <span class="level-badge-icon">${levelInfo.badge}</span>
                            <div class="level-badge-info">
                                <div class="level-badge-title">
                                    <span class="level-badge-number">Lv${levelInfo.current_level}</span>
                                    <span class="level-badge-separator">·</span>
                                    <span>${levelInfo.title}</span>
                                </div>
                                <div class="level-badge-progress-container">
                                    <div class="level-badge-progress-bar">
                                        <div class="level-badge-progress-fill" style="width: ${levelInfo.progress_percent}%;"></div>
                                    </div>
                                    <span class="level-badge-progress-text">${levelInfo.progress_percent.toFixed(0)}%</span>
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    // Fallback se API non risponde
                    const cur8Total = this.currentUser.total_xp_earned || 0;
                    const multiplier = this.currentUser.cur8_multiplier || 1.0;
                    userCur8.textContent = `XP ${multiplier}x 💰 ${cur8Total.toFixed(2)} XP`;
                }
            } catch (error) {
                console.error('Failed to load level info:', error);
                const cur8Total = this.currentUser.total_xp_earned || 0;
                const multiplier = this.currentUser.cur8_multiplier || 1.0;
                userCur8.textContent = `XP ${multiplier}x 💰 ${cur8Total.toFixed(2)} XP`;
            }

        } else {
            // User not logged in
            userInfo.style.display = 'none';
            if (profileLink) {
                profileLink.classList.add('auth-required');
                profileLink.style.display = 'none';
            }
            if (questsLink) {
                questsLink.classList.add('auth-required');
                questsLink.style.display = 'none';
            }
        }
    },

    updateCur8(amount) {
        if (this.currentUser) {
            const oldTotal = this.currentUser.total_xp_earned || 0;
            this.currentUser.total_xp_earned = oldTotal + amount;

            // Salva in localStorage
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            localStorage.setItem('gameplatform_user', JSON.stringify(this.currentUser));

            // Aggiorna UI immediatamente
            this.updateUI().catch(err => console.error('Failed to update UI:', err));
        } else {
            console.warn('⚠️ updateCur8: Nessun utente loggato');
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
    },

    /**
     * Track daily access for login quests
     * Called once per day to update login streak and login quests
     */
    async trackDailyAccess() {
        if (!this.currentUser || !this.currentUser.user_id) {
            return;
        }

        try {
            // Check if we already tracked today
            const lastTrackedDate = localStorage.getItem('lastDailyAccessTracked');
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            
            if (lastTrackedDate === today) {
                // Already tracked today, skip
                return;
            }

            const apiUrl = window.ENV?.API_URL || window.location.origin || 'http://localhost:8000';
            const response = await fetch(`${apiUrl}/users/daily-access`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: this.currentUser.user_id
                })
            });

            if (response.ok) {
                const data = await response.json();
                
                // Save that we tracked today
                localStorage.setItem('lastDailyAccessTracked', today);
                
                // Update login streak if available
                if (data.login_streak !== undefined) {
                    this.currentUser.login_streak = data.login_streak;
                    localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                    localStorage.setItem('gameplatform_user', JSON.stringify(this.currentUser));
                }
                
                console.log('✅ Daily access tracked:', data);
            }
        } catch (error) {
            console.error('Error tracking daily access:', error);
        }
    }
};

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AuthManager.init());
} else {
    AuthManager.init();
}

// Listen for login event and update UI
window.addEventListener('userLogin', () => {
    AuthManager.updateUI();
});

// Export for use in other modules
window.AuthManager = AuthManager;

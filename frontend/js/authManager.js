/**
 * Authentication Manager
 * Gestisce autenticazione utenti (Steem, Anonymous, Standard)
 */

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.authMethod = null;
        this.platformEpoch = null;
        this.loadFromStorage();
    }

    /**
     * Carica utente da localStorage
     */
    loadFromStorage() {
        const userStr = localStorage.getItem('currentUser');
        const method = localStorage.getItem('authMethod');
        this.platformEpoch = localStorage.getItem('platformEpoch');
        
        if (userStr) {
            try {
                this.currentUser = JSON.parse(userStr);
                this.authMethod = method || 'unknown';
            } catch (e) {
                console.error('Failed to parse user from storage', e);
                this.clearAuth();
            }
        }
    }

    /**
     * Salva utente in localStorage
     */
    saveToStorage() {
        if (this.currentUser) {
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            localStorage.setItem('authMethod', this.authMethod);
            if (this.platformEpoch) {
                localStorage.setItem('platformEpoch', this.platformEpoch);
            }
        }
    }

    /**
     * Verifica il platform epoch e fa logout se la piattaforma è stata resettata
     */
    async checkPlatformEpoch() {
        try {
            const API_URL = window.ENV?.API_URL || window.config?.API_URL || window.location.origin;
            const response = await fetch(`${API_URL}/api/platform/info`);
            
            if (response.ok) {
                const data = await response.json();
                const serverEpoch = data.platform_epoch;
                
                // Se abbiamo un epoch salvato e è diverso da quello del server, logout
                if (this.platformEpoch && serverEpoch && this.platformEpoch !== serverEpoch) {
                    console.log('🔄 Platform has been reset. Logging out...');
                    this.clearAuth();
                    // Salva il nuovo epoch
                    localStorage.setItem('platformEpoch', serverEpoch);
                    // Redirect a login se non siamo già lì
                    if (!window.location.pathname.includes('auth.html')) {
                        window.location.href = '/auth.html?reason=platform_reset';
                    }
                    return false;
                }
                
                // Aggiorna l'epoch salvato
                this.platformEpoch = serverEpoch;
                localStorage.setItem('platformEpoch', serverEpoch);
            }
        } catch (e) {
            console.warn('Failed to check platform epoch:', e);
        }
        return true;
    }

    /**
     * Verifica se l'utente è autenticato
     */
    isAuthenticated() {
        return this.currentUser !== null;
    }

    /**
     * Ottiene l'utente corrente
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Ottiene il metodo di autenticazione
     */
    getAuthMethod() {
        return this.authMethod;
    }

    /**
     * Verifica se l'utente è anonimo
     */
    isAnonymous() {
        return this.currentUser?.is_anonymous === true;
    }

    /**
     * Verifica se l'utente è autenticato con Steem
     */
    isSteemUser() {
        return this.authMethod === 'steem_keychain';
    }

    /**
     * Ottiene il moltiplicatore CUR8
     */
    getCur8Multiplier() {
        return this.currentUser?.cur8_multiplier || 1.0;
    }

    /**
     * Ottiene il totale XP guadagnato
     */
    getTotalCur8() {
        return this.currentUser?.total_xp_earned || 0.0;
    }

    /**
     * Imposta l'utente corrente
     */
    setUser(user, method = 'standard') {
        this.currentUser = user;
        this.authMethod = method;
        this.saveToStorage();
        this.emitAuthChange();
    }

    /**
     * Pulisce l'autenticazione
     */
    clearAuth() {
        this.currentUser = null;
        this.authMethod = null;
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authMethod');
        this.emitAuthChange();
    }

    /**
     * Logout
     */
    logout() {
        if (confirm('Sei sicuro di voler disconnetterti?')) {
            this.clearAuth();
            window.location.href = '/auth.html';
        }
    }

    /**
     * Richiede login se non autenticato
     */
    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = '/auth.html';
            return false;
        }
        return true;
    }

    /**
     * Aggiorna le informazioni utente nella navbar
     */
    async showUserBanner() {
        if (!this.isAuthenticated()) {
            // Nascondi userInfo se non autenticato
            const userInfo = document.getElementById('userInfo');
            if (userInfo) {
                userInfo.style.display = 'none';
            }
            return;
        }

        // Mostra e aggiorna userInfo nella navbar esistente
        const userInfo = document.getElementById('userInfo');
        const userName = document.getElementById('userName');
        const levelBadgeContainer = document.getElementById('levelBadgeContainer');
        
        if (userInfo && userName && levelBadgeContainer) {
            let displayName = this.currentUser.username || `Anonymous #${this.currentUser.user_id.slice(-6)}`;
            
            // Aggiungi badge per tipo di autenticazione
            let methodBadge = '';
            if (this.isSteemUser()) {
                methodBadge = '⚡ ';
            } else if (this.isAnonymous()) {
                methodBadge = '👤 ';
            }
            
            userName.textContent = methodBadge + displayName;
            
            // Fetch level info and show compact level display
            try {
                const API_URL = window.ENV?.API_URL || window.config?.API_URL || window.location.origin;
                const response = await fetch(`${API_URL}/api/levels/${this.currentUser.user_id}`);
                if (response.ok) {
                    const levelInfo = await response.json();
                    // Fallbacks for old/new field names
                    const xpInLevel = levelInfo.xp_in_level ?? (levelInfo.current_xp - levelInfo.xp_current_level || 0);
                    const xpRequired = levelInfo.xp_required_for_next_level ?? levelInfo.xp_needed_for_next ?? (levelInfo.xp_next_level - levelInfo.xp_current_level);
                    const xpToNext = levelInfo.xp_to_next_level ?? Math.max(0, xpRequired - xpInLevel);

                    levelBadgeContainer.innerHTML = `
                        <div class="level-badge-container">
                            <span class="level-color-swatch"><span class="level-badge-icon">${levelInfo.badge}</span></span>
                            <div class="level-badge-info">
                                <div class="level-badge-title">
                                    <span class="level-badge-number">Lv${levelInfo.current_level}</span>
                                    <span class="level-badge-separator">·</span>
                                    <span>${levelInfo.title}</span>
                                </div>
                                <div class="level-badge-progress-container">
                                    <div class="level-badge-progress-bar">
                                        <div class="level-badge-progress-fill"></div>
                                    </div>
                                    <span class="level-badge-progress-text">${Math.round(xpInLevel)} / ${Math.round(xpRequired)} XP</span>
                                </div>
                            </div>
                        </div>
                    `;

                    // Safely set CSS variables so missing values don't produce invalid css tokens
                    try {
                        const created = levelBadgeContainer.querySelector('.level-badge-container');
                        if (created) {
                            const safeColor = levelInfo.color || getComputedStyle(document.documentElement).getPropertyValue('--primary-color') || '#6366f1';
                            const percent = Number(levelInfo.progress_percent) || 0;
                            created.style.setProperty('--level-color', safeColor);
                            created.style.setProperty('--progress-percent', `${percent}%`);
                        }
                    } catch (e) {

                    }
                } else {
                    // Fallback to XP display
                    levelBadgeContainer.textContent = `⭐ ${this.getTotalCur8().toFixed(2)} XP`;
                }
            } catch (error) {
                console.error('Failed to load level for navbar:', error);
                levelBadgeContainer.textContent = `⭐ ${this.getTotalCur8().toFixed(2)} XP`;
            }
            
            userInfo.style.display = 'flex';
        }
    }

    /**
     * Emit auth change event
     */
    emitAuthChange() {
        window.dispatchEvent(new CustomEvent('authchange', {
            detail: {
                user: this.currentUser,
                method: this.authMethod,
                isAuthenticated: this.isAuthenticated()
            }
        }));
        
        // Dispatch also auth-state-changed for quest badge
        window.dispatchEvent(new Event('auth-state-changed'));
    }

    /**
     * Aggiorna XP dell'utente corrente
     */
    updateCur8(amount) {
        if (this.currentUser) {
            this.currentUser.total_xp_earned = (this.currentUser.total_xp_earned || 0) + amount;
            this.saveToStorage();
            this.showUserBanner(); // Aggiorna banner
        }
    }

    /**
     * Aggiorna i dati utente dal server e sincronizza la navbar
     * @returns {Promise<Object|null>} Dati utente aggiornati o null
     */
    async refreshUserData() {
        if (!this.currentUser || !this.currentUser.user_id) {
            return null;
        }

        try {
            // Importa config dinamicamente per evitare dipendenze circolari
            const { config } = await import('./config.js');
            
            const response = await fetch(`${config.API_URL}/users/users/${this.currentUser.user_id}`);
            
            if (response.ok) {
                const userData = await response.json();
                const freshUser = userData.user;
                
                // Aggiorna i dati utente mantenendo il metodo di autenticazione
                this.currentUser = {
                    ...this.currentUser,
                    total_xp_earned: freshUser.total_xp_earned,
                    cur8_multiplier: freshUser.cur8_multiplier,
                    game_scores_enriched: freshUser.game_scores_enriched
                };
                
                this.saveToStorage();
                this.showUserBanner(); // Aggiorna la navbar con dati freschi
                
                return this.currentUser;
            } else {
                return null;
            }
        } catch (error) {
            console.error('Error refreshing user data:', error);
            return null;
        }
    }

    /**
     * Traccia l'accesso giornaliero per le quest di login
     * Viene chiamato una volta al giorno quando l'utente visita la piattaforma
     */
    async trackDailyAccess() {
        if (!this.currentUser || !this.currentUser.user_id) {
            return;
        }

        try {
            // Verifica se abbiamo già tracciato oggi
            const lastTrackedDate = localStorage.getItem('lastDailyAccessTracked');
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            
            if (lastTrackedDate === today) {
                // Già tracciato oggi, skip
                return;
            }

            // Importa config dinamicamente
            const { config } = await import('./config.js');
            
            const response = await fetch(`${config.API_URL}/users/daily-access`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: this.currentUser.user_id
                })
            });

            if (response.ok) {
                const data = await response.json();
                
                // Salva che abbiamo tracciato oggi
                localStorage.setItem('lastDailyAccessTracked', today);
                
                // Aggiorna login streak se disponibile
                if (data.login_streak !== undefined) {
                    this.currentUser.login_streak = data.login_streak;
                    this.saveToStorage();
                }
                

            }
        } catch (error) {
            console.error('Error tracking daily access:', error);
        }
    }
}

// Istanza globale
const authManager = new AuthManager();

// Esporta per uso nei moduli
export default authManager;

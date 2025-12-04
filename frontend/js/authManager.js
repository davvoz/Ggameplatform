/**
 * Authentication Manager
 * Gestisce autenticazione utenti (Steem, Anonymous, Standard)
 */

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.authMethod = null;
        this.loadFromStorage();
    }

    /**
     * Carica utente da localStorage
     */
    loadFromStorage() {
        const userStr = localStorage.getItem('currentUser');
        const method = localStorage.getItem('authMethod');
        
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
        }
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
        const userCur8 = document.getElementById('userCur8');
        
        if (userInfo && userName && userCur8) {
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
                    userCur8.innerHTML = `
                        <span style="font-size: 18px; margin-right: 4px;">${levelInfo.badge}</span>
                        <span style="font-weight: 600;">Lv${levelInfo.current_level}</span>
                        <span style="font-size: 11px; opacity: 0.7; margin-left: 4px;">(${levelInfo.progress_percent.toFixed(0)}%)</span>
                    `;
                    userCur8.title = `${levelInfo.title} - ${levelInfo.current_xp.toFixed(0)} XP`;
                } else {
                    // Fallback to XP display
                    userCur8.textContent = `⭐ ${this.getTotalCur8().toFixed(2)} XP`;
                }
            } catch (error) {
                console.error('Failed to load level for navbar:', error);
                userCur8.textContent = `⭐ ${this.getTotalCur8().toFixed(2)} XP`;
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
}

// Istanza globale
const authManager = new AuthManager();

// Esporta per uso nei moduli
export default authManager;

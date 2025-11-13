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
    showUserBanner() {
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
            userCur8.textContent = `⭐ ${this.getTotalCur8().toFixed(2)} XP`;
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
}

// Istanza globale
const authManager = new AuthManager();

// Esporta per uso nei moduli
export default authManager;

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
     * Ottiene il totale CUR8 guadagnato
     */
    getTotalCur8() {
        return this.currentUser?.total_cur8_earned || 0.0;
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
     * Mostra banner informativo dell'utente
     */
    showUserBanner() {
        const existingBanner = document.querySelector('.auth-banner');
        if (existingBanner) {
            existingBanner.remove();
        }

        if (!this.isAuthenticated()) {
            return;
        }

        const banner = document.createElement('div');
        banner.className = 'auth-banner';
        
        let username = this.currentUser.username || `Anonymous #${this.currentUser.user_id.slice(-6)}`;
        let multiplierInfo = `CUR8 ${this.getCur8Multiplier()}x`;
        let methodBadge = '';

        if (this.isSteemUser()) {
            methodBadge = '<span class="badge steem">⚡ Steem</span>';
        } else if (this.isAnonymous()) {
            methodBadge = '<span class="badge anon">👤 Guest</span>';
        }

        banner.innerHTML = `
            <div class="user-info-banner">
                ${methodBadge}
                <span class="username">${username}</span>
                <span class="multiplier">${multiplierInfo}</span>
                <span class="cur8-total">💰 ${this.getTotalCur8().toFixed(2)} CUR8</span>
                <button class="logout-btn" onclick="authManager.logout()">Logout</button>
            </div>
        `;

        // Aggiungi stili
        const style = document.createElement('style');
        style.textContent = `
            .auth-banner {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 12px 20px;
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                z-index: 1000;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .user-info-banner {
                max-width: 1200px;
                margin: 0 auto;
                display: flex;
                align-items: center;
                gap: 16px;
                color: white;
                font-size: 0.9em;
            }
            .user-info-banner .username {
                font-weight: 600;
                flex: 1;
            }
            .user-info-banner .badge {
                padding: 4px 10px;
                border-radius: 12px;
                font-size: 0.85em;
                font-weight: 600;
            }
            .user-info-banner .badge.steem {
                background: #ffd700;
                color: #1a1a1a;
            }
            .user-info-banner .badge.anon {
                background: rgba(255,255,255,0.2);
            }
            .user-info-banner .logout-btn {
                background: rgba(255,255,255,0.2);
                border: 1px solid rgba(255,255,255,0.3);
                color: white;
                padding: 6px 14px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.9em;
            }
            .user-info-banner .logout-btn:hover {
                background: rgba(255,255,255,0.3);
            }
            body.has-auth-banner {
                padding-top: 50px;
            }
        `;
        document.head.appendChild(style);

        document.body.insertBefore(banner, document.body.firstChild);
        document.body.classList.add('has-auth-banner');
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
     * Aggiorna CUR8 dell'utente corrente
     */
    updateCur8(amount) {
        if (this.currentUser) {
            this.currentUser.total_cur8_earned = (this.currentUser.total_cur8_earned || 0) + amount;
            this.saveToStorage();
            this.showUserBanner(); // Aggiorna banner
        }
    }
}

// Istanza globale
const authManager = new AuthManager();

// Mostra banner all'avvio se autenticato
if (authManager.isAuthenticated()) {
    document.addEventListener('DOMContentLoaded', () => {
        authManager.showUserBanner();
    });
}

// Esporta per uso nei moduli
export default authManager;

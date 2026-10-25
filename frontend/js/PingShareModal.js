import { getCoinBalanceWidget } from './state.js';
import { paintPingCard } from './PingShareCard.js';
import postingKeyVault from './PostingKeyVault.js';

/**
 * Ping Share Modal
 * Shows the ping of a finished game (its picture and its text), what it costs
 * and how many pings are left today, then publishes it under today's
 * cur8.fun Pings wall the way the player signed in: with Keychain, or with
 * the posting key kept at login (asked for only when it is not there).
 */

const SIGN_KEYCHAIN = 'keychain';
const SIGN_POSTING_KEY = 'posting_key';

class PingShareModal {
    constructor(pingsAPI, authManager, { onShared = null } = {}) {
        this.pingsAPI = pingsAPI;
        this.authManager = authManager;
        this.onShared = onShared;
        this.modalElement = null;
        this.sessionId = null;
        this.preview = null;
        this.picture = null;
        this.uploadedImageUrl = null;
        this.signing = null;
        this.keepKey = false;
        this.savedKey = null;
    }

    /** Sign the way the player logged in; without a known login method, Keychain when installed */
    async resolveSigning() {
        let method = null;
        try {
            method = localStorage.getItem('authMethod');
        } catch {
            // storage unavailable: fall back below
        }
        this.keepKey = method === 'steem_posting_key';
        if (this.keepKey) {
            this.signing = SIGN_POSTING_KEY;
            this.savedKey = await postingKeyVault.load(this.preview.card.username);
        } else if (method === 'steem_keychain' || this.pingsAPI.isKeychainAvailable()) {
            this.signing = SIGN_KEYCHAIN;
        } else {
            this.signing = SIGN_POSTING_KEY;
        }
    }

    /**
     * Open the dialog for an ended game session
     * @param {string} sessionId - Ended game session ID
     */
    async show(sessionId) {
        this.sessionId = sessionId;
        this.uploadedImageUrl = null;
        this.exitFullscreen();
        this.createModal();

        try {
            this.preview = await this.pingsAPI.preview(sessionId);
            [this.picture] = await Promise.all([paintPingCard(this.preview.card), this.resolveSigning()]);
            this.renderPreview();
        } catch (error) {
            this.renderError(error.message);
        }
    }

    /** The dialog lives on the page: leave the game's fullscreen to show it (and Keychain's popup) */
    exitFullscreen() {
        if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => { });
        } else if (document.webkitFullscreenElement && document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    }

    createModal() {
        document.getElementById('pingShareModal')?.remove();

        document.body.insertAdjacentHTML('beforeend', `
            <div id="pingShareModal" class="ping-modal">
                <div class="ping-modal-overlay"></div>
                <div class="ping-modal-content">
                    <div class="ping-modal-header">
                        <h2>📣 Post on Pings</h2>
                        <button class="ping-modal-close" id="closePingModal" aria-label="Close">&times;</button>
                    </div>
                    <div class="ping-modal-body" id="pingModalBody">
                        <div class="ping-loading"><div class="spinner-small"></div><span>Preparing your ping...</span></div>
                    </div>
                    <div class="ping-modal-footer" id="pingModalFooter" style="display: none;"></div>
                </div>
            </div>
        `);
        this.modalElement = document.getElementById('pingShareModal');
        this.modalElement.querySelector('#closePingModal').addEventListener('click', () => this.close());
        this.modalElement.querySelector('.ping-modal-overlay').addEventListener('click', () => this.close());
        setTimeout(() => this.modalElement?.classList.add('active'), 10);
    }

    renderPreview() {
        if (!this.modalElement) return;
        const body = this.modalElement.querySelector('#pingModalBody');
        body.innerHTML = `
            <img class="ping-card-preview" alt="Picture of your result" />
            <div class="ping-text-preview"></div>
        `;
        body.querySelector('.ping-card-preview').src = this.picture.dataUrl;
        body.querySelector('.ping-text-preview').textContent = this.preview.text;

        if (this.preview.already_shared) {
            this.renderFooterMessage('✅ You already shared this game on Pings.');
            return;
        }
        this.renderFooter();
    }

    renderFooter() {
        const { cost_coins: cost, remaining_today: remaining, daily_limit: limit, balance } = this.preview;
        const blocked = this.blockedReason();

        const footer = this.modalElement.querySelector('#pingModalFooter');
        footer.style.display = 'flex';
        footer.innerHTML = `
            <div class="ping-footer-info">
                <div class="ping-quota">
                    <span>🪙 ${cost} coins</span>
                    <span>📅 ${remaining}/${limit} left today</span>
                    <span>Balance: ${balance} 🪙</span>
                </div>
                ${blocked ? `<div class="ping-blocked">${blocked}</div>` : this.authHTML()}
            </div>
            <button id="postPingBtn" class="btn-primary" ${blocked ? 'disabled' : ''}>
                <span class="btn-icon">🚀</span><span>Post ping</span>
            </button>
        `;
        footer.querySelector('#postPingBtn').addEventListener('click', () => this.post());
    }

    /** Why the ping cannot be posted now, if it cannot */
    blockedReason() {
        const { cost_coins: cost, remaining_today: remaining, daily_limit: limit, balance } = this.preview;
        if (remaining <= 0) return `You posted ${limit} pings today. Come back tomorrow!`;
        if (balance < cost) return `Insufficient balance: a ping costs ${cost} coins.`;
        return null;
    }

    authHTML() {
        if (this.signing === SIGN_KEYCHAIN) {
            return `<div class="ping-auth-notice">🔐 You'll confirm with Steem Keychain</div>`;
        }
        if (this.savedKey) {
            return `<div class="ping-auth-notice">🔑 Signed with the posting key you logged in with</div>`;
        }
        const hint = this.keepKey
            ? 'It will be kept encrypted in this browser for your next pings, until you log out'
            : 'Your key is never stored and only used for this ping';
        return `
            <label class="ping-key-label" for="pingPostingKey">🔑 Your Posting Key:</label>
            <input type="password" id="pingPostingKey" class="posting-key-input" placeholder="Enter your posting key..." autocomplete="off" />
            <small class="ping-key-hint">${hint}</small>
        `;
    }

    renderFooterMessage(message) {
        const footer = this.modalElement.querySelector('#pingModalFooter');
        footer.style.display = 'flex';
        footer.innerHTML = `<div class="ping-footer-info"><div class="ping-auth-notice">${message}</div></div>`;
    }

    renderError(message) {
        const body = this.modalElement?.querySelector('#pingModalBody');
        if (!body) return;
        body.innerHTML = `<div class="ping-error"></div>`;
        body.querySelector('.ping-error').textContent = `⚠️ ${message}`;
    }

    async post() {
        const button = this.modalElement.querySelector('#postPingBtn');
        const keyInput = this.modalElement.querySelector('#pingPostingKey');
        const withKeychain = this.signing === SIGN_KEYCHAIN;
        const postingKey = this.savedKey || keyInput?.value.trim();

        if (!withKeychain && !postingKey) {
            alert('Please enter your posting key to publish.');
            return;
        }

        try {
            this.setButtonLoading(button, 'Uploading picture...');
            if (!this.uploadedImageUrl) {
                this.uploadedImageUrl = await this.pingsAPI.uploadImage(this.picture.base64);
            }

            let postUrl;
            if (withKeychain) {
                this.setButtonLoading(button, 'Waiting for Keychain...');
                const prepared = await this.pingsAPI.prepare(this.sessionId, this.uploadedImageUrl);
                await this.pingsAPI.broadcastWithKeychain(prepared.author, prepared.keychain_operations);
                postUrl = prepared.post_url;
                // The ping is on the chain: a failed confirmation must not tell the player it was not posted
                await this.pingsAPI.confirm(this.sessionId, prepared.permlink)
                    .catch((error) => console.error('Ping confirmation failed:', error));
            } else {
                this.setButtonLoading(button, 'Publishing...');
                const result = await this.pingsAPI.publishWithKey(this.sessionId, postingKey, this.uploadedImageUrl);
                postUrl = result.post_url;
                if (keyInput) keyInput.value = '';
                if (this.keepKey && !this.savedKey) {
                    await postingKeyVault.save(this.preview.card.username, postingKey);
                }
            }

            this.showSuccess(postUrl);
            this.onShared?.(this.sessionId);
            await getCoinBalanceWidget()?.updateBalance();
        } catch (error) {
            if (error.status === 401 && this.savedKey && /posting key/i.test(error.message)) {
                // The kept key no longer signs for the account (changed on the chain): ask for it
                await postingKeyVault.clear();
                this.savedKey = null;
                alert('Your saved posting key was refused. Please enter it again.');
                this.renderFooter();
                return;
            }
            alert(`Ping failed: ${error.message}`);
            button.disabled = false;
            button.innerHTML = '<span class="btn-icon">🚀</span><span>Post ping</span>';
        }
    }

    setButtonLoading(button, message) {
        button.disabled = true;
        button.innerHTML = `<div class="spinner-small"></div><span>${message}</span>`;
    }

    showSuccess(postUrl) {
        if (!this.modalElement) return;
        const body = this.modalElement.querySelector('#pingModalBody');
        body.innerHTML = `
            <div class="success-message">
                <div class="success-icon">🎉</div>
                <h2>Ping posted!</h2>
                <p>Your result is on cur8.fun Pings.</p>
                <div class="success-actions">
                    <a target="_blank" rel="noopener" class="btn-view-post"><span>📄 View ping</span></a>
                    <button class="btn-close-success">Close</button>
                </div>
            </div>
        `;
        body.querySelector('.btn-view-post').href = postUrl;
        body.querySelector('.btn-close-success').addEventListener('click', () => this.close());
        this.modalElement.querySelector('#pingModalFooter').style.display = 'none';
    }

    close() {
        if (!this.modalElement) return;
        const modal = this.modalElement;
        this.modalElement = null;
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    }
}

export default PingShareModal;

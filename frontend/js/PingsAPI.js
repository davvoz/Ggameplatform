/**
 * Pings API Client
 * Sharing a finished game as a ping on cur8.fun: the ping is built by the
 * backend from the ended session, published with Keychain or the posting key.
 */

import { config } from './config.js';

class PingsAPI {
    constructor(baseUrl) {
        this.baseUrl = baseUrl || config.API_URL;
    }

    async _request(path, options = {}) {
        const response = await fetch(`${this.baseUrl}/api/pings${path}`, {
            ...options,
            headers: { 'Content-Type': 'application/json', ...options.headers }
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            const error = new Error(data.detail || `Request failed (${response.status})`);
            error.status = response.status;
            throw error;
        }
        return data;
    }

    /**
     * The ping of an ended game: text, picture data, cost and pings left today
     * @param {string} sessionId - Ended game session ID
     */
    preview(sessionId) {
        return this._request(`/preview/${encodeURIComponent(sessionId)}`);
    }

    /**
     * Keychain operations for the ping under today's wall
     * @param {string} sessionId - Ended game session ID
     * @param {string|null} imageUrl - Hosted picture of the result
     */
    prepare(sessionId, imageUrl) {
        return this._request('/prepare', {
            method: 'POST',
            body: JSON.stringify({ session_id: sessionId, image_url: imageUrl })
        });
    }

    /**
     * Spend the coins of a ping Keychain has broadcast
     * @param {string} sessionId - Ended game session ID
     * @param {string} permlink - The ping's permlink
     */
    confirm(sessionId, permlink) {
        return this._request('/confirm', {
            method: 'POST',
            body: JSON.stringify({ session_id: sessionId, permlink })
        });
    }

    /**
     * Publish the ping with the posting key (via backend, never stored)
     * @param {string} sessionId - Ended game session ID
     * @param {string} postingKey - User's posting key
     * @param {string|null} imageUrl - Hosted picture of the result
     */
    publishWithKey(sessionId, postingKey, imageUrl) {
        return this._request('/publish-with-key', {
            method: 'POST',
            body: JSON.stringify({ session_id: sessionId, posting_key: postingKey, image_url: imageUrl })
        });
    }

    /**
     * Host the picture of the result (base64 JPEG, without the data URL prefix)
     * @param {string} base64 - Image data
     * @returns {Promise<string>} Image URL
     */
    async uploadImage(base64) {
        const response = await fetch(`${this.baseUrl}/api/steem/upload_image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_base64: base64 })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.image_url) {
            throw new Error(data.detail || 'The picture could not be uploaded, try again');
        }
        return data.image_url;
    }

    /**
     * Broadcast the ping with Steem Keychain
     * @param {string} username - Steem username
     * @param {Array} operations - Operations prepared by the backend
     */
    broadcastWithKeychain(username, operations) {
        return new Promise((resolve, reject) => {
            if (!this.isKeychainAvailable()) {
                reject(new Error('Steem Keychain not found. Please install it first.'));
                return;
            }
            globalThis.steem_keychain.requestBroadcast(username, operations, 'Posting', (response) => {
                if (response.success) {
                    resolve(response);
                } else {
                    reject(new Error(response.message || 'Ping cancelled or failed'));
                }
            });
        });
    }

    isKeychainAvailable() {
        return typeof globalThis.steem_keychain === 'object' && globalThis.steem_keychain !== null;
    }
}

export default PingsAPI;

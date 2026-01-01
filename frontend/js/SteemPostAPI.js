/**
 * Steem Post API Client
 * Handles API calls for Steem post publishing and interaction with Keychain
 */

class SteemPostAPI {
    constructor(baseUrl) {
        this.baseUrl = baseUrl || window.ENV?.API_URL || 'http://localhost:8000';
    }

    /**
     * Get the cost in coins to publish a post
     */
    async getPostCost() {
        try {
            const response = await fetch(`${this.baseUrl}/api/steem/post-cost`);
            if (!response.ok) throw new Error('Failed to fetch post cost');
            return await response.json();
        } catch (error) {
            console.error('Error fetching post cost:', error);
            throw error;
        }
    }

    /**
     * Get a preview of the post before publishing
     * @param {string} userId - User ID
     * @param {string} userMessage - Optional personal message from user
     */
    async previewPost(userId, userMessage = null) {
        try {
            const response = await fetch(`${this.baseUrl}/api/steem/preview-post`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: userId,
                    user_message: userMessage
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to generate preview');
            }

            return await response.json();
        } catch (error) {
            console.error('Error generating post preview:', error);
            throw error;
        }
    }

    /**
     * Check if user can publish a post (cooldown check)
     * @param {string} userId - User ID
     */
    async checkPostAvailability(userId) {
        try {
            const response = await fetch(`${this.baseUrl}/api/steem/post-availability/${userId}`);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to check post availability');
            }

            return await response.json();
        } catch (error) {
            console.error('Error checking post availability:', error);
            throw error;
        }
    }

    /**
     * Create post data and deduct coins (actual publishing happens via Keychain)
     * @param {string} userId - User ID
     * @param {string} userMessage - Optional personal message from user
     */
    async createPost(userId, userMessage = null) {
        try {
            const response = await fetch(`${this.baseUrl}/api/steem/create-post`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: userId,
                    user_message: userMessage
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to create post');
            }

            return await response.json();
        } catch (error) {
            console.error('Error creating post:', error);
            throw error;
        }
    }

    /**
     * Refund coins if post publication failed
     * @param {string} userId - User ID
     * @param {string} transactionId - Original transaction ID
     */
    async refundPost(userId, transactionId) {
        try {
            const response = await fetch(`${this.baseUrl}/api/steem/refund-post`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: userId,
                    transaction_id: transactionId
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to refund coins');
            }

            return await response.json();
        } catch (error) {
            console.error('Error refunding post:', error);
            throw error;
        }
    }

    /**
     * Publish post to Steem using Keychain
     * @param {string} steemUsername - Steem username
     * @param {string} title - Post title
     * @param {string} body - Post body (markdown)
     * @param {string[]} tags - Post tags
     * @param {object} metadata - Post metadata
     */
    async publishViaKeychain(steemUsername, title, body, tags, metadata = {}) {
        return new Promise((resolve, reject) => {
            if (!window.steem_keychain) {
                reject(new Error('Steem Keychain not found. Please install it first.'));
                return;
            }

            // Generate permlink from title
            const permlink = this._generatePermlink(title);

            // Prepare operations for Steem post
            const operations = [
                ['comment', {
                    parent_author: '',
                    parent_permlink: tags[0] || 'gaming', // Primary tag
                    author: steemUsername,
                    permlink: permlink,
                    title: title,
                    body: body,
                    json_metadata: JSON.stringify({
                        tags: tags,
                        ...metadata
                    })
                }]
            ];

            // Request Keychain to broadcast
            window.steem_keychain.requestBroadcast(
                steemUsername,
                operations,
                'Posting',
                (response) => {
                    console.log('Keychain broadcast response:', response);
                    
                    if (response.success) {
                        resolve({
                            success: true,
                            permlink: permlink,
                            post_url: `https://www.cur8.fun/app/@${steemUsername}/${permlink}`,
                            transaction_id: response.result?.id
                        });
                    } else {
                        reject(new Error(response.message || 'Post publication cancelled or failed'));
                    }
                }
            );
        });
    }

    /**
     * Publish post using posting key (fallback method)
     * @param {string} steemUsername - Steem username
     * @param {string} postingKey - User's posting key
     * @param {string} title - Post title
     * @param {string} body - Post body
     * @param {string[]} tags - Post tags
     * @param {object} metadata - Post metadata
     */
    async publishViaPostingKey(steemUsername, postingKey, title, body, tags, metadata = {}) {
        return new Promise((resolve, reject) => {
            // Generate permlink
            const permlink = this._generatePermlink(title);

            // Use dhive library via CDN
            if (!window.dhive) {
                // Load dhive dynamically
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/@hiveio/dhive@latest/dist/dhive.js';
                script.onload = () => {
                    this._publishWithDhive(steemUsername, postingKey, title, body, tags, permlink, metadata, resolve, reject);
                };
                script.onerror = () => {
                    reject(new Error('Failed to load Steem publishing library. Please try again or use Keychain.'));
                };
                document.head.appendChild(script);
            } else {
                this._publishWithDhive(steemUsername, postingKey, title, body, tags, permlink, metadata, resolve, reject);
            }
        });
    }

    /**
     * Publish post using dhive library
     * @private
     */
    async _publishWithDhive(steemUsername, postingKey, title, body, tags, permlink, metadata, resolve, reject) {
        try {
            const dhive = window.dhive;
            
            // Create client
            const client = new dhive.Client([
                'https://api.steemit.com',
                'https://api.moecki.online'
            ]);

            // Create private key
            const key = dhive.PrivateKey.fromString(postingKey);

            // Prepare comment operation
            const commentOp = [
                'comment',
                {
                    parent_author: '',
                    parent_permlink: tags[0] || 'gaming',
                    author: steemUsername,
                    permlink: permlink,
                    title: title,
                    body: body,
                    json_metadata: JSON.stringify({
                        tags: tags,
                        ...metadata
                    })
                }
            ];

            // Broadcast operation
            const result = await client.broadcast.sendOperations([commentOp], key);

            resolve({
                success: true,
                permlink: permlink,
                post_url: `https://www.cur8.fun/app/@${steemUsername}/${permlink}`,
                transaction_id: result.id
            });

        } catch (error) {
            console.error('Error publishing with posting key:', error);
            reject(new Error(`Failed to publish: ${error.message}`));
        }
    }

    /**
     * Generate URL-safe permlink from title
     * @private
     */
    _generatePermlink(title) {
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        
        // Convert title to URL-safe format
        let permlink = title.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
            .replace(/\s+/g, '-')          // Replace spaces with hyphens
            .replace(/-+/g, '-')           // Replace multiple hyphens
            .substring(0, 100);            // Limit length
        
        // Add timestamp to ensure uniqueness
        permlink = `${permlink}-${randomSuffix}`;
        
        return permlink;
    }

    /**
     * Check if Steem Keychain is available
     */
    isKeychainAvailable() {
        return typeof window.steem_keychain !== 'undefined';
    }
}

// Export for use in other modules
window.SteemPostAPI = SteemPostAPI;

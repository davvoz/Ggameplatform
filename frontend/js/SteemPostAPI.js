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
     * Confirm successful post publication (updates cooldown timer and deducts coins)
     * @param {string} userId - User ID
     * @param {string} postUrl - Published post URL
     * @param {string} postTitle - Post title
     * @param {string} publishMethod - 'keychain' or 'posting_key'
     */
    async confirmPost(userId, postUrl, postTitle = 'Gaming milestone post', publishMethod = 'keychain') {
        try {
            const response = await fetch(`${this.baseUrl}/api/steem/confirm-post`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: userId,
                    post_url: postUrl,
                    post_title: postTitle,
                    publish_method: publishMethod
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to confirm post');
            }

            return await response.json();
        } catch (error) {
            console.error('Error confirming post:', error);
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
     * Publish post to Steem using Keychain with pre-prepared operations (includes beneficiaries)
     * @param {string} steemUsername - Steem username
     * @param {array} operations - Pre-prepared Keychain operations from backend
     * @param {string} permlink - Post permlink
     * @param {string} title - Post title (for return data)
     */
    async publishViaKeychainOperations(steemUsername, operations, permlink, title) {
        return new Promise((resolve, reject) => {
            if (!window.steem_keychain) {
                reject(new Error('Steem Keychain not found. Please install it first.'));
                return;
            }




            // Request Keychain to broadcast with backend-prepared operations
            window.steem_keychain.requestBroadcast(
                steemUsername,
                operations,
                'Posting',
                (response) => {

                    
                    if (response.success) {
                        resolve({
                            success: true,
                            permlink: permlink,
                            post_url: `https://www.cur8.fun/app/@${steemUsername}/${permlink}`,
                            post_title: title,
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
     * Publish post to Steem using Keychain (legacy method - generates operations in frontend)
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
     * Publish post using posting key (via backend with beem)
     * @param {string} steemUsername - Steem username
     * @param {string} postingKey - User's posting key
     * @param {string} title - Post title
     * @param {string} body - Post body
     * @param {string[]} tags - Post tags
     * @param {object} metadata - Post metadata
     */
    async publishViaPostingKey(steemUsername, postingKey, title, body, tags, metadata = {}) {
        try {




            
            const response = await fetch(`${this.baseUrl}/api/steem/publish-with-key`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: steemUsername,
                    posting_key: postingKey,
                    title: title,
                    body: body,
                    tags: tags,
                    metadata: metadata
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to publish post');
            }

            const result = await response.json();
            
            return {
                success: true,
                permlink: result.permlink,
                post_url: result.post_url,
                transaction_id: null // Backend doesn't return transaction ID from beem
            };

        } catch (error) {
            console.error('Error publishing with posting key:', error);
            throw error;
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

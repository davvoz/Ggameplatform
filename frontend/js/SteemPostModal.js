/**
 * Steem Post Modal
 * Modal for creating and publishing Steem posts with user customization
 */

class SteemPostModal {
    constructor(steemPostAPI, coinAPI, authManager) {
        this.steemPostAPI = steemPostAPI;
        this.coinAPI = coinAPI;
        this.authManager = authManager;
        this.modalElement = null;
        this.previewData = null;
    }

    /**
     * Show the post creation modal
     */
    async show() {
        const user = this.authManager.getUser();
        if (!user || !user.user_id) {
            alert('Please log in to create a post');
            return;
        }

        // Check if user has Steem account
        if (!user.steem_username && !user.username) {
            alert('Only Steem users can publish posts. Please connect your Steem account.');
            return;
        }

        try {
            // Create modal HTML
            this.createModal();
            
            // Load initial balance and authentication UI
            await this.loadInitialData();
            
        } catch (error) {
            console.error('Error showing post modal:', error);
            alert(`Failed to open post creator: ${error.message}`);
        }
    }

    /**
     * Create modal HTML structure
     */
    createModal() {
        // Remove existing modal if any
        const existing = document.getElementById('steemPostModal');
        if (existing) {
            existing.remove();
        }

        const modalHTML = `
            <div id="steemPostModal" class="steem-post-modal">
                <div class="steem-post-modal-overlay"></div>
                <div class="steem-post-modal-content">
                    <div class="steem-post-modal-header">
                        <h2>🎮 Share on Steem</h2>
                        <button class="steem-post-modal-close" id="closePostModal">&times;</button>
                    </div>
                    
                    <div class="steem-post-modal-body">
                        <div class="post-creator-section">
                            <h3>✍️ Your Personal Message</h3>
                            <p class="section-description">Add a personal touch to your gaming achievement post</p>
                            <textarea 
                                id="userMessageInput" 
                                class="user-message-input" 
                                placeholder="Share your thoughts about your gaming journey, favorite moments, or achievements...&#10;&#10;Example: 'What an amazing week! I've been grinding hard and finally reached level 25. The competition has been intense, especially in Rainbow Rush where I managed to break into the top 10. Can't wait to see what the next level brings!'"
                                rows="5"
                            ></textarea>
                        </div>
                    </div>

                    <div class="steem-post-modal-footer">
                        <div class="footer-info">
                            <div class="balance-display">
                                Your Balance: <span id="userBalanceDisplay">--</span> 🪙
                            </div>
                            <div class="keychain-notice" id="keychainNotice">
                                <span class="notice-icon">🔐</span>
                                <span>You'll need to confirm with Steem Keychain</span>
                            </div>
                            <div class="posting-key-input-container" id="postingKeyContainer" style="display: none;">
                                <label for="postingKeyForPost" style="font-size: 13px; color: rgba(255, 255, 255, 0.8); margin-bottom: 6px; display: block;">
                                    <span class="notice-icon">🔑</span> Your Posting Key:
                                </label>
                                <input 
                                    type="password" 
                                    id="postingKeyForPost" 
                                    class="posting-key-input"
                                    placeholder="Enter your posting key to publish..."
                                    autocomplete="off"
                                />
                                <small style="color: rgba(255, 255, 255, 0.5); font-size: 12px; margin-top: 4px; display: block;">
                                    Your key is never stored and only used for this publication
                                </small>
                            </div>
                        </div>
                        <div class="footer-actions">
                            <button id="publishPostBtn" class="btn-primary">
                                <span class="btn-icon">🚀</span>
                                <span class="btn-text">Publish Post (500 coins)</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modalElement = document.getElementById('steemPostModal');

        // Add event listeners
        this.attachEventListeners();

        // Show modal with animation
        setTimeout(() => {
            this.modalElement.classList.add('active');
        }, 10);
    }

    /**
     * Attach event listeners to modal elements
     */
    attachEventListeners() {
        const closeBtn = document.getElementById('closePostModal');
        const publishBtn = document.getElementById('publishPostBtn');
        const overlay = this.modalElement.querySelector('.steem-post-modal-overlay');

        closeBtn.addEventListener('click', () => this.close());
        overlay.addEventListener('click', () => this.close());
        publishBtn.addEventListener('click', () => this.publishPost());
    }

    /**
     * Load initial data (balance and auth UI) without preview
     */
    async loadInitialData() {
        const user = this.authManager.getUser();
        
        try {
            // Fetch user balance from coin API
            const data = await this.coinAPI.getUserBalance(user.user_id);
            const balance = data.balance || 0;
            
            // Update balance display
            const balanceEl = document.getElementById('userBalanceDisplay');
            if (balanceEl) {
                balanceEl.textContent = balance;
            }

            // Check authentication method and show appropriate input
            this.updateAuthenticationUI();

            // Update publish button state based on balance
            const publishBtn = document.getElementById('publishPostBtn');
            const canAfford = balance >= 500;
            
            if (!canAfford) {
                publishBtn.disabled = true;
                publishBtn.innerHTML = `
                    <span class="btn-icon">⚠️</span>
                    <span class="btn-text">Insufficient Balance</span>
                `;
                publishBtn.classList.add('disabled');
            } else {
                publishBtn.disabled = false;
                publishBtn.classList.remove('disabled');
            }

        } catch (error) {
            console.error('Error loading initial data:', error);
            alert(`Failed to load balance: ${error.message}`);
        }
    }

    /**
     * Update authentication UI based on available methods
     */
    updateAuthenticationUI() {
        const keychainNotice = document.getElementById('keychainNotice');
        const postingKeyContainer = document.getElementById('postingKeyContainer');
        const isKeychainAvailable = this.steemPostAPI.isKeychainAvailable();

        if (isKeychainAvailable) {
            // Show Keychain notice, hide posting key input
            if (keychainNotice) keychainNotice.style.display = 'flex';
            if (postingKeyContainer) postingKeyContainer.style.display = 'none';
        } else {
            // Hide Keychain notice, show posting key input
            if (keychainNotice) keychainNotice.style.display = 'none';
            if (postingKeyContainer) postingKeyContainer.style.display = 'block';
        }
    }

    /**
     * Publish post to Steem
     */
    async publishPost() {
        const user = this.authManager.getUser();
        const userMessage = document.getElementById('userMessageInput').value;
        const publishBtn = document.getElementById('publishPostBtn');
        const postingKeyInput = document.getElementById('postingKeyForPost');
        const steemUsername = user.steem_username || user.username;

        // Check if we have Keychain or posting key
        const hasKeychain = this.steemPostAPI.isKeychainAvailable();
        const postingKey = !hasKeychain ? postingKeyInput?.value : null;

        if (!hasKeychain && !postingKey) {
            alert('Please enter your posting key to publish.');
            return;
        }

        let postData = null; // Declare here to use in catch block

        try {
            // Disable button
            publishBtn.disabled = true;
            publishBtn.innerHTML = `
                <div class="spinner-small"></div>
                <span>Processing...</span>
            `;

            // Step 1: Create post and deduct coins
            const response = await this.steemPostAPI.createPost(user.user_id, userMessage);
            
            // Debug log
            console.log('Post data received:', response);
            
            // Extract post data (handle both nested and flat response)
            postData = response.data || response;
            
            // Validate post data
            if (!postData.title || !postData.body || !postData.tags) {
                console.error('Invalid post data:', postData);
                throw new Error('Invalid post data received from server. Missing title, body, or tags.');
            }

            // Step 2: Publish via appropriate method
            let result;
            
            if (hasKeychain) {
                publishBtn.innerHTML = `
                    <span class="btn-icon">🔐</span>
                    <span>Waiting for Keychain...</span>
                `;

                result = await this.steemPostAPI.publishViaKeychain(
                    steemUsername,
                    postData.title,
                    postData.body,
                    postData.tags,
                    { transaction_id: postData.transaction_id }
                );
            } else {
                publishBtn.innerHTML = `
                    <span class="btn-icon">📝</span>
                    <span>Publishing with posting key...</span>
                `;

                result = await this.steemPostAPI.publishViaPostingKey(
                    steemUsername,
                    postingKey,
                    postData.title,
                    postData.body,
                    postData.tags,
                    { transaction_id: postData.transaction_id }
                );

                // Clear posting key from input immediately after use
                if (postingKeyInput) {
                    postingKeyInput.value = '';
                }
            }

            // Confirm post publication and update cooldown timer
            try {
                await this.steemPostAPI.confirmPost(user.user_id, result.post_url);
                console.log('Post confirmed, cooldown timer updated');
            } catch (confirmError) {
                console.error('Failed to confirm post (cooldown not updated):', confirmError);
                // Don't fail the entire process, just log the error
            }

            // Success!
            this.showSuccess(result.post_url);

            // Refresh coin balance
            if (window.coinBalanceWidget) {
                await window.coinBalanceWidget.updateBalance();
            }

        } catch (error) {
            console.error('Error publishing post:', error);
            
            // Attempt to refund coins if post creation was successful but publishing failed
            if (postData && postData.transaction_id) {
                try {
                    console.log('Attempting to refund coins...');
                    const refundResult = await this.steemPostAPI.refundPost(user.user_id, postData.transaction_id);
                    console.log('Refund successful:', refundResult);
                    
                    // Refresh coin balance
                    if (window.coinBalanceWidget) {
                        await window.coinBalanceWidget.updateBalance();
                    }
                    
                    alert(`Failed to publish post:\n\n${error.message}\n\nYour ${refundResult.refunded_amount} coins have been refunded.`);
                } catch (refundError) {
                    console.error('Failed to refund coins:', refundError);
                    alert(`Failed to publish post:\n\n${error.message}\n\nWARNING: Automatic refund failed. Please contact support with transaction ID: ${postData.transaction_id}`);
                }
            } else {
                alert(`Failed to publish post:\n\n${error.message}\n\nYour coins have not been deducted.`);
            }
            
            // Re-enable button
            publishBtn.disabled = false;
            publishBtn.innerHTML = `
                <span class="btn-icon">🚀</span>
                <span class="btn-text">Publish Post (500 coins)</span>
            `;
        }
    }

    /**
     * Show success message
     */
    showSuccess(postUrl) {
        const modalBody = this.modalElement.querySelector('.steem-post-modal-body');
        modalBody.innerHTML = `
            <div class="success-message">
                <div class="success-icon">🎉</div>
                <h2>Post Published Successfully!</h2>
                <p>Your gaming achievement has been shared on Steem.</p>
                <div class="success-actions">
                    <a href="${postUrl}" target="_blank" class="btn-view-post">
                        <span>📄 View Post</span>
                    </a>
                    <button onclick="document.getElementById('closePostModal').click()" class="btn-close-success">
                        Close
                    </button>
                </div>
            </div>
        `;

        // Hide footer
        this.modalElement.querySelector('.steem-post-modal-footer').style.display = 'none';
    }

    /**
     * Close modal
     */
    close() {
        if (this.modalElement) {
            this.modalElement.classList.remove('active');
            setTimeout(() => {
                this.modalElement.remove();
                this.modalElement = null;
            }, 300);
        }
    }

    /**
     * Simple markdown-like rendering (basic support)
     */
    _renderMarkdown(markdown) {
        // This is a simplified version - in production, use a proper markdown library
        let html = markdown;
        
        // Convert headers
        html = html.replace(/^### (.*$)/gim, '<h4>$1</h4>');
        html = html.replace(/^## (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^# (.*$)/gim, '<h2>$1</h2>');
        
        // Convert bold
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Convert lists
        html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        
        // Convert line breaks
        html = html.replace(/\n\n/g, '</p><p>');
        html = '<p>' + html + '</p>';
        
        // Clean up
        html = html.replace(/<p><\/p>/g, '');
        html = html.replace(/<p>(<h[234]>)/g, '$1');
        html = html.replace(/(<\/h[234]>)<\/p>/g, '$1');
        html = html.replace(/<p>(<ul>)/g, '$1');
        html = html.replace(/(<\/ul>)<\/p>/g, '$1');
        html = html.replace(/<p><center>/g, '<center>');
        html = html.replace(/<\/center><\/p>/g, '</center>');
        html = html.replace(/<p>---<\/p>/g, '<hr>');
        
        return html;
    }

    /**
     * Escape HTML to prevent XSS
     */
    _escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}

// Export
window.SteemPostModal = SteemPostModal;

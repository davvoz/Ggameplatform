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

        const hasKeychain = this.steemPostAPI.isKeychainAvailable();
        const postingKey = hasKeychain ? null : postingKeyInput?.value;

        if (!hasKeychain && !postingKey) {
            alert('Please enter your posting key to publish.');
            return;
        }

        try {
            this.setButtonLoading(publishBtn, 'Processing...');

            const postData = await this.generatePostContent(user.user_id, userMessage);
            const result = await this.publishToSteem(hasKeychain, steemUsername, postingKey, postData, user.user_id, publishBtn);

            this.clearPostingKeyInput(postingKeyInput);
            await this.confirmAndFinalize(result);

        } catch (error) {
            console.error('Error publishing post:', error);
            this.resetPublishButton(publishBtn);
        }
    }

    /**
     * Set button to loading state
     */
    setButtonLoading(button, message, icon = null) {
        button.disabled = true;
        const iconHtml = icon ? `<span class="btn-icon">${icon}</span>` : '<div class="spinner-small"></div>';
        button.innerHTML = `${iconHtml}<span>${message}</span>`;
    }

    /**
     * Reset publish button to default state
     */
    resetPublishButton(button) {
        button.disabled = false;
        button.innerHTML = `
            <span class="btn-icon">🚀</span>
            <span class="btn-text">Publish Post (500 coins)</span>
        `;
    }

    /**
     * Generate post content from API
     */
    async generatePostContent(userId, userMessage) {
        const response = await this.steemPostAPI.createPost(userId, userMessage);
        const postData = response.data || response;

        if (!postData.title || !postData.body || !postData.tags) {
            throw new Error('Invalid post data received from server. Missing title, body, or tags.');
        }

        return postData;
    }

    /**
     * Publish post via Keychain or posting key
     */
    async publishToSteem(hasKeychain, steemUsername, postingKey, postData, userId, publishBtn) {
        if (hasKeychain) {
            this.setButtonLoading(publishBtn, 'Waiting for Keychain...', '🔐');
            return this.steemPostAPI.publishViaKeychain(
                steemUsername,
                postData.title,
                postData.body,
                postData.tags,
                {}
            );
        }

        this.setButtonLoading(publishBtn, 'Publishing with posting key...', '📝');
        return this.steemPostAPI.publishViaPostingKey(
            steemUsername,
            postingKey,
            postData.title,
            postData.body,
            postData.tags,
            { user_id: userId }
        );
    }

    /**
     * Clear posting key input for security
     */
    clearPostingKeyInput(inputElement) {
        if (inputElement) {
            inputElement.value = '';
        }
    }

    /**
     * Confirm post publication and finalize
     */
    async confirmAndFinalize(result) {


        this.showSuccess(result.post_url);

        if (window.coinBalanceWidget) {
            await window.coinBalanceWidget.updateBalance();
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
}

// Export
window.SteemPostModal = SteemPostModal;

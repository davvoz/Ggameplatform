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
        this.uploadedImageUrl = null;
        this.MAX_FILE_SIZE_MB = 15;
        this.UPLOAD_TIMEOUT_MS = 60000;
        this.API_ENDPOINT = 'https://imridd.eu.pythonanywhere.com/api/steem/free_upload_image';
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
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <h3 style="margin: 0;">✍️ Your Personal Message</h3>
                                <button id="selectImageBtn" class="btn-select-image-small" title="Add image">
                                    📷 Add Image
                                </button>
                            </div>
                            <input 
                                type="file" 
                                id="imageUploadInput" 
                                accept="image/*" 
                                style="display: none;"
                            />
                            <p class="section-description">Add a personal touch to your gaming achievement post</p>
                            <textarea 
                                id="userMessageInput" 
                                class="user-message-input" 
                                placeholder="Share your thoughts about your gaming journey, favorite moments, or achievements...&#10;&#10;Example: 'What an amazing week! I've been grinding hard and finally reached level 25. The competition has been intense, especially in Rainbow Rush where I managed to break into the top 10. Can't wait to see what the next level brings!'"
                                rows="5"
                            ></textarea>
                            <div id="imagePreviewContainer" class="image-preview-container-compact" style="display: none;">
                                <div class="image-preview-wrapper-compact">
                                    <img id="imagePreview" class="image-preview-compact" />
                                    <button id="removeImageBtn" class="btn-remove-image-compact" title="Remove image">&times;</button>
                                </div>
                                <div class="image-upload-status" id="imageUploadStatus"></div>
                            </div>
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
        const selectImageBtn = document.getElementById('selectImageBtn');
        const imageUploadInput = document.getElementById('imageUploadInput');
        const removeImageBtn = document.getElementById('removeImageBtn');

        closeBtn.addEventListener('click', () => this.close());
        overlay.addEventListener('click', () => this.close());
        publishBtn.addEventListener('click', () => this.publishPost());
        selectImageBtn.addEventListener('click', () => imageUploadInput.click());
        imageUploadInput.addEventListener('change', (e) => this.handleImageSelection(e));
        removeImageBtn.addEventListener('click', () => this.removeImage());
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

        // If an image was uploaded, prepend it to the body
        if (this.uploadedImageUrl) {
            const imageMarkdown = `![](${this.uploadedImageUrl})\n\n`;
            postData.body = imageMarkdown + postData.body;
            
            // Also update operations if using Keychain
            if (postData.keychain_operations && postData.keychain_operations[0]) {
                postData.keychain_operations[0][1].body = imageMarkdown + postData.keychain_operations[0][1].body;
            }
        }

        return postData;
    }

    /**
     * Publish post via Keychain or posting key
     */
    async publishToSteem(hasKeychain, steemUsername, postingKey, postData, userId, publishBtn) {
        if (hasKeychain) {
            this.setButtonLoading(publishBtn, 'Waiting for Keychain...', '🔐');
            // Use operations prepared by backend (includes beneficiaries)
            return this.steemPostAPI.publishViaKeychainOperations(
                steemUsername,
                postData.keychain_operations,
                postData.permlink,
                postData.title
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
        const user = this.authManager.getUser();
        
        // If published via Keychain, confirm on backend to deduct coins and update cooldown
        if (result.success && result.post_url) {
            try {
                const postTitle = result.post_title || 'Gaming milestone post';
                await this.steemPostAPI.confirmPost(user.user_id, result.post_url, postTitle);

            } catch (error) {
                console.error('[SteemPostModal] Failed to confirm post on backend:', error);
                // Continue anyway - post was published successfully
            }
        }

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
     * Handle image selection from input
     */
    async handleImageSelection(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file
        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file');
            return;
        }

        const fileSizeInMB = file.size / (1024 * 1024);
        if (fileSizeInMB > this.MAX_FILE_SIZE_MB) {
            alert(`Image is too large. Maximum allowed size is ${this.MAX_FILE_SIZE_MB}MB.`);
            return;
        }

        try {
            // Show preview immediately
            const reader = new FileReader();
            reader.onload = (e) => {
                const imagePreview = document.getElementById('imagePreview');
                const previewContainer = document.getElementById('imagePreviewContainer');
                imagePreview.src = e.target.result;
                previewContainer.style.display = 'block';
            };
            reader.readAsDataURL(file);

            // Update status
            const statusEl = document.getElementById('imageUploadStatus');
            statusEl.textContent = 'Uploading...';
            statusEl.style.color = '#ffd700';

            // Compress and upload image
            const compressedFile = await this.compressImage(file);
            const base64Data = await this.fileToBase64(compressedFile);
            
            const payload = { image_base64: base64Data };
            
            const response = await this.fetchWithTimeout(
                this.API_ENDPOINT,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                },
                this.UPLOAD_TIMEOUT_MS
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            
            if (!data.image_url) {
                throw new Error('Invalid response: missing image URL');
            }

            this.uploadedImageUrl = data.image_url;

            // Update status
            statusEl.textContent = '✓ Image uploaded successfully';
            statusEl.style.color = '#4CAF50';

        } catch (error) {
            console.error('Image upload error:', error);
            let errorMessage = error.message;
            if (errorMessage.includes('timeout')) {
                errorMessage = 'Upload timeout. Please check your connection and try again.';
            }
            alert(`Failed to upload image: ${errorMessage}`);
            this.removeImage();
        }
    }

    /**
     * Compress image if needed
     */
    async compressImage(file, maxWidthHeight = 1920) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target.result; // Use data URL instead of blob URL
                
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > maxWidthHeight || height > maxWidthHeight) {
                        if (width > height) {
                            height *= maxWidthHeight / width;
                            width = maxWidthHeight;
                        } else {
                            width *= maxWidthHeight / height;
                            height = maxWidthHeight;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    const mimeType = file.type || 'image/jpeg';
                    const quality = mimeType === 'image/png' ? 1.0 : 0.9;
                    
                    canvas.toBlob(
                        blob => resolve(blob),
                        mimeType,
                        quality
                    );
                };
                
                img.onerror = () => reject(new Error('Error loading image'));
            };
            
            reader.onerror = () => reject(new Error('Error reading file'));
            reader.readAsDataURL(file);
        });
    }

    /**
     * Convert file to base64
     */
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            
            reader.onloadend = () => {
                try {
                    if (!reader.result || typeof reader.result !== 'string') {
                        throw new Error('Invalid file data');
                    }
                    
                    const parts = reader.result.split(',');
                    if (parts.length < 2) {
                        throw new Error('Invalid image data format');
                    }
                    
                    resolve(parts[1]);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = (error) => {
                reject(new Error('Error reading file: ' + error));
            };
        });
    }

    /**
     * Fetch with timeout
     */
    fetchWithTimeout(url, options, timeout) {
        return Promise.race([
            fetch(url, options),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Request timeout')), timeout)
            )
        ]);
    }

    /**
     * Remove uploaded image
     */
    removeImage() {
        this.uploadedImageUrl = null;
        const previewContainer = document.getElementById('imagePreviewContainer');
        const imagePreview = document.getElementById('imagePreview');
        const imageUploadInput = document.getElementById('imageUploadInput');
        const statusEl = document.getElementById('imageUploadStatus');

        previewContainer.style.display = 'none';
        imagePreview.src = '';
        imageUploadInput.value = '';
        statusEl.textContent = '';
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
                this.uploadedImageUrl = null;
            }, 300);
        }
    }
}

// Export
window.SteemPostModal = SteemPostModal;

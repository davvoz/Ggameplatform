import { getCoinBalanceWidget } from './state.js';
import imageUploadService from './ImageUploadService.js';

/**
 * Steem Post Modal
 * Modal for creating and publishing Steem posts with user customization
 */

const MAX_IMAGES = 10;

class SteemPostModal {
    constructor(steemPostAPI, coinAPI, authManager) {
        this.steemPostAPI = steemPostAPI;
        this.coinAPI = coinAPI;
        this.authManager = authManager;
        this.modalElement = null;
        this.previewData = null;
        // Each entry: { id, previewUrl, url: string|null, status: 'uploading'|'done', element }
        this.images = [];
        this.nextImageId = 0;
    }

    /**
     * Show the post creation modal
     */
    async show() {
        const user = this.authManager.getUser();
        if (!user?.user_id) {
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
                                <button id="selectImageBtn" class="btn-select-image-small" title="Add images (max ${MAX_IMAGES})">
                                    📷 Add Images
                                </button>
                            </div>
                            <input
                                type="file"
                                id="imageUploadInput"
                                accept="image/*"
                                multiple
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
                                <div id="imagePreviewGrid" class="image-preview-grid"></div>
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

        closeBtn.addEventListener('click', () => this.close());
        overlay.addEventListener('click', () => this.close());
        publishBtn.addEventListener('click', () => this.publishPost());
        selectImageBtn.addEventListener('click', () => imageUploadInput.click());
        imageUploadInput.addEventListener('change', (e) => this.handleImageSelection(e));
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

            if (canAfford) {
                publishBtn.disabled = false;
                publishBtn.classList.remove('disabled');
            } else {
                publishBtn.disabled = true;
                publishBtn.innerHTML = `
                    <span class="btn-icon">⚠️</span>
                    <span class="btn-text">Insufficient Balance</span>
                `;
                publishBtn.classList.add('disabled');
            }

        } catch (error) {
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

        if (this.hasPendingUploads()) {
            alert('Please wait until all images have finished uploading.');
            return;
        }

        try {
            this.setButtonLoading(publishBtn, 'Processing...');

            const postData = await this.generatePostContent(user.user_id, userMessage);
            const result = await this.publishToSteem(hasKeychain, steemUsername, postingKey, postData, user.user_id, publishBtn);

            this.clearPostingKeyInput(postingKeyInput);

            // Pass the publish method to confirmAndFinalize
            await this.confirmAndFinalize(result, hasKeychain ? 'keychain' : 'posting_key');
        } catch (error) {
            alert(`Publication failed: ${error.message}`);
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

        // If images were uploaded, prepend them to the body in selection order
        const imageMarkdown = this.buildImagesMarkdown();
        if (imageMarkdown) {
            postData.body = imageMarkdown + postData.body;
            
            // Also update operations if using Keychain
            if (postData.keychain_operations?.[0]) {
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
    async confirmAndFinalize(result, publishMethod = 'keychain') {
        const user = this.authManager.getUser();
        
        // Always confirm on backend to deduct coins and update cooldown
        // Pass publishMethod to avoid duplicate Telegram notifications
        if (result.success && result.post_url) {
           
                const postTitle = result.post_title || 'Gaming milestone post';
                await this.steemPostAPI.confirmPost(user.user_id, result.post_url, postTitle, publishMethod);

           
        }

        this.showSuccess(result.post_url);

        const coinBalanceWidget = getCoinBalanceWidget();
        if (coinBalanceWidget) {
            await coinBalanceWidget.updateBalance();
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
     * Handle image selection from input (supports multiple files)
     */
    handleImageSelection(event) {
        const input = event.target;
        const files = Array.from(input.files || []);
        // Reset so selecting the same file again re-triggers "change"
        input.value = '';
        if (files.length === 0) return;

        const { accepted, rejected } = this.validateSelectedFiles(files);
        if (rejected.length > 0) {
            alert(rejected.join('\n'));
        }

        accepted.forEach(file => this.addAndUploadImage(file));
    }

    /**
     * Split selected files into accepted ones and human-readable rejection reasons
     */
    validateSelectedFiles(files) {
        const accepted = [];
        const rejected = [];
        let freeSlots = MAX_IMAGES - this.images.length;

        for (const file of files) {
            if (!file.type.startsWith('image/')) {
                rejected.push(`"${file.name}" is not a valid image file.`);
            } else if (!imageUploadService.isFileSizeValid(file)) {
                rejected.push(`"${file.name}" is too large (max ${imageUploadService.MAX_FILE_SIZE_MB}MB).`);
            } else if (freeSlots <= 0) {
                rejected.push(`"${file.name}" skipped: maximum ${MAX_IMAGES} images per post.`);
            } else {
                accepted.push(file);
                freeSlots--;
            }
        }

        return { accepted, rejected };
    }

    /**
     * Add a preview tile for the file and upload it
     */
    async addAndUploadImage(file) {
        const image = {
            id: this.nextImageId++,
            previewUrl: URL.createObjectURL(file),
            url: null,
            status: 'uploading',
            element: null
        };
        image.element = this.createImageTile(image);
        this.images.push(image);
        document.getElementById('imagePreviewGrid')?.appendChild(image.element);
        this.refreshImageStatus();

        try {
            const user = this.authManager.getUser();
            const url = await imageUploadService.uploadImage(file, user?.steem_username || user?.username);
            // The image may have been removed (or the modal closed) during upload
            if (!this.images.includes(image)) return;
            image.url = url;
            image.status = 'done';
            image.element.classList.remove('uploading');
        } catch (error) {
            if (!this.images.includes(image)) return;
            const errorMessage = error.message.includes('timeout')
                ? 'Upload timeout. Please check your connection and try again.'
                : error.message;
            alert(`Failed to upload "${file.name}": ${errorMessage}`);
            this.removeImage(image.id);
            return;
        }

        this.refreshImageStatus();
    }

    /**
     * Build a preview tile (thumbnail + remove button) for an image
     */
    createImageTile(image) {
        const tile = document.createElement('div');
        tile.className = 'image-preview-tile uploading';

        const img = document.createElement('img');
        img.className = 'image-preview-thumb';
        img.src = image.previewUrl;
        img.alt = '';

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'btn-remove-image-compact';
        removeBtn.title = 'Remove image';
        removeBtn.innerHTML = '&times;';
        removeBtn.addEventListener('click', () => this.removeImage(image.id));

        tile.append(img, removeBtn);
        return tile;
    }

    /**
     * Update the status line and container visibility from current images
     */
    refreshImageStatus() {
        const container = document.getElementById('imagePreviewContainer');
        const statusEl = document.getElementById('imageUploadStatus');
        const selectBtn = document.getElementById('selectImageBtn');
        if (!container || !statusEl) return;

        const total = this.images.length;
        const pending = this.images.filter(img => img.status === 'uploading').length;

        container.style.display = total > 0 ? 'block' : 'none';
        if (selectBtn) selectBtn.disabled = total >= MAX_IMAGES;

        if (total === 0) {
            statusEl.textContent = '';
        } else if (pending > 0) {
            statusEl.textContent = `Uploading ${pending} of ${total} image(s)...`;
            statusEl.style.color = '#ffd700';
        } else {
            statusEl.textContent = `✓ ${total} image(s) uploaded (max ${MAX_IMAGES})`;
            statusEl.style.color = '#4CAF50';
        }
    }

    /**
     * Remove a single image by id
     */
    removeImage(imageId) {
        const index = this.images.findIndex(img => img.id === imageId);
        if (index === -1) return;

        const [image] = this.images.splice(index, 1);
        image.element?.remove();
        URL.revokeObjectURL(image.previewUrl);
        this.refreshImageStatus();
    }

    /**
     * Remove all images and release their preview URLs
     */
    clearImages() {
        this.images.forEach(img => URL.revokeObjectURL(img.previewUrl));
        this.images = [];
    }

    /**
     * Whether any image is still uploading
     */
    hasPendingUploads() {
        return this.images.some(img => img.status === 'uploading');
    }

    /**
     * Markdown for all uploaded images, in selection order ('' if none)
     */
    buildImagesMarkdown() {
        return this.images
            .filter(img => img.url)
            .map(img => `![](${img.url})\n\n`)
            .join('');
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
                this.clearImages();
            }, 300);
        }
    }
}

// ES6 export
export default SteemPostModal;

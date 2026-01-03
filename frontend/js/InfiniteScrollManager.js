/**
 * InfiniteScrollManager
 * Reusable infinite scroll component following SOLID principles
 * Single Responsibility: Manages infinite scrolling behavior only
 */

class InfiniteScrollManager {
    /**
     * @param {Object} options Configuration options
     * @param {HTMLElement} options.container - Scrollable container element
     * @param {HTMLElement} options.listElement - Element where items will be appended
     * @param {Function} options.loadMore - Async function to load more items
     * @param {Function} options.renderItem - Function to render a single item
     * @param {number} options.threshold - Pixels from bottom to trigger load (default: 200)
     * @param {number} options.pageSize - Items per page (default: 20)
     */
    constructor(options) {
        this.container = options.container;
        this.listElement = options.listElement;
        this.loadMore = options.loadMore;
        this.renderItem = options.renderItem;
        this.threshold = options.threshold || 200;
        this.pageSize = options.pageSize || 20;
        
        this.offset = 0;
        this.isLoading = false;
        this.hasMore = true;
        this.items = [];
        
        this.loaderElement = null;
        this.endMessageElement = null;
        
        this._boundScrollHandler = this._handleScroll.bind(this);
        this._init();
    }

    /**
     * Initialize the scroll manager
     * @private
     */
    _init() {
        this._createLoader();
        this._createEndMessage();
        this._attachScrollListener();
    }

    /**
     * Create loading indicator
     * @private
     */
    _createLoader() {
        this.loaderElement = document.createElement('div');
        this.loaderElement.className = 'infinite-scroll-loader';
        this.loaderElement.innerHTML = `
            <div class="loader-spinner">
                <div class="spinner-ring"></div>
                <span>Loading more...</span>
            </div>
        `;
        this.loaderElement.style.display = 'none';
        this.listElement.after(this.loaderElement);
    }

    /**
     * Create end of list message
     * @private
     */
    _createEndMessage() {
        this.endMessageElement = document.createElement('div');
        this.endMessageElement.className = 'infinite-scroll-end';
        this.endMessageElement.innerHTML = `
            <div class="end-message">
                <span class="end-icon">✓</span>
                <span>You've seen all transactions</span>
            </div>
        `;
        this.endMessageElement.style.display = 'none';
        this.loaderElement.after(this.endMessageElement);
    }

    /**
     * Attach scroll event listener
     * @private
     */
    _attachScrollListener() {
        // Use window or container based on setup
        const scrollTarget = this.container === document.documentElement 
            ? window 
            : this.container;
        
        scrollTarget.addEventListener('scroll', this._boundScrollHandler, { passive: true });
    }

    /**
     * Handle scroll event
     * @private
     */
    _handleScroll() {
        if (this.isLoading || !this.hasMore) return;

        const scrollHeight = this.container.scrollHeight || document.documentElement.scrollHeight;
        const scrollTop = this.container.scrollTop || window.scrollY;
        const clientHeight = this.container.clientHeight || window.innerHeight;

        if (scrollHeight - scrollTop - clientHeight < this.threshold) {
            this.loadNextPage();
        }
    }

    /**
     * Load the next page of items
     * @returns {Promise<void>}
     */
    async loadNextPage() {
        if (this.isLoading || !this.hasMore) return;

        this.isLoading = true;
        this._showLoader();

        try {
            const newItems = await this.loadMore(this.offset, this.pageSize);
            
            if (!newItems || newItems.length === 0) {
                this.hasMore = false;
                this._showEndMessage();
            } else {
                this._appendItems(newItems);
                this.offset += newItems.length;
                
                if (newItems.length < this.pageSize) {
                    this.hasMore = false;
                    this._showEndMessage();
                }
            }
        } catch (error) {
            console.error('Error loading more items:', error);
            this._showError(error.message);
        } finally {
            this.isLoading = false;
            this._hideLoader();
        }
    }

    /**
     * Append items to the list
     * @param {Array} items - Items to append
     * @private
     */
    _appendItems(items) {
        const fragment = document.createDocumentFragment();
        
        items.forEach((item, index) => {
            const element = this.renderItem(item, this.items.length + index);
            if (element) {
                // Add animation class
                element.classList.add('fade-in-up');
                element.style.animationDelay = `${index * 50}ms`;
                fragment.appendChild(element);
            }
            this.items.push(item);
        });

        this.listElement.appendChild(fragment);
    }

    /**
     * Show loading indicator
     * @private
     */
    _showLoader() {
        if (this.loaderElement) {
            this.loaderElement.style.display = 'flex';
        }
    }

    /**
     * Hide loading indicator
     * @private
     */
    _hideLoader() {
        if (this.loaderElement) {
            this.loaderElement.style.display = 'none';
        }
    }

    /**
     * Show end of list message
     * @private
     */
    _showEndMessage() {
        if (this.endMessageElement && this.items.length > 0) {
            this.endMessageElement.style.display = 'flex';
        }
    }

    /**
     * Show error message
     * @param {string} message - Error message
     * @private
     */
    _showError(message) {
        const errorEl = document.createElement('div');
        errorEl.className = 'infinite-scroll-error';
        errorEl.innerHTML = `
            <span class="error-icon">⚠️</span>
            <span>Error loading data: ${message}</span>
            <button class="retry-btn" onclick="this.parentElement.remove()">Dismiss</button>
        `;
        this.listElement.after(errorEl);
    }

    /**
     * Reset the scroll manager
     * @param {Array} initialItems - Optional initial items
     */
    reset(initialItems = []) {
        this.offset = 0;
        this.isLoading = false;
        this.hasMore = true;
        this.items = [];
        
        // Clear list
        this.listElement.innerHTML = '';
        
        // Hide messages
        if (this.endMessageElement) {
            this.endMessageElement.style.display = 'none';
        }
        
        // Remove any error messages
        const errors = this.container.querySelectorAll('.infinite-scroll-error');
        errors.forEach(el => el.remove());
        
        // Add initial items if provided
        if (initialItems.length > 0) {
            this._appendItems(initialItems);
            this.offset = initialItems.length;
            
            if (initialItems.length < this.pageSize) {
                this.hasMore = false;
                this._showEndMessage();
            }
        }
    }

    /**
     * Destroy the scroll manager
     */
    destroy() {
        const scrollTarget = this.container === document.documentElement 
            ? window 
            : this.container;
        
        scrollTarget.removeEventListener('scroll', this._boundScrollHandler);
        
        if (this.loaderElement) {
            this.loaderElement.remove();
        }
        if (this.endMessageElement) {
            this.endMessageElement.remove();
        }
    }

    /**
     * Get current items
     * @returns {Array}
     */
    getItems() {
        return [...this.items];
    }

    /**
     * Get loading state
     * @returns {boolean}
     */
    getIsLoading() {
        return this.isLoading;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InfiniteScrollManager;
}

// Global export for non-module scripts
if (typeof window !== 'undefined') {
    window.InfiniteScrollManager = InfiniteScrollManager;
    console.log('✅ InfiniteScrollManager loaded and exported to window');
}

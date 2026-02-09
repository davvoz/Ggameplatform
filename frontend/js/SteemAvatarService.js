/**
 * SteemAvatarService - Handles Steem profile avatar URL generation and caching.
 * 
 * Provides a centralized, reusable service for resolving Steem user avatars
 * across different components (leaderboard, profile, community, etc.).
 * 
 * Uses the Steemit CDN for efficient avatar delivery with configurable sizes.
 */
export class SteemAvatarService {
    /** @type {string} Base CDN URL for Steem profile images */
    static AVATAR_CDN_BASE = 'https://steemitimages.com/u';

    /** @type {string} Default fallback emoji for users without avatars */
    static DEFAULT_AVATAR_EMOJI = '🎮';

    /** @type {Map<string, string>} In-memory cache for resolved avatar URLs */
    #cache = new Map();

    /**
     * Get the avatar URL for a Steem username.
     * @param {string|null} steemUsername - The Steem username
     * @param {'small'|'medium'|'large'} size - Avatar size variant
     * @returns {string|null} Avatar image URL, or null if no username
     */
    getAvatarUrl(steemUsername, size = 'small') {
        if (!steemUsername) {
            return null;
        }

        const cacheKey = `${steemUsername}_${size}`;
        if (this.#cache.has(cacheKey)) {
            return this.#cache.get(cacheKey);
        }

        const url = `${SteemAvatarService.AVATAR_CDN_BASE}/${steemUsername}/avatar/${size}`;
        this.#cache.set(cacheKey, url);
        return url;
    }

    /**
     * Generate an HTML <img> element string for a Steem user avatar.
     * @param {string|null} steemUsername - The Steem username
     * @param {object} options - Rendering options
     * @param {'small'|'medium'|'large'} [options.size='small'] - Avatar size
     * @param {string} [options.cssClass='steem-avatar'] - CSS class for the image
     * @param {number} [options.width=28] - Image width in pixels
     * @param {number} [options.height=28] - Image height in pixels
     * @returns {string} HTML string for the avatar (img tag or emoji fallback)
     */
    renderAvatarImg(steemUsername, options = {}) {
        const {
            size = 'small',
            cssClass = 'steem-avatar',
            width = 28,
            height = 28
        } = options;

        const url = this.getAvatarUrl(steemUsername, size);

        if (!url) {
            return `<span class="${cssClass} ${cssClass}--fallback" style="width:${width}px;height:${height}px;">${SteemAvatarService.DEFAULT_AVATAR_EMOJI}</span>`;
        }

        return `<img src="${url}" alt="${steemUsername}" class="${cssClass}" width="${width}" height="${height}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='inline-flex'"><span class="${cssClass} ${cssClass}--fallback" style="display:none;width:${width}px;height:${height}px;">🎮</span>`;
    }

    /**
     * Clear the internal cache.
     */
    clearCache() {
        this.#cache.clear();
    }
}

/** Singleton instance for global use */
export const steemAvatarService = new SteemAvatarService();

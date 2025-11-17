/**
 * Service class for fetching Steem blockchain profile data
 */
export class SteemProfileService {
    constructor(apiUrl = 'https://api.steemit.com') {
        this.apiUrl = apiUrl;
    }

    /**
     * Fetch Steem user profile data
     * @param {string} username - Steem username
     * @returns {Promise<Object|null>} Profile data or null if not found
     */
    async fetchProfile(username) {
        if (!username) {
            console.warn('SteemProfileService: username is required');
            return null;
        }

        console.log('Fetching Steem profile for:', username);

        try {
            const accountData = await this._fetchAccountData(username);
            if (!accountData) {
                return null;
            }

            return this._extractProfileData(accountData);
        } catch (error) {
            console.error('Error fetching Steem profile:', error);
            return null;
        }
    }

    /**
     * Fetch raw account data from Steem API
     * @private
     */
    async _fetchAccountData(username) {
        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'condenser_api.get_accounts',
                params: [[username]],
                id: 1
            })
        });

        if (!response.ok) {
            console.error('Steem API error:', response.status, response.statusText);
            return null;
        }

        const data = await response.json();
        console.log('Steem API response:', data);

        return data.result?.[0] || null;
    }

    /**
     * Extract and parse profile data from account
     * @private
     */
    _extractProfileData(account) {
        console.log('Account data:', account);

        const metadata = this._parseMetadata(account);
        const profile = metadata.profile || {};

        return {
            profileImage: profile.profile_image || '',
            coverImage: profile.cover_image || '',
            about: profile.about || '',
            location: profile.location || '',
            website: profile.website || ''
        };
    }

    /**
     * Parse JSON metadata from account
     * @private
     */
    _parseMetadata(account) {
        try {
            // Try posting_json_metadata first (newer format)
            const metadataString = account.posting_json_metadata || account.json_metadata;
            if (!metadataString) {
                return {};
            }

            const metadata = JSON.parse(metadataString);
            console.log('Parsed metadata:', metadata);
            return metadata;
        } catch (error) {
            console.warn('Failed to parse Steem metadata:', error);
            return {};
        }
    }
}

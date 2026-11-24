/**
 * Service class for fetching Steem blockchain profile data
 */
export class SteemProfileService {
    constructor(apiUrl = 'https://api.steemit.com') {
        this.apiUrl = apiUrl;
        this.vestsToSpCache = null; // Cache for VESTS to SP ratio
        this.cacheTimestamp = null;
        this.cacheMaxAge = 3600000; // 1 hour in milliseconds
    }

    /**
     * Get outgoing vesting delegations (delegations made by the account)
     * @param {string} username
     * @returns {Promise<Array>} array of delegation objects
     */
    async getOutgoingVestingDelegations(username) {

        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'condenser_api.get_vesting_delegations',
                params: [username, '', 100],
                id: 1
            })
        });

        if (!response.ok) return [];
        const data = await response.json();
        return data.result || [];

    }

    /**
     * Fetch Steem user profile data
     * @param {string} username - Steem username
     * @param {{ includeCur8Support?: boolean }} [options] - includeCur8Support also
     *   reads the cur8.witness vote (proxy included) and the delegation to @cur8:
     *   extra RPC calls, so only callers that need them ask for them
     * @returns {Promise<Object|null>} Profile data or null if not found
     */
    async fetchProfile(username, { includeCur8Support = false } = {}) {
        if (!username) {
            return null;
        }

        const accountData = await this._fetchAccountData(username);
        if (!accountData) {
            return null;
        }

        const profileData = this._extractProfileData(accountData);
        if (includeCur8Support) {
            Object.assign(profileData, await this._fetchCur8Support(accountData));
        }
        return profileData;
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
            return null;
        }

        const data = await response.json();


        return data.result?.[0] || null;
    }

    /**
     * Extract and parse profile data from account
     * @private
     */
    _extractProfileData(account) {
        const metadata = this._parseMetadata(account);
        const profile = metadata.profile || {};

        return {
            profileImage: profile.profile_image || '',
            coverImage: profile.cover_image || '',
            about: profile.about || '',
            location: profile.location || '',
            website: profile.website || '',
            witnessVotes: account.witness_votes || [],
            proxy: account.proxy || '',
            account: account
        };
    }

    /**
     * Read the account's support to CUR8: cur8.witness vote (directly or through
     * its proxy) and SP delegated to @cur8
     * @private
     */
    async _fetchCur8Support(account) {
        const witnessVotes = account.witness_votes || [];
        let votesCur8Witness = witnessVotes.includes('cur8.witness');

        const proxy = account.proxy || '';
        if (proxy && !votesCur8Witness) {
            votesCur8Witness = await this._checkProxyVote(proxy);
        }

        const delegationAmount = await this._getDelegationToCur8(account.name);

        return { votesCur8Witness, delegationAmount };
    }

    /**
     * Check if proxy account votes for cur8.witness
     * @private
     */
    async _checkProxyVote(proxyUsername) {

        const proxyAccount = await this._fetchAccountData(proxyUsername);
        if (proxyAccount) {
            const proxyWitnessVotes = proxyAccount.witness_votes || [];
            const votesForCur8 = proxyWitnessVotes.includes('cur8.witness');

            return votesForCur8;
        }
        return false;

    }

    /**
     * Get VESTS to SP conversion ratio
     * @private
     */
    async _getVestsToSpRatio() {
        // Check if cache is valid
        const now = Date.now();
        if (this.vestsToSpCache && this.cacheTimestamp && (now - this.cacheTimestamp < this.cacheMaxAge)) {
            return this.vestsToSpCache;
        }


        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'condenser_api.get_dynamic_global_properties',
                params: [],
                id: 1
            })
        });

        if (!response.ok) {
            return this.vestsToSpCache; // Return cached value or null
        }

        const data = await response.json();
        const props = data.result;

        const totalVestingFundSteem = Number.parseFloat(props.total_vesting_fund_steem.split(' ')[0] || '0');
        const totalVestingShares = Number.parseFloat(props.total_vesting_shares.split(' ')[0] || '0');

        if (totalVestingShares > 0 && totalVestingFundSteem > 0) {
            const ratio = totalVestingShares / totalVestingFundSteem;
            // Update cache
            this.vestsToSpCache = ratio;
            this.cacheTimestamp = now;
            return ratio;
        }

        return this.vestsToSpCache; // Return cached value or null

    }

    /**
     * Get delegation amount specifically to @cur8
     * @private
     */
    async _getDelegationToCur8(username) {

        // Get conversion ratio
        const vestsPerSteem = await this._getVestsToSpRatio();

        // If we can't get the ratio, we can't calculate delegation accurately
        if (!vestsPerSteem) {
            return 0;
        }

        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'condenser_api.get_vesting_delegations',
                params: [username, 'cur8', 100],
                id: 1
            })
        });

        if (!response.ok) {
            return 0;
        }

        const data = await response.json();
        const delegations = data.result || [];

        // Find delegation to @cur8
        for (const delegation of delegations) {
            if (delegation.delegatee === 'cur8') {
                const vests = Number.parseFloat(delegation.vesting_shares.split(' ')[0] || '0');
                // Convert VESTS to STEEM Power using dynamic ratio
                const steem = vests / vestsPerSteem;
                return Math.round(steem * 1000) / 1000; // Round to 3 decimals
            }
        }

        return 0;

    }

    /**
     * Parse JSON metadata from account
     * @private
     */
    _parseMetadata(account) {

        // Try posting_json_metadata first (newer format)
        const metadataString = account.posting_json_metadata || account.json_metadata;
        if (!metadataString) {
            return {};
        }

        const metadata = JSON.parse(metadataString);

        return metadata;

    }
}

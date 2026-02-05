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
        try {
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
        } catch (error) {
            console.error('Error fetching outgoing vesting delegations:', error);
            return [];
        }
    }

    /**
     * Fetch Steem user profile data
     * @param {string} username - Steem username
     * @returns {Promise<Object|null>} Profile data or null if not found
     */
    async fetchProfile(username) {
        if (!username) {

            return null;
        }



        try {
            const accountData = await this._fetchAccountData(username);
            if (!accountData) {
                return null;
            }

            return await this._extractProfileData(accountData);
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


        return data.result?.[0] || null;
    }

    /**
     * Extract and parse profile data from account
     * @private
     */
    async _extractProfileData(account) {


        const metadata = this._parseMetadata(account);
        const profile = metadata.profile || {};

        // Extract witness votes
        const witnessVotes = account.witness_votes || [];
        let votesCur8Witness = witnessVotes.includes('cur8.witness');
        
        // Check if user uses a proxy for witness voting
        const proxy = account.proxy || '';
        if (proxy && !votesCur8Witness) {

            // If using proxy, check if proxy votes for cur8.witness
            votesCur8Witness = await this._checkProxyVote(proxy);
        }

        // Get delegation specifically to @cur8 using get_vesting_delegations
        const delegationAmount = await this._getDelegationToCur8(account.name);

        console.log('✅ Extracted Steem data:', {
            witnessVotes,
            votesCur8Witness,
            proxy,
            delegationAmount
        });

        return {
            profileImage: profile.profile_image || '',
            coverImage: profile.cover_image || '',
            about: profile.about || '',
            location: profile.location || '',
            website: profile.website || '',
            witnessVotes: witnessVotes,
            votesCur8Witness: votesCur8Witness,
            proxy: proxy,
            delegationAmount: delegationAmount,
            account: account
        };
    }

    /**
     * Check if proxy account votes for cur8.witness
     * @private
     */
    async _checkProxyVote(proxyUsername) {
        try {
            const proxyAccount = await this._fetchAccountData(proxyUsername);
            if (proxyAccount) {
                const proxyWitnessVotes = proxyAccount.witness_votes || [];
                const votesForCur8 = proxyWitnessVotes.includes('cur8.witness');

                return votesForCur8;
            }
            return false;
        } catch (error) {
            console.error(`Error checking proxy vote for ${proxyUsername}:`, error);
            return false;
        }
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

        try {
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
                console.warn('Failed to fetch VESTS to SP ratio, using cached value if available');
                return this.vestsToSpCache; // Return cached value or null
            }

            const data = await response.json();
            const props = data.result;
            
            const totalVestingFundSteem = parseFloat(props.total_vesting_fund_steem.split(' ')[0] || '0');
            const totalVestingShares = parseFloat(props.total_vesting_shares.split(' ')[0] || '0');
            
            if (totalVestingShares > 0 && totalVestingFundSteem > 0) {
                const ratio = totalVestingShares / totalVestingFundSteem;
                // Update cache
                this.vestsToSpCache = ratio;
                this.cacheTimestamp = now;
                return ratio;
            }
            
            console.warn('Invalid VESTS to SP calculation, using cached value if available');
            return this.vestsToSpCache; // Return cached value or null
        } catch (error) {
            console.error('Error fetching VESTS to SP ratio:', error);
            return this.vestsToSpCache; // Return cached value or null
        }
    }

    /**
     * Get delegation amount specifically to @cur8
     * @private
     */
    async _getDelegationToCur8(username) {
        try {
            // Get conversion ratio
            const vestsPerSteem = await this._getVestsToSpRatio();
            
            // If we can't get the ratio, we can't calculate delegation accurately
            if (!vestsPerSteem) {
                console.error('Cannot calculate delegation: VESTS to SP ratio unavailable');
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
                    const vests = parseFloat(delegation.vesting_shares.split(' ')[0] || '0');
                    // Convert VESTS to STEEM Power using dynamic ratio
                    const steem = vests / vestsPerSteem;
                    return Math.round(steem * 1000) / 1000; // Round to 3 decimals
                }
            }

            return 0;
        } catch (error) {
            console.error('Error fetching delegation to cur8:', error);
            return 0;
        }
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

            return metadata;
        } catch (error) {

            return {};
        }
    }
}

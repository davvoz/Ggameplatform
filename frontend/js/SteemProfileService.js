/**
 * Service class for fetching Steem blockchain profile data
 */
export class SteemProfileService {
    constructor(apiUrl = 'https://api.steemit.com') {
        this.apiUrl = apiUrl;
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
            console.warn('SteemProfileService: username is required');
            return null;
        }

        console.log('Fetching Steem profile for:', username);

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
        console.log('Steem API response:', data);

        return data.result?.[0] || null;
    }

    /**
     * Extract and parse profile data from account
     * @private
     */
    async _extractProfileData(account) {
        console.log('Account data:', account);

        const metadata = this._parseMetadata(account);
        const profile = metadata.profile || {};

        // Extract witness votes
        const witnessVotes = account.witness_votes || [];
        let votesCur8Witness = witnessVotes.includes('cur8.witness');
        
        // Check if user uses a proxy for witness voting
        const proxy = account.proxy || '';
        if (proxy && !votesCur8Witness) {
            console.log(`🔄 User ${account.name} uses voting proxy: ${proxy}`);
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
                console.log(`${votesForCur8 ? '✅' : '❌'} Proxy ${proxyUsername} votes for cur8.witness: ${votesForCur8}`);
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
                return 2000.0; // Fallback
            }

            const data = await response.json();
            const props = data.result;
            
            const totalVestingFundSteem = parseFloat(props.total_vesting_fund_steem.split(' ')[0] || '0');
            const totalVestingShares = parseFloat(props.total_vesting_shares.split(' ')[0] || '0');
            
            if (totalVestingShares > 0) {
                return totalVestingShares / totalVestingFundSteem;
            }
            
            return 2000.0; // Fallback
        } catch (error) {
            console.error('Error fetching VESTS to SP ratio:', error);
            return 2000.0; // Fallback
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
            console.log('Parsed metadata:', metadata);
            return metadata;
        } catch (error) {
            console.warn('Failed to parse Steem metadata:', error);
            return {};
        }
    }
}

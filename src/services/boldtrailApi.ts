import type { BoldTrailTransaction, BoldTrailUser } from '../types/boldtrail';

class BoldTrailApi {
    /**
     * Fetches all users from BoldTrail Backoffice
     */
    async getUsers(limit: number = 10000): Promise<BoldTrailUser[]> {
        // Try cache first (valid for 1 hour)
        const cacheKey = 'bt_users_list_v1';
        try {
            const stored = localStorage.getItem(cacheKey);
            if (stored) {
                const { data, timestamp } = JSON.parse(stored);
                if (Date.now() - timestamp < 3600000) { // 1 hour
                    return data;
                }
            }
        } catch (e) { }

        const allUsers: BoldTrailUser[] = [];
        let startingFromId: number | undefined = undefined;
        const batchSize = 1000;

        try {
            while (allUsers.length < limit) {
                let url = `/api/bt-users?count=${batchSize}`;
                if (startingFromId) {
                    url += `&starting_from_id=${startingFromId}`;
                }

                const response = await fetch(url, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' }
                });

                if (!response.ok) break;

                const data: BoldTrailUser[] = await response.json();
                if (!data || data.length === 0) break;

                allUsers.push(...data);
                if (data.length < batchSize) break;
                startingFromId = data[data.length - 1].id;
            }

            const result = allUsers.slice(0, limit);
            localStorage.setItem(cacheKey, JSON.stringify({ data: result, timestamp: Date.now() }));
            return result;
        } catch (e) {
            console.error('Failed to fetch users from BoldTrail', e);
            return [];
        }
    }
    /**
     * Fetches all transactions from BoldTrail Backoffice using the local Vercel proxy.
     * Note: The boldtrail transactions API limits to 1000 items per request max,
     * we will fetch up to max pages or as requested.
     */
    async getTransactions(limit: number = 200): Promise<BoldTrailTransaction[]> {
        const allTransactions: BoldTrailTransaction[] = [];
        let startingFromId: number | undefined = undefined;
        const batchSize = 1000;

        try {
            while (allTransactions.length < limit) {
                let url = `/api/transactions?count=${batchSize}&sort_by=created_at&sort_order=desc`;
                if (startingFromId) {
                    url += `&starting_from_id=${startingFromId}`;
                }

                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                    }
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('BoldTrail Transactions API Error:', response.status, errorText);
                    break;
                }

                const data: BoldTrailTransaction[] = await response.json();

                if (!data || data.length === 0) {
                    break;
                }

                allTransactions.push(...data);

                if (data.length < batchSize) {
                    break; // Last page
                }

                // The boldtrail API uses starting_from_id based on the lowest ID returned
                // Assuming the list is ordered descending by ID as default.
                // If sorting asc, it would be the highest. The documentation states "starting from" id.
                startingFromId = data[data.length - 1].id;
            }

            return allTransactions.slice(0, limit);
        } catch (e) {
            console.error('Failed to fetch transactions from BoldTrail', e);
            return [];
        }
    }

    /**
     * Fetches additional profile details for agents using the local Vercel proxy.
     * @param userIds Array of BoldTrail user IDs.
     * @returns A map of userId to user details.
     */
    async getUserDetails(userIds: number[]): Promise<Record<number, any>> {
        if (!userIds || userIds.length === 0) return {};

        const results: Record<number, any> = {};
        const idsToFetch: number[] = [];

        // Cache valid for 24 hours for user details
        const cacheKey = 'bt_user_details_cache_v1';
        let cachedData: Record<number, { data: any, timestamp: number }> = {};
        try {
            const stored = localStorage.getItem(cacheKey);
            if (stored) cachedData = JSON.parse(stored);
        } catch (e) { }

        userIds.forEach(id => {
            const entry = cachedData[id];
            if (entry && Date.now() - entry.timestamp < 86400000) { // 24 hours
                results[id] = entry.data;
            } else {
                idsToFetch.push(id);
            }
        });

        if (idsToFetch.length === 0) return results;

        const chunkSize = 50;
        try {
            for (let i = 0; i < idsToFetch.length; i += chunkSize) {
                const chunk = idsToFetch.slice(i, i + chunkSize);
                const url = `/api/bt-user-details?ids=${chunk.join(',')}`;

                const response = await fetch(url, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' }
                });

                if (!response.ok) continue;

                const data = await response.json();
                Object.assign(results, data);

                Object.entries(data).forEach(([id, profile]) => {
                    cachedData[Number(id)] = { data: profile, timestamp: Date.now() };
                });
            }

            localStorage.setItem(cacheKey, JSON.stringify(cachedData));
            return results;
        } catch (e) {
            console.error('Failed to fetch user details', e);
            return results;
        }
    }

    /**
     * Fetches the participants (agents) for a batch of transactions.
     * @param transactionIds Array of BoldTrail transaction IDs (max 200).
     * @returns A map of transactionId to an array of BoldTrailUser.
     */
    async getTransactionParticipants(transactionIds: number[]): Promise<Record<number, BoldTrailUser[]>> {
        if (!transactionIds || transactionIds.length === 0) return {};

        const results: Record<number, BoldTrailUser[]> = {};
        const idsToFetch: number[] = [];

        // Try to load from cache first
        const cacheKey = 'bt_participants_cache_v1';
        let cachedData: Record<number, BoldTrailUser[]> = {};
        try {
            const stored = localStorage.getItem(cacheKey);
            if (stored) cachedData = JSON.parse(stored);
        } catch (e) {
            console.warn('Failed to parse participants cache', e);
        }

        // Check which IDs we already have
        transactionIds.forEach(id => {
            if (cachedData[id]) {
                results[id] = cachedData[id];
            } else {
                idsToFetch.push(id);
            }
        });

        if (idsToFetch.length === 0) return results;

        // Chunk into max 100 per request
        const chunkSize = 100;

        try {
            for (let i = 0; i < idsToFetch.length; i += chunkSize) {
                const chunk = idsToFetch.slice(i, i + chunkSize);
                const url = `/api/transaction-participants?ids=${chunk.join(',')}`;

                const response = await fetch(url, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' }
                });

                if (!response.ok) {
                    console.error('BoldTrail Participants API Error:', response.status);
                    continue; // try next chunk
                }

                const data = await response.json();
                Object.assign(results, data);

                // Merge into cache
                Object.assign(cachedData, data);
            }

            // Save back to localStorage (keep only last 2000 mappings to prevent bloat)
            const cacheIds = Object.keys(cachedData);
            if (cacheIds.length > 2000) {
                const sortedIds = cacheIds.sort((a, b) => Number(b) - Number(a)).slice(0, 2000);
                const pruneCache: Record<number, BoldTrailUser[]> = {};
                sortedIds.forEach(id => pruneCache[Number(id)] = cachedData[Number(id)]);
                localStorage.setItem(cacheKey, JSON.stringify(pruneCache));
            } else {
                localStorage.setItem(cacheKey, JSON.stringify(cachedData));
            }

            return results;
        } catch (e) {
            console.error('Failed to fetch transaction participants', e);
            return results;
        }
    }

    /**
     * Fetches the commissions (office net, agent net, etc) for a batch of transactions.
     * @param transactionIds Array of BoldTrail transaction IDs (max 200).
     * @returns A map of transactionId to its office_net and agent_net.
     */
    async getTransactionCommissions(transactionIds: number[]): Promise<Record<number, { officeNet: number, agentNet: number }>> {
        if (!transactionIds || transactionIds.length === 0) return {};

        const chunkSize = 100;
        const results: Record<number, { officeNet: number, agentNet: number }> = {};

        try {
            for (let i = 0; i < transactionIds.length; i += chunkSize) {
                const chunk = transactionIds.slice(i, i + chunkSize);
                const url = `/api/transaction-commissions?ids=${chunk.join(',')}`;

                const response = await fetch(url, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' }
                });

                if (!response.ok) {
                    console.error('BoldTrail Commissions API Error:', response.status);
                    continue; // try next chunk
                }

                const data = await response.json();
                Object.assign(results, data);
            }
            return results;
        } catch (e) {
            console.error('Failed to fetch transaction commissions', e);
            return results;
        }
    }
}

export const boldtrailApi = new BoldTrailApi();

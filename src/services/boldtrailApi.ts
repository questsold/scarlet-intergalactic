import type { BoldTrailTransaction, BoldTrailUser } from '../types/boldtrail';

let cachedTransactions: BoldTrailTransaction[] | null = null;
let lastCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

class BoldTrailApi {
    /**
     * Fetches all users from BoldTrail Backoffice
     */
    async getUsers(limit: number = 10000): Promise<BoldTrailUser[]> {
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
                    headers: {
                        'Accept': 'application/json',
                    }
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('BoldTrail Users API Error:', response.status, errorText);
                    break;
                }

                const data: BoldTrailUser[] = await response.json();

                if (!data || data.length === 0) {
                    break;
                }

                allUsers.push(...data);

                if (data.length < batchSize) {
                    break;
                }

                startingFromId = data[data.length - 1].id;
            }

            return allUsers.slice(0, limit);
        } catch (e) {
            console.error('Failed to fetch users from BoldTrail', e);
            return [];
        }
    }
    /**
     * Fetches all transactions from BoldTrail Backoffice using the local Vercel proxy.
     * Caches the results to prevent hitting API rate limits.
     */
    async getTransactions(limit: number = 10000): Promise<BoldTrailTransaction[]> {
        if (cachedTransactions && (Date.now() - lastCacheTime < CACHE_DURATION)) {
            // Return from cache if we want fewer or same items. 
            // We sort by created_at desc so if limit < total, we get newest first.
            const sortedCache = [...cachedTransactions].sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
            return sortedCache.slice(0, limit);
        }

        const allTransactions: BoldTrailTransaction[] = [];
        let startingFromId: number | undefined = undefined;

        try {
            while (allTransactions.length < limit) {
                const batchSize = Math.min(1000, limit - allTransactions.length);
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

            // Update cache
            if (allTransactions.length > 0) {
                cachedTransactions = allTransactions;
                lastCacheTime = Date.now();
            }

            const sorted = [...allTransactions].sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
            return sorted.slice(0, limit);
        } catch (e) {
            console.error('Failed to fetch transactions from BoldTrail', e);
            return [];
        }
    }

    /**
     * Fetches a single transaction from BoldTrail Backoffice by its ID.
     */
    async getTransaction(id: number | string): Promise<BoldTrailTransaction | null> {
        try {
            const url = `/api/transaction?id=${id}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`BoldTrail Transaction API Error for ID ${id}:`, response.status, errorText);
                return null;
            }

            const data: BoldTrailTransaction = await response.json();
            return data;
        } catch (e) {
            console.error(`Failed to fetch BoldTrail transaction ID ${id}`, e);
            return null;
        }
    }



    /**
     * Fetches additional profile details for agents using the local Vercel proxy.
     * @param userIds Array of BoldTrail user IDs.
     * @returns A map of userId to user details.
     */
    async getUserDetails(userIds: number[]): Promise<Record<number, any>> {
        if (!userIds || userIds.length === 0) return {};

        const chunkSize = 50;
        const results: Record<number, any> = {};

        try {
            for (let i = 0; i < userIds.length; i += chunkSize) {
                const chunk = userIds.slice(i, i + chunkSize);
                const url = `/api/bt-user-details?ids=${chunk.join(',')}`;

                const response = await fetch(url, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' }
                });

                if (!response.ok) {
                    console.error('BoldTrail User Details API Error:', response.status);
                    continue;
                }

                const data = await response.json();
                Object.assign(results, data);
            }
            return results;
        } catch (e) {
            console.error('Failed to fetch user details', e);
            return results;
        }
    }

    /**
     * Fetches the specific Company Cap Report (Report ID: 775362)
     */
    async getCapReport(): Promise<any[]> {
        try {
            const response = await fetch('/api/bt-cap-report', {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) {
                console.error('BoldTrail Cap Report API Error:', response.status);
                return [];
            }

            const data = await response.json();
            return data.data || [];
        } catch (e) {
            console.error('Failed to fetch Cap Report', e);
            return [];
        }
    }

    /**
     * Fetches the participants (agents) for a batch of transactions.
     * @param transactionIds Array of BoldTrail transaction IDs (max 200).
     * @returns A map of transactionId to an array of BoldTrailUser.
     */
    async getTransactionParticipants(transactionIds: number[]): Promise<Record<number, any[]>> {
        if (!transactionIds || transactionIds.length === 0) return {};

        // Chunk into max 100 per request
        const chunkSize = 100;
        const results: Record<number, any[]> = {};

        try {
            for (let i = 0; i < transactionIds.length; i += chunkSize) {
                const chunk = transactionIds.slice(i, i + chunkSize);
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
    async getTransactionCommissions(transactionIds: number[]): Promise<Record<number, { officeNet: number, officeContribution: number, agentNet: number }>> {
        if (!transactionIds || transactionIds.length === 0) return {};

        const chunkSize = 100;
        const results: Record<number, { officeNet: number, officeContribution: number, agentNet: number }> = {};

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

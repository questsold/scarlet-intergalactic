import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const BROKERMINT_API_KEY = process.env.VITE_BOLDTRAIL_API_KEY || process.env.BROKERMINT_API_KEY;
const BROKERMINT_BASE_URL = 'https://my.brokermint.com/api/v1';

// Firebase Admin Initialization
if (!getApps().length) {
    const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    if (serviceAccountBase64) {
        try {
            const serviceAccountJson = Buffer.from(serviceAccountBase64, 'base64').toString('utf-8');
            const serviceAccount = JSON.parse(serviceAccountJson);
            initializeApp({
                credential: cert(serviceAccount)
            });
        } catch (e) {
            console.error('Failed to parse Firebase Service Account Key. Transactions sync will fail.', e);
        }
    } else {
        console.warn('FIREBASE_SERVICE_ACCOUNT_BASE64 is not defined. Admin sync will not work.');
    }
}

const db = getFirestore();

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Helper for Brokermint API with exponential backoff
    const fetchWithRetry = async (url: string, options: any, retries: number = 5, backoff: number = 1000): Promise<Response> => {
        for (let i = 0; i < retries; i++) {
            const response = await fetch(url, options);
            if (response.status === 429) {
                console.warn(`Rate limit hit fetching ${url}. Retrying in ${backoff}ms...`);
                await new Promise(r => setTimeout(r, backoff));
                backoff *= 2; // exponential backoff
                continue;
            }
            return response;
        }
        throw new Error(`Failed to fetch ${url} after ${retries} retries due to rate limiting.`);
    };

    try {

        // 1. Fetch Follow Up Boss Users
        const fubResponse = await fetch('https://api.followupboss.com/v1/users?limit=100', {
            headers: {
                'Authorization': `Basic ${Buffer.from(process.env.VITE_FUB_API_KEY + ':').toString('base64')}`,
                'Accept': 'application/json'
            }
        });

        const fubData = fubResponse.ok ? await fubResponse.json() : { users: [] };
        const users = fubData.users || [];

        const nameToFubUserId = new Map<string, number>();
        const emailToFubUserId = new Map<string, number>();
        users.forEach((u: any) => {
            if (u.name) nameToFubUserId.set(u.name.toLowerCase(), u.id);
            if (u.email) emailToFubUserId.set(u.email.toLowerCase(), u.id);
        });

        // 1.5 Fetch all Boldtrail Users directly 
        const allBtUsers: any[] = [];
        let btStartingFromId: number | undefined = undefined;
        while (allBtUsers.length < 10000) {
            let userUrl = `${BROKERMINT_BASE_URL}/users?api_key=${BROKERMINT_API_KEY}&count=1000`;
            if (btStartingFromId) userUrl += `&starting_from_id=${btStartingFromId}`;

            try {
                const uRes = await fetchWithRetry(userUrl, { headers: { 'Accept': 'application/json' } });
                if (!uRes.ok) break;
                const chunk = await uRes.json();
                if (!chunk || chunk.length === 0) break;
                allBtUsers.push(...chunk);
                if (chunk.length < 1000) break;
                btStartingFromId = chunk[chunk.length - 1].id;
            } catch (e) {
                console.error("Failed to fetch BM Users", e);
                break;
            }
        }

        const btIdToUserMap = new Map<number, any>();
        allBtUsers.forEach(u => btIdToUserMap.set(u.id, u));

        // Get last sync timestamp to avoid syncing all historical transactions
        const metadataRef = db.collection('metadata').doc('brokermint_sync');
        const metadataDoc = await metadataRef.get();
        let updatedSinceParam = '';
        if (metadataDoc.exists && metadataDoc.data()?.lastSyncTimestamp) {
            updatedSinceParam = `&updated_since=${metadataDoc.data()!.lastSyncTimestamp}`;
        }

        // 2. Fetch all transactions from BoldTrail
        const allTransactions: any[] = [];
        let startingFromId: number | undefined = undefined;
        const limit = 10000;
        const batchSize = 1000;

        while (allTransactions.length < limit) {
            let url = `${BROKERMINT_BASE_URL}/transactions?api_key=${BROKERMINT_API_KEY}&count=${batchSize}&sort_by=created_at&sort_order=desc${updatedSinceParam}`;
            if (startingFromId) {
                url += `&starting_from_id=${startingFromId}`;
            }

            let response;
            try {
                response = await fetchWithRetry(url, {
                    headers: {
                        'Accept': 'application/json'
                    }
                });
            } catch (e: any) {
                return res.status(500).json({ error: 'Failed to fetch from BoldTrail (Rate Limit)', details: e.message });
            }

            if (!response.ok) {
                return res.status(500).json({ error: 'Failed to fetch from BoldTrail', details: await response.text() });
            }

            const data = await response.json();
            if (!data || data.length === 0) break;

            allTransactions.push(...data);
            if (data.length < batchSize) break;
            startingFromId = data[data.length - 1].id;

            // Wait to prevent rate limiting on pagination
            await new Promise(r => setTimeout(r, 1000));
        }

        // 3. Process each transaction to determine ownership and save to Firestore
        let batch = db.batch();
        let opsCount = 0;
        let syncedCount = 0;

        for (const tx of allTransactions) {
            let ownerFubIds: number[] = [];
            // A. Fetch Participants for this transaction natively (limit low because updated_since is active)
            let partRes;
            try {
                partRes = await fetchWithRetry(`${BROKERMINT_BASE_URL}/transactions/${tx.id}/participants?api_key=${BROKERMINT_API_KEY}`, {
                    headers: { 'Accept': 'application/json' }
                });
            } catch (e) {
                console.warn(`Failed to fetch participants for tx ${tx.id} due to rate limits.`);
                partRes = { ok: false, json: async () => [] };
            }

            const btAgentIds: number[] = [];

            if (partRes.ok) {
                const participants = await partRes.json();
                const linkedUsers = participants.filter((p: any) => p.user && p.user.status === 'active');
                for (const p of linkedUsers) {
                    if (p.user.id) btAgentIds.push(p.user.id);
                }
            }

            // Fallback to basic representations if participants endpoint fails or is empty
            if (btAgentIds.length === 0) {
                if (tx.buying_side_representer?.id) btAgentIds.push(tx.buying_side_representer.id);
                if (tx.listing_side_representer?.id) btAgentIds.push(tx.listing_side_representer.id);
            }

            const uniqueBtAgentIds = Array.from(new Set(btAgentIds));

            // Map BT User IDs to FUB User IDs using in-memory map
            for (const btAgentId of uniqueBtAgentIds) {
                const btUser = btIdToUserMap.get(btAgentId);
                if (btUser) {
                    let fubId: number | undefined;
                    const uEmail = btUser.email?.toLowerCase();
                    const uName = (`${btUser.first_name || ''} ${btUser.last_name || ''}`).trim().toLowerCase();

                    if (uEmail && emailToFubUserId.has(uEmail)) {
                        fubId = emailToFubUserId.get(uEmail);
                    } else if (uName && nameToFubUserId.has(uName)) {
                        fubId = nameToFubUserId.get(uName);
                    } else if (btUser.name && nameToFubUserId.has(btUser.name.toLowerCase())) {
                        fubId = nameToFubUserId.get(btUser.name.toLowerCase());
                    }

                    if (fubId && !ownerFubIds.includes(fubId)) {
                        ownerFubIds.push(fubId);
                    }
                }
            }

            // Enrich transaction object for Firebase tracking
            const enrichedTx = {
                ...tx,
                ownerFubIds: ownerFubIds,
                syncedAt: new Date().toISOString()
            };

            const docRef = db.collection('transactions').doc(String(tx.id));
            batch.set(docRef, enrichedTx, { merge: true });
            opsCount++;
            syncedCount++;

            // Commit batch every 400 operations to stay within Firestore 500 limit
            if (opsCount >= 400) {
                await batch.commit();
                batch = db.batch();
                opsCount = 0;
            }
        }

        if (opsCount > 0) {
            await batch.commit();
        }

        // Update the last sync timestamp
        await metadataRef.set({ lastSyncTimestamp: Date.now() }, { merge: true });

        return res.status(200).json({
            success: true,
            message: `Synced ${syncedCount} transactions to Firestore`,
            transactionsProcessed: syncedCount
        });

    } catch (error: any) {
        console.error('Error syncing transactions:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}

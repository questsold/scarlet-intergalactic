import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
const serviceAccountJson = Buffer.from(serviceAccountBase64, 'base64').toString('utf-8');
const serviceAccount = JSON.parse(serviceAccountJson);
if (!getApps().length) {
    initializeApp({
        credential: cert(serviceAccount)
    });
}
const db = getFirestore();

const BROKERMINT_API_KEY = process.env.VITE_BOLDTRAIL_API_KEY || process.env.BROKERMINT_API_KEY;
const BROKERMINT_BASE_URL = 'https://my.brokermint.com/api/v1';

async function fetchWithRetry(url: string, options: any, retries: number = 8, backoff: number = 1000): Promise<Response> {
    for (let i = 0; i < retries; i++) {
        const response = await fetch(url, options);
        if (response.status === 429) {
            console.warn(`[429] Rate limit fetching ${url}. Retrying in ${backoff}ms...`);
            await new Promise(r => setTimeout(r, backoff));
            backoff *= 1.5;
            continue;
        }
        return response;
    }
    throw new Error(`Failed to fetch ${url} after ${retries} retries due to rate limiting.`);
}

async function run() {
    console.log("Fetching FUB users...");
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

    console.log("Fetching all BM users...");
    const allBtUsers: any[] = [];
    let btStartingFromId: number | undefined = undefined;
    while (allBtUsers.length < 10000) {
        let userUrl = `${BROKERMINT_BASE_URL}/users?api_key=${BROKERMINT_API_KEY}&count=1000`;
        if (btStartingFromId) userUrl += `&starting_from_id=${btStartingFromId}`;
        const uRes = await fetchWithRetry(userUrl, { headers: { 'Accept': 'application/json' } });
        if (!uRes.ok) break;
        const chunk = await uRes.json();
        if (!chunk || chunk.length === 0) break;
        allBtUsers.push(...chunk);
        if (chunk.length < 1000) break;
        btStartingFromId = chunk[chunk.length - 1].id;
    }
    const btIdToUserMap = new Map<number, any>();
    allBtUsers.forEach(u => btIdToUserMap.set(u.id, u));

    console.log("Fetching all transactions in DB without ownerFubIds...");
    const txSnapshot = await db.collection('transactions').get();

    // Sort transactions by closing_date or created_at desc so newest are hydrated first
    const txs: any[] = [];
    txSnapshot.forEach(d => {
        const data = d.data();
        if (!data.ownerFubIds || data.ownerFubIds.length === 0) {
            txs.push(data);
        }
    });

    txs.sort((a, b) => (b.closing_date || b.created_at || 0) - (a.closing_date || a.created_at || 0));

    console.log(`Found ${txs.length} transactions missing owner metadata. Starting hydration...`);

    let processedCount = 0;

    for (const tx of txs) {
        let partRes;
        try {
            partRes = await fetchWithRetry(`${BROKERMINT_BASE_URL}/transactions/${tx.id}/participants?api_key=${BROKERMINT_API_KEY}`, {
                headers: { 'Accept': 'application/json' }
            });
        } catch (e) {
            console.error(`Skipping tx ${tx.id} due to rate limits`);
            continue;
        }

        const btAgentIds: number[] = [];

        if (partRes.ok) {
            const participants = await partRes.json();
            const linkedUsers = participants.filter((p: any) => p.user && p.user.status === 'active');
            for (const p of linkedUsers) {
                if (p.user.id) btAgentIds.push(p.user.id);
            }
        }

        if (btAgentIds.length === 0) {
            if (tx.buying_side_representer?.id) btAgentIds.push(tx.buying_side_representer.id);
            if (tx.listing_side_representer?.id) btAgentIds.push(tx.listing_side_representer.id);
        }

        const uniqueBtAgentIds = Array.from(new Set(btAgentIds));
        let ownerFubIds: number[] = [];

        for (const btAgentId of uniqueBtAgentIds) {
            // Because we only fetch /participants (1 request per tx), the user mapped from participants has a .id
            // If the fallback (representing Account IDs) was used, this map will legitimately fail to find them (which is expected)
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

        if (ownerFubIds.length > 0) {
            const docRef = db.collection('transactions').doc(String(tx.id));
            await docRef.update({ ownerFubIds });
        }

        processedCount++;
        if (processedCount % 10 === 0) {
            console.log(`Hydrated ${processedCount} / ${txs.length} transactions`);
        }

        // Wait 120ms to keep it just under the 100/10s limit (avg ~8 requests/sec)
        await new Promise(resolve => setTimeout(resolve, 120));
    }

    console.log(`Hydration completely finished!`);
}

run().catch(console.error);

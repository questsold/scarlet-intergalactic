import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

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

async function wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// 429 Retry logic
async function fetchWithRetry(url: string, options: any, retries = 5, backoff = 1000): Promise<Response> {
    for (let i = 0; i < retries; i++) {
        const response = await fetch(url, options);
        if (response.status === 429) {
            console.warn(`[429] Rate limit... Retrying in ${backoff}ms`);
            await wait(backoff);
            backoff *= 1.5;
            continue;
        }
        return response;
    }
    throw new Error(`Failed to fetch ${url} after ${retries} retries`);
}

async function run() {
    console.log("Starting Broker Pollution Fix...");

    // 1. Fetch FUB users to get all active FUB ids, names, and emails
    const fubResponse = await fetch('https://api.followupboss.com/v1/users?limit=100', {
        headers: {
            'Authorization': `Basic ${Buffer.from(process.env.VITE_FUB_API_KEY + ':').toString('base64')}`,
            'Accept': 'application/json'
        }
    });
    const fubData = await fubResponse.json();
    const fubUsers = fubData.users || [];
    const nameToFubUserId = new Map<string, number>();
    const emailToFubUserId = new Map<string, number>();
    fubUsers.forEach((u: any) => {
        if (u.name) nameToFubUserId.set(u.name.toLowerCase(), u.id);
        if (u.email) emailToFubUserId.set(u.email.toLowerCase(), u.id);
    });

    // 2. We need BT users to map participant IDs to FUB
    console.log("Fetching BT users...");
    const allBtUsers: any[] = [];
    let btStartingFromId: number | undefined = undefined;
    while (allBtUsers.length < 10000) {
        let userUrl = `${BROKERMINT_BASE_URL}/users?api_key=${BROKERMINT_API_KEY}&count=1000`;
        if (btStartingFromId) userUrl += `&starting_from_id=${btStartingFromId}`;
        const uRes = await fetch(userUrl, { headers: { 'Accept': 'application/json' } });
        if (!uRes.ok) break;
        const chunk = await uRes.json();
        if (!chunk || chunk.length === 0) break;
        allBtUsers.push(...chunk);
        if (chunk.length < 1000) break;
        btStartingFromId = chunk[chunk.length - 1].id;
    }
    const btIdToUserMap = new Map<number, any>();
    allBtUsers.forEach(u => btIdToUserMap.set(u.id, u));

    // 3. Find the deals to fix
    const brokerIds = [1, 3, 5, 28]; // Ali, Samantha, Ronya, Quest Realty
    const snapshot = await db.collection('transactions').get();

    const dealsToClean: any[] = [];
    const dealsToReFetch: any[] = [];

    snapshot.forEach(d => {
        const tx = d.data();
        const owners = tx.ownerFubIds || [];
        if (owners.length > 0) {
            const hasBroker = owners.some((o: number) => brokerIds.includes(o));
            const hasAgent = owners.some((o: number) => !brokerIds.includes(o));

            if (hasBroker && hasAgent) {
                dealsToClean.push({ id: d.id, owners });
            } else if (hasBroker && !hasAgent) {
                dealsToReFetch.push(tx);
            }
        }
    });

    console.log(`Found ${dealsToClean.length} deals mapped to Brokers + Agents.`);
    console.log(`Found ${dealsToReFetch.length} deals mapped ONLY to Brokers.`);

    // --- PHASE 1: Clean mixed deals ---
    // If Ali (1) and Drew (10) are on it. We strip Ali out. So it's just Drew's deal.
    let cleanBatch = db.batch();
    let cleanCount = 0;

    for (const deal of dealsToClean) {
        const docRef = db.collection('transactions').doc(deal.id);
        const filteredAgents = deal.owners.filter((o: number) => !brokerIds.includes(o));
        cleanBatch.update(docRef, { ownerFubIds: filteredAgents });
        cleanCount++;

        if (cleanCount % 400 === 0) {
            await cleanBatch.commit();
            cleanBatch = db.batch();
        }
    }
    if (cleanCount % 400 !== 0) {
        await cleanBatch.commit();
    }
    console.log(`Phase 1 Complete: Cleaned Brokers out of ${cleanCount} mixed deals.`);

    // --- PHASE 2: Fetch and securely hydrate Broker-only deals ---
    console.log(`Phase 2: Verifying actual participants for ${dealsToReFetch.length} unassigned / Broker-only deals...`);
    let reFetchCount = 0;

    for (const tx of dealsToReFetch) {
        let partRes;
        try {
            partRes = await fetchWithRetry(`${BROKERMINT_BASE_URL}/transactions/${tx.id}/participants?api_key=${BROKERMINT_API_KEY}`, {
                headers: { 'Accept': 'application/json' }
            });
        } catch (e) {
            console.error(`Skipping tx ${tx.id} due to total endpoint failure`);
            continue; // Leave it as is for now
        }

        const actualAgentIds: number[] = [];
        if (partRes.ok) {
            const participants = await partRes.json();
            const linkedUsers = participants.filter((p: any) => p.user && p.user.status === 'active');
            for (const p of linkedUsers) {
                if (p.user.id) actualAgentIds.push(p.user.id);
            }
        }

        let newOwnerFubIds: number[] = [];
        for (const btAgentId of actualAgentIds) {
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

                if (fubId && !newOwnerFubIds.includes(fubId)) {
                    newOwnerFubIds.push(fubId); // Even if it IS Ali (1)! Because Ali authentically did it!
                }
            }
        }

        const docRef = db.collection('transactions').doc(String(tx.id));
        await docRef.update({ ownerFubIds: newOwnerFubIds });

        reFetchCount++;
        if (reFetchCount % 10 === 0) console.log(`Verified ${reFetchCount} / ${dealsToReFetch.length} broker-only deals...`);

        // Sleep to stay well under the 100/10s burst limit natively
        await wait(120);
    }
    console.log("Broker Pollution Fix Completely Finished!");
}

run().catch(console.error);

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

async function run() {
    console.log("Starting optimized backfill...");

    while (true) {
        // Ping users endpoint to check API lock status
        const pingRes = await fetch(`${BROKERMINT_BASE_URL}/users?api_key=${BROKERMINT_API_KEY}&count=1`, {
            headers: { 'Accept': 'application/json' }
        });
        if (pingRes.status === 429) {
            console.log(`[${new Date().toISOString()}] API locked (429). Sleeping for 5 minutes...`);
            await wait(5 * 60 * 1000); // 5 mins
            continue;
        }
        if (!pingRes.ok) {
            console.error("Unknown error from Brokermint:", await pingRes.text());
            return;
        }
        console.log("API unlocked! Proceeding...");
        break;
    }

    // 1. Fetch FUB users
    console.log("Fetching FUB users...");
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

    // 2. Fetch all BT users
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

    // We only need to check active users with matching FUB IDs to assign deals
    for (const btUser of allBtUsers) {
        if (!btUser.active && btUser.role !== 'owner') continue; // Only actively tracking people

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

        if (!fubId) continue;

        console.log(`Processing BT Agent ${btUser.name} (ID: ${btUser.id}) mapped to FUB ID ${fubId}...`);

        let txStartingFromId: number | undefined = undefined;
        let mappedTxCount = 0;

        while (true) {
            let txUrl = `${BROKERMINT_BASE_URL}/transactions?api_key=${BROKERMINT_API_KEY}&count=1000&owned_by=User-${btUser.id}`;
            if (txStartingFromId) txUrl += `&starting_from_id=${txStartingFromId}`;

            const txRes = await fetch(txUrl, { headers: { 'Accept': 'application/json' } });
            if (!txRes.ok) {
                console.error(`Failed to fetch transactions for user ${btUser.id}`);
                break;
            }
            const chunk = await txRes.json();
            if (!chunk || chunk.length === 0) break;

            const batch = db.batch();
            let batchOps = 0;

            for (const t of chunk) {
                const docRef = db.collection('transactions').doc(String(t.id));
                batch.set(docRef, { ownerFubIds: FieldValue.arrayUnion(fubId) }, { merge: true });
                batchOps++;
                mappedTxCount++;
            }

            if (batchOps > 0) {
                try {
                    await batch.commit();
                } catch (e) {
                    console.log(`Skipping batch update for ${btUser.name} - likely some docs do not exist yet in DB`);
                }
            }

            if (chunk.length < 1000) break;
            txStartingFromId = chunk[chunk.length - 1].id;
            await wait(500);
        }

        console.log(`Bound ${mappedTxCount} transactions to agent ${btUser.name}.`);
        await wait(1000); // 1s wait between agent checks to avoid burst limit
    }

    console.log("Optimized hydration fully complete.");
}

run().catch(console.error);

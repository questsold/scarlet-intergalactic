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

    console.log("Fetching BT users...");
    let userUrl = `${BROKERMINT_BASE_URL}/users?api_key=${BROKERMINT_API_KEY}&count=1000`;
    const uRes = await fetch(userUrl, { headers: { 'Accept': 'application/json' } });
    const allBtUsers = await uRes.json();
    const btIdToUserMap = new Map<number, any>();
    allBtUsers.forEach((u: any) => btIdToUserMap.set(u.id, u));

    console.log("Checking tx...");
    const txSnapshot = await db.collection('transactions').orderBy('created_at', 'desc').limit(5).get();

    for (const d of txSnapshot.docs) {
        const tx = d.data();
        console.log(`\n--- Tx ${tx.id} ---`);
        const partRes = await fetch(`${BROKERMINT_BASE_URL}/transactions/${tx.id}/participants?api_key=${BROKERMINT_API_KEY}`, {
            headers: { 'Accept': 'application/json' }
        });
        if (partRes.ok) {
            const participants = await partRes.json();
            console.log("Raw Participants:", JSON.stringify(participants, null, 2));
            const linkedUsers = participants.filter((p: any) => p.user && p.user.status === 'active');

            const btAgentIds: number[] = [];
            for (const p of linkedUsers) {
                if (p.user.id) btAgentIds.push(p.user.id);
            }
            console.log("Linked user IDs:", btAgentIds);

            for (const btAgentId of btAgentIds) {
                const btUser = btIdToUserMap.get(btAgentId);
                console.log(`User for ${btAgentId}:`, btUser ? btUser.email : 'Not found');
                if (btUser) {
                    const email = btUser.email?.toLowerCase();
                    const name = (`${btUser.first_name || ''} ${btUser.last_name || ''}`).trim().toLowerCase();
                    console.log(`FUB match email? ${emailToFubUserId.get(email)} | name? ${nameToFubUserId.get(name)}`);
                }
            }
        } else {
            console.log("Participants failed:", partRes.status);
        }
    }
}

run().catch(console.error);

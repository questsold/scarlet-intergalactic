import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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
    console.log(`FUB Users mapped: ${users.length}`);

    console.log("Fetching Brokermint users...");
    let userUrl = `${BROKERMINT_BASE_URL}/users?api_key=${BROKERMINT_API_KEY}&count=10`;
    const uRes = await fetch(userUrl, { headers: { 'Accept': 'application/json' } });
    const chunk = await uRes.json();
    console.log("Sample BT Users:", JSON.stringify(chunk, null, 2));

    console.log("Checking tx 108357 agent ID 2750 against map");
    const uRes2 = await fetch(`${BROKERMINT_BASE_URL}/users/2750?api_key=${BROKERMINT_API_KEY}`, { headers: { 'Accept': 'application/json' } });
    const agent2750 = await uRes2.json();
    console.log("Agent 2750:", agent2750);
}

run().catch(console.error);

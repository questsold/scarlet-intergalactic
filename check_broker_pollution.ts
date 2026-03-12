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

async function run() {
    const all = await db.collection('transactions').get();

    let brokerIds = [1, 3, 5, 28]; // Ali, Samantha, Ronya, Quest Realty
    let aliOnlyDeals = 0;
    let onlyBrokersDeals = 0;
    let mixedDeals = 0;

    all.forEach(d => {
        const owners = d.data().ownerFubIds || [];
        if (owners.length > 0) {
            const hasBroker = owners.some(o => brokerIds.includes(o));
            const hasAgent = owners.some(o => !brokerIds.includes(o));

            if (hasBroker && hasAgent) {
                mixedDeals++;
            } else if (hasBroker && !hasAgent) {
                onlyBrokersDeals++;
            }

            if (owners.length === 1 && owners[0] === 1) {
                aliOnlyDeals++;
            }
        }
    });

    console.log(`Mixed Deals (Broker + real Agent): ${mixedDeals}`);
    console.log(`Only Brokers Deals: ${onlyBrokersDeals}`);
    console.log(`Ali ONLY Deals: ${aliOnlyDeals}`);
}

run().catch(console.error);

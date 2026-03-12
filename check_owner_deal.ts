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
    console.log("Checking deals assigned to Ali...");
    let aliDeals = 0;

    // List some addresses of Ali's deals to see if they're right
    let aliAddresses = [];
    const all = await db.collection('transactions').get();
    all.forEach(d => {
        const tx = d.data();
        if ((tx.ownerFubIds || []).includes(2)) { // Assuming Ali's FUB ID is 2
            aliDeals++;
            if (aliAddresses.length < 5) aliAddresses.push(tx.address);
        }
    });

    console.log(`Ali Berry (FUB 2) has ${aliDeals} deals in Firestore`);
    console.log(`Samples:`, aliAddresses);
}

run().catch(console.error);

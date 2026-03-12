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
    let emptyCount = 0;
    let populatedCount = 0;
    const snapshot = await db.collection('transactions').get();
    let samplePrinted = false;
    snapshot.forEach((d) => {
        const owners = d.data().ownerFubIds || [];
        if (owners.length === 0) emptyCount++;
        else {
            populatedCount++;
            if (!samplePrinted) {
                console.log("Sample Tx with owners:", JSON.stringify(d.data(), null, 2));
                samplePrinted = true;
            }
        }
    });
    console.log(`Transactions with 0 owners: ${emptyCount}`);
    console.log(`Transactions with owners: ${populatedCount}`);
}

run().catch(console.error);

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
if (!serviceAccountBase64) {
    console.error("Missing FIREBASE_SERVICE_ACCOUNT_BASE64");
    process.exit(1);
}
const serviceAccountJson = Buffer.from(serviceAccountBase64, 'base64').toString('utf-8');
const serviceAccount = JSON.parse(serviceAccountJson);
if (!getApps().length) {
    initializeApp({
        credential: cert(serviceAccount)
    });
}
const db = getFirestore();

async function run() {
    const snapshot = await db.collection('transactions').limit(1).get();
    if (snapshot.empty) {
        console.log("No transactions found in Firestore.");
        return;
    }
    snapshot.forEach(doc => {
        console.log("Tx ID:", doc.id);
        console.log(JSON.stringify(doc.data(), null, 2));
    });
}

run().catch(console.error);

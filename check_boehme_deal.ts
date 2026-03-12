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
    let boehmeTx = null;
    all.forEach(d => {
        if (d.data().address && d.data().address.includes('Boehme')) {
            boehmeTx = d.data();
        }
    });

    if (boehmeTx) {
        console.log("Boehme Deal:", JSON.stringify(boehmeTx, null, 2));
    } else {
        console.log("Boehme deal not found");
    }
}

run().catch(console.error);

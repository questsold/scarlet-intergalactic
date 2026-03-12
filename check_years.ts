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
    let ytdCount = 0;
    const now = new Date();
    const currentYear = now.getFullYear();
    const snapshot = await db.collection('transactions').get();
    let samplePrinted = false;
    snapshot.forEach(d => {
        const cd = d.data().closing_date || d.data().acceptance_date;
        if (cd) {
            const dt = new Date(cd);
            if (dt.getFullYear() === currentYear) {
                ytdCount++;
                if (!samplePrinted) {
                    console.log("Found transaction from this year:", d.id);
                    samplePrinted = true;
                }
            }
        }
    });
    console.log(`Current year transactions: ${ytdCount}`);
    console.log(`Current year checking against: ${currentYear}`);
}

run().catch(console.error);

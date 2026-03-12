import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
if (!base64) throw new Error('No service account');

const buf = Buffer.from(base64, 'base64');
initializeApp({ credential: cert(JSON.parse(buf.toString())) });

const db = getFirestore();
db.collection('fub_tag_events').get().then(s => {
  console.log("Found " + s.docs.length + " tags");
  s.docs.forEach(d => console.log(d.id, d.data()));
  process.exit(0);
});

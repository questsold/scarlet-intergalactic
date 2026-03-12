import dotenv from 'dotenv'; dotenv.config({ path: '.env.local' });
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fetch from 'node-fetch';

const buf = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64');
initializeApp({ credential: cert(JSON.parse(buf.toString())) });

async function run() {
  const db = getFirestore();
  const s = await db.collection('fub_tag_events').get();
  const fubTagEvents = s.docs.map(doc => doc.data());
  
  console.log('Fetching people (max 5000)...');
  const res = await fetch('https://scarlet-intergalactic.vercel.app/api/fub-proxy?action=people&limit=5000');
  const d = await res.json();
  const people = d.people;
  
  console.log('Events:', fubTagEvents.length, 'People:', people.length);
  
  fubTagEvents.forEach(tagEvent => {
    const { personId, tag, eventCreated } = tagEvent;
    const person = people.find(p => p.id === personId);
    console.log('Found person?', !!person, 'personId:', personId, typeof personId, 'first person id type:', typeof people[0].id);
    if (person) {
        console.log('Person assignedUserId:', person.assignedUserId);
    }
  });
  
  process.exit(0);
}

run().catch(console.error);

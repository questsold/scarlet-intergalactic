import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getSecurityRules } from 'firebase-admin/security-rules';
import fs from 'fs';

const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
const serviceAccountJson = Buffer.from(serviceAccountBase64, 'base64').toString('utf-8');
const serviceAccount = JSON.parse(serviceAccountJson);
if (!getApps().length) {
    initializeApp({
        credential: cert(serviceAccount)
    });
}

const source = fs.readFileSync('firestore.rules', 'utf8');

async function run() {
    const rules = getSecurityRules();
    console.log("Releasing Firestore rules...");
    await rules.releaseFirestoreRulesetFromSource(source);
    console.log("Success!");
}

run().catch(console.error);

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function testWrite() {
    try {
        console.log("Logging in...");
        const userCredential = await signInWithEmailAndPassword(auth, 'admin@questsold.com', 'password123');
        console.log("Logged in as:", userCredential.user.email);

        console.log("Attempting to write to client_portals collection...");
        const portalRef = doc(collection(db, 'client_portals'));
        await setDoc(portalRef, {
            id: portalRef.id,
            transactionId: 12345,
            clientName: "Test Client Script",
            propertyAddress: "123 Test St",
            agentId: "admin@questsold.com",
            createdAt: Date.now(),
            updatedAt: Date.now(),
            milestones: []
        });

        console.log("SUCCESS! Portal created with ID:", portalRef.id);
        process.exit(0);
    } catch (err) {
        console.error("FIREBASE ERROR:");
        console.error(err);
        process.exit(1);
    }
}

testWrite();

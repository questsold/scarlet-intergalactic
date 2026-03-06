const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, doc, setDoc } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0) {
        envVars[key.trim()] = values.join('=').trim().replace(/"/g, '');
    }
});

const firebaseConfig = {
    apiKey: envVars.VITE_FIREBASE_API_KEY,
    authDomain: envVars.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: envVars.VITE_FIREBASE_PROJECT_ID,
    storageBucket: envVars.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: envVars.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: envVars.VITE_FIREBASE_APP_ID
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

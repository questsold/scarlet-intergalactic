import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const createAgentAuthAccount = async (email: string, pass: string, name: string) => {
    const tempApp = initializeApp(firebaseConfig, 'tempApp_' + Date.now());
    const tempAuth = getAuth(tempApp);
    try {
        const userCredential = await createUserWithEmailAndPassword(tempAuth, email, pass);
        await updateProfile(userCredential.user, { displayName: name });
        await tempAuth.signOut();
        return { success: true, exists: false };
    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
            return { success: true, exists: true };
        }
        throw error;
    } finally {
        await deleteApp(tempApp);
    }
};

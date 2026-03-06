import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

export interface UserAccessData {
    hasAccess: boolean;
    role: 'admin' | 'user';
    name?: string;
    email?: string;
}

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);
    const [accessData, setAccessData] = useState<UserAccessData | null>(null);
    const location = useLocation();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                // Check Firestore for explicit approval
                if (firebaseUser.email) {
                    try {
                        const docRef = doc(db, 'allowed_users', firebaseUser.email.toLowerCase());
                        const docSnap = await getDoc(docRef);
                        const emailStr = firebaseUser.email.toLowerCase();
                        const isFounder = emailStr === 'ali@questsold.com' || emailStr === 'admin@questsold.com';

                        if (docSnap.exists()) {
                            const existingData = docSnap.data() as UserAccessData;
                            // If they are a founder but their existing doc says they don't have access, force upgrade them.
                            if (isFounder && !existingData.hasAccess) {
                                const upgradedAccess: UserAccessData = {
                                    ...existingData,
                                    hasAccess: true,
                                    role: 'admin',
                                    name: firebaseUser.displayName || existingData.name || 'Admin'
                                };
                                try { await setDoc(docRef, upgradedAccess); } catch (e) { console.warn("Could not save upgraded founder access to db, ignoring."); }
                                setAccessData(upgradedAccess);
                            } else {
                                setAccessData(existingData);
                            }
                        } else {
                            // Auto-grant the founders so they can access the Settings page and approve others
                            if (isFounder) {
                                const newAccess: UserAccessData = {
                                    hasAccess: true,
                                    role: 'admin',
                                    email: emailStr,
                                    name: firebaseUser.displayName || 'Admin'
                                };
                                try { await setDoc(docRef, newAccess); } catch (e) { console.warn("Could not save new founder access to db, ignoring."); }
                                setAccessData(newAccess);
                            } else {
                                // If they just created an account, they don't have access yet by default
                                setAccessData({ hasAccess: false, role: 'user' });
                            }
                        }
                    } catch (error) {
                        console.error("Error fetching access data:", error);
                        // If there is a permission error, founders should still get in.
                        const isFounder = (firebaseUser.email?.toLowerCase() === 'ali@questsold.com' || firebaseUser.email?.toLowerCase() === 'admin@questsold.com');
                        if (isFounder) {
                            setAccessData({ hasAccess: true, role: 'admin', email: firebaseUser.email?.toLowerCase(), name: firebaseUser.displayName || 'Admin' });
                        } else {
                            setAccessData({ hasAccess: false, role: 'user' });
                        }
                    }
                }
            } else {
                setUser(null);
                setAccessData(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0f1322] flex items-center justify-center">
                <div className="h-12 w-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (accessData && !accessData.hasAccess) {
        return (
            <div className="min-h-screen bg-[#0f1322] flex flex-col items-center justify-center text-center px-4">
                <div className="glass-card p-8 max-w-md w-full border border-red-500/20">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">🔒</span>
                    </div>
                    <h1 className="text-xl font-bold text-slate-100 mb-2">Access Pending</h1>
                    <p className="text-slate-400 text-sm mb-6">
                        Your account ({user.email}) has been created, but an administrator needs to grant you access before you can view the dashboard.
                    </p>
                    <button
                        onClick={() => auth.signOut()}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded-lg py-2 transition-colors border border-white/10"
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};

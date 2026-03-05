import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { ShieldAlert, ShieldCheck, Loader2 } from 'lucide-react';
import { boldtrailApi } from '../services/boldtrailApi';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../services/firebase';

interface FubAgent {
    id: number;
    name: string;
    email?: string;
    status: string;
}

interface UserAccess {
    email: string;
    hasAccess: boolean;
    role: 'admin' | 'user';
}

const AgentsPage: React.FC = () => {
    const [authUser] = useAuthState(auth);
    const [loading, setLoading] = useState(true);
    const [fubAgents, setFubAgents] = useState<FubAgent[]>([]);
    const [accessMap, setAccessMap] = useState<Record<string, UserAccess>>({});
    const [saving, setSaving] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Fetch Agents from FUB API proxy
                const response = await fetch('/api/users');
                if (!response.ok) throw new Error('Failed to fetch FUB users');
                const data = await response.json();
                const agents: FubAgent[] = data.users || [];

                // Filter only questsold agents immediately so we don't over-fetch
                const questAgents = agents.filter(a => {
                    const email = a.email?.toLowerCase();
                    return email && email.endsWith('@questsold.com') && email !== 'info@questsold.com';
                });
                setFubAgents(questAgents);

                // 2. Fetch allowed_users from Firestore
                const querySnapshot = await getDocs(collection(db, 'allowed_users'));
                const map: Record<string, UserAccess> = {};
                querySnapshot.forEach((doc) => {
                    map[doc.id] = { ...doc.data(), email: doc.id } as UserAccess;
                });
                setAccessMap(map);

                // 3. Fetch BoldTrail Users to match emails to BT IDs
                const btUsers = await boldtrailApi.getUsers();
                const emailToBtId: Record<string, number> = {};
                btUsers.forEach(u => {
                    if (u.email) {
                        emailToBtId[u.email.toLowerCase()] = u.id;
                    }
                });

                // Find BT IDs that match our quest agents
                // (We don't need the IDs for deep details anymore to avoid rate limits)
                // Skip profile matching logic to protect API limits


            } catch (err) {
                console.error("Error loading settings data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const toggleAccess = async (agentName: string, email: string) => {
        if (!email) {
            alert("This agent does not have a valid email address in Follow Up Boss.");
            return;
        }

        const emailKey = email.toLowerCase();
        const currentAccess = accessMap[emailKey];
        const newHasAccess = currentAccess ? !currentAccess.hasAccess : true;
        const newRole = currentAccess?.role || 'user';

        setSaving(emailKey);
        try {
            const docRef = doc(db, 'allowed_users', emailKey);
            await setDoc(docRef, {
                hasAccess: newHasAccess,
                role: newRole,
                name: agentName,
                email: emailKey
            }, { merge: true });

            setAccessMap(prev => ({
                ...prev,
                [emailKey]: {
                    email: emailKey,
                    hasAccess: newHasAccess,
                    role: newRole
                }
            }));
        } catch (err) {
            console.error("Error saving access toggle:", err);
            alert("Failed to save changes to the database.");
        } finally {
            setSaving(null);
        }
    };

    const toggleRole = async (agentName: string, email: string) => {
        if (!email) {
            alert("This agent does not have a valid email address.");
            return;
        }

        const emailKey = email.toLowerCase();
        const currentAccess = accessMap[emailKey];
        const newRole = currentAccess?.role === 'admin' ? 'user' : 'admin';
        const currentHasAccess = currentAccess?.hasAccess || false;

        setSaving(emailKey);
        try {
            const docRef = doc(db, 'allowed_users', emailKey);
            await setDoc(docRef, {
                hasAccess: currentHasAccess,
                role: newRole,
                name: agentName,
                email: emailKey
            }, { merge: true });

            setAccessMap(prev => ({
                ...prev,
                [emailKey]: {
                    email: emailKey,
                    hasAccess: currentHasAccess,
                    role: newRole
                }
            }));
        } catch (err) {
            console.error("Error saving access toggle:", err);
            alert("Failed to save changes to the database.");
        } finally {
            setSaving(null);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex h-[50vh] flex-col items-center justify-center text-slate-400 gap-4">
                    <Loader2 size={32} className="animate-spin text-blue-500" />
                    <span>Loading Agent Directory & BackOffice Sync...</span>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="w-full max-w-6xl mx-auto animate-in fade-in duration-500 pb-12">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-100">Agents Directory</h1>
                    <p className="text-slate-400 mt-2">Manage all agents, their dashboard access, and sync BackOffice data.</p>
                </div>

                {(() => {
                    const sortedAgents = [...fubAgents].sort((a, b) => a.name.localeCompare(b.name));

                    const renderTableSection = (title: string, agents: FubAgent[], description: string) => {
                        if (agents.length === 0) return null;

                        return (
                            <div className="glass-card bg-[#1c2336] border border-white/5 rounded-2xl overflow-hidden mb-8">
                                <div className="p-6 border-b border-white/5 bg-slate-800/20">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                                                {title} <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded-full">{agents.length} {title.includes('Leadership') ? 'Users' : 'Agents'}</span>
                                            </h2>
                                            <p className="text-sm text-slate-400 mt-1">
                                                {description}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="text-slate-400 text-xs uppercase tracking-wider font-semibold border-b border-white/5">
                                                <th className="px-6 py-4">Agent Name</th>
                                                <th className="px-6 py-4">Email</th>
                                                <th className="px-6 py-4 text-right">Dashboard Access</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {agents.map(agent => {
                                                const emailKey = agent.email?.toLowerCase();
                                                const dbAccess = emailKey ? accessMap[emailKey] : null;
                                                const hasAccess = dbAccess?.hasAccess || false;
                                                const isSaving = saving === emailKey;

                                                return (
                                                    <tr key={agent.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                        <td className="px-6 py-4 font-medium text-slate-200">
                                                            {agent.name}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="text-slate-300 text-sm">{agent.email || <span className="text-slate-600 italic">No email</span>}</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            {agent.email ? (
                                                                <div className="flex flex-col gap-2 items-end">
                                                                    <button
                                                                        onClick={() => toggleAccess(agent.name, agent.email!)}
                                                                        disabled={isSaving}
                                                                        className={`inline-flex w-36 justify-center items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${hasAccess
                                                                            ? 'bg-blue-500/10 text-blue-400 hover:bg-red-500/10 hover:text-red-400 border border-transparent hover:border-red-500/20'
                                                                            : 'bg-white/5 text-slate-300 hover:bg-blue-500 hover:text-white border border-white/10'
                                                                            } disabled:opacity-50`}
                                                                    >
                                                                        {isSaving ? 'Saving...' : hasAccess ? (
                                                                            <><ShieldCheck size={16} /> Revoke Access</>
                                                                        ) : (
                                                                            <><ShieldAlert size={16} /> Grant Access</>
                                                                        )}
                                                                    </button>

                                                                    {authUser?.email === 'ali@questsold.com' && (
                                                                        <button
                                                                            onClick={() => toggleRole(agent.name, agent.email!)}
                                                                            disabled={isSaving || !hasAccess}
                                                                            className={`inline-flex w-36 justify-center items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${dbAccess?.role === 'admin'
                                                                                ? 'bg-purple-500/20 text-purple-300 hover:bg-orange-500/20 hover:text-orange-300 border border-purple-500/30 hover:border-orange-500/30'
                                                                                : 'bg-white/5 text-slate-400 hover:bg-purple-500 hover:text-white border border-white/10'
                                                                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                                                                            title={!hasAccess ? "Must grant access first" : "Toggle admin role"}
                                                                        >
                                                                            {dbAccess?.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-red-400/80 italic">Requires valid email</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    };

                    return (
                        <>
                            {renderTableSection("Agent Directory", sortedAgents, "All synchronized agents from Follow Up Boss and BoldTrail BackOffice.")}
                            {fubAgents.length === 0 && (
                                <div className="p-8 text-center text-slate-500">No agents found from FUB API matching @questsold.com.</div>
                            )}
                        </>
                    );
                })()}
            </div>
        </DashboardLayout>
    );
};

export default AgentsPage;

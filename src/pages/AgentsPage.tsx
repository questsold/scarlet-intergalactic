import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { ShieldAlert, ShieldCheck } from 'lucide-react';

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
                setFubAgents(agents);

                // 2. Fetch allowed_users from Firestore
                const querySnapshot = await getDocs(collection(db, 'allowed_users'));
                const map: Record<string, UserAccess> = {};
                querySnapshot.forEach((doc) => {
                    map[doc.id] = { ...doc.data(), email: doc.id } as UserAccess;
                });
                setAccessMap(map);
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

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex h-[50vh] items-center justify-center text-slate-400">Loading Agent Directory...</div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="w-full max-w-4xl mx-auto animate-in fade-in duration-500 pb-12">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-100">Agents Directory</h1>
                    <p className="text-slate-400 mt-2">Manage all agents and their dashboard access.</p>
                </div>

                <div className="glass-card bg-[#1c2336] border border-white/5 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-white/5 bg-slate-800/20">
                        <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                            User Management
                        </h2>
                        <p className="text-sm text-slate-400 mt-1">
                            List of agents synchronized from Follow Up Boss. Toggle access to allow them to log into this dashboard. They must still sign in with their @questsold.com Google account.
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-slate-400 text-xs uppercase tracking-wider font-semibold border-b border-white/5">
                                    <th className="px-6 py-4">Agent Name</th>
                                    <th className="px-6 py-4">Email</th>
                                    <th className="px-6 py-4 text-center">FUB Status</th>
                                    <th className="px-6 py-4 text-right">Dashboard Access</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fubAgents.filter(agent => agent.email?.toLowerCase().endsWith('@questsold.com')).sort((a, b) => a.name.localeCompare(b.name)).map(agent => {
                                    const emailKey = agent.email?.toLowerCase();
                                    const dbAccess = emailKey ? accessMap[emailKey] : null;
                                    const hasAccess = dbAccess?.hasAccess || false;
                                    const isSaving = saving === emailKey;

                                    return (
                                        <tr key={agent.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-200">
                                                {agent.name}
                                            </td>
                                            <td className="px-6 py-4 text-slate-400 text-sm">
                                                {agent.email || <span className="text-slate-600 italic">No email provided</span>}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${agent.status === 'Active' ? 'border-green-500/20 text-green-400 bg-green-500/10' : 'border-slate-500/20 text-slate-400 bg-slate-500/10'
                                                    }`}>
                                                    {agent.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {agent.email ? (
                                                    <button
                                                        onClick={() => toggleAccess(agent.name, agent.email!)}
                                                        disabled={isSaving}
                                                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${hasAccess
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
                                                ) : (
                                                    <span className="text-xs text-red-400/80 italic">Requires valid email</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {fubAgents.length === 0 && (
                            <div className="p-8 text-center text-slate-500">No agents found from FUB API.</div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default AgentsPage;

import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { ShieldAlert, ShieldCheck, Loader2 } from 'lucide-react';
import { boldtrailApi } from '../services/boldtrailApi';

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

interface BtProfile {
    title?: string;
    phone?: string;
    anniversary_date?: number;
}

const formatDate = (ts?: number) => {
    if (!ts) return 'N/A';
    return new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const AgentsPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [fubAgents, setFubAgents] = useState<FubAgent[]>([]);
    const [accessMap, setAccessMap] = useState<Record<string, UserAccess>>({});
    const [btProfiles, setBtProfiles] = useState<Record<string, BtProfile>>({});
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
                const questAgents = agents.filter(a => a.email?.toLowerCase().endsWith('@questsold.com'));
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
                const btIdsToFetch: number[] = [];
                const questAgentEmails = questAgents.map(a => a.email?.toLowerCase()).filter(Boolean) as string[];
                questAgentEmails.forEach(email => {
                    if (emailToBtId[email]) {
                        btIdsToFetch.push(emailToBtId[email]);
                    }
                });

                // Fetch expanded profiles in parallel
                if (btIdsToFetch.length > 0) {
                    const profiles = await boldtrailApi.getUserDetails(btIdsToFetch);
                    const profileMapByEmail: Record<string, BtProfile> = {};

                    // The 'profiles' object is keyed by BT ID
                    Object.values(profiles).forEach((profile: any) => {
                        if (profile && profile.email) {
                            profileMapByEmail[profile.email.toLowerCase()] = {
                                title: profile.title,
                                phone: profile.phone,
                                anniversary_date: profile.anniversary_date
                            };
                        }
                    });
                    setBtProfiles(profileMapByEmail);
                }

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

                <div className="glass-card bg-[#1c2336] border border-white/5 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-white/5 bg-slate-800/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                                    User Management <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded-full">{fubAgents.length} Agents</span>
                                </h2>
                                <p className="text-sm text-slate-400 mt-1">
                                    Internal Team synchronized from Follow Up Boss and BoldTrail BackOffice.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-slate-400 text-xs uppercase tracking-wider font-semibold border-b border-white/5">
                                    <th className="px-6 py-4">Agent Name</th>
                                    <th className="px-6 py-4">Title</th>
                                    <th className="px-6 py-4">Email & Phone</th>
                                    <th className="px-6 py-4">Rollover Date</th>
                                    <th className="px-6 py-4 text-center">FUB Status</th>
                                    <th className="px-6 py-4 text-right">Dashboard Access</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fubAgents.sort((a, b) => a.name.localeCompare(b.name)).map(agent => {
                                    const emailKey = agent.email?.toLowerCase();
                                    const dbAccess = emailKey ? accessMap[emailKey] : null;
                                    const hasAccess = dbAccess?.hasAccess || false;
                                    const isSaving = saving === emailKey;
                                    const profile = emailKey ? btProfiles[emailKey] : null;

                                    return (
                                        <tr key={agent.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-200">
                                                {agent.name}
                                            </td>
                                            <td className="px-6 py-4 text-slate-400 text-sm">
                                                {profile?.title || <span className="text-slate-600 italic">Agent</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-slate-300 text-sm">{agent.email || <span className="text-slate-600 italic">No email</span>}</span>
                                                    {profile?.phone && <span className="text-slate-500 text-xs mt-0.5">{profile.phone}</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-400 text-sm">
                                                {formatDate(profile?.anniversary_date)}
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
                            <div className="p-8 text-center text-slate-500">No agents found from FUB API matching @questsold.com.</div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default AgentsPage;

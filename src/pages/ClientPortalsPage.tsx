// Create Portals List Component (ClientPortalsPage)
import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { AppWindow, Loader2, Plus, ArrowRight, Clock, MapPin, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../services/firebase';
import { clientPortalService } from '../services/clientPortalService';
import type { ClientPortal } from '../types/clientPortal';
import { doc, getDoc } from 'firebase/firestore';

const ClientPortalsPage: React.FC = () => {
    const [authUser] = useAuthState(auth);
    const [portals, setPortals] = useState<ClientPortal[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (!authUser?.email) return;

        const checkAdminAndFetch = async () => {
            try {
                let adminStatus = false;
                try {
                    const userDoc = await getDoc(doc(db, 'allowed_users', authUser.email!.toLowerCase()));
                    adminStatus = userDoc.exists() && userDoc.data().role === 'admin';
                } catch (e) {
                    const isFounder = authUser.email?.toLowerCase() === 'ali@questsold.com' || authUser.email?.toLowerCase() === 'admin@questsold.com';
                    adminStatus = isFounder;
                }
                setIsAdmin(adminStatus);

                let fetchedPortals: ClientPortal[] = [];
                if (adminStatus) {
                    fetchedPortals = await clientPortalService.getAllPortals();
                } else {
                    fetchedPortals = await clientPortalService.getPortalsByAgent(authUser.email!);
                }
                setPortals(fetchedPortals);
            } catch (error) {
                console.error("Error fetching client portals:", error);
            } finally {
                setLoading(false);
            }
        };

        checkAdminAndFetch();
    }, [authUser]);

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm("Are you sure you want to delete this portal? The client will no longer be able to access it.")) {
            try {
                await clientPortalService.deletePortal(id);
                setPortals(prev => prev.filter(p => p.id !== id));
            } catch (error) {
                console.error("Error deleting portal", error);
            }
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex h-[50vh] flex-col items-center justify-center text-slate-400 gap-4">
                    <Loader2 size={32} className="animate-spin text-blue-500" />
                    <span>Loading Portals...</span>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-100 tracking-tight flex items-center gap-3">
                            <AppWindow className="text-brand-green" /> Client Portals
                        </h1>
                        <p className="text-slate-400 mt-2">Manage interactive timeline portals for your clients.</p>
                    </div>
                    <button
                        onClick={() => navigate('/transactions')}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-green text-white rounded-lg font-medium hover:bg-brand-green/90 transition-colors shadow-lg shadow-brand-green/20"
                    >
                        <Plus size={18} /> New Portal
                    </button>
                </div>

                {portals.length === 0 ? (
                    <div className="glass-card flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-[#1c2336] border border-white/5">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                            <AppWindow size={32} className="text-slate-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-200 mb-2">No Portals Yet</h3>
                        <p className="text-slate-400 max-w-md mx-auto mb-6">
                            You haven't created any client portals. Go to your transactions list to create a beautiful, interactive timeline for your clients.
                        </p>
                        <button
                            onClick={() => navigate('/transactions')}
                            className="px-6 py-2.5 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition-colors"
                        >
                            View Transactions
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {portals.map(portal => (
                            <div
                                key={portal.id}
                                onClick={() => navigate(`/portals/${portal.id}`)}
                                className="glass-card bg-[#1c2336] border border-white/5 rounded-2xl overflow-hidden hover:border-brand-green/30 transition-all cursor-pointer group flex flex-col"
                            >
                                <div className="p-6 border-b border-white/5 relative">
                                    <button
                                        onClick={(e) => handleDelete(e, portal.id)}
                                        className="absolute top-4 right-4 p-2 rounded-lg bg-black/20 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                    <h3 className="text-xl font-bold text-slate-100 mb-1 line-clamp-1">{portal.clientName}</h3>
                                    <p className="text-slate-400 flex items-center gap-1.5 text-sm line-clamp-1">
                                        <MapPin size={14} /> {portal.propertyAddress}
                                    </p>
                                </div>
                                <div className="p-6 flex-1 flex flex-col justify-between">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-500">Created:</span>
                                            <span className="text-slate-300 flex items-center gap-1">
                                                <Clock size={14} />
                                                {new Date(portal.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-500">Milestones Done:</span>
                                            <span className="text-slate-300 font-medium bg-white/5 px-2 py-0.5 rounded-full">
                                                {portal.milestones.filter(m => m.isCompleted).length} / {portal.milestones.length}
                                            </span>
                                        </div>
                                        {isAdmin && (
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-slate-500">Agent:</span>
                                                <span className="text-slate-300 truncate max-w-[150px]" title={portal.agentId}>
                                                    {portal.agentId}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-brand-green group-hover:text-brand-green/80 transition-colors">
                                        <span className="font-medium text-sm">Edit Timeline</span>
                                        <ArrowRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default ClientPortalsPage;

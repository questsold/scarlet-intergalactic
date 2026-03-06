// Create Portals List Component (ClientPortalsPage)
import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { AppWindow, Loader2, Plus, ArrowRight, Clock, MapPin, Trash2, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { searchPeople } from '../services/fubApi';
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

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedClientName, setSelectedClientName] = useState('');
    const [selectedClientCreated, setSelectedClientCreated] = useState<number | undefined>(undefined);
    const [propertyAddress, setPropertyAddress] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // Address Autocomplete states
    const [addressResults, setAddressResults] = useState<any[]>([]);
    const [isSearchingAddress, setIsSearchingAddress] = useState(false);
    const [showAddressDropdown, setShowAddressDropdown] = useState(false);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.trim().length > 2) {
                setIsSearching(true);
                try {
                    const res = await searchPeople(searchQuery);
                    setSearchResults(res.people || []);
                } catch (err) {
                    console.error("Failed to search people:", err);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (propertyAddress.trim().length > 3 && showAddressDropdown) {
                setIsSearchingAddress(true);
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(propertyAddress)}&format=json&addressdetails=1&limit=5&countrycodes=us`);
                    const data = await res.json();
                    setAddressResults(data);
                } catch (err) {
                    console.error("Failed to search addresses:", err);
                } finally {
                    setIsSearchingAddress(false);
                }
            } else {
                setAddressResults([]);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [propertyAddress, showAddressDropdown]);

    const handleCreatePortal = async () => {
        if (!selectedClientName || !propertyAddress || !authUser?.email) {
            alert("Please select a client and enter a property address.");
            return;
        }
        setIsCreating(true);
        try {
            const newPortalId = await clientPortalService.createManualPortal(
                selectedClientName,
                propertyAddress,
                authUser.email,
                selectedClientCreated
            );
            setIsModalOpen(false);
            navigate(`/portals/${newPortalId}`);
        } catch (err) {
            console.error("Error creating portal:", err);
            alert("Failed to create portal");
            setIsCreating(false);
        }
    };

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
                        onClick={() => setIsModalOpen(true)}
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
                            onClick={() => setIsModalOpen(true)}
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

            {/* Create Manual Portal Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#1c2336] rounded-2xl w-full max-w-lg shadow-2xl border border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between p-6 border-b border-white/5">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Plus size={20} className="text-brand-green" /> New Client Portal
                            </h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 -mr-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 overflow-y-auto">
                            {!selectedClientName ? (
                                <div className="space-y-4">
                                    <label className="block text-sm font-medium text-slate-300">Search Follow Up Boss Client</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            {isSearching ? <Loader2 size={18} className="text-brand-green animate-spin" /> : <Search size={18} className="text-slate-500" />}
                                        </div>
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Type a name to search..."
                                            className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green/50 text-white placeholder-slate-500 transition-all"
                                        />
                                    </div>

                                    {searchResults.length > 0 && (
                                        <div className="mt-2 bg-slate-900 border border-white/10 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                                            {searchResults.map(person => (
                                                <button
                                                    key={person.id}
                                                    onClick={() => {
                                                        setSelectedClientName(person.name);
                                                        setSelectedClientCreated(person.created ? new Date(person.created).getTime() : undefined);
                                                    }}
                                                    className="w-full text-left px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors flex items-center justify-between group"
                                                >
                                                    <div>
                                                        <div className="text-slate-200 font-medium">{person.name}</div>
                                                        {(person.emails?.length > 0 || person.phones?.length > 0) && (
                                                            <div className="text-slate-500 text-sm mt-0.5">
                                                                {person.emails?.[0]?.value || person.phones?.[0]?.value}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <ArrowRight size={16} className="text-brand-green opacity-0 group-hover:opacity-100 transition-opacity transform -translate-x-2 group-hover:translate-x-0" />
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {searchQuery.trim().length > 2 && !isSearching && searchResults.length === 0 && (
                                        <div className="text-slate-400 text-sm text-center py-4">No clients found matching "{searchQuery}"</div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    <div className="bg-brand-green/10 border border-brand-green/20 rounded-xl p-4 flex items-center justify-between">
                                        <div>
                                            <div className="text-xs text-brand-green uppercase tracking-wider font-semibold mb-1">Selected Client</div>
                                            <div className="text-white font-medium text-lg">{selectedClientName}</div>
                                        </div>
                                        <button
                                            onClick={() => { setSelectedClientName(''); setSelectedClientCreated(undefined); setSearchQuery(''); setSearchResults([]); }}
                                            className="text-slate-400 hover:text-white text-sm"
                                        >
                                            Change
                                        </button>
                                    </div>

                                    <div className="space-y-2 relative">
                                        <label className="block text-sm font-medium text-slate-300">Property Address / Goal</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={propertyAddress}
                                                onChange={(e) => {
                                                    setPropertyAddress(e.target.value);
                                                    setShowAddressDropdown(true);
                                                }}
                                                placeholder="e.g. 123 Main St or 'Buyer Search'"
                                                className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green/50 text-white placeholder-slate-500 transition-all"
                                            />
                                            {isSearchingAddress && (
                                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                    <Loader2 size={16} className="text-brand-green animate-spin" />
                                                </div>
                                            )}
                                        </div>

                                        {showAddressDropdown && addressResults.length > 0 && (
                                            <div className="absolute z-10 w-full mt-1 bg-slate-900 border border-white/10 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                                                {addressResults.map((addr, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => {
                                                            setPropertyAddress(addr.display_name.split(',').slice(0, 3).join(',').trim());
                                                            setShowAddressDropdown(false);
                                                            setAddressResults([]);
                                                        }}
                                                        className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-white/5 hover:text-white border-b border-white/5 last:border-0 transition-colors flex items-center gap-2"
                                                    >
                                                        <MapPin size={14} className="shrink-0 text-brand-green" />
                                                        <span className="truncate">{addr.display_name.split(',').slice(0, 3).join(',')}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-white/5 bg-slate-900/50 flex justify-end gap-3">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-5 py-2.5 rounded-xl font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreatePortal}
                                disabled={!selectedClientName || !propertyAddress || isCreating}
                                className="px-5 py-2.5 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green/90 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                            >
                                {isCreating ? <Loader2 size={18} className="animate-spin" /> : <span>Create Portal</span>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default ClientPortalsPage;

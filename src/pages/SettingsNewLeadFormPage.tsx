import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { fetchUsers, createEvent } from '../services/fubApi';
import type { FubUser } from '../types/fub';

const LEADS_SOURCES = [
    "Amerisave Realty",
    "DFCU",
    "Facebook",
    "Google",
    "MyLinked Solutions",
    "Open House",
    "Other/Agent",
    "ProBroker",
    "Referral",
    "Return Client",
    "Rocket HyperLocal",
    "Sphere",
    "Website",
    "Yelp",
    "Zillow"
];

const SettingsNewLeadFormPage: React.FC = () => {
    const navigate = useNavigate();
    const [loadingSettings, setLoadingSettings] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [users, setUsers] = useState<FubUser[]>([]);
    
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        source: '',
        assignedUserId: '',
        tag1: '',
        tag2: ''
    });

    useEffect(() => {
        const loadFubData = async () => {
            try {
                const usersResponse = await fetchUsers();
                const activeUsers = (usersResponse.users || []).filter(u => u.status === 'Active' && (u.role === 'Owner' || u.role === 'Agent'));
                // Sort users alphabetically
                activeUsers.sort((a, b) => a.name.localeCompare(b.name));
                setUsers(activeUsers);
            } catch (err) {
                console.error("Failed to load users for lead form", err);
            } finally {
                setLoadingSettings(false);
            }
        };
        
        loadFubData();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        setIsSuccess(false);

        try {
            if (!formData.firstName || !formData.lastName || !formData.source || !formData.assignedUserId) {
                throw new Error("First Name, Last Name, Source, and Assigned Agent are required.");
            }

            const tags = [];
            if (formData.tag1) tags.push(formData.tag1.trim());
            if (formData.tag2) tags.push(formData.tag2.trim());

            const personPayload: any = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                assignedUserId: parseInt(formData.assignedUserId, 10),
            };

            if (formData.email) {
                personPayload.emails = [{ value: formData.email }];
            }

            if (formData.phone) {
                personPayload.phones = [{ value: formData.phone }];
            }

            if (tags.length > 0) {
                personPayload.tags = tags;
            }

            const eventPayload = {
                source: formData.source,
                type: "Inquiry",
                message: "Lead manually entered via Scarlet Intergalactic admin settings.",
                system: "ScarletDashboard",
                person: personPayload
            };

            await createEvent(eventPayload);
            
            setIsSuccess(true);
            setFormData({
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                source: '',
                assignedUserId: '',
                tag1: '',
                tag2: ''
            });
            
            setTimeout(() => setIsSuccess(false), 5000);

        } catch (err: any) {
            setError(err.message || 'Failed to submit lead.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingSettings) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-full pt-20">
                    <Loader2 className="w-8 h-8 text-brand-green animate-spin" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="w-full max-w-3xl mx-auto animate-in fade-in duration-500 pb-12">
                <div className="mb-6 flex items-center gap-4">
                    <button 
                        onClick={() => navigate('/settings')}
                        className="p-2 hover:bg-[#20283e] rounded-xl transition-colors border border-transparent hover:border-white/10 text-slate-400 group focus:outline-none"
                        title="Back to Settings"
                    >
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-100">New Lead Input Form</h1>
                        <p className="text-slate-400 mt-2">Enter lead details to automatically route them into Follow Up Boss.</p>
                    </div>
                </div>

                <div className="glass-card bg-[#1c2336] border border-white/5 rounded-2xl p-6 md:p-8">
                    {isSuccess && (
                        <div className="mb-6 p-4 rounded-xl bg-brand-green/10 border border-brand-green/20 flex items-start gap-4">
                            <CheckCircle className="text-brand-green shrink-0 mt-0.5" size={20} />
                            <div>
                                <h4 className="text-brand-green font-semibold">Lead Submitted Successfully</h4>
                                <p className="text-brand-green/80 text-sm mt-1">The lead has been sent directly to Follow Up Boss.</p>
                            </div>
                        </div>
                    )}
                    
                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-4">
                            <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={20} />
                            <div>
                                <h4 className="text-red-400 font-semibold">Submission Error</h4>
                                <p className="text-red-400/80 text-sm mt-1">{error}</p>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Name Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2 relative group">
                                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 group-focus-within:text-brand-green transition-colors">
                                    First Name <span className="text-red-400">*</span>
                                </label>
                                <input 
                                    type="text"
                                    name="firstName"
                                    required
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    className="w-full bg-[#121727] border border-white/10 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green transition-all"
                                    placeholder="John"
                                />
                            </div>
                            <div className="space-y-2 relative group">
                                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 group-focus-within:text-brand-green transition-colors">
                                    Last Name <span className="text-red-400">*</span>
                                </label>
                                <input 
                                    type="text"
                                    name="lastName"
                                    required
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    className="w-full bg-[#121727] border border-white/10 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green transition-all"
                                    placeholder="Doe"
                                />
                            </div>
                        </div>

                        {/* Contact Info Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2 relative group">
                                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 group-focus-within:text-brand-green transition-colors">
                                    Email
                                </label>
                                <input 
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full bg-[#121727] border border-white/10 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green transition-all"
                                    placeholder="lead@example.com"
                                />
                            </div>
                            <div className="space-y-2 relative group">
                                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 group-focus-within:text-brand-green transition-colors">
                                    Phone
                                </label>
                                <input 
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="w-full bg-[#121727] border border-white/10 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green transition-all"
                                    placeholder="(555) 123-4567"
                                />
                            </div>
                        </div>

                        {/* Dropdowns */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2 relative group">
                                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 group-focus-within:text-brand-green transition-colors">
                                    Source <span className="text-red-400">*</span>
                                </label>
                                <div className="relative">
                                    <select 
                                        name="source"
                                        required
                                        value={formData.source}
                                        onChange={handleChange}
                                        className="w-full bg-[#121727] border border-white/10 rounded-xl px-4 py-3 text-slate-200 appearance-none focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green transition-all"
                                    >
                                        <option value="" disabled>Select Source</option>
                                        {LEADS_SOURCES.map(source => (
                                            <option key={source} value={source}>{source}</option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                                        <span className="text-slate-500">▼</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 relative group">
                                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 group-focus-within:text-brand-green transition-colors">
                                    Assigned Agent <span className="text-red-400">*</span>
                                </label>
                                <div className="relative">
                                    <select 
                                        name="assignedUserId"
                                        required
                                        value={formData.assignedUserId}
                                        onChange={handleChange}
                                        className="w-full bg-[#121727] border border-white/10 rounded-xl px-4 py-3 text-slate-200 appearance-none focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green transition-all"
                                    >
                                        <option value="" disabled>Select Assigned Agent</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.name}</option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                                        <span className="text-slate-500">▼</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tags Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
                            <div className="space-y-2 relative group">
                                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 group-focus-within:text-brand-green transition-colors">
                                    Tag 1
                                </label>
                                <input 
                                    type="text"
                                    name="tag1"
                                    value={formData.tag1}
                                    onChange={handleChange}
                                    className="w-full bg-[#121727] border border-white/10 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green transition-all"
                                    placeholder="Enter Tag 1..."
                                />
                            </div>
                            <div className="space-y-2 relative group">
                                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 group-focus-within:text-brand-green transition-colors">
                                    Tag 2
                                </label>
                                <input 
                                    type="text"
                                    name="tag2"
                                    value={formData.tag2}
                                    onChange={handleChange}
                                    className="w-full bg-[#121727] border border-white/10 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green transition-all"
                                    placeholder="Enter Tag 2..."
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/5 flex justify-end">
                            <button 
                                type="submit"
                                disabled={submitting}
                                className="bg-brand-green hover:bg-brand-green/90 text-[#0f1322] font-semibold py-3 px-8 rounded-xl transition-all shadow-lg shadow-brand-green/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {submitting && <Loader2 size={18} className="animate-spin" />}
                                {submitting ? "Submitting..." : "Submit Lead"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );

};

export default SettingsNewLeadFormPage;

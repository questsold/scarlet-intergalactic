// Client Portal Editor - Agent facing view
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import {
    Loader2,
    ArrowLeft,
    CheckCircle2,
    Circle,
    Save,
    Copy,
    ExternalLink,
    MapPin,
    User as UserIcon,
    AlertCircle
} from 'lucide-react';
import { clientPortalService } from '../services/clientPortalService';
import type { ClientPortal } from '../types/clientPortal';

const ClientPortalEditor: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [portal, setPortal] = useState<ClientPortal | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchPortal = async () => {
            if (!id) return;
            try {
                const data = await clientPortalService.getPortal(id);
                if (data) {
                    setPortal(data);
                } else {
                    setError('Portal not found.');
                }
            } catch (err) {
                console.error("Error fetching portal:", err);
                setError('Failed to load portal.');
            } finally {
                setLoading(false);
            }
        };
        fetchPortal();
    }, [id]);

    const handleSave = async () => {
        if (!portal) return;
        setSaving(true);
        try {
            await clientPortalService.updatePortal(portal.id, {
                milestones: portal.milestones,
                clientName: portal.clientName
            });
            // Show a quick success indication?
        } catch (err) {
            console.error("Error saving portal:", err);
            alert("Failed to save changes.");
        } finally {
            setSaving(false);
        }
    };

    const toggleMilestone = (milestoneId: string) => {
        if (!portal) return;
        const newMilestones = portal.milestones.map(m => {
            if (m.id === milestoneId) {
                const isNowCompleted = !m.isCompleted;
                return {
                    ...m,
                    isCompleted: isNowCompleted,
                    completedDate: isNowCompleted ? Date.now() : null
                };
            }
            return m;
        });
        setPortal({ ...portal, milestones: newMilestones });
    };

    const handleDateChange = (milestoneId: string, timestamp: number | null) => {
        if (!portal) return;
        const newMilestones = portal.milestones.map(m => {
            if (m.id === milestoneId) {
                return { ...m, deadlineDate: timestamp };
            }
            return m;
        });
        setPortal({ ...portal, milestones: newMilestones });
    };

    const copyLink = () => {
        const url = `${window.location.origin}/portal/${id}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const goToPublicView = () => {
        window.open(`/portal/${id}`, '_blank');
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex h-[50vh] flex-col items-center justify-center text-slate-400 gap-4">
                    <Loader2 size={32} className="animate-spin text-brand-green" />
                    <span>Loading Editor...</span>
                </div>
            </DashboardLayout>
        );
    }

    if (error || !portal) {
        return (
            <DashboardLayout>
                <div className="flex h-[50vh] flex-col items-center justify-center text-slate-400 gap-4 p-6 text-center">
                    <AlertCircle size={48} className="text-red-400 mb-2" />
                    <h2 className="text-2xl font-semibold text-white">Oops!</h2>
                    <p>{error || 'Portal not found.'}</p>
                    <button
                        onClick={() => navigate('/portals')}
                        className="mt-4 px-6 py-2 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition-colors"
                    >
                        Return to Portals
                    </button>
                </div>
            </DashboardLayout>
        );
    }

    const completedCount = portal.milestones.filter(m => m.isCompleted).length;
    const totalCount = portal.milestones.length;
    const progress = Math.round((completedCount / totalCount) * 100);

    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto flex flex-col gap-6 pb-20">
                {/* Header Actions */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => navigate('/portals')}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={18} /> Back to Portals
                    </button>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={copyLink}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${copied ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'}`}
                        >
                            {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                            {copied ? 'Copied Link' : 'Copy Client Link'}
                        </button>
                        <button
                            onClick={goToPublicView}
                            className="flex items-center gap-2 px-4 py-2 bg-white/5 text-slate-300 border border-white/10 rounded-lg font-medium hover:bg-white/10 transition-colors"
                        >
                            <ExternalLink size={18} /> View Public
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-2 bg-brand-green text-white rounded-lg font-medium hover:bg-brand-green/90 transition-colors shadow-lg shadow-brand-green/20 disabled:opacity-50"
                        >
                            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            Save Changes
                        </button>
                    </div>
                </div>

                {/* Info Card */}
                <div className="glass-card bg-[#1c2336] border border-white/5 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row justify-between gap-6">
                    <div className="flex-1 space-y-4">
                        <h1 className="text-3xl font-bold text-white tracking-tight">Timeline Editor</h1>
                        <div className="space-y-2">
                            <div className="flex items-center gap-3 text-slate-300">
                                <UserIcon size={18} className="text-slate-500" />
                                <input
                                    type="text"
                                    value={portal.clientName}
                                    onChange={(e) => setPortal({ ...portal, clientName: e.target.value })}
                                    className="bg-transparent border-b border-transparent hover:border-white/20 focus:border-brand-green focus:outline-none transition-colors font-medium text-lg w-full max-w-sm px-1 py-0.5"
                                    placeholder="Client Name"
                                />
                            </div>
                            <div className="flex items-center gap-3 text-slate-400">
                                <MapPin size={18} className="text-slate-500" />
                                <span className="px-1">{portal.propertyAddress}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900/50 p-6 rounded-xl border border-white/5 min-w-[200px] flex flex-col items-center justify-center text-center">
                        <div className="text-4xl font-bold text-brand-green mb-2">{progress}%</div>
                        <p className="text-slate-400 text-sm font-medium">Timeline Completion</p>
                        <div className="w-full bg-slate-800 rounded-full h-2 mt-4 overflow-hidden">
                            <div
                                className="bg-brand-green h-full rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Editor List */}
                <div className="glass-card bg-[#1c2336] border border-white/5 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-white/5 bg-slate-800/20">
                        <h2 className="text-lg font-semibold text-slate-200">Milestones</h2>
                        <p className="text-sm text-slate-400 mt-1">Check off items as they happen and adjust target dates.</p>
                    </div>

                    <div className="divide-y divide-white/5">
                        {portal.milestones.sort((a, b) => a.order - b.order).map((milestone) => (
                            <div
                                key={milestone.id}
                                className={`p-6 transition-colors flex flex-col sm:flex-row gap-6 items-start sm:items-center ${milestone.isCompleted ? 'bg-brand-green/5' : 'hover:bg-white/5'}`}
                            >
                                <button
                                    onClick={() => toggleMilestone(milestone.id)}
                                    className="pt-1 focus:outline-none group shrink-0"
                                >
                                    {milestone.isCompleted ? (
                                        <CheckCircle2 size={32} className="text-brand-green transition-transform group-hover:scale-110 group-active:scale-95" />
                                    ) : (
                                        <Circle size={32} className="text-slate-600 transition-all group-hover:text-slate-400 group-active:scale-95" />
                                    )}
                                </button>

                                <div className="flex-1 min-w-0">
                                    <h3 className={`text-lg font-semibold mb-1 transition-colors ${milestone.isCompleted ? 'text-brand-green' : 'text-slate-200'}`}>
                                        {milestone.title}
                                    </h3>
                                    <p className="text-slate-400 text-sm">
                                        {milestone.description}
                                    </p>
                                </div>

                                <div className="shrink-0 w-full sm:w-auto">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                                        Target Date
                                    </label>
                                    <input
                                        type="date"
                                        value={milestone.deadlineDate ? new Date(milestone.deadlineDate).toISOString().split('T')[0] : ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            handleDateChange(milestone.id, val ? new Date(val).getTime() : null);
                                        }}
                                        className={`bg-slate-900/50 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/50 transition-all ${milestone.isCompleted ? 'border-brand-green/20 text-brand-green/70 cursor-not-allowed opacity-70' : 'border-white/10 text-slate-300 hover:border-white/20'}`}
                                        disabled={milestone.isCompleted}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </DashboardLayout>
    );
};

export default ClientPortalEditor;

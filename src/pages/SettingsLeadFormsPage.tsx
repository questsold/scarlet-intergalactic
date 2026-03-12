import React from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { ArrowLeft, UserPlus, Target } from 'lucide-react';

const SettingsLeadFormsPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <DashboardLayout>
            <div className="w-full max-w-4xl mx-auto animate-in fade-in duration-500 pb-12 px-4">
                <div className="mb-8 flex items-center gap-4">
                    <button 
                        onClick={() => navigate('/settings')}
                        className="p-2 hover:bg-[#20283e] rounded-xl transition-colors border border-transparent hover:border-white/10 text-slate-400 group focus:outline-none"
                        title="Back to Settings"
                    >
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-100">Lead Input Forms</h1>
                        <p className="text-slate-400 mt-2">Select a form to manually input leads into your Follow Up Boss CRM.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div 
                        onClick={() => navigate('/settings/new-lead-form')}
                        className="glass-card bg-[#1c2336] border border-white/5 rounded-2xl p-6 cursor-pointer hover:bg-white/5 hover:border-brand-green/30 transition-all group flex flex-col h-full"
                    >
                        <div className="w-12 h-12 bg-brand-green/10 text-brand-green rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <UserPlus size={24} />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-200 mb-2 group-hover:text-brand-green transition-colors">
                            General Lead Input Form
                        </h3>
                        <p className="text-slate-400 text-sm leading-relaxed flex-grow">
                            Standard form with multiple source options (Zillow, Facebook, Website, etc.) to capture conventional inbound leads.
                        </p>
                    </div>

                    <div 
                        onClick={() => navigate('/settings/hyperlocal-lead-form')}
                        className="glass-card bg-[#1c2336] border border-white/5 rounded-2xl p-6 cursor-pointer hover:bg-white/5 hover:border-purple-500/30 transition-all group flex flex-col h-full"
                    >
                        <div className="w-12 h-12 bg-purple-500/10 text-purple-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Target size={24} />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-200 mb-2 group-hover:text-purple-400 transition-colors">
                            Rocket HyperLocal Form
                        </h3>
                        <p className="text-slate-400 text-sm leading-relaxed flex-grow">
                            Specialized form designed specifically for Rocket HyperLocal leads with a locked source attribution.
                        </p>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default SettingsLeadFormsPage;

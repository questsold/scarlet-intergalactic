import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { clientPortalService } from '../services/clientPortalService';
import type { ClientPortal } from '../types/clientPortal';
import { Loader2, Home, CheckCircle2, Circle, MapPin, CalendarClock, PartyPopper } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ClientPortalPublicView: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [portal, setPortal] = useState<ClientPortal | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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
                setError('Failed to load timeline.');
            } finally {
                setLoading(false);
            }
        };
        fetchPortal();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0f1322] flex flex-col items-center justify-center text-slate-400 gap-6">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                >
                    <Loader2 size={48} className="text-brand-green" />
                </motion.div>
                <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-lg tracking-wide font-medium"
                >
                    Loading your journey...
                </motion.span>
            </div>
        );
    }

    if (error || !portal) {
        return (
            <div className="min-h-screen bg-[#0f1322] flex flex-col items-center justify-center p-6 text-center text-slate-300">
                <Home size={64} className="text-slate-600 mb-6" />
                <h1 className="text-3xl font-bold text-white mb-2">Portal Unavailable</h1>
                <p className="max-w-md text-slate-400">
                    {error || "We couldn't find the timeline you're looking for. Please check the link and try again."}
                </p>
            </div>
        );
    }

    const milestones = [...portal.milestones].sort((a, b) => a.order - b.order);
    const completedCount = milestones.filter(m => m.isCompleted).length;
    const isAllDone = completedCount === milestones.length;
    const progressPercent = Math.round((completedCount / milestones.length) * 100);

    return (
        <div className="min-h-screen bg-[#0f1322] text-slate-200 selection:bg-brand-green/30 font-sans overflow-x-hidden relative">

            {/* Ambient Background Elements */}
            <div className="fixed top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-brand-green/10 to-transparent pointer-events-none z-0" />
            <div className="fixed top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-brand-green/5 blur-[120px] pointer-events-none z-0" />
            <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-500/5 blur-[150px] pointer-events-none z-0" />

            <div className="max-w-4xl mx-auto px-6 py-12 md:py-20 relative z-10">

                {/* Header Section */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="text-center mb-16 space-y-6"
                >
                    <div className="inline-flex items-center justify-center p-4 bg-brand-green/10 rounded-full border border-brand-green/20 text-brand-green mb-2 shadow-lg shadow-brand-green/5">
                        <Home size={32} />
                    </div>
                    <div>
                        <div className="text-brand-green font-semibold uppercase tracking-[0.2em] text-sm mb-3">
                            {portal.clientType === 'seller' ? 'Seller Timeline' : 'Buyer Timeline'}
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
                            Welcome, {portal.clientName}
                        </h1>
                        <p className="text-xl text-slate-400 font-medium flex items-center justify-center gap-2">
                            <MapPin size={20} className="text-slate-500" />
                            {portal.propertyAddress}
                        </p>
                    </div>

                    {/* Progress Bar Widget */}
                    <div className="max-w-md mx-auto bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-6 mt-8 shadow-2xl">
                        <div className="flex justify-between items-end mb-3">
                            <div>
                                <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Journey Progress</p>
                            </div>
                            <div className="text-2xl font-bold text-brand-green">{progressPercent}%</div>
                        </div>
                        <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden shadow-inner relative">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPercent}%` }}
                                transition={{ duration: 1.5, delay: 0.5, ease: "easeInOut" }}
                                className="absolute top-0 left-0 h-full bg-gradient-to-r from-brand-green to-emerald-400 rounded-full"
                            />
                        </div>
                        {isAllDone && (
                            <motion.p
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 2 }}
                                className="mt-4 text-brand-green font-medium flex items-center justify-center gap-2"
                            >
                                <PartyPopper size={18} /> Congratulations! You've reached the end!
                            </motion.p>
                        )}
                    </div>
                </motion.div>

                {/* Timeline Section */}
                <div className="relative">
                    {/* The Line */}
                    <div className="absolute left-[39px] md:left-1/2 top-0 bottom-0 w-0.5 bg-slate-800 transform md:-translate-x-1/2 z-0" />

                    {/* The Progress Line overlay */}
                    <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${progressPercent}%` }}
                        transition={{ duration: 2, delay: 0.5, ease: "easeInOut" }}
                        className="absolute left-[39px] md:left-1/2 top-0 bg-brand-green w-0.5 transform md:-translate-x-1/2 z-0 shadow-[0_0_10px_2px_rgba(16,185,129,0.5)]"
                    />

                    <div className="space-y-12 relative z-10">
                        <AnimatePresence>
                            {milestones.map((milestone, index) => {
                                const isEven = index % 2 === 0;

                                return (
                                    <motion.div
                                        key={milestone.id}
                                        initial={{ opacity: 0, y: 50 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true, margin: "-100px" }}
                                        transition={{ duration: 0.6, delay: index * 0.1 }}
                                        className={`flex items-center w-full ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} relative`}
                                    >
                                        {/* Mobile structural spacer */}
                                        <div className="w-20 md:w-1/2 hidden md:block" />

                                        {/* 
                                            Icon container in center (desktop) 
                                            or left-aligned (mobile)
                                        */}
                                        <div className="absolute left-6 md:left-1/2 transform -translate-x-1/2 flex items-center justify-center w-16 h-16 z-20">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 shadow-xl ${milestone.isCompleted
                                                ? 'bg-brand-green shadow-brand-green/40 scale-110'
                                                : 'bg-slate-800 border-2 border-slate-700 text-slate-500 scale-100'
                                                }`}>
                                                {milestone.isCompleted ? (
                                                    <CheckCircle2 size={24} className="text-white" />
                                                ) : (
                                                    <Circle size={20} className="text-slate-400" />
                                                )}
                                            </div>
                                        </div>

                                        {/* Content Card */}
                                        <div className={`w-full md:w-1/2 pl-24 md:pl-0 ${isEven ? 'md:pr-16 text-left md:text-right' : 'md:pl-16 text-left'}`}>
                                            <div className={`glass-card p-6 rounded-2xl border transition-all duration-300 hover:scale-[1.02] ${milestone.isCompleted
                                                ? 'bg-[#1c2336]/80 border-brand-green/30 shadow-[0_4px_20px_-4px_rgba(16,185,129,0.15)] shadow-brand-green/5'
                                                : 'bg-slate-900/40 border-white/5 opacity-80'
                                                }`}>
                                                <h3 className={`text-xl font-bold mb-2 tracking-wide ${milestone.isCompleted ? 'text-white' : 'text-slate-300'}`}>
                                                    {milestone.title}
                                                </h3>
                                                <p className="text-slate-400 text-sm md:text-base leading-relaxed mb-4">
                                                    {milestone.description}
                                                </p>

                                                {/* Date indicator */}
                                                {milestone.id !== 'preparing_home' && (
                                                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${milestone.isCompleted
                                                        ? 'bg-brand-green/10 text-brand-green'
                                                        : 'bg-white/5 text-slate-400'
                                                        }`}>
                                                        <CalendarClock size={16} />
                                                        {milestone.isCompleted
                                                            ? 'Completed'
                                                            : milestone.deadlineDate
                                                                ? `Target: ${new Date(milestone.deadlineDate).toLocaleDateString()}`
                                                                : 'Pending Target Date'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 1 }}
                    className="mt-24 text-center pb-12"
                >
                    <p className="text-slate-500 text-sm font-medium">
                        Powered by <span className="text-brand-green font-bold opacity-80">QuestSold</span> Client Experience
                    </p>
                </motion.div>

            </div>
        </div>
    );
};

export default ClientPortalPublicView;

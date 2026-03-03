import React from 'react';
import type { FubPerson } from '../types/fub';
import { isConvertedStage } from '../utils/fubData';
import { UserPlus, UserCheck, MessageCircle, Clock } from 'lucide-react';

interface RecentActivityProps {
    people: FubPerson[];
    limit?: number;
}

const RecentActivity: React.FC<RecentActivityProps> = ({ people, limit = 5 }) => {
    // Take the most "recently created" leads
    const recentLeads = [...people]
        .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
        .slice(0, limit);

    return (
        <div className="glass-card shadow-lg border border-slate-700/50 overflow-hidden flex flex-col h-full relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl"></div>

            <div className="p-6 border-b border-slate-700/50 flex items-center justify-between relative z-10">
                <div>
                    <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                        Recent Pipeline Activity
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">Latest inbound leads & stage updates</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 relative z-10">
                <ul className="space-y-1">
                    {recentLeads.map((person, index) => {
                        const isConverted = isConvertedStage(person.stage);
                        const date = new Date(person.created);
                        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                        return (
                            <li
                                key={person.id || index}
                                className="p-4 hover:bg-slate-800/40 rounded-xl transition-all duration-200 group flex gap-4 items-start"
                            >
                                <div className={`mt-1 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border shadow-sm ${isConverted
                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-emerald-500/10'
                                        : 'bg-blue-500/10 border-blue-500/20 text-blue-400 shadow-blue-500/10'
                                    }`}>
                                    {isConverted ? <UserCheck size={18} /> : <UserPlus size={18} />}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-semibold text-slate-200 truncate">
                                            {person.firstName} {person.lastName}
                                        </p>
                                        <span className="text-xs text-slate-500 flex items-center gap-1 flex-shrink-0">
                                            <Clock size={12} />
                                            {timeStr}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${isConverted
                                                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                                                : 'bg-slate-800 text-slate-300 border-slate-700'
                                            }`}>
                                            {person.stage || 'New Lead'}
                                        </span>
                                        <span className="text-xs text-slate-400 truncate hidden sm:inline-block">
                                            Source: {person.source || 'Direct'}
                                        </span>
                                    </div>

                                    {person.assignedTo && (
                                        <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <MessageCircle size={12} className="text-purple-400" />
                                            Assigned to <span className="text-slate-300">{person.assignedTo}</span>
                                        </p>
                                    )}
                                </div>
                            </li>
                        );
                    })}

                    {recentLeads.length === 0 && (
                        <div className="p-8 text-center text-slate-500 flex flex-col items-center">
                            <div className="w-12 h-12 rounded-full border border-dashed border-slate-600 flex items-center justify-center mb-3">
                                <Clock className="text-slate-600" />
                            </div>
                            <p>No recent activity found.</p>
                        </div>
                    )}
                </ul>
            </div>

            <div className="p-4 border-t border-slate-700/50 relative z-10 bg-slate-900/40">
                <button className="w-full text-center text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors">
                    View all activity →
                </button>
            </div>
        </div>
    );
};

export default RecentActivity;

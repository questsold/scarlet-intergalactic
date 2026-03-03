import type { ReactNode } from 'react';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: ReactNode;
    trend?: string;
    trendUp?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, trendUp }) => {
    return (
        <div className="glass-card p-6 flex flex-col relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-white/5 to-white/0 rounded-full blur-xl group-hover:bg-white/10 transition-colors duration-500" />

            <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700 shadow-inner">
                    {icon}
                </div>

                {trend && (
                    <div className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center space-x-1 ${trendUp ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                        <span>{trendUp ? '↑' : '↓'}</span>
                        <span>{trend}</span>
                    </div>
                )}
            </div>

            <div>
                <h3 className="text-slate-400 text-sm font-medium mb-1">{title}</h3>
                <p className="text-3xl font-bold text-slate-50 tracking-tight">{value}</p>
            </div>
        </div>
    );
};

export default StatCard;

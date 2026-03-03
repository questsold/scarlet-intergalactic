import React from 'react';
import { Trophy } from 'lucide-react';

interface AgentStats {
    agentName: string;
    totalLeads: number;
    convertedLeads: number;
    conversionRate: string;
    avatarUrl?: string;
}

interface AgentTableProps {
    data: AgentStats[];
    onAgentClick?: (agentName: string) => void;
}

const AgentTable: React.FC<AgentTableProps> = ({ data, onAgentClick }) => {
    // Sort by highest conversion rate for the leaderboard feel
    const sortedData = [...data].sort((a, b) => {
        const rateA = parseFloat(a.conversionRate.replace('%', ''));
        const rateB = parseFloat(b.conversionRate.replace('%', ''));
        return rateB - rateA;
    });

    // Calculate some aggregate values for the bottom "TOTAL" row
    const sumLeads = sortedData.reduce((acc, curr) => acc + curr.totalLeads, 0);
    const sumConverted = sortedData.reduce((acc, curr) => acc + curr.convertedLeads, 0);
    const avgRate = sumLeads > 0 ? Math.round((sumConverted / sumLeads) * 100) : 0;

    return (
        <div className="glass-card flex flex-col h-full bg-[#1c2336] border border-white/5 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-white/5">
                <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                    Agent Conversion Leaderboard 🤩
                </h2>
            </div>

            <div className="flex-1 overflow-x-auto p-2">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-slate-400 text-xs uppercase tracking-wider font-semibold border-b border-white/5">
                            <th className="px-4 py-3 font-medium w-8 text-center text-slate-500"></th>
                            <th className="px-4 py-3 font-medium w-48">Employee</th>
                            <th className="px-4 py-3 font-medium text-right">Leads</th>
                            <th className="px-4 py-3 font-medium min-w-[150px] text-center">% Converted</th>
                            <th className="px-4 py-3 font-medium text-right text-slate-500">Converted</th>
                        </tr>
                    </thead>
                    <tbody className="">
                        {sortedData.map((agent, index) => {
                            const numericRate = parseFloat(agent.conversionRate.replace('%', ''));
                            // Assign a trophy color for top 3
                            const isTop = index === 0;

                            return (
                                <tr
                                    key={index}
                                    className="hover:bg-white/5 transition-colors duration-150 border-b border-white/5 last:border-0"
                                >
                                    <td className="px-4 py-4 whitespace-nowrap text-center text-slate-500 font-medium">
                                        {index + 1}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-8 w-8 flex-shrink-0">
                                                <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold text-sm shadow-md border border-slate-600">
                                                    {agent.agentName.substring(0, 2).toUpperCase()}
                                                </div>
                                            </div>
                                            <div
                                                className="ml-3 flex items-center gap-2 cursor-pointer hover:underline decoration-white/30"
                                                onClick={() => onAgentClick?.(agent.agentName)}
                                            >
                                                <div className="text-sm font-bold text-slate-200">{agent.agentName}</div>
                                                {isTop && <Trophy size={14} className="text-brand-green fill-brand-green" />}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-right">
                                        <div className="text-sm text-slate-200 font-medium font-mono">{agent.totalLeads}</div>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        {/* Embedded Progress Bar */}
                                        <div className="w-full max-w-[200px] mx-auto flex items-center gap-3">
                                            <div className="flex-1 h-6 bg-slate-800 rounded-sm overflow-hidden relative border border-slate-700">
                                                <div
                                                    className="absolute top-0 left-0 h-full bg-brand-green transition-all duration-1000 ease-out"
                                                    style={{ width: `${numericRate}%` }}
                                                ></div>
                                            </div>
                                            <div className="text-sm font-bold text-slate-200 w-10 text-right">
                                                {numericRate}%
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-right text-slate-400">
                                        <div className="text-sm font-medium">{agent.convertedLeads}</div>
                                    </td>
                                </tr>
                            );
                        })}

                        {sortedData.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-slate-500 text-sm">
                                    No data available or loading...
                                </td>
                            </tr>
                        )}
                    </tbody>
                    <tfoot className="bg-slate-800/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] text-sm font-bold text-slate-200">
                        <tr>
                            <td colSpan={2} className="px-6 py-4 text-left font-sans">
                                TOTAL
                            </td>
                            <td className="px-4 py-4 text-right font-mono">
                                {sumLeads}
                            </td>
                            <td className="px-4 py-4">
                                <div className="w-full max-w-[200px] mx-auto flex items-center gap-3">
                                    <div className="flex-1"></div>
                                    <div className="text-sm font-bold text-brand-green w-10 text-right">
                                        {avgRate}%
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-right text-slate-400 font-mono pr-8">
                                {sumConverted}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

export default AgentTable;

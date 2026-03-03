import React, { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export interface AgentProductionData {
    agentName: string;
    newLeads: number;
    writtenDeals: number;
    closedDeals: number;
    volume: number;
}

interface AgentProductionTableProps {
    data: AgentProductionData[];
    onAgentClick?: (agentName: string) => void;
}

type SortField = keyof AgentProductionData;
type SortDirection = 'asc' | 'desc';

export const AgentProductionTable: React.FC<AgentProductionTableProps> = ({ data, onAgentClick }) => {
    const [sortField, setSortField] = useState<SortField>('closedDeals');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    const handleSort = (field: SortField) => {
        if (field === sortField) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc'); // Default to desc for new sorts (since high numbers are usually better)
        }
    };

    const sortedData = useMemo(() => {
        return [...data].sort((a, b) => {
            const aValue = a[sortField];
            const bValue = b[sortField];

            if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [data, sortField, sortDirection]);

    const renderSortIcon = (field: SortField) => {
        if (sortField !== field) return <ArrowUpDown size={14} className="ml-1 text-slate-600 opacity-50 group-hover:opacity-100 transition-opacity" />;
        return sortDirection === 'asc'
            ? <ArrowUp size={14} className="ml-1 text-blue-400" />
            : <ArrowDown size={14} className="ml-1 text-blue-400" />;
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(value);
    };

    return (
        <div className="glass-card shadow-lg flex flex-col w-full animate-in fade-in duration-500 delay-100 overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <h2 className="text-xl font-bold text-slate-200">Agent Production</h2>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                        <tr className="text-slate-400 text-xs uppercase tracking-wider font-semibold border-b border-white/5 bg-[#1c2336]/50">
                            <th className="px-6 py-4 font-medium transition-colors hover:bg-white/5 cursor-pointer group" onClick={() => handleSort('agentName')}>
                                <div className="flex items-center">
                                    Agent {renderSortIcon('agentName')}
                                </div>
                            </th>
                            <th className="px-6 py-4 font-medium text-right transition-colors hover:bg-white/5 cursor-pointer group" onClick={() => handleSort('newLeads')}>
                                <div className="flex items-center justify-end">
                                    New Leads {renderSortIcon('newLeads')}
                                </div>
                            </th>
                            <th className="px-6 py-4 font-medium text-right transition-colors hover:bg-white/5 cursor-pointer group" onClick={() => handleSort('writtenDeals')}>
                                <div className="flex items-center justify-end">
                                    Under Contract {renderSortIcon('writtenDeals')}
                                </div>
                            </th>
                            <th className="px-6 py-4 font-medium text-right transition-colors hover:bg-white/5 cursor-pointer group" onClick={() => handleSort('closedDeals')}>
                                <div className="flex items-center justify-end">
                                    Closed Deals {renderSortIcon('closedDeals')}
                                </div>
                            </th>
                            <th className="px-6 py-4 font-medium text-right transition-colors hover:bg-white/5 cursor-pointer group" onClick={() => handleSort('volume')}>
                                <div className="flex items-center justify-end">
                                    Volume {renderSortIcon('volume')}
                                </div>
                            </th>
                        </tr>
                    </thead>
                    {sortedData.length > 0 && (
                        <tbody className="border-b-2 border-white/10 bg-[#1c2336] font-semibold text-slate-200 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)]">
                            <tr>
                                <td className="px-6 py-4">
                                    Totals ({sortedData.length} Agents)
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {sortedData.reduce((acc, curr) => acc + curr.newLeads, 0)}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className="text-brand-green">
                                        {sortedData.reduce((acc, curr) => acc + curr.writtenDeals, 0)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className="text-green-400">
                                        {sortedData.reduce((acc, curr) => acc + curr.closedDeals, 0)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {formatCurrency(sortedData.reduce((acc, curr) => acc + curr.volume, 0))}
                                </td>
                            </tr>
                        </tbody>
                    )}
                    <tbody className="divide-y divide-white/5">
                        {sortedData.length > 0 ? (
                            sortedData.map((agent, index) => (
                                <tr key={index} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-4 font-medium text-slate-200">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-xs font-bold text-blue-400 border border-blue-500/20">
                                                {agent.agentName.substring(0, 2).toUpperCase()}
                                            </div>
                                            {onAgentClick ? (
                                                <button
                                                    onClick={() => onAgentClick(agent.agentName)}
                                                    className="text-slate-200 hover:text-blue-400 transition-colors font-medium text-left underline-offset-2 hover:underline"
                                                >
                                                    {agent.agentName}
                                                </button>
                                            ) : (
                                                <span>{agent.agentName}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right text-slate-300">
                                        {agent.newLeads}
                                    </td>
                                    <td className="px-6 py-4 text-right text-slate-300">
                                        <span className="inline-flex items-center rounded-full bg-brand-green/10 px-2 py-1 text-xs font-medium text-brand-green ring-1 ring-inset ring-brand-green/20">
                                            {agent.writtenDeals}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-slate-300">
                                        <span className="inline-flex items-center rounded-full bg-green-400/10 px-2 py-1 text-xs font-medium text-green-400 ring-1 ring-inset ring-green-400/20">
                                            {agent.closedDeals}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-semibold text-slate-100">
                                        {formatCurrency(agent.volume)}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                    No production data found for this timeframe.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

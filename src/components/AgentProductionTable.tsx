import React, { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export interface AgentProductionData {
    agentName: string;
    newLeads: number;
    writtenDeals: number;
    closedDeals: number;
    volume: number;
    avatarUrl?: string;
    capAmount?: number;
    officeContribution?: number;
    officeContributionTimeframe?: number;
    fubUserId?: number;
    
    // Zillow Prefered specific
    zillowApptMet?: number;
    zillowShowingHomes?: number;
    zillowSubmittingOffers?: number;
    zillowUnderContract?: number;
    zillowClosed?: number; 
}

interface AgentProductionTableProps {
    data: AgentProductionData[];
    zillowData?: AgentProductionData[];
    onAgentClick?: (agentName: string) => void;
}

type SortField = keyof AgentProductionData;
type SortDirection = 'asc' | 'desc';

export const AgentProductionTable: React.FC<AgentProductionTableProps> = ({ data, zillowData, onAgentClick }) => {
    const [activeTab, setActiveTab] = useState<'standard' | 'zillow'>('standard');
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

    const currentData = activeTab === 'standard' ? data : (zillowData || []);

    const sortedData = useMemo(() => {
        return [...currentData].sort((a, b) => {
            const aValue = a[sortField] ?? '';
            const bValue = b[sortField] ?? '';

            if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [currentData, sortField, sortDirection]);

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
            <div className="p-0 border-b border-white/5 flex items-center justify-between bg-[#1c2336]/60 backdrop-blur-xl">
                <div className="flex items-center space-x-1 p-2">
                    <button
                        onClick={() => { setActiveTab('standard'); setSortField('closedDeals'); }}
                        className={`px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center gap-2 ${activeTab === 'standard'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-inner'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                            }`}
                    >
                        Standard Production
                    </button>
                    {zillowData && (
                        <>
                            <button
                                onClick={() => { setActiveTab('zillow'); setSortField('zillowApptMet'); }}
                                className={`px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center gap-2 ${activeTab === 'zillow'
                                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-inner'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                                    }`}
                            >
                                Zillow Prefered
                            </button>
                        </>
                    )}
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
                            {activeTab === 'standard' ? (
                                <>
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
                                </>
                            ) : (
                                <>
                                    <th className="px-6 py-4 font-medium text-right transition-colors hover:bg-white/5 cursor-pointer group" onClick={() => handleSort('zillowApptMet')}>
                                        <div className="flex items-center justify-end whitespace-nowrap">
                                            Appt Met {renderSortIcon('zillowApptMet')}
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 font-medium text-right transition-colors hover:bg-white/5 cursor-pointer group" onClick={() => handleSort('zillowShowingHomes')}>
                                        <div className="flex items-center justify-end whitespace-nowrap">
                                            Showing Homes {renderSortIcon('zillowShowingHomes')}
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 font-medium text-right transition-colors hover:bg-white/5 cursor-pointer group" onClick={() => handleSort('zillowSubmittingOffers')}>
                                        <div className="flex items-center justify-end whitespace-nowrap">
                                            Submitting Offers {renderSortIcon('zillowSubmittingOffers')}
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 font-medium text-right transition-colors hover:bg-white/5 cursor-pointer group" onClick={() => handleSort('zillowUnderContract')}>
                                        <div className="flex items-center justify-end whitespace-nowrap">
                                            Under Contract {renderSortIcon('zillowUnderContract')}
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 font-medium text-right transition-colors hover:bg-white/5 cursor-pointer group" onClick={() => handleSort('zillowClosed')}>
                                        <div className="flex items-center justify-end">
                                            Closed {renderSortIcon('zillowClosed')}
                                        </div>
                                    </th>
                                </>
                            )}
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
                                {activeTab === 'standard' ? (
                                    <>
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
                                    </>
                                ) : (
                                    <>
                                        <td className="px-6 py-4 text-right text-brand-green">{sortedData.reduce((acc, curr) => acc + (curr.zillowApptMet || 0), 0)}</td>
                                        <td className="px-6 py-4 text-right text-brand-green">{sortedData.reduce((acc, curr) => acc + (curr.zillowShowingHomes || 0), 0)}</td>
                                        <td className="px-6 py-4 text-right text-brand-green">{sortedData.reduce((acc, curr) => acc + (curr.zillowSubmittingOffers || 0), 0)}</td>
                                        <td className="px-6 py-4 text-right text-brand-green">{sortedData.reduce((acc, curr) => acc + (curr.zillowUnderContract || 0), 0)}</td>
                                        <td className="px-6 py-4 text-right text-green-400">{sortedData.reduce((acc, curr) => acc + (curr.zillowClosed || 0), 0)}</td>
                                    </>
                                )}
                            </tr>
                        </tbody>
                    )}
                    <tbody className="divide-y divide-white/5">
                        {sortedData.length > 0 ? (
                            sortedData.map((agent, index) => (
                                <tr key={index} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-4 font-medium text-slate-200">
                                        <div className="flex items-center space-x-3">
                                            {agent.avatarUrl ? (
                                                <img src={agent.avatarUrl} alt={agent.agentName} className="w-8 h-8 rounded-full object-cover border border-white/10" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-xs font-bold text-blue-400 border border-blue-500/20">
                                                    {agent.agentName.substring(0, 2).toUpperCase()}
                                                </div>
                                            )}
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
                                    {activeTab === 'standard' ? (
                                        <>
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
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-6 py-4 text-right text-slate-300">
                                                <span className="inline-flex items-center rounded-full bg-brand-green/10 px-2 py-1 text-xs font-medium text-brand-green ring-1 ring-inset ring-brand-green/20">
                                                    {agent.zillowApptMet || 0}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right text-slate-300">
                                                <span className="inline-flex items-center rounded-full bg-brand-green/10 px-2 py-1 text-xs font-medium text-brand-green ring-1 ring-inset ring-brand-green/20">
                                                    {agent.zillowShowingHomes || 0}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right text-slate-300">
                                                <span className="inline-flex items-center rounded-full bg-brand-green/10 px-2 py-1 text-xs font-medium text-brand-green ring-1 ring-inset ring-brand-green/20">
                                                    {agent.zillowSubmittingOffers || 0}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right text-slate-300">
                                                <span className="inline-flex items-center rounded-full bg-brand-green/10 px-2 py-1 text-xs font-medium text-brand-green ring-1 ring-inset ring-brand-green/20">
                                                    {agent.zillowUnderContract || 0}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right text-slate-300">
                                                <span className="inline-flex items-center rounded-full bg-green-400/10 px-2 py-1 text-xs font-medium text-green-400 ring-1 ring-inset ring-green-400/20">
                                                    {agent.zillowClosed || 0}
                                                </span>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={activeTab === 'standard' ? 5 : 7} className="px-6 py-12 text-center text-slate-500">
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

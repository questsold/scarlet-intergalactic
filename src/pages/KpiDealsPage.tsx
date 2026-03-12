import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, DollarSign, Home, AlertCircle, LayoutGrid, List } from 'lucide-react';
import type { UnifiedDeal } from '../types/unifiedDeal';
import { isBoldTrailTransaction } from '../types/unifiedDeal';
import DashboardLayout from '../components/DashboardLayout';
import TimeframeSelector from '../components/TimeframeSelector';
import type { Timeframe } from '../utils/timeFilters';

interface KpiDealsPageState {
    title: string;
    deals: UnifiedDeal[];
    allTransactions?: UnifiedDeal[];
    initialTimeframe: Timeframe;
    initialCustomStart: string;
    initialCustomEnd: string;
}

const formatCurrency = (value: number | null | undefined) => {
    if (!value) return '—';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(value);
};

const formatDate = (dateStr: string | number | undefined | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
};


const DealCard: React.FC<{ deal: UnifiedDeal }> = ({ deal }) => {
    let agentName = '';
    let agentAvatar = '';
    if (isBoldTrailTransaction(deal)) {
        agentName = deal.assigned_agent_name || '';
        agentAvatar = deal.assigned_agent_avatar || '';
    } else {
        const fubUser = deal.users && deal.users.length > 0 ? (deal.users[0] as any) : null;
        agentName = fubUser?.name || '';
        agentAvatar = fubUser?.picture?.["162x162"] || fubUser?.picture?.["60x60"] || fubUser?.picture?.original || '';
    }

    const renderAvatar = () => {
        if (!agentName && !agentAvatar) return <Home size={20} className="text-slate-400 shrink-0" />;
        if (agentAvatar) {
            return <img src={agentAvatar} alt={agentName} className="w-8 h-8 rounded-full object-cover shrink-0 border border-white/10" title={agentName} />;
        }
        const initials = agentName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        return (
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0 border border-white/10" title={agentName}>
                <span className="text-xs text-slate-300 font-semibold">{initials}</span>
            </div>
        );
    };

    if (isBoldTrailTransaction(deal)) {
        let ringColor = 'bg-yellow-400/10 text-yellow-400 ring-yellow-400/20';
        if (deal.status === 'closed') ringColor = 'bg-green-400/10 text-green-400 ring-green-400/20';
        if (deal.status === 'cancelled') ringColor = 'bg-red-400/10 text-red-400 ring-red-400/20';

        return (
            <div className="glass-card p-4 flex flex-col gap-3 hover:bg-white/5 transition-colors border border-white/5">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        {renderAvatar()}
                        <span className="text-slate-200 font-medium text-sm truncate">{deal.address || 'Unnamed Deal'}</span>
                        <a
                            href={`https://my.brokermint.com/#/transactions/${deal.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-md hover:bg-white/10 transition-colors shrink-0 outline-none focus:ring-2 focus:ring-blue-500/50"
                            title="View in BackOffice"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <img src="/brokermint-icon.png" alt="BackOffice" className="w-4 h-4 rounded-[3px] object-cover" />
                        </a>
                    </div>
                    <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${ringColor} capitalize`}>
                        {deal.status === 'pending' ? 'under contract' : deal.status}
                    </span>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mt-2 text-xs">
                    <div className="flex flex-col gap-1">
                        <span className="text-slate-500 uppercase tracking-wide">Side</span>
                        <span className="text-slate-300 capitalize">{deal.representing || '—'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-slate-500 uppercase tracking-wide">Price</span>
                        <span className="text-slate-300 font-medium">{formatCurrency(deal.price)}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-slate-500 uppercase tracking-wide">Source</span>
                        <span className="text-slate-300 truncate" title={deal.custom_attributes?.find(a => a.name === 'lead_source' || a.label === 'Lead source' || a.label === 'Lead Source')?.value || '—'}>
                            {deal.custom_attributes?.find(a => a.name === 'lead_source' || a.label === 'Lead source' || a.label === 'Lead Source')?.value || '—'}
                        </span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-slate-500 uppercase tracking-wide">
                            {deal.status === 'listing' ? 'Active Date' : 'U/C Date'}
                        </span>
                        <span className="text-slate-300">
                            {formatDate(deal.status === 'listing' ? (deal.listing_date || deal.created_at) : (deal.acceptance_date || deal.created_at))}
                        </span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-slate-500 uppercase tracking-wide">Closing Date</span>
                        <span className="text-slate-300">
                            {formatDate(deal.closing_date)}
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    const isClosed = deal.stageName === 'Closed';
    const isCancelled = deal.stageName === 'Cancelled';

    let ringColor = 'bg-yellow-400/10 text-yellow-400 ring-yellow-400/20';
    if (isClosed) ringColor = 'bg-green-400/10 text-green-400 ring-green-400/20';
    if (isCancelled) ringColor = 'bg-red-400/10 text-red-400 ring-red-400/20';
    if (deal.stageName === 'Active Listing') ringColor = 'bg-blue-400/10 text-blue-400 ring-blue-400/20';

    return (
        <div className="glass-card p-4 flex flex-col gap-3 hover:bg-white/5 transition-colors border border-white/5">
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    {renderAvatar()}
                    <span className="text-slate-200 font-medium text-sm truncate">{deal.name || 'Unnamed Deal'}</span>
                </div>
                <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${ringColor}`}>
                    {deal.stageName}
                </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="flex flex-col gap-1">
                    <span className="text-slate-500 uppercase tracking-wide">Client</span>
                    <span className="text-slate-300">
                        {(deal as any).people && (deal as any).people.length > 0 ? (deal as any).people[0].name : '—'}
                    </span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-slate-500 uppercase tracking-wide">Price</span>
                    <span className="text-slate-300 font-medium">{formatCurrency(deal.price)}</span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-slate-500 uppercase tracking-wide">Agent</span>
                    <span className="text-slate-300">
                        {deal.users && deal.users.length > 0 ? deal.users[0].name : '—'}
                    </span>
                </div>
            </div>
        </div>
    );
};

export const KpiDealsPage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const state = location.state as KpiDealsPageState | null;
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    if (!state) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
                    <p>No deals data found. Please go back.</p>
                    <button onClick={() => navigate(-1)} className="mt-4 text-blue-400 hover:underline">← Go Back</button>
                </div>
            </DashboardLayout>
        );
    }

    const [timeframe, setTimeframe] = useState<Timeframe>(state.initialTimeframe || 'This Month');
    const [customStartDate, setCustomStartDate] = useState<string>(state.initialCustomStart || '');
    const [customEndDate, setCustomEndDate] = useState<string>(state.initialCustomEnd || '');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const { title } = state;

    // Dynamically re-filter if we have allTransactions, else fallback to passed deals
    const activeDeals = useMemo(() => {
        if (!state.allTransactions) return state.deals || [];

        const now = new Date();
        let rangeStart: Date | null = null;
        let rangeEnd: Date | null = null;
        if (timeframe !== 'All Time') {
            switch (timeframe) {
                case 'This Week': {
                    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1));
                    rangeStart = d;
                    rangeEnd = new Date(d);
                    rangeEnd.setDate(rangeEnd.getDate() + 7);
                    break;
                }
                case 'This Month':
                    rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
                    rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                    break;
                case 'Last Month':
                    rangeStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    rangeEnd = new Date(now.getFullYear(), now.getMonth(), 1);
                    break;
                case 'This Quarter': {
                    const qm = Math.floor(now.getMonth() / 3) * 3;
                    rangeStart = new Date(now.getFullYear(), qm, 1);
                    rangeEnd = new Date(now.getFullYear(), qm + 3, 1);
                    break;
                }
                case 'This Year':
                    rangeStart = new Date(now.getFullYear(), 0, 1);
                    rangeEnd = new Date(now.getFullYear() + 1, 0, 1);
                    break;
                case '2025':
                    rangeStart = new Date(2025, 0, 1); rangeEnd = new Date(2026, 0, 1); break;
                case '2024':
                    rangeStart = new Date(2024, 0, 1); rangeEnd = new Date(2025, 0, 1); break;
                case 'Custom':
                    if (customStartDate) rangeStart = new Date(customStartDate);
                    if (customEndDate) { const e = new Date(customEndDate); e.setDate(e.getDate() + 1); rangeEnd = e; }
                    break;
            }
        }

        const inRange = (dateParam: string | number | undefined | null): boolean => {
            if (!dateParam) return false;
            const d = new Date(dateParam);
            if (rangeStart && d < rangeStart) return false;
            if (rangeEnd && d >= rangeEnd) return false;
            return true;
        };

        const result: UnifiedDeal[] = [];

        state.allTransactions.forEach(tx => {
            if (!isBoldTrailTransaction(tx)) return;

            if (title === 'Active Listings') {
                if (tx.status === 'listing' && (tx.representing === 'seller' || tx.representing === 'both')) {
                    result.push(tx);
                }
            } else if (title === 'Under Contract') {
                const contractDateStr = tx.acceptance_date || tx.created_at;
                const isWritten = timeframe === 'All Time' || inRange(contractDateStr);
                const allowedWrittenStatuses = ['pending', 'closed', 'cancelled'];
                if (isWritten && allowedWrittenStatuses.includes(tx.status)) {
                    result.push(tx);
                }
            } else if (title === 'Cancelled Deals') {
                const cancelDateStr = tx.acceptance_date || tx.created_at;
                if (tx.status === 'cancelled' && (timeframe === 'All Time' || inRange(cancelDateStr))) {
                    result.push(tx);
                }
            } else if (title === 'Closed Deals') {
                const isClosedState = tx.status === 'closed';
                if (isClosedState && (timeframe === 'All Time' || inRange(tx.closing_date))) {
                    result.push(tx);
                }
            }
        });

        return result;
    }, [state.allTransactions, state.deals, title, timeframe, customStartDate, customEndDate]);

    const totalVolume = activeDeals.reduce((sum, d) => sum + (d.price || 0), 0);

    const sortedDeals = useMemo(() => {
        const statusOrder: Record<string, number> = {
            'pending': 1,
            'listing': 2,
            'closed': 3,
            'cancelled': 4
        };

        return [...activeDeals].sort((a, b) => {
            const statusA = (a as any).status || '';
            const statusB = (b as any).status || '';

            const orderA = statusOrder[statusA] || 99;
            const orderB = statusOrder[statusB] || 99;

            if (orderA !== orderB) {
                return orderA - orderB;
            }

            if (title === 'Closed Deals') {
                const dateA = (a as any).closing_date || (a as any).closed_at || 0;
                const dateB = (b as any).closing_date || (b as any).closed_at || 0;
                return new Date(dateB).getTime() - new Date(dateA).getTime();
            } else if (title === 'Active Listings') {
                const dateA = (a as any).listing_date || (a as any).created_at || (a as any).createdAt || 0;
                const dateB = (b as any).listing_date || (b as any).created_at || (b as any).createdAt || 0;
                return new Date(dateB).getTime() - new Date(dateA).getTime();
            } else {
                const dateA = (a as any).acceptance_date || (a as any).created_at || (a as any).createdAt || 0;
                const dateB = (b as any).acceptance_date || (b as any).created_at || (b as any).createdAt || 0;
                return new Date(dateB).getTime() - new Date(dateA).getTime();
            }
        });
    }, [activeDeals, title]);

    const headerActions = (
        <TimeframeSelector
            timeframe={timeframe}
            setTimeframe={setTimeframe}
            customStartDate={customStartDate}
            setCustomStartDate={setCustomStartDate}
            customEndDate={customEndDate}
            setCustomEndDate={setCustomEndDate}
            isDropdownOpen={isDropdownOpen}
            setIsDropdownOpen={setIsDropdownOpen}
        />
    );

    return (
        <DashboardLayout headerActions={headerActions}>
            <div className="w-full animate-in fade-in duration-500 mb-8 max-w-5xl mx-auto">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm transition-colors mb-6 group"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    Back to Dashboard
                </button>

                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500/30 to-blue-500/30 flex items-center justify-center border border-indigo-500/30 shrink-0">
                        <DollarSign size={24} className="text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100">{title}</h1>
                        <p className="text-slate-400 text-sm mt-0.5"><span className="text-blue-400">{timeframe}</span></p>
                    </div>
                </div>

                {/* KPI strip */}
                <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="glass-card p-4 flex items-center gap-3 border border-white/5">
                        <div className="w-9 h-9 rounded-lg bg-indigo-400/10 flex items-center justify-center shrink-0">
                            <CheckCircle2 size={18} className="text-indigo-400" />
                        </div>
                        <div>
                            <p className="text-slate-400 text-xs">Total Deals</p>
                            <p className="text-slate-100 text-xl font-bold">{activeDeals.length}</p>
                        </div>
                    </div>
                    <div className="glass-card p-4 flex items-center gap-3 border border-white/5">
                        <div className="w-9 h-9 rounded-lg bg-blue-400/10 flex items-center justify-center shrink-0">
                            <DollarSign size={18} className="text-blue-400" />
                        </div>
                        <div>
                            <p className="text-slate-400 text-xs">Total Volume</p>
                            <p className="text-slate-100 text-xl font-bold">{formatCurrency(totalVolume)}</p>
                        </div>
                    </div>
                </div>

                {/* Deals List */}
                <div className="mt-8 flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                        <h2 className="text-base font-semibold text-slate-200">{title} Breakdown</h2>
                        <div className="ml-auto flex items-center bg-white/5 rounded-lg p-1 border border-white/5">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                                title="Grid View"
                            >
                                <LayoutGrid size={16} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                                title="List View"
                            >
                                <List size={16} />
                            </button>
                        </div>
                    </div>
                    <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "flex flex-col gap-4"}>
                        {sortedDeals.length > 0 ? (
                            sortedDeals.map(deal => <DealCard key={deal.id} deal={deal} />)
                        ) : (
                            <div className="col-span-1 md:col-span-2 glass-card p-12 text-center text-slate-500 border border-white/5 text-sm flex flex-col items-center justify-center gap-3">
                                <AlertCircle size={32} className="text-slate-600 opacity-50" />
                                No deals found for this specific dimension in the selected timeframe.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default KpiDealsPage;


import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, CheckCircle2, DollarSign, Home, LayoutGrid, List } from 'lucide-react';
import type { UnifiedDeal } from '../types/unifiedDeal';
import { isBoldTrailTransaction } from '../types/unifiedDeal';
import DashboardLayout from '../components/DashboardLayout';
import TimeframeSelector from '../components/TimeframeSelector';
import type { Timeframe } from '../utils/timeFilters';
import { boldtrailApi } from '../services/boldtrailApi';

interface AgentDealsPageState {
    agentName: string;
    agentAvatar?: string;
    allDeals: UnifiedDeal[];
    initialTimeframe: Timeframe;
    initialCustomStart: string;
    initialCustomEnd: string;
    capAmount?: number;
    officeContribution?: number;
    anniversaryTs?: number;
}

// We no longer strictly filter by PENDING_STAGES because 'Written' means it was signed in the timeframe.

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

const DealCard: React.FC<{ deal: UnifiedDeal; type: 'pending' | 'closed'; agentName?: string; agentAvatar?: string }> = ({ deal, type, agentName, agentAvatar }) => {
    const isPending = type === 'pending';

    const renderAvatar = () => {
        if (!agentName && !agentAvatar) return <Home size={20} className="text-slate-400 shrink-0" />;
        if (agentAvatar) {
            return <img src={agentAvatar} alt={agentName} className="w-8 h-8 rounded-full object-cover shrink-0 border border-white/10" title={agentName} />;
        }
        const initials = agentName ? agentName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '—';
        return (
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0 border border-white/10" title={agentName}>
                <span className="text-xs text-slate-300 font-semibold">{initials}</span>
            </div>
        );
    };

    if (isBoldTrailTransaction(deal)) {
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
                        </a >
                    </div >
                    <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset capitalize ${isPending
                        ? 'bg-yellow-400/10 text-yellow-400 ring-yellow-400/20'
                        : 'bg-green-400/10 text-green-400 ring-green-400/20'
                        }`}>
                        {deal.status === 'pending' ? 'under contract' : deal.status}
                    </span>
                </div >
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
            </div >
        );
    }

    return (
        <div className="glass-card p-4 flex flex-col gap-3 hover:bg-white/5 transition-colors border border-white/5">
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    {renderAvatar()}
                    <span className="text-slate-200 font-medium text-sm truncate">{deal.name || 'Unnamed Deal'}</span>
                </div>
                <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${isPending
                    ? 'bg-yellow-400/10 text-yellow-400 ring-yellow-400/20'
                    : 'bg-green-400/10 text-green-400 ring-green-400/20'
                    }`}>
                    {deal.stageName}
                </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="flex flex-col gap-1">
                    <span className="text-slate-500 uppercase tracking-wide">Pipeline</span>
                    <span className="text-slate-300">{(deal as any).pipelineName || '—'}</span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-slate-500 uppercase tracking-wide">Price</span>
                    <span className="text-slate-300 font-medium">{formatCurrency(deal.price)}</span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-slate-500 uppercase tracking-wide">{isPending ? 'Signed' : 'Closed'}</span>
                    <span className="text-slate-300">{formatDate(isPending ? (deal.customSignedDate || deal.mutualAcceptanceDate || deal.createdAt) : (deal.closeDate || deal.projectedCloseDate || (deal as any).enteredStageAt || deal.createdAt))}</span>
                </div>
            </div>
        </div>
    );
};

export const AgentDealsPage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const state = location.state as AgentDealsPageState | null;
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const [timeframe, setTimeframe] = useState<Timeframe>(state?.initialTimeframe || 'This Month');
    const [customStartDate, setCustomStartDate] = useState<string>(state?.initialCustomStart || '');
    const [customEndDate, setCustomEndDate] = useState<string>(state?.initialCustomEnd || '');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const [liveCap, setLiveCap] = useState<{ capAmount: number, officeContribution: number, anniversaryTs: number } | null>(null);

    useEffect(() => {
        if (state && state.agentName) {
            boldtrailApi.getCapReport().then(reportData => {
                const row = reportData.find((r: any) =>
                    r.agent_name?.toLowerCase() === state.agentName.toLowerCase() ||
                    (r.email && state.allDeals.length > 0 && r.email.toLowerCase() === (state.allDeals[0] as any)?.agentEmail?.toLowerCase())
                );
                if (row) {
                    setLiveCap({
                        capAmount: 12000,
                        officeContribution: Number(row.office_contribution) || 0,
                        anniversaryTs: row.anniversary_date || 0
                    });
                }
            });
        }
    }, [state?.agentName]);

    if (!state) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
                    <p>No agent data found. Please go back.</p>
                    <button onClick={() => navigate(-1)} className="mt-4 text-blue-400 hover:underline">← Go Back</button>
                </div>
            </DashboardLayout>
        );
    }

    const { writtenDeals, closedDeals } = useMemo(() => {
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
                case 'Last 3 Months':
                    rangeStart = new Date(now.getFullYear(), now.getMonth() - 3, 1);
                    rangeEnd = new Date(now.getFullYear(), now.getMonth(), 1);
                    break;
                case 'Last 6 Months':
                    rangeStart = new Date(now.getFullYear(), now.getMonth() - 6, 1);
                    rangeEnd = new Date(now.getFullYear(), now.getMonth(), 1);
                    break;
                case 'Last 90 days':
                    rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90);
                    rangeEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
                    break;
                case 'Last 180 days':
                    rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 180);
                    rangeEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
                    break;
                case 'This Quarter':
                    const qm = Math.floor(now.getMonth() / 3) * 3;
                    rangeStart = new Date(now.getFullYear(), qm, 1);
                    rangeEnd = new Date(now.getFullYear(), qm + 3, 1);
                    break;
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

        const w: UnifiedDeal[] = [];
        const c: UnifiedDeal[] = [];

        state.allDeals.forEach(deal => {
            if (isBoldTrailTransaction(deal)) {
                const contractStr = deal.acceptance_date || deal.created_at;
                const isWritten = timeframe === 'All Time' || inRange(contractStr);

                const allowedWrittenStatuses = ['pending', 'closed', 'cancelled'];
                const isValidWrittenStatus = allowedWrittenStatuses.includes(deal.status);

                const closeStr = deal.closing_date;
                const isClosed = deal.status === 'closed' && (timeframe === 'All Time' || inRange(closeStr));

                if (isWritten && isValidWrittenStatus) w.push(deal);
                if (isClosed) c.push(deal);
                return;
            }

            const contractDateStr = deal.customSignedDate || deal.mutualAcceptanceDate || deal.createdAt;
            const isWritten = timeframe === 'All Time' || inRange(contractDateStr);

            const isClosedState = deal.stageName === 'Closed';
            const closeDateStr = deal.closeDate || deal.projectedCloseDate || deal.enteredStageAt || deal.createdAt;
            const isClosed = isClosedState && (timeframe === 'All Time' || inRange(closeDateStr));

            if (isWritten) w.push(deal);
            if (isClosed) c.push(deal);
        });

        const statusOrder: Record<string, number> = {
            'pending': 1,
            'listing': 2,
            'closed': 3,
            'cancelled': 4
        };

        w.sort((a, b) => {
            const statusA = (a as any).status || '';
            const statusB = (b as any).status || '';

            const orderA = statusOrder[statusA] || 99;
            const orderB = statusOrder[statusB] || 99;

            if (orderA !== orderB) {
                return orderA - orderB;
            }

            const dateA = (a as any).acceptance_date || (a as any).created_at || (a as any).createdAt || 0;
            const dateB = (b as any).acceptance_date || (b as any).created_at || (b as any).createdAt || 0;
            return new Date(dateB).getTime() - new Date(dateA).getTime();
        });

        c.sort((a, b) => {
            const dateA = (a as any).closing_date || (a as any).closed_at || (a as any).closeDate || (a as any).projectedCloseDate || 0;
            const dateB = (b as any).closing_date || (b as any).closed_at || (b as any).closeDate || (b as any).projectedCloseDate || 0;
            return new Date(dateB).getTime() - new Date(dateA).getTime();
        });

        return { writtenDeals: w, closedDeals: c };
    }, [state.allDeals, timeframe, customStartDate, customEndDate]);

    const agentName = state.agentName;
    const initials = agentName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const totalVolume = closedDeals.reduce((sum, d) => sum + (d.price || 0), 0);

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
            {/* Header */}
            <div className="w-full animate-in fade-in duration-500 mb-8">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm transition-colors mb-6 group"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    Back to Dashboard
                </button>

                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center text-lg font-bold text-blue-300 border border-blue-500/30 shrink-0">
                        {initials}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100">{agentName}</h1>
                        <p className="text-slate-400 text-sm mt-0.5">Deals — <span className="text-blue-400">{timeframe}</span></p>
                    </div>
                </div>

                {/* Summary KPI strip */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="glass-card p-4 flex items-center gap-3 border border-white/5">
                        <div className="w-9 h-9 rounded-lg bg-yellow-400/10 flex items-center justify-center shrink-0">
                            <Clock size={18} className="text-yellow-400" />
                        </div>
                        <div>
                            <p className="text-slate-400 text-xs">Under Contract</p>
                            <p className="text-slate-100 text-xl font-bold">{writtenDeals.length}</p>
                        </div>
                    </div>
                    <div className="glass-card p-4 flex items-center gap-3 border border-white/5">
                        <div className="w-9 h-9 rounded-lg bg-green-400/10 flex items-center justify-center shrink-0">
                            <CheckCircle2 size={18} className="text-green-400" />
                        </div>
                        <div>
                            <p className="text-slate-400 text-xs">Closed</p>
                            <p className="text-slate-100 text-xl font-bold">{closedDeals.length}</p>
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

                {/* Cap Progress */}
                {(() => {
                    const capToUse = (state && state.capAmount !== undefined)
                        ? { capAmount: state.capAmount, officeContribution: state.officeContribution || 0, anniversaryTs: state.anniversaryTs || 0 }
                        : liveCap;

                    if (!capToUse) return null;

                    const annivDateStr = capToUse.anniversaryTs ? new Date(capToUse.anniversaryTs).toLocaleDateString() : '';
                    return (
                        <div className="mt-6 glass-card p-5 border border-white/5 rounded-2xl relative overflow-hidden bg-[#1c2336]/60 backdrop-blur-xl">
                            <div className="absolute inset-0 top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
                                <div>
                                    <h3 className="text-slate-200 font-bold mb-0.5 flex items-center gap-2">
                                        <DollarSign size={16} className="text-brand-green" /> Office Cap Progress
                                    </h3>
                                    <p className="text-slate-400 text-xs shadow-sm">Contributions since last anniversary rollover {annivDateStr ? `(${annivDateStr})` : ''}</p>
                                </div>
                                <div className="flex items-center gap-2 text-sm font-semibold">
                                    <span className={capToUse.officeContribution >= capToUse.capAmount ? "text-green-400 text-lg" : "text-blue-400 text-lg"}>
                                        {formatCurrency(capToUse.officeContribution)}
                                    </span>
                                    <span className="text-slate-500 text-base">
                                        / {formatCurrency(capToUse.capAmount)}
                                    </span>
                                </div>
                            </div>

                            <div className="w-full bg-[#0a0f1c] rounded-full h-3 overflow-hidden shadow-inner relative border border-white/5">
                                <div className={`h-full rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-2 text-[10px] text-white/50 relative overflow-hidden ${capToUse.officeContribution >= capToUse.capAmount
                                    ? 'bg-gradient-to-r from-green-600/50 to-green-400 border border-green-400/50 shadow-[0_0_15px_rgba(74,222,128,0.4)]'
                                    : 'bg-gradient-to-r from-blue-700/50 to-blue-500 border border-blue-400/50 shadow-[0_0_15px_rgba(96,165,250,0.4)]'
                                    }`}
                                    style={{ width: `${Math.max(1, Math.min(100, (capToUse.officeContribution / capToUse.capAmount) * 100))}%` }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-[200%] animate-[shimmer_2s_infinite]"></div>
                                </div>
                            </div>
                            <div className="flex justify-between items-center mt-2 text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                                <span>0%</span>
                                <span>{Math.round(Math.min(100, (capToUse.officeContribution / capToUse.capAmount) * 100))}%</span>
                            </div>
                        </div>
                    );
                })()}
            </div>

            {/* Deals Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full animate-in fade-in duration-500 delay-100">
                {/* Written */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                        <Clock size={16} className="text-yellow-400" />
                        <h2 className="text-base font-semibold text-slate-200">Under Contract</h2>
                        <span className="text-xs text-slate-500 bg-yellow-400/10 text-yellow-400 px-2 py-0.5 rounded-full ring-1 ring-yellow-400/20">
                            {writtenDeals.length}
                        </span>
                        <div className="ml-auto flex items-center bg-white/5 rounded-lg p-1 border border-white/5">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-1 rounded-md transition-colors flex items-center justify-center ${viewMode === 'grid' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                                title="Grid View"
                            >
                                <LayoutGrid size={14} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-1 rounded-md transition-colors flex items-center justify-center ${viewMode === 'list' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                                title="List View"
                            >
                                <List size={14} />
                            </button>
                        </div>
                    </div>
                    <div className={viewMode === 'grid' ? "grid grid-cols-1 2xl:grid-cols-2 gap-4" : "flex flex-col gap-4"}>
                        {writtenDeals.length > 0 ? (
                            writtenDeals.map(deal => <DealCard key={deal.id} deal={deal} type="pending" agentName={state.agentName} agentAvatar={state.agentAvatar} />)
                        ) : (
                            <div className="glass-card p-8 text-center text-slate-500 border border-white/5 text-sm">
                                No deals under contract in this timeframe.
                            </div>
                        )}
                    </div>
                </div>

                {/* Closed */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-green-400" />
                        <h2 className="text-base font-semibold text-slate-200">Closed Deals</h2>
                        <span className="text-xs text-slate-500 bg-green-400/10 text-green-400 px-2 py-0.5 rounded-full ring-1 ring-green-400/20">
                            {closedDeals.length}
                        </span>
                        <div className="ml-auto flex items-center bg-white/5 rounded-lg p-1 border border-white/5">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-1 rounded-md transition-colors flex items-center justify-center ${viewMode === 'grid' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                                title="Grid View"
                            >
                                <LayoutGrid size={14} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-1 rounded-md transition-colors flex items-center justify-center ${viewMode === 'list' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                                title="List View"
                            >
                                <List size={14} />
                            </button>
                        </div>
                    </div>
                    <div className={viewMode === 'grid' ? "grid grid-cols-1 2xl:grid-cols-2 gap-4" : "flex flex-col gap-4"}>
                        {closedDeals.length > 0 ? (
                            closedDeals.map(deal => <DealCard key={deal.id} deal={deal} type="closed" agentName={state.agentName} agentAvatar={state.agentAvatar} />)
                        ) : (
                            <div className="glass-card p-8 text-center text-slate-500 border border-white/5 text-sm">
                                No closed deals in this timeframe.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default AgentDealsPage;

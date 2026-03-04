import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Search, Loader2, X, ChevronUp, ChevronDown } from 'lucide-react';
import { boldtrailApi } from '../services/boldtrailApi';
import type { BoldTrailTransaction } from '../types/boldtrail';
import TimeframeSelector from '../components/TimeframeSelector';
import { filterByTimeframe, type Timeframe } from '../utils/timeFilters';
import { MultiSelect } from '../components/MultiSelect';

const TransactionsPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState<BoldTrailTransaction[]>([]);
    const [agents, setAgents] = useState<{ id: number; name: string; email?: string }[]>([]);

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string[]>(['Active Listings', 'Under Contract', 'Closed', 'Cancelled']);
    const [agentFilter, setAgentFilter] = useState<string[]>([]);
    const [timeframe, setTimeframe] = useState<Timeframe>('This Year');
    const [customStartDate, setCustomStartDate] = useState<string>('');
    const [customEndDate, setCustomEndDate] = useState<string>('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Sort logic
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'created_at', direction: 'desc' });

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // Fetch FUB agents
                const response = await fetch('/api/users');
                const data = response.ok ? await response.json() : { users: [] };
                const fubAgents = data.users || [];

                // Filter valid questsold emails + Ali
                const questAgentEmails = fubAgents.filter((a: any) => {
                    const email = a.email?.toLowerCase();
                    return email && email.endsWith('@questsold.com') && email !== 'info@questsold.com';
                }).map((a: any) => a.email?.toLowerCase());

                if (!questAgentEmails.includes('ali@questsold.com')) {
                    questAgentEmails.push('ali@questsold.com');
                }

                // Fetch BT agents
                const btUsers = await boldtrailApi.getUsers();

                const validAgents = btUsers.filter(u => {
                    if (u.email && questAgentEmails.includes(u.email.toLowerCase())) {
                        return true;
                    }
                    return false;
                });

                validAgents.sort((a, b) => a.name.localeCompare(b.name));
                setAgents(validAgents);

                // Fetch transactions
                const txs = await boldtrailApi.getTransactions();
                setTransactions(txs);
            } catch (err) {
                console.error("Error loading transactions:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, []);

    const filteredTransactions = useMemo(() => {
        let result = transactions;

        // Apply timeframe filter based on created_at
        result = filterByTimeframe(result, timeframe, customStartDate, customEndDate);

        // Apply secondary filters
        result = result.filter(tx => {
            // Search query filter (Address)
            if (searchQuery) {
                const searchLower = searchQuery.toLowerCase();
                const addressMatch = tx.address?.toLowerCase().includes(searchLower);
                if (!addressMatch) return false;
            }

            // Status filter
            if (statusFilter.length > 0) {
                const isSelected = (statusName: string) => statusFilter.includes(statusName);

                let matchesStatus = false;

                if (isSelected('Active Listings') && tx.status === 'listing') matchesStatus = true;
                if (isSelected('Under Contract') && tx.status === 'pending') matchesStatus = true;
                if (isSelected('Closed') && tx.status === 'closed') matchesStatus = true;
                if (isSelected('Cancelled') && tx.status === 'cancelled') matchesStatus = true;

                if (tx.status === 'opportunity' || tx.status === 'pre_listing' || tx.status === 'pre-listing') {
                    if (isSelected('Pre-Listing') && (tx.representing === 'seller' || tx.representing === 'both')) matchesStatus = true;
                    if (isSelected('Opportunities') && tx.representing === 'buyer') matchesStatus = true;
                }

                if (!matchesStatus) return false;
            }

            // Agent filter
            if (agentFilter.length > 0) {
                const isBuyingAgent = tx.buying_side_representer?.id && agentFilter.includes(String(tx.buying_side_representer.id));
                const isListingAgent = tx.listing_side_representer?.id && agentFilter.includes(String(tx.listing_side_representer.id));
                if (!isBuyingAgent && !isListingAgent) return false;
            }

            return true;
        });

        // Apply sorting
        if (sortConfig) {
            result.sort((a, b) => {
                let aValue: any = a[sortConfig.key as keyof typeof a];
                let bValue: any = b[sortConfig.key as keyof typeof b];

                if (sortConfig.key === 'agentName') {
                    const agentIdA = a.buying_side_representer?.id || a.listing_side_representer?.id;
                    const foundAgentA = agents.find(ag => ag.id === agentIdA);
                    aValue = foundAgentA ? foundAgentA.name : 'Unknown Agent';

                    const agentIdB = b.buying_side_representer?.id || b.listing_side_representer?.id;
                    const foundAgentB = agents.find(ag => ag.id === agentIdB);
                    bValue = foundAgentB ? foundAgentB.name : 'Unknown Agent';
                } else if (sortConfig.key === 'price') {
                    aValue = a.price || a.sales_volume || 0;
                    bValue = b.price || b.sales_volume || 0;
                } else {
                    // fallbacks
                    aValue = aValue ?? '';
                    bValue = bValue ?? '';
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }

        return result;
    }, [transactions, searchQuery, statusFilter, agentFilter, timeframe, customStartDate, customEndDate, sortConfig, agents]);

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex h-[50vh] flex-col items-center justify-center text-slate-400 gap-4">
                    <Loader2 size={32} className="animate-spin text-blue-500" />
                    <span>Loading Transactions...</span>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="flex flex-col gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Transactions Directory</h1>
                    <p className="text-slate-400 mt-2">View and filter all brokerage transactions.</p>
                </div>

                {/* Filters */}
                <div className="glass-card p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center bg-[#1c2336] border border-white/5 flex-wrap">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by address..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-900/50 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                        />
                    </div>

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

                    {/* Status Filter */}
                    <div className="md:w-48">
                        <MultiSelect
                            options={[
                                { label: 'Active Listings', value: 'Active Listings' },
                                { label: 'Under Contract', value: 'Under Contract' },
                                { label: 'Closed', value: 'Closed' },
                                { label: 'Cancelled', value: 'Cancelled' },
                                { label: 'Pre-Listing', value: 'Pre-Listing' },
                                { label: 'Opportunities', value: 'Opportunities' }
                            ]}
                            selectedValues={statusFilter}
                            onChange={setStatusFilter}
                            placeholder="All Statuses"
                        />
                    </div>

                    {/* Agent Filter */}
                    <div className="md:w-64">
                        <MultiSelect
                            options={agents.map(a => ({ label: a.name, value: String(a.id) }))}
                            selectedValues={agentFilter}
                            onChange={setAgentFilter}
                            placeholder="All Agents"
                        />
                    </div>

                    {/* Clear Filters Button */}
                    <button
                        onClick={() => {
                            setSearchQuery('');
                            setStatusFilter(['Active Listings', 'Under Contract', 'Closed', 'Cancelled']);
                            setAgentFilter([]);
                            setTimeframe('This Year');
                            setCustomStartDate('');
                            setCustomEndDate('');
                        }}
                        className="p-2 ml-1 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-slate-200"
                        title="Clear Filters"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Results Table */}
                <div className="glass-card flex-1 min-h-0 flex flex-col bg-[#1c2336] border border-white/5 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-white/5 bg-slate-800/20">
                        <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                            Results <span className="text-sm font-normal text-slate-500 ml-2">({filteredTransactions.length} transactions)</span>
                        </h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-slate-400 text-xs uppercase tracking-wider font-semibold border-b border-white/5 select-none">
                                    <th className="px-6 py-4 cursor-pointer hover:text-slate-200 transition-colors" onClick={() => handleSort('address')}>
                                        <div className="flex items-center gap-1">Address {sortConfig.key === 'address' && (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                                    </th>
                                    <th className="px-6 py-4 cursor-pointer hover:text-slate-200 transition-colors" onClick={() => handleSort('status')}>
                                        <div className="flex items-center gap-1">Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                                    </th>
                                    <th className="px-6 py-4 cursor-pointer hover:text-slate-200 transition-colors" onClick={() => handleSort('agentName')}>
                                        <div className="flex items-center gap-1">Agent {sortConfig.key === 'agentName' && (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                                    </th>
                                    <th className="px-6 py-4 cursor-pointer hover:text-slate-200 transition-colors" onClick={() => handleSort('price')}>
                                        <div className="flex items-center gap-1">Price / Vol {sortConfig.key === 'price' && (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                                    </th>
                                    <th className="px-6 py-4 cursor-pointer hover:text-slate-200 transition-colors" onClick={() => handleSort('created_at')}>
                                        <div className="flex items-center gap-1">Created {sortConfig.key === 'created_at' && (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                                    </th>
                                    <th className="px-6 py-4 cursor-pointer hover:text-slate-200 transition-colors" onClick={() => handleSort('closing_date')}>
                                        <div className="flex items-center gap-1">Closing {sortConfig.key === 'closing_date' && (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                                    </th>
                                    <th className="px-6 py-4 text-right">BackOffice</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTransactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-8 text-center text-slate-500 italic">
                                            No transactions match your filters.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTransactions.map(tx => {
                                        // Try to find the agent name locally from our fetched agents
                                        const agentId = tx.buying_side_representer?.id || tx.listing_side_representer?.id;
                                        const foundAgent = agents.find(a => a.id === agentId);
                                        const agentName = foundAgent ? foundAgent.name : 'Unknown Agent';

                                        const isOppSeller = (tx.status === 'opportunity' || tx.status === 'pre_listing' || tx.status === 'pre-listing') && (tx.representing === 'seller' || tx.representing === 'both');
                                        const isOppBuyer = (tx.status === 'opportunity' || tx.status === 'pre_listing' || tx.status === 'pre-listing') && tx.representing === 'buyer';

                                        return (
                                            <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                <td className="px-6 py-4 font-medium text-slate-200">
                                                    {tx.address || 'Unnamed Deal'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset capitalize whitespace-nowrap ${tx.status === 'listing' ? 'bg-blue-400/10 text-blue-400 ring-blue-400/20' :
                                                        tx.status === 'pending' ? 'bg-yellow-400/10 text-yellow-400 ring-yellow-400/20' :
                                                            tx.status === 'closed' ? 'bg-green-400/10 text-green-400 ring-green-400/20' :
                                                                isOppSeller ? 'bg-purple-400/10 text-purple-400 ring-purple-400/20' :
                                                                    isOppBuyer ? 'bg-orange-400/10 text-orange-400 ring-orange-400/20' :
                                                                        'bg-red-400/10 text-red-400 ring-red-400/20'
                                                        }`}>
                                                        {tx.status === 'listing' ? 'active' : tx.status === 'pending' ? 'under contract' : isOppSeller ? 'pre-listing' : isOppBuyer ? 'opportunity' : tx.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-400 text-sm">
                                                    {agentName}
                                                </td>
                                                <td className="px-6 py-4 text-slate-300 font-mono text-sm">
                                                    ${(tx.price || tx.sales_volume || 0).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 text-slate-400 text-sm whitespace-nowrap">
                                                    {tx.created_at ? new Date(tx.created_at > 9999999999 ? tx.created_at : tx.created_at * 1000).toLocaleDateString() : '-'}
                                                </td>
                                                <td className="px-6 py-4 text-slate-400 text-sm whitespace-nowrap">
                                                    {tx.closing_date ? new Date(tx.closing_date > 9999999999 ? tx.closing_date : tx.closing_date * 1000).toLocaleDateString() : '-'}
                                                </td>
                                                <td className="px-6 py-4 flex justify-end">
                                                    <a
                                                        href={`https://my.brokermint.com/#/transactions/${tx.id}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-1 rounded-md hover:bg-white/10 transition-colors shrink-0 outline-none focus:ring-2 focus:ring-blue-500/50 inline-flex items-center justify-center h-8"
                                                        title="View in BackOffice"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <img src="/brokermint-icon.png" alt="BackOffice" className="w-5 h-5 rounded-[3px] object-cover" />
                                                    </a>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default TransactionsPage;

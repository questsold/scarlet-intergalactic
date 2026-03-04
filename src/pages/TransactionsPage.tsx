import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Search, Loader2 } from 'lucide-react';
import { boldtrailApi } from '../services/boldtrailApi';
import type { BoldTrailTransaction } from '../types/boldtrail';

type StatusFilter = 'All' | 'Active' | 'Under Contract' | 'Closed' | 'Cancelled';

const TransactionsPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState<BoldTrailTransaction[]>([]);
    const [agents, setAgents] = useState<{ id: number; name: string; email?: string }[]>([]);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
    const [agentFilter, setAgentFilter] = useState<string>('All');

    // Default timeframe to this month logic can be applied if we implement a date filter, 
    // but the API fetching currently gathers all or relies on the unified fetching.
    // For now, we'll fetch a broad set or just what's available and filter locally.

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // Fetch agents
                const btUsers = await boldtrailApi.getUsers();

                // Exclude leadership
                const excludedEmails = ['ali@questsold.com', 'nancysteele@questsold.com', 'lillian@questsold.com'];

                const validAgents = btUsers.filter(u => {
                    if (u.email === 'ali@questsold.com') return true; // Include me
                    if (u.email && excludedEmails.includes(u.email.toLowerCase())) return false;
                    return true;
                });

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
        return transactions.filter(tx => {
            // Search query filter (Address)
            if (searchQuery) {
                const searchLower = searchQuery.toLowerCase();
                const addressMatch = tx.address?.toLowerCase().includes(searchLower);
                if (!addressMatch) return false;
            }

            // Status filter
            if (statusFilter !== 'All') {
                const statusMap: Record<string, string> = {
                    'Active': 'listing',
                    'Under Contract': 'pending',
                    'Closed': 'closed',
                    'Cancelled': 'cancelled'
                };
                if (tx.status !== statusMap[statusFilter]) return false;
            }

            // Agent filter
            if (agentFilter !== 'All') {
                const isBuyingAgent = tx.buying_side_representer?.id === Number(agentFilter);
                const isListingAgent = tx.listing_side_representer?.id === Number(agentFilter);
                if (!isBuyingAgent && !isListingAgent) return false;
            }

            return true;
        });
    }, [transactions, searchQuery, statusFilter, agentFilter]);

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
                <div className="glass-card p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center bg-[#1c2336] border border-white/5">
                    {/* Search */}
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by address..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-900/50 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                        />
                    </div>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                        className="w-full md:w-48 bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    >
                        <option value="All">All Statuses</option>
                        <option value="Active">Active Listings</option>
                        <option value="Under Contract">Under Contract</option>
                        <option value="Closed">Closed</option>
                        <option value="Cancelled">Cancelled</option>
                    </select>

                    {/* Agent Filter */}
                    <select
                        value={agentFilter}
                        onChange={(e) => setAgentFilter(e.target.value)}
                        className="w-full md:w-64 bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    >
                        <option value="All">All Agents</option>
                        {agents.map(a => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                    </select>
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
                                <tr className="text-slate-400 text-xs uppercase tracking-wider font-semibold border-b border-white/5">
                                    <th className="px-6 py-4">Address</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Price / Volume</th>
                                    <th className="px-6 py-4">Agent Name</th>
                                    <th className="px-6 py-4 text-right">BackOffice</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTransactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-slate-500 italic">
                                            No transactions match your filters.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTransactions.map(tx => {
                                        // Try to find the agent name locally from our fetched agents
                                        const agentId = tx.buying_side_representer?.id || tx.listing_side_representer?.id;
                                        const foundAgent = agents.find(a => a.id === agentId);
                                        const agentName = foundAgent ? foundAgent.name : 'Unknown Agent';

                                        return (
                                            <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                <td className="px-6 py-4 font-medium text-slate-200">
                                                    {tx.address || 'Unnamed Deal'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset capitalize ${tx.status === 'listing' ? 'bg-blue-400/10 text-blue-400 ring-blue-400/20' :
                                                            tx.status === 'pending' ? 'bg-yellow-400/10 text-yellow-400 ring-yellow-400/20' :
                                                                tx.status === 'closed' ? 'bg-green-400/10 text-green-400 ring-green-400/20' :
                                                                    'bg-red-400/10 text-red-400 ring-red-400/20'
                                                        }`}>
                                                        {tx.status === 'listing' ? 'active' : tx.status === 'pending' ? 'under contract' : tx.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-300 font-mono text-sm">
                                                    ${(tx.price || tx.sales_volume || 0).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 text-slate-400 text-sm">
                                                    {agentName}
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

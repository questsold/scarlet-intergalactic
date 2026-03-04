import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Megaphone, DollarSign, TrendingUp } from 'lucide-react';
import TimeframeSelector from '../components/TimeframeSelector';
import type { Timeframe } from '../utils/timeFilters';
import { filterByTimeframe } from '../utils/timeFilters';
import type { BoldTrailTransaction } from '../types/boldtrail';
import { boldtrailApi } from '../services/boldtrailApi';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

const MarketingPage: React.FC = () => {
    const [timeframe, setTimeframe] = useState<Timeframe>('This Year');
    const [customStartDate, setCustomStartDate] = useState<string>('');
    const [customEndDate, setCustomEndDate] = useState<string>('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const [transactions, setTransactions] = useState<BoldTrailTransaction[]>([]);
    const [spends, setSpends] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const loadTransactions = async () => {
            try {
                const txs = await boldtrailApi.getTransactions(1000);
                setTransactions(txs);
            } catch (error) {
                console.error("Error loading transactions", error);
            }
        };

        const loadSpends = async () => {
            try {
                const docSnap = await getDoc(doc(db, 'settings', 'marketing_spend'));
                if (docSnap.exists()) {
                    setSpends(docSnap.data().spends || {});
                }
            } catch (error) {
                console.error("Error loading spends", error);
            }
        };

        Promise.all([loadTransactions(), loadSpends()]).finally(() => setLoading(false));
    }, []);

    const handleSpendChange = (source: string, val: string) => {
        const parsed = parseFloat(val) || 0;
        setSpends(prev => ({ ...prev, [source]: parsed }));
    };

    const saveSpends = async () => {
        setSaving(true);
        try {
            await setDoc(doc(db, 'settings', 'marketing_spend'), { spends }, { merge: true });
        } catch (error) {
            console.error(error);
        }
        setSaving(false);
    };

    const { roiData, totalCommission, totalSpend } = useMemo(() => {
        const closedMapped = transactions.filter(t => t.status === 'closed').map(t => ({
            ...t,
            createdAt: new Date(t.closing_date || t.created_at || Date.now()).toISOString(),
        }));

        const filtered = filterByTimeframe(closedMapped, timeframe, customStartDate || undefined, customEndDate || undefined);

        const sourceMap = new Map<string, { count: number, commission: number }>();

        filtered.forEach(tx => {
            const sourceAttr = tx.custom_attributes?.find((a: any) => a.name === 'lead_source');
            const sourceName = (sourceAttr?.value || 'Unknown').trim();
            if (!sourceName) return;

            if (!sourceMap.has(sourceName)) sourceMap.set(sourceName, { count: 0, commission: 0 });
            const s = sourceMap.get(sourceName)!;
            s.count += 1;
            s.commission += (tx.total_gross_commission || 0);
        });

        // Ensure that any source we have a spend for is shown, even if no closed deals!
        Object.keys(spends).forEach(source => {
            if (!sourceMap.has(source) && spends[source] > 0) {
                sourceMap.set(source, { count: 0, commission: 0 });
            }
        });

        let tComm = 0;
        let tSpend = 0;

        const data = Array.from(sourceMap.entries()).map(([source, stats]) => {
            const spendAmount = spends[source] || 0;
            const roi = spendAmount > 0 ? ((stats.commission - spendAmount) / spendAmount) * 100 : 0;
            const roas = spendAmount > 0 ? stats.commission / spendAmount : 0;
            const costPerDeal = stats.count > 0 ? spendAmount / stats.count : 0;

            tComm += stats.commission;
            tSpend += spendAmount;

            return {
                source,
                count: stats.count,
                commission: stats.commission,
                spend: spendAmount,
                roi,
                roas,
                costPerDeal,
            };
        }).sort((a, b) => b.commission - a.commission);

        return { roiData: data, totalCommission: tComm, totalSpend: tSpend };
    }, [transactions, timeframe, customStartDate, customEndDate, spends]);

    const headerFilterUI = (
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

    const totalRoi = totalSpend > 0 ? ((totalCommission - totalSpend) / totalSpend) * 100 : 0;

    return (
        <DashboardLayout headerActions={headerFilterUI}>
            <div className="w-full animate-in fade-in duration-500 pb-12">
                <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
                            <Megaphone className="text-purple-400" size={28} />
                            Marketing Intelligence
                        </h1>
                        <p className="text-slate-400 mt-2">Map closed deal commissions to their originating lead source and track ROI.</p>
                    </div>
                    <button
                        onClick={saveSpends}
                        disabled={saving}
                        className="bg-brand-green hover:bg-brand-green/90 text-[#0f1322] font-bold py-2.5 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap min-w-[140px]"
                    >
                        {saving ? (
                            <div className="h-5 w-5 border-2 border-[#0f1322]/30 border-t-[#0f1322] rounded-full animate-spin"></div>
                        ) : 'Save Spends'}
                    </button>
                </div>

                {loading ? (
                    <div className="h-64 flex items-center justify-center">
                        <div className="h-10 w-10 border-4 border-slate-700 border-t-brand-green rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <>
                        {/* Top Overview Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="glass-card p-6 bg-[#1c2336] border border-white/5 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-3xl group-hover:bg-green-500/10 transition-colors"></div>
                                <h3 className="text-slate-400 text-sm font-medium mb-1">Total Closed Commission</h3>
                                <div className="text-4xl font-bold text-slate-100 flex items-center gap-2">
                                    <DollarSign size={28} className="text-green-400" />
                                    {totalCommission.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                                </div>
                            </div>
                            <div className="glass-card p-6 bg-[#1c2336] border border-white/5 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl group-hover:bg-red-500/10 transition-colors"></div>
                                <h3 className="text-slate-400 text-sm font-medium mb-1">Total Target Spend</h3>
                                <div className="text-4xl font-bold text-slate-100 flex items-center gap-2">
                                    <div className="text-red-400/80">-</div>
                                    <DollarSign size={28} className="text-red-400/80" />
                                    {totalSpend.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                                </div>
                            </div>
                            <div className="glass-card p-6 bg-[#1c2336] border border-white/5 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl group-hover:bg-purple-500/10 transition-colors"></div>
                                <h3 className="text-slate-400 text-sm font-medium mb-1">Overall ROI</h3>
                                <div className="text-4xl font-bold text-slate-100 flex items-center gap-2">
                                    <TrendingUp size={28} className="text-purple-400" />
                                    {totalSpend > 0 ? `${totalRoi.toFixed(0)}%` : '∞'}
                                </div>
                            </div>
                        </div>

                        {/* Details Table */}
                        <div className="glass-card bg-[#1c2336] border border-white/5 rounded-2xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-800/50 text-xs uppercase tracking-wider text-slate-400 border-b border-white/5">
                                            <th className="px-6 py-4 font-medium">Lead Source</th>
                                            <th className="px-6 py-4 text-right font-medium">Closed Deals</th>
                                            <th className="px-6 py-4 text-right font-medium">Gross Commission</th>
                                            <th className="px-6 py-4 text-right font-medium">Target Spend ($)</th>
                                            <th className="px-6 py-4 text-right font-medium">Cost / Deal</th>
                                            <th className="px-6 py-4 text-right font-medium text-brand-green">ROI</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {roiData.map((row, i) => (
                                            <tr key={i} className="hover:bg-white/5 transition-colors text-sm">
                                                <td className="px-6 py-4 text-slate-200 font-medium">
                                                    {row.source}
                                                </td>
                                                <td className="px-6 py-4 text-slate-300 font-mono text-right">
                                                    {row.count}
                                                </td>
                                                <td className="px-6 py-4 text-green-400 font-mono text-right font-medium">
                                                    ${row.commission.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="inline-flex items-center bg-slate-900 rounded-lg border border-white/10 px-3 py-1.5 focus-within:border-brand-green/50 transition-colors">
                                                        <span className="text-slate-500 mr-1">$</span>
                                                        <input
                                                            type="number"
                                                            value={spends[row.source] || ''}
                                                            onChange={(e) => handleSpendChange(row.source, e.target.value)}
                                                            className="bg-transparent text-slate-200 w-24 text-right outline-none font-mono"
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-400 font-mono text-right">
                                                    ${row.costPerDeal.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                                                </td>
                                                <td className="px-6 py-4 text-brand-green font-bold text-right text-base">
                                                    {row.spend > 0 ? `${row.roi.toFixed(0)}%` : '∞'}
                                                </td>
                                            </tr>
                                        ))}

                                        {roiData.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                                    No closed transactions with a known lead source found in this timeframe.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
};

export default MarketingPage;

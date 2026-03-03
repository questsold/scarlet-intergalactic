import React, { useMemo } from 'react';
import type { BoldTrailTransaction } from '../types/boldtrail';
import { TrendingUp } from 'lucide-react';

interface Props {
    transactions: BoldTrailTransaction[];
}

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(val);
};

const CashFlowPredictor: React.FC<Props> = ({ transactions }) => {
    const buckets = useMemo(() => {
        let bucket30 = 0;
        let bucket60 = 0;
        let bucket90 = 0;
        let count30 = 0;
        let count60 = 0;
        let count90 = 0;

        const now = new Date();
        const nowTime = now.getTime();
        const days30 = nowTime + 30 * 24 * 60 * 60 * 1000;
        const days60 = nowTime + 60 * 24 * 60 * 60 * 1000;
        const days90 = nowTime + 90 * 24 * 60 * 60 * 1000;

        transactions.forEach(tx => {
            if (tx.status === 'pending') {
                const commission = tx.total_gross_commission || 0;
                // If closing date is null, we might ignore it or guess? Let's assume it closes in 30 days if null just to be safe, or just ignore. 
                // Better to ignore if no closing date, or use acceptance date + 30? Usually pending needs closing date. Let's strictly use closing_date.
                if (tx.closing_date) {
                    if (tx.closing_date <= days30) {
                        bucket30 += commission;
                        count30++;
                    } else if (tx.closing_date > days30 && tx.closing_date <= days60) {
                        bucket60 += commission;
                        count60++;
                    } else if (tx.closing_date > days60 && tx.closing_date <= days90) {
                        bucket90 += commission;
                        count90++;
                    }
                }
            }
        });

        return {
            bucket30: { amount: bucket30, count: count30 },
            bucket60: { amount: bucket60, count: count60 },
            bucket90: { amount: bucket90, count: count90 },
        };
    }, [transactions]);

    return (
        <div className="w-full bg-[#1c2336]/80 rounded-2xl border border-white/5 p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <TrendingUp size={16} className="text-green-400" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-100">Brokerage Cash Flow Predictor</h2>
                    <p className="text-sm text-slate-400">Projected GCI from active pending pipeline</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 30 Days */}
                <div className="bg-slate-900/50 rounded-xl p-5 border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-3xl group-hover:bg-green-500/10 transition-colors"></div>
                    <div className="text-slate-400 text-sm font-medium mb-1">Next 30 Days</div>
                    <div className="text-3xl font-bold text-slate-100 mb-2">{formatCurrency(buckets.bucket30.amount)}</div>
                    <div className="text-xs text-brand-green bg-brand-green/10 px-2 py-1 rounded inline-block">
                        {buckets.bucket30.count} Pending Deals
                    </div>
                </div>

                {/* 60 Days */}
                <div className="bg-slate-900/50 rounded-xl p-5 border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors"></div>
                    <div className="text-slate-400 text-sm font-medium mb-1">Next 60 Days</div>
                    <div className="text-3xl font-bold text-slate-100 mb-2">{formatCurrency(buckets.bucket60.amount)}</div>
                    <div className="text-xs text-blue-400 bg-blue-400/10 px-2 py-1 rounded inline-block">
                        {buckets.bucket60.count} Pending Deals
                    </div>
                </div>

                {/* 90 Days */}
                <div className="bg-slate-900/50 rounded-xl p-5 border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl group-hover:bg-purple-500/10 transition-colors"></div>
                    <div className="text-slate-400 text-sm font-medium mb-1">Next 90 Days</div>
                    <div className="text-3xl font-bold text-slate-100 mb-2">{formatCurrency(buckets.bucket90.amount)}</div>
                    <div className="text-xs text-purple-400 bg-purple-400/10 px-2 py-1 rounded inline-block">
                        {buckets.bucket90.count} Pending Deals
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CashFlowPredictor;

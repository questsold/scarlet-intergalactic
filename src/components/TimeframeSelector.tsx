import React from 'react';
import { ChevronDown } from 'lucide-react';
import type { Timeframe } from '../utils/timeFilters';

interface TimeframeSelectorProps {
    timeframe: Timeframe;
    setTimeframe: (tf: Timeframe) => void;
    customStartDate: string;
    setCustomStartDate: (val: string) => void;
    customEndDate: string;
    setCustomEndDate: (val: string) => void;
    isDropdownOpen: boolean;
    setIsDropdownOpen: (val: boolean) => void;
}

const TimeframeSelector: React.FC<TimeframeSelectorProps> = ({
    timeframe,
    setTimeframe,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    isDropdownOpen,
    setIsDropdownOpen
}) => {
    return (
        <div className="flex animate-in fade-in duration-500 relative z-50 gap-4">
            {timeframe === 'Custom' && (
                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">From</span>
                    <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="bg-[#1c2336] border border-white/5 text-slate-200 px-3 py-1.5 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
                        style={{ colorScheme: 'dark' }}
                    />
                    <span className="text-sm text-slate-400">To</span>
                    <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="bg-[#1c2336] border border-white/5 text-slate-200 px-3 py-1.5 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
                        style={{ colorScheme: 'dark' }}
                    />
                </div>
            )}

            <div className="relative">
                <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-baseline space-x-2 bg-[#1c2336] border border-white/5 hover:bg-[#20283e] hover:border-slate-500/20 text-slate-200 px-4 py-1.5 rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                    <span className="text-sm font-medium">{timeframe}</span>
                    <ChevronDown size={14} className={`text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''} translate-y-[2px]`} />
                </button>

                {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-xl bg-[#1c2336] border border-white/10 overflow-hidden z-50">
                        {(['This Week', 'This Month', 'Last Month', 'Last 3 Months', 'Last 6 Months', 'Last 90 days', 'Last 180 days', 'This Quarter', 'This Year', '2025', '2024', 'All Time', 'ZHL 3 Month', 'ZHL 6 Month', 'Custom'] as Timeframe[]).map((tf) => (
                            <button
                                key={tf}
                                onClick={() => {
                                    setTimeframe(tf);
                                    setIsDropdownOpen(false);
                                }}
                                className={`block w-full text-left px-4 py-3 text-sm transition-colors hover:bg-white/5 ${timeframe === tf ? 'text-blue-400 font-medium bg-blue-500/10' : 'text-slate-300'
                                    }`}
                            >
                                {tf}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TimeframeSelector;

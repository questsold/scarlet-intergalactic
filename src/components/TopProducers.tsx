import React from 'react';

interface Producer {
    name: string;
    closed: number;
    written: number;
    avatarUrl?: string; // Optional: can use initials if no image
}

interface TopProducersProps {
    producers: Producer[];
    title: string;
    onAgentClick?: (agentName: string) => void;
}

const TopProducers: React.FC<TopProducersProps> = ({ producers, title, onAgentClick }) => {
    return (
        <div className="glass-card flex flex-col items-center bg-[#1c2336] border border-white/5 rounded-2xl p-6 pb-12 relative w-full shrink-0 h-full">
            <div className="w-full mb-6 flex items-center gap-2 relative z-10">
                <h2 className="text-xl font-bold text-slate-100">{title}</h2>
            </div>

            <div className="flex flex-wrap justify-center gap-6 md:gap-8 w-full relative z-10 mt-4">
                {producers.slice(0, 10).map((producer, index) => {
                    // Uniform larger sizing to fill the box evenly
                    const sizeClass = 'w-24 h-24 md:w-28 md:h-28';
                    const isFirst = index === 0;
                    const ringColor = isFirst ? 'ring-brand-green' : 'ring-slate-600';

                    return (
                        <div key={index} className="flex flex-col items-center group">
                            <div className="relative mb-4">
                                {/* Avatar Circle */}
                                <div
                                    onClick={() => onAgentClick?.(producer.name)}
                                    className={`${sizeClass} rounded-full flex items-center justify-center bg-slate-800 ring-4 ${ringColor} ring-offset-4 ring-offset-[#1c2336] overflow-hidden shadow-2xl transition-transform duration-300 group-hover:scale-110 cursor-pointer`}
                                >
                                    {producer.avatarUrl ? (
                                        <img src={producer.avatarUrl} alt={producer.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-slate-300 font-bold text-xl">
                                            {producer.name.substring(0, 2).toUpperCase()}
                                        </span>
                                    )}
                                </div>

                                {/* Rank Badge */}
                                <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-6 h-6 rounded-full bg-slate-100 text-slate-900 flex items-center justify-center font-bold text-xs shadow-md border border-white">
                                    {index + 1}
                                </div>

                                {/* Sparkles for 1st place */}
                                {isFirst && (
                                    <>
                                        <div className="absolute top-0 right-0 w-3 h-3 text-brand-green animate-pulse">✨</div>
                                        <div className="absolute bottom-4 -left-2 w-2 h-2 text-brand-green animate-pulse delay-100">✨</div>
                                    </>
                                )}
                            </div>

                            <div className="text-center mt-2">
                                <p
                                    className="text-slate-300 text-sm font-medium cursor-pointer hover:underline decoration-white/30"
                                    onClick={() => onAgentClick?.(producer.name)}
                                >
                                    {producer.name}
                                </p>
                                <div className="mt-1 flex flex-col items-center gap-0.5">
                                    <p className="text-white font-bold text-lg tracking-tight leading-none">{producer.closed} Closed</p>
                                    {producer.written > 0 && (
                                        <p className="text-brand-green font-medium text-sm tracking-tight leading-none">{producer.written} Under Contract</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {producers.length === 0 && (
                    <div className="text-slate-500 text-center w-full py-8">
                        No production data available.
                    </div>
                )}
            </div>
        </div>
    );
};

export default TopProducers;

import React from 'react';

interface RadialProgressCardProps {
    title: string;
    subtitle: string;
    value: string;
    subValue: string;
    percentage: number; // 0 to 100
    color: 'red' | 'green';
}

const RadialProgressCard: React.FC<RadialProgressCardProps> = ({
    title, subtitle, value, subValue, percentage, color
}) => {
    const radius = 90;
    const strokeWidth = 14;
    const normalizedRadius = radius - strokeWidth * 2;
    const circumference = normalizedRadius * 2 * Math.PI;

    // Calculate stroke dashoffset for a semicircular arc (starts at bottom left, goes over top to bottom right)
    // To make it look like the Plecto gauge, we only show about 75% of the circle, starting from 135deg
    const arcLength = circumference * 0.75;
    const emptyOffset = circumference - arcLength;
    const strokeDashoffset = emptyOffset + arcLength * ((100 - (percentage * 0.75)) / 100);

    // Setup gradient IDs based on color
    const gradientId = `grad-${color}`;

    return (
        <div className="glass-card shadow-lg p-6 flex flex-col items-center justify-between relative overflow-hidden h-[300px]">
            {/* Background glow behind text */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-[50px] opacity-20 ${color === 'red' ? 'bg-red-500' : 'bg-green-500'
                }`}></div>

            <div className="w-fulltext-left w-full z-10 mb-2">
                <h3 className="text-slate-200 font-bold text-lg">{title}</h3>
                <p className="text-slate-400 text-sm mt-1">{subtitle}</p>
            </div>

            <div className="relative flex-1 w-full flex items-center justify-center z-10 mt-4 overflow-hidden h-[200px]">
                <svg
                    height={radius * 2}
                    width={radius * 2}
                    className="transform rotate-135"
                    style={{ transform: 'rotate(135deg)' }}
                >
                    <defs>
                        <linearGradient id={`${gradientId}-empty`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#334155" />
                            <stop offset="100%" stopColor="#1e293b" />
                        </linearGradient>
                        <linearGradient id={`${gradientId}-fill`} x1="0%" y1="100%" x2="100%" y2="0%">
                            {color === 'red' ? (
                                <>
                                    <stop offset="0%" stopColor="#ef4444" />
                                    <stop offset="100%" stopColor="#7f1d1d" />
                                </>
                            ) : (
                                <>
                                    <stop offset="0%" stopColor="#10b981" />
                                    <stop offset="100%" stopColor="#064e3b" />
                                </>
                            )}
                        </linearGradient>
                    </defs>

                    {/* Background track arc */}
                    <circle
                        stroke={`url(#${gradientId}-empty)`}
                        fill="transparent"
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${arcLength} ${circumference}`}
                        strokeLinecap="round"
                        r={normalizedRadius}
                        cx={radius}
                        cy={radius}
                    />

                    {/* Progress arc */}
                    <circle
                        stroke={`url(#${gradientId}-fill)`}
                        fill="transparent"
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${circumference} ${circumference}`}
                        style={{ strokeDashoffset }}
                        strokeLinecap="round"
                        r={normalizedRadius}
                        cx={radius}
                        cy={radius}
                        className="transition-all duration-1000 ease-out"
                    />
                </svg>

                {/* Center Text */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center mt-2 flex flex-col items-center">
                    <span className={`text-4xl font-bold ${color === 'red' ? 'text-red-500' : 'text-green-500'}`}>
                        {value}
                    </span>
                    <span className="text-slate-400 font-medium text-lg mt-1 block">
                        {subValue}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default RadialProgressCard;

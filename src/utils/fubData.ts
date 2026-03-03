export const CONVERTED_STAGES = [
    'Closed',
    'Past Client',
    'Under Contract', // Often considered converted from a lead standpoint
    'Pending'
];

export const isConvertedStage = (stage: string) => {
    return CONVERTED_STAGES.includes(stage);
};

export const calculateConversionRate = (converted: number, total: number): string => {
    if (total === 0) return '0%';
    return `${Math.round((converted / total) * 100)}%`;
};

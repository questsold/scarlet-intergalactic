export type Timeframe = 'This Week' | 'This Month' | 'Last Month' | 'This Quarter' | 'This Year' | '2025' | '2024' | 'All Time' | 'Custom';

export const filterByTimeframe = <T extends { created?: string, createdAt?: string, created_at?: number }>(
    data: T[],
    timeframe: Timeframe,
    customStartDate?: string,
    customEndDate?: string
): T[] => {
    if (timeframe === 'All Time') return data;

    const now = new Date();
    const startOfCurrentDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let startDate: Date | null = null;
    let endDate: Date | null = null;

    switch (timeframe) {
        case 'This Week':
            const startOfWeek = new Date(startOfCurrentDay);
            const day = startOfWeek.getDay();
            const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
            startOfWeek.setDate(diff);
            startDate = startOfWeek;

            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 7);
            break;
        case 'This Month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            break;
        case 'Last Month':
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        case 'This Quarter':
            const currentMonth = now.getMonth();
            const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
            startDate = new Date(now.getFullYear(), quarterStartMonth, 1);
            endDate = new Date(now.getFullYear(), quarterStartMonth + 3, 1);
            break;
        case 'This Year':
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear() + 1, 0, 1);
            break;
        case '2025':
            startDate = new Date(2025, 0, 1);
            endDate = new Date(2026, 0, 1);
            break;
        case '2024':
            startDate = new Date(2024, 0, 1);
            endDate = new Date(2025, 0, 1);
            break;
        case 'Custom':
            if (customStartDate) startDate = new Date(customStartDate);
            if (customEndDate) {
                const end = new Date(customEndDate);
                end.setDate(end.getDate() + 1);
                endDate = end;
            }
            break;
        default:
            return data;
    }

    return data.filter(item => {
        const itemDateVal = 'createdAt' in item ? (item as any).createdAt : ('created_at' in item ? (item as any).created_at : (item as any).created);
        const itemDate = new Date(itemDateVal);

        let isValid = true;
        if (startDate) isValid = isValid && itemDate >= startDate;
        if (endDate) isValid = isValid && itemDate < endDate;
        return isValid;
    });
};

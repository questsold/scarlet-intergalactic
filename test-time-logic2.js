const run = async () => {
    const fetchPage = async (offset) => {
        const response = await fetch(
            'https://api.followupboss.com/v1/deals?limit=100&offset=' + offset + '&sort=-created',
            {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': 'Basic ' + Buffer.from(process.env.VITE_FUB_API_KEY + ':').toString('base64')
                }
            }
        );
        return response.json();
    };
    const MAX_OFFSET = 1900;
    const remainingOffsets = [];
    for (let offset = 0; offset < MAX_OFFSET + 100; offset += 100) {
        remainingOffsets.push(offset);
    }
    const remainingPages = await Promise.all(remainingOffsets.map(fetchPage));
    const allDeals = [].concat(...remainingPages.map(p => p.deals || []));
    
    // Check how many deals TOTAL were closed in 2025:
    const closed2025 = allDeals.filter(d => {
        if (d.stageName !== 'Closed') return false;
        const targetDate = d.closeDate || d.projectedCloseDate || d.enteredStageAt || d.createdAt;
        const year = new Date(targetDate).getFullYear();
        return year === 2025;
    });
    console.log('Total closed in 2025:', closed2025.length);
    
    // Check how many deals were "Written" in 2025, but closed in 2025 as well?
    const writtenAndClosed2025 = closed2025.filter(d => {
        const contractDateStr = d.customSignedDate || d.mutualAcceptanceDate;
        if (!contractDateStr) return false;
        return new Date(contractDateStr).getFullYear() === 2025;
    });
    console.log('Total closed 2025 that were also written in 2025:', writtenAndClosed2025.length);
    
    // Now look at ALL Deals that were written in 2025, regardless of current stage!
    const written2025 = allDeals.filter(d => {
        const contractDateStr = d.customSignedDate || d.mutualAcceptanceDate;
        if (!contractDateStr) return false;
        return new Date(contractDateStr).getFullYear() === 2025;
    });
    console.log('Total Written in 2025 (any stage):', written2025.length);
    console.log('Stages of those written in 2025:');
    const stageCounts = written2025.reduce((acc, curr) => {
        acc[curr.stageName] = (acc[curr.stageName] || 0) + 1;
        return acc;
    }, {});
    console.log(stageCounts);
};
run();

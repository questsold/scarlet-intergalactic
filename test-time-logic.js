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
    
    // We want to count deals that were written in 2025.
    // If a deal closed in 2025, but was written in 2024, it counts as CLOSED in 2025, pending 2024.
    // If a deal sits in currently "Pending" stage and was written in 2025, it counts as PENDING 2025.
    
    const PENDING_STAGES = ['Under Contract', 'Pending', 'Past Inspection', 'Past Appraisal'];
    
    // 1. How many deals are CURRENTLY pending and were written in 2025?
    const currentlyPending2025 = allDeals.filter(d => {
        if (!PENDING_STAGES.includes(d.stageName)) return false;
        
        // This is exactly what the code does right now:
        const targetDate = d.customSignedDate || d.mutualAcceptanceDate || d.createdAt;
        const year = new Date(targetDate).getFullYear();
        return year === 2025;
    });
    
    console.log('Currently pending and written in 2025:', currentlyPending2025.length);
    console.log('Examples:', currentlyPending2025.map(d => d.name));
};

run();

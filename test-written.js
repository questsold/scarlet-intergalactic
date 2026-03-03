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
    
    const PENDING_STAGES = ['Under Contract', 'Pending', 'Past Inspection', 'Past Appraisal'];
    
    let total2025 = 0;
    // Iterate over all deals and check if they hit the pending stage criteria
    // A deal counts as "Pending" for a year if its contract date is in that year, REGARDLESS of whether it closed later!
    // FUB deals API tracks the CURRENT stage. If a deal closed in 2026, its current stage is 'Closed',
    // but its customSignedDate might be 2025. That means it WAS pending in 2025.
    
    const pendingIn2025 = allDeals.filter(deal => {
        // Any deal that has a contract written in 2025 counts as a "Pending Deal" for 2025 performance.
        // It doesn't matter if its CURRENT status is 'Closed' or 'Fell Through'.
        const contractDateStr = deal.customSignedDate || deal.mutualAcceptanceDate;
        if (!contractDateStr) return false;
        
        const d = new Date(contractDateStr);
        return d.getFullYear() === 2025;
    });
    console.log('Total deals WRITTEN (Pending) in 2025:', pendingIn2025.length);
};

run();

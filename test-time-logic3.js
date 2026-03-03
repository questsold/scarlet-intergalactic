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
    
    // Test the logic that the App currently uses for pending deals:
    const PENDING_STAGES = ['Under Contract', 'Pending', 'Past Inspection', 'Past Appraisal'];
    
    let prodMap = new Map();
    const inRange2025 = (dateStr) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return d >= new Date(2025, 0, 1) && d < new Date(2026, 0, 1);
    };
    
    let pending2025 = 0;
    let closed2025 = 0;
    
    allDeals.forEach(deal => {
        const isPending = PENDING_STAGES.includes(deal.stageName || '');
        const isClosed = deal.stageName === 'Closed';

        let targetDate = deal.createdAt;
        if (isPending) {
          // Pending volume is tracked by when it actually went under contract
          targetDate = deal.customSignedDate || deal.mutualAcceptanceDate || deal.createdAt;
        } else if (isClosed) {
          // Closed volume is tracked by actual closing
          targetDate = deal.closeDate || deal.projectedCloseDate || deal.enteredStageAt || deal.createdAt;
        }

        if (inRange2025(targetDate)) {
          if (isPending) {
              pending2025 += 1;
              console.log('Counting pending 2025:', deal.name, deal.stageName, 'targetDate:', targetDate);
          } else if (isClosed) {
              closed2025 += 1;
          }
        }
    });
    
    console.log('Total pending 2025 counted:', pending2025);
    console.log('Total closed 2025 counted:', closed2025);
};
run();

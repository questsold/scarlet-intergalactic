import * as fs from 'fs';

const API_KEY = process.env.VITE_FUB_API_KEY || 'fub_db76c666504a5fb8231c51db3f0e8fcaecc8';

async function fetchDeals() {
    console.log("Fetching FUB deals...");
    const limit = 100;
    const response = await fetch(
        `https://api.followupboss.com/v1/deals?limit=${limit}&sort=-created`,
        {
            headers: {
                'Accept': 'application/json',
                'Authorization': `Basic ${Buffer.from(API_KEY + ':').toString('base64')}`
            }
        }
    );
    if (!response.ok) {
        console.error("FUB API error:", response.status, response.statusText);
        return;
    }
    const data = await response.json();

    // Check closed deals
    const closed = data.deals.filter(d => d.stageName === 'Closed');
    console.log('Total closed deals in first 100:', closed.length);
    if (closed.length > 0) {
        console.log('Sample closed deals:');
        for (let i = 0; i < Math.min(3, closed.length); i++) {
            const d = closed[i];
            console.log(`  ID: ${d.id}`);
            console.log(`  Name: ${d.name}`);
            console.log(`  Pipeline: ${d.pipelineName}`);
            console.log(`  Stage: ${d.stageName}`);
            console.log(`  closeDate: ${d.closeDate}`);
            console.log(`  projectedCloseDate: ${d.projectedCloseDate}`);
            console.log(`  enteredStageAt: ${d.enteredStageAt}`);
            console.log(`  created: ${d.created}`);
            console.log('---');
        }
    }
}
fetchDeals();

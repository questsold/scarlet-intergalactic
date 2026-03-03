const fetch = require('node-fetch');
async function test() {
    try {
        const BOLDTRAIL_API_KEY = '_85vFG44EVtAWIJk11NIktap5_I';
        let allTx = [];
        let startingFromId;
        const batchSize = 1000;

        while (allTx.length < 10000) {
            let url = `https://my.brokermint.com/api/v1/transactions?api_key=${BOLDTRAIL_API_KEY}&count=${batchSize}`;
            if (startingFromId) url += `&starting_from_id=${startingFromId}`;
            const res = await fetch(url);
            if (!res.ok) break;
            const data = await res.json();
            if (data.length === 0) break;
            allTx.push(...data);
            if (data.length < batchSize) break;
            startingFromId = data[data.length - 1].id;
        }

        const now = new Date();
        const rangeStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const rangeEnd = new Date(now.getFullYear(), now.getMonth(), 1);

        const inRange = (dateParam) => {
            if (!dateParam) return false;
            const d = new Date(dateParam);
            if (rangeStart && d < rangeStart) return false;
            if (rangeEnd && d >= rangeEnd) return false;
            return true;
        };

        const inRangeTx = allTx.filter(tx => inRange(tx.acceptance_date || tx.created_at));

        console.log('Total in range by acceptance_date:', inRangeTx.length);

        const countsByStatus = {};
        inRangeTx.forEach(tx => {
            const key = tx.status;
            countsByStatus[key] = (countsByStatus[key] || 0) + 1;
        });

        console.log('Counts by status:', countsByStatus);

        const countsByType = {};
        inRangeTx.forEach(tx => {
            const key = tx.transaction_type;
            countsByType[key] = (countsByType[key] || 0) + 1;
        });

        console.log('Counts by type:', countsByType);

        // Filter based on user request "Active/Pending/Closed/Cancelled"
        const finalMatches = inRangeTx.filter(tx => ['listing', 'pending', 'closed', 'cancelled'].includes(tx.status));
        console.log('Final matches with listing/pending/closed/cancelled:', finalMatches.length);

        // Log all distinct statuses in DB
        const statuses = new Set(allTx.map(t => t.status));
        console.log('All available statuses in DB:', Array.from(statuses));

    } catch (e) { console.error(e); }
}
test();

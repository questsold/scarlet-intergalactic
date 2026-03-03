const fetch = require('node-fetch');
async function test() {
    try {
        const BOLDTRAIL_API_KEY = '_85vFG44EVtAWIJk11NIktap5_I';
        let allTx = [];
        let startingFromId;
        const batchSize = 1000;

        while (allTx.length < 5000) {
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

        const rangeStart = new Date(new Date().getFullYear(), 0, 1); // This Year
        const rangeEnd = new Date(new Date().getFullYear() + 1, 0, 1);

        const inRange = (dateParam) => {
            if (!dateParam) return false;
            const d = new Date(dateParam);
            if (rangeStart && d < rangeStart) return false;
            if (rangeEnd && d >= rangeEnd) return false;
            return true;
        };

        const closedThisYear = allTx.filter(tx => tx.status === 'closed' && inRange(tx.closing_date || tx.closed_at));
        console.log('Closed This Year (closing_date):', closedThisYear.length);

        const pendingThisYear = allTx.filter(tx => tx.status !== 'closed' && tx.status !== 'cancelled' && inRange(tx.acceptance_date || tx.created_at));
        console.log('Written This Year (acceptance_date):', pendingThisYear.length);

        console.log('Range Start:', rangeStart);
        console.log('Range End:', rangeEnd);

        // Log a recent date
        const recentClosed = allTx.filter(tx => tx.status === 'closed').sort((a, b) => (b.closing_date || b.closed_at) - (a.closing_date || a.closed_at))[0];
        console.log('Most recent closed closing_date:', new Date(recentClosed.closing_date));
    } catch (e) { console.error(e); }
}
test();

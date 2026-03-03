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

        const listings = allTx.filter(tx =>
            tx.status === 'listing' &&
            (tx.representing === 'seller' || tx.representing === 'both')
        );
        console.log('Total matches with status=listing AND representing=seller/both:', listings.length);
    } catch (e) { console.error(e); }
}
test();

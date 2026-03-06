(async () => {
    try {
        let count = 0;
        let startingFromId = null;
        const batchSize = 1000;

        console.log('Fetching transactions...');
        while (true) {
            let url = `https://scarlet-intergalactic.vercel.app/api/transactions?count=${batchSize}`;
            if (startingFromId) url += `&starting_from_id=${startingFromId}`;

            const res = await fetch(url);
            const txs = await res.json();

            if (!txs || txs.length === 0) break;

            count += txs.length;
            startingFromId = txs[txs.length - 1].id;
            console.log(`Fetched ${txs.length}. Total so far: ${count}. Last ID: ${startingFromId}`);

            if (txs.length < batchSize) break;
        }

        console.log('Grand total transactions:', count);
    } catch (e) {
        console.error(e);
    }
})();

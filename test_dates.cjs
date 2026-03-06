(async () => {
    try {
        const res = await fetch('https://scarlet-intergalactic.vercel.app/api/transactions?count=100');
        const txs = await res.json();
        console.log('Total fetched:', txs.length);

        const thisYearTxs = txs.filter(tx => {
            const date = new Date(tx.created_at);
            return date.getFullYear() === 2026;
        });

        const Year2025Txs = txs.filter(tx => {
            const date = new Date(tx.created_at);
            return date.getFullYear() === 2025;
        });

        console.log('Transactions in 2026:', thisYearTxs.length);
        console.log('Transactions in 2025:', Year2025Txs.length);
        if (txs.length > 0) {
            console.log('Sample created_at string:', txs[0].created_at);
        }
    } catch (e) {
        console.error(e);
    }
})();

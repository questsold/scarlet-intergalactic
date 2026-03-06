(async () => {
    try {
        const res = await fetch('https://scarlet-intergalactic.vercel.app/api/transactions?count=5');
        const txs = await res.json();

        txs.slice(0, 5).forEach(tx => {
            console.log('TX ID:', tx.id, 'Address:', tx.address);
            console.log('Buying Representer:', tx.buying_side_representer);
            console.log('Listing Representer:', tx.listing_side_representer);
        });
    } catch (e) {
        console.error(e);
    }
})();

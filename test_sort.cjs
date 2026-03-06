(async () => {
    try {
        const tests = [
            'count=5',
            'count=5&sort_by=-created_at',
            'count=5&sortBy=createdAt&sortOrder=desc',
            'count=5&sort=-created_at',
            'count=5&order=desc'
        ];

        for (const query of tests) {
            const url = `https://scarlet-intergalactic.vercel.app/api/transactions?${query}`;
            const res = await fetch(url);
            const txs = await res.json();

            if (txs && txs.length > 0) {
                const dates = txs.map(t => new Date(t.created_at || t.createdAt).getFullYear());
                console.log(`Query "${query}" returned:`, dates);
            } else {
                console.log(`Query "${query}" returned: ERROR/EMPTY`);
            }
        }
    } catch (e) {
        console.error(e);
    }
})();

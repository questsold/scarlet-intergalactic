export default async function handler(req, res) {
    // Allow CORS
    res.setHeader('Access-Control-Allow-Credentials', true)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600')

    if (req.method === 'OPTIONS') {
        res.status(200).end()
        return
    }

    const BOLDTRAIL_API_KEY = process.env.VITE_BOLDTRAIL_API_KEY;

    if (!BOLDTRAIL_API_KEY) {
        return res.status(500).json({ error: 'BoldTrail API key not configured' })
    }

    try {
        const queryStr = req.url.split('?')[1] || '';
        const searchParams = new URLSearchParams(queryStr);
        const idsParam = searchParams.get('ids');

        if (!idsParam) {
            return res.status(400).json({ error: 'Missing ids parameter' })
        }

        const ids = idsParam.split(',').filter(Boolean);
        if (ids.length > 200) {
            return res.status(400).json({ error: 'Too many IDs. Max 200.' })
        }

        const results = {};

        // Fetch in parallel batches to avoid overwhelming the Vercel execution environment
        const batchSize = 10;
        for (let i = 0; i < ids.length; i += batchSize) {
            const batch = ids.slice(i, i + batchSize);
            const promises = batch.map(async (id) => {
                const targetUrl = `https://my.brokermint.com/api/v1/transactions/${id}/participants/users?api_key=${BOLDTRAIL_API_KEY}`;
                try {
                    const response = await fetch(targetUrl, {
                        method: 'GET',
                        headers: { 'Accept': 'application/json' }
                    });
                    if (response.ok) {
                        const data = await response.json();
                        results[id] = data;
                    } else if (response.status === 429) {
                        results[id] = { error: 429 };
                    } else {
                        results[id] = [];
                    }
                } catch (e) {
                    results[id] = [];
                }
            });
            await Promise.all(promises);
            if (i + batchSize < ids.length) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        res.status(200).json(results);
    } catch (error) {
        console.error('Error proxying participants to BoldTrail:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

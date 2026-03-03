export default async function handler(req, res) {
    // Allow CORS and set Edge Cache
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const API_KEY = process.env.VITE_FUB_API_KEY;

    if (!API_KEY) {
        return res.status(500).json({ error: 'FUB_API_KEY is not configured.' });
    }

    const authHeader = `Basic ${Buffer.from(`${API_KEY}:`).toString('base64')}`;
    const limit = 100;
    // FUB API enforces a hard cap at offset 1900 (returns 400 for offset >= 2000)
    const MAX_OFFSET = 1900;

    const fetchPage = async (offset) => {
        const response = await fetch(
            `https://api.followupboss.com/v1/deals?limit=${limit}&offset=${offset}&sort=-created`,
            {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': authHeader
                }
            }
        );
        if (!response.ok) throw new Error(`FUB API ${response.status} at offset ${offset}`);
        return response.json();
    };

    try {
        // Fetch the first page to get the total count
        const firstPage = await fetchPage(0);
        const reportedTotal = firstPage._metadata?.total || 0;
        const firstDeals = firstPage.deals || [];

        if (reportedTotal <= limit) {
            return res.status(200).json({ deals: firstDeals, _metadata: { total: firstDeals.length } });
        }

        // Build all remaining page offsets up to FUB's hard cap of offset 1900
        const effectiveMax = Math.min(reportedTotal, MAX_OFFSET + limit);
        const remainingOffsets = [];
        for (let offset = limit; offset < effectiveMax; offset += limit) {
            remainingOffsets.push(offset);
        }

        // Fetch all remaining pages in parallel (server-to-server is fast)
        const remainingPages = await Promise.all(remainingOffsets.map(offset => fetchPage(offset)));
        const allDeals = firstDeals.concat(...remainingPages.map(p => p.deals || []));

        res.status(200).json({ deals: allDeals, _metadata: { total: allDeals.length, reportedTotal } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch deals data from FUB API', details: error.message });
    }
}

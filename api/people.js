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

    const { limit = 100, offset = 0 } = req.query;

    try {
        const response = await fetch(`https://api.followupboss.com/v1/people?limit=${limit}&offset=${offset}&sort=-created`, {
            headers: {
                'Accept': 'application/json',
                'Authorization': `Basic ${Buffer.from(`${API_KEY}:`).toString('base64')}`
            }
        });

        if (!response.ok) {
            throw new Error(`FUB API responded with ${response.status}`);
        }

        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch people data from FUB API' });
    }
}

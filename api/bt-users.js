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
        const targetUrl = `https://my.brokermint.com/api/v1/users?api_key=${BOLDTRAIL_API_KEY}&${queryStr}`;

        const response = await fetch(targetUrl, {
            method: req.method,
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            const text = await response.text();
            return res.status(response.status).json({ error: text || response.statusText });
        }

        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        console.error('Error proxying to BoldTrail Users:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

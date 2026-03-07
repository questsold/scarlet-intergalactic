export default async function handler(req, res) {
    // Allow CORS
    res.setHeader('Access-Control-Allow-Credentials', true)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200')

    if (req.method === 'OPTIONS') {
        res.status(200).end()
        return
    }

    const BOLDTRAIL_API_KEY = process.env.VITE_BOLDTRAIL_API_KEY;

    if (!BOLDTRAIL_API_KEY) {
        return res.status(500).json({ error: 'BoldTrail API key not configured' })
    }

    try {
        const targetUrl = `https://my.brokermint.com/api/v2/reports/775362?api_key=${BOLDTRAIL_API_KEY}`;
        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            console.error('BoldTrail Report API Error:', response.status);
            return res.status(response.status).json({ error: 'Failed to fetch report' });
        }

        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        console.error('Error proxying to BoldTrail Report API:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

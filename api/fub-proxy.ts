import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Allow CORS and set Edge Cache
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const API_KEY = process.env.VITE_FUB_API_KEY;
    if (!API_KEY) {
        return res.status(500).json({ error: 'FUB_API_KEY is not configured.' });
    }

    const authHeader = `Basic ${Buffer.from(`${API_KEY}:`).toString('base64')}`;

    if (req.method === 'POST') {
        const { action } = req.query;
        if (action === 'events') {
            try {
                const response = await fetch('https://api.followupboss.com/v1/events', {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'Authorization': authHeader
                    },
                    body: JSON.stringify(req.body)
                });
                
                if (!response.ok) {
                    const text = await response.text();
                    throw new Error(`FUB API Error ${response.status}: ${text}`);
                }
                
                return res.status(200).json(await response.json());
            } catch (error: any) {
                console.error("FUB Event Post Error:", error);
                return res.status(500).json({ error: 'Failed to post event to FUB API', details: error.message });
            }
        }
    }

    const { action } = req.query;

    if (action === 'users') {
        try {
            const response = await fetch(`https://api.followupboss.com/v1/users?limit=100`, {
                headers: { 'Accept': 'application/json', 'Authorization': authHeader }
            });
            if (!response.ok) throw new Error(`FUB API responded with ${response.status}`);
            return res.status(200).json(await response.json());
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Failed to fetch users data from FUB API' });
        }
    }

    if (action === 'people') {
        const { limit = '100', offset = '0', name, email } = req.query as Record<string, string>;
        
        // Searching for specific person - single request
        if (name || email) {
            let url = `https://api.followupboss.com/v1/people?limit=${limit}&offset=${offset}&sort=-created`;
            if (name) url += `&name=${encodeURIComponent(name)}`;
            if (email) url += `&email=${encodeURIComponent(email)}`;

            try {
                const response = await fetch(url, {
                    headers: { 'Accept': 'application/json', 'Authorization': authHeader }
                });
                if (!response.ok) throw new Error(`FUB API responded with ${response.status}`);
                return res.status(200).json(await response.json());
            } catch (error) {
                console.error(error);
                return res.status(500).json({ error: 'Failed to fetch people data from FUB API' });
            }
        }

        // Fetching all people - paginate
        const limitCount = 100;
        const requestedTotalLimit = parseInt(limit, 10) > 100 ? parseInt(limit, 10) : 100; // E.g., if UI asks for 5000
        
        const fetchPage = async (offsetVal: number) => {
            const response = await fetch(
                `https://api.followupboss.com/v1/people?limit=${limitCount}&offset=${offsetVal}&sort=-created`,
                { headers: { 'Accept': 'application/json', 'Authorization': authHeader } }
            );
            if (!response.ok) throw new Error(`FUB API ${response.status} at offset ${offsetVal}`);
            return response.json();
        };

        try {
            const firstPage = await fetchPage(0);
            const reportedTotal = firstPage._metadata?.total || 0;
            const firstPeople = firstPage.people || [];

            if (reportedTotal <= limitCount || requestedTotalLimit <= limitCount) {
                return res.status(200).json({ people: firstPeople, _metadata: { total: firstPeople.length } });
            }

            // Cap the max offset at 9900 (FUB hard limit for offset) or what the user requested
            const effectiveMaxTotal = Math.min(reportedTotal, requestedTotalLimit, 10000); // 10k max items = up to offset 9900
            const remainingOffsets = [];
            for (let offsetVal = limitCount; offsetVal < effectiveMaxTotal; offsetVal += limitCount) {
                remainingOffsets.push(offsetVal);
            }

            // Batch them in chunks of 10 to avoid FUB rate limits
            const allRemainingPages = [];
            for (let i = 0; i < remainingOffsets.length; i += 10) {
                const batch = remainingOffsets.slice(i, i + 10);
                const batchResults = await Promise.all(batch.map(o => fetchPage(o)));
                allRemainingPages.push(...batchResults);
                // Pause for 1 second between batches to respect rate limits (FUB is 10 req/s)
                if (i + 10 < remainingOffsets.length) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            const allPeople = firstPeople.concat(...allRemainingPages.map(p => p.people || []));

            return res.status(200).json({ people: allPeople, _metadata: { total: allPeople.length, reportedTotal } });
        } catch (error: any) {
            console.error(error);
            return res.status(500).json({ error: 'Failed to fetch people data from FUB API', details: error.message });
        }
    }

    if (action === 'deals') {
        const limitCount = 100;
        const MAX_OFFSET = 1900;
        const fetchPage = async (offsetVal: number) => {
            const response = await fetch(
                `https://api.followupboss.com/v1/deals?limit=${limitCount}&offset=${offsetVal}&sort=-created`,
                { headers: { 'Accept': 'application/json', 'Authorization': authHeader } }
            );
            if (!response.ok) throw new Error(`FUB API ${response.status} at offset ${offsetVal}`);
            return response.json();
        };

        try {
            const firstPage = await fetchPage(0);
            const reportedTotal = firstPage._metadata?.total || 0;
            const firstDeals = firstPage.deals || [];

            if (reportedTotal <= limitCount) {
                return res.status(200).json({ deals: firstDeals, _metadata: { total: firstDeals.length } });
            }

            const effectiveMax = Math.min(reportedTotal, MAX_OFFSET + limitCount);
            const remainingOffsets = [];
            for (let offset = limitCount; offset < effectiveMax; offset += limitCount) {
                remainingOffsets.push(offset);
            }

            const remainingPages = await Promise.all(remainingOffsets.map(offset => fetchPage(offset)));
            const allDeals = firstDeals.concat(...remainingPages.map(p => p.deals || []));

            return res.status(200).json({ deals: allDeals, _metadata: { total: allDeals.length, reportedTotal } });
        } catch (error: any) {
            console.error(error);
            return res.status(500).json({ error: 'Failed to fetch deals data from FUB API', details: error.message });
        }
    }

    return res.status(400).json({ error: 'Invalid proxy action' });
}

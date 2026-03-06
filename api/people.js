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

    const { limit = 100, offset = 0, name } = req.query;

    let url = `https://api.followupboss.com/v1/people?limit=${limit}&offset=${offset}&sort=-created`;
    if (name) {
        url += `&name=${encodeURIComponent(name)}`;
    }

    try {
        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json',
                'Authorization': `Basic ${Buffer.from(`${API_KEY}:`).toString('base64')}`
            }
        });

        if (!response.ok) {
            throw new Error(`FUB API responded with ${response.status}`);
        }

        const data = await response.json();

        // Fetch users to get assigned agent emails
        const usersResponse = await fetch(`https://api.followupboss.com/v1/users?limit=100`, {
            headers: {
                'Accept': 'application/json',
                'Authorization': `Basic ${Buffer.from(`${API_KEY}:`).toString('base64')}`
            }
        });

        if (usersResponse.ok) {
            const usersData = await usersResponse.json();
            const userMap = {};
            (usersData.users || []).forEach(user => {
                let pictureUrl = null;
                if (user.picture) {
                    pictureUrl = user.picture["162x162"] || user.picture["60x60"] || user.picture.original || null;
                }
                userMap[user.id] = {
                    email: user.email,
                    name: user.name,
                    picture: pictureUrl
                };
            });

            // Annotate people with their assigned user details
            if (data.people) {
                data.people = data.people.map(person => {
                    const assignedUser = userMap[person.assignedUserId];
                    return {
                        ...person,
                        assignedUserEmail: assignedUser ? assignedUser.email : null,
                        assignedUserName: assignedUser ? assignedUser.name : null,
                        assignedUserPicture: assignedUser ? assignedUser.picture : null
                    };
                });
            }
        }

        res.status(200).json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch people data from FUB API' });
    }
}

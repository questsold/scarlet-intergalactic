const https = require('https');

const apiKey = 'fka_0YTROfOSE7vb8kCu6BouS0uJMsCaoPZJBT'; 

const email = encodeURIComponent('barm1959@yahoo.com');
const url = `https://api.followupboss.com/v1/events?personId=2021159`; // Let's get his personId first

const options = {
    headers: {
        'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
        'Accept': 'application/json'
    }
};

https.get(`https://api.followupboss.com/v1/people?email=${email}`, options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const json = JSON.parse(data);
        const personId = json.people[0].id;
        
        // Fetch events for this person
        https.get(`https://api.followupboss.com/v1/events?personId=${personId}&limit=100`, options, (res2) => {
             let evData = '';
             res2.on('data', chunk => evData += chunk);
             res2.on('end', () => {
                 const evJson = JSON.parse(evData);
                 const tagEvents = evJson.events.filter(e => e.type === 'tag' || e.message?.toLowerCase().includes('tag'));
                 console.log("Found tag-related events:", tagEvents);
                 console.log(`Total events inspected: ${evJson.events.length}`);
             });
        });
    });
});

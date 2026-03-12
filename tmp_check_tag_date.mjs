import * as fs from 'fs';

const API_KEY = process.env.VITE_FUB_API_KEY || 'fub_db76c666504a5fb8231c51db3f0e8fcaecc8';

async function checkPerson() {
    const email = 'barm1959@yahoo.com';
    const response = await fetch(
        `https://api.followupboss.com/v1/people?email=${encodeURIComponent(email)}`,
        {
            headers: {
                'Accept': 'application/json',
                'Authorization': `Basic ${Buffer.from(API_KEY + ':').toString('base64')}`
            }
        }
    );
    if (!response.ok) {
        console.error("FUB API error:", response.status, response.statusText);
        return;
    }
    const data = await response.json();
    
    if (data.people && data.people.length > 0) {
        const p = data.people[0];
        console.log(`Person: ${p.firstName} ${p.lastName}`);
        console.log(`Tags (${p.tags.length}):`, p.tags);
        
        // Also check if there's any expanded properties for tags
        console.log("Full Person Object Keys:", Object.keys(p));
        
        // Let's look for "tagDate" or anything like that in the API
        console.log("Any tag-specific objects?", p.tagDetails || "None");
    } else {
        console.log("Not found.");
    }
}
checkPerson();

const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const match = envFile.match(/VITE_BOLDTRAIL_API_KEY=([^\n\r]+)/);
let apiKey = match[1].trim();
if (apiKey.startsWith('"') && apiKey.endsWith('"')) { apiKey = apiKey.slice(1, -1); }
const fubMatch = envFile.match(/VITE_FUB_API_KEY=([^\n\r]+)/);
let fubKey = fubMatch ? fubMatch[1].trim() : fs.readFileSync('.env', 'utf8').match(/VITE_FUB_API_KEY=([^\n\r]+)/)[1].trim();
if (fubKey.startsWith('"') && fubKey.endsWith('"')) { fubKey = fubKey.slice(1, -1); }

async function run() {
    console.log("Fetching BT users...");
    const res = await fetch(`https://my.brokermint.com/api/v1/users?api_key=${apiKey}&count=5`, { headers: { Accept: 'application/json' } });
    const btUsers = await res.json();
    for (const bu of btUsers) {
        if (bu.id) {
            const ures = await fetch(`https://my.brokermint.com/api/v1/users/${bu.id}?api_key=${apiKey}`, { headers: { Accept: 'application/json' } });
            console.log("BT USER:", await ures.json());
            break;
        }
    }

    console.log("Fetching FUB users...");
    const HeaderObj = { 'Authorization': 'Basic ' + Buffer.from(fubKey + ':').toString('base64'), 'Accept': 'application/json' };
    const fres = await fetch('https://api.followupboss.com/v1/users?limit=2', { headers: HeaderObj });
    const fData = await fres.json();
    console.log("FUB USER:", fData.users[0]);
}

run();

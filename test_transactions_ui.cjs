const puppeteer = require('puppeteer');

(async () => {
    try {
        const browser = await puppeteer.launch({ headless: 'new' });
        const page = await browser.newPage();

        // Setup console mirroring
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));

        await page.goto('https://scarlet-intergalactic.vercel.app/login');
        await page.waitForSelector('input[type="email"]');

        await page.type('input[type="email"]', 'admin@questsold.com');
        await page.type('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');

        await new Promise(r => setTimeout(r, 6000));

        console.log('Current URL after login attempt:', page.url());

        if (page.url().includes('login')) {
            console.log('Failed to log in as admin!');
        } else {
            console.log('Logged in. Navigating to /transactions');
            await page.goto('https://scarlet-intergalactic.vercel.app/transactions', { waitUntil: 'networkidle2' });

            // Wait for transactions to load. It grabs 3000 txs so it might take a few seconds
            await new Promise(r => setTimeout(r, 8000));

            const transactionsHtml = await page.evaluate(() => {
                const trs = document.querySelectorAll('tbody tr');
                return Array.from(trs).map(tr => tr.innerText).slice(0, 10);
            });
            console.log('Found rows matching data:', transactionsHtml.length);
            console.log(transactionsHtml);
        }

        await browser.close();
    } catch (err) {
        console.error('Error running test:', err);
    }
})();

const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    // Capture console errors
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log('PAGE ERROR:', msg.text());
        } else {
            console.log(`PAGE LOG [${msg.type()}]:`, msg.text());
        }
    });

    try {
        console.log("Navigating to live site...");
        await page.goto('https://scarlet-intergalactic.vercel.app/login', { waitUntil: 'networkidle2' });

        console.log("Logging in...");
        await page.type('input[type="email"]', 'admin@questsold.com');
        await page.type('input[type="password"]', 'password123'); // Assuming test admin credential is same
        await page.click('button[type="submit"]');

        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        console.log("Navigating to Transactions...");
        await page.goto('https://scarlet-intergalactic.vercel.app/transactions', { waitUntil: 'networkidle2' });

        // Wait for transactions to load
        await page.waitForSelector('table tbody tr');

        console.log("Clicking 'Portal' button on first transaction...");
        // Click the first Portal button
        const portalButtons = await page.$$('button[title="Create Client Portal"]');
        if (portalButtons.length > 0) {
            await portalButtons[0].click();
            console.log("Portal modal opened.");

            // Wait for modal
            await page.waitForSelector('input[placeholder="e.g. John & Jane Doe"]');
            await page.type('input[placeholder="e.g. John & Jane Doe"]', 'Test Client Auto');

            // Override window.alert so it doesn't block evaluation
            await page.evaluate(() => {
                window.alert = (msg) => console.error("ALERT TRIGGERED:", msg);
            });

            console.log("Submitting portal form...");
            const submitBtn = await page.$('button[type="submit"]');
            await submitBtn.click();

            // Wait longer to see if firestore fails
            await page.waitForTimeout(4000);

        } else {
            console.log("No transactions found to click Portal.");
        }

    } catch (err) {
        console.error("Test Script Error:", err);
    } finally {
        await browser.close();
    }
})();

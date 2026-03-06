const puppeteer = require('puppeteer');
(async () => {
    try {
        const browser = await puppeteer.launch({ headless: 'new' });
        const page = await browser.newPage();
        await page.goto('https://scarlet-intergalactic.vercel.app/login');
        await page.waitForSelector('input[type="email"]');
        await page.type('input[type="email"]', 'testuser_12345@questsold.com');
        await page.type('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');

        await new Promise(r => setTimeout(r, 4000));

        const bodyText = await page.evaluate(() => document.body.innerText);
        console.log('Body Text:', bodyText.substring(0, 500));
        await browser.close();
    } catch (err) {
        console.error('Error running test:', err);
    }
})();

import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    try {
        await page.goto('https://www.cognitoforms.com/AliBerry/NewLeadInputForm', { waitUntil: 'load' });
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const html = await page.evaluate(() => document.body.innerHTML);
        console.log("HTML length:", html.length);
        console.log(html);
    } catch (e) {
        console.error("Error evaluating page:", e);
    } finally {
        await browser.close();
    }
})();

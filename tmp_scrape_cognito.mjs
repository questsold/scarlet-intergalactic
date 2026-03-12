import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    try {
        await page.goto('https://www.cognitoforms.com/AliBerry/NewLeadInputForm', { waitUntil: 'networkidle2' });
        
        // Wait for the form to render
        await page.waitForSelector('.c-editor', { timeout: 10000 });
        
        // Extract form definition or labels
        const formFields = await page.evaluate(() => {
            const fields = [];
            const elements = document.querySelectorAll('.c-editor');
            elements.forEach(el => {
                const label = el.querySelector('.c-label')?.innerText?.trim();
                const type = el.className;
                
                // Get options if dropdown or radio
                const options = [];
                const optionEls = el.querySelectorAll('option, .c-choice-option label');
                optionEls.forEach(opt => {
                    const text = opt.innerText?.trim();
                    if (text) options.push(text);
                });
                
                if (label) {
                    fields.push({ label, type, options });
                }
            });
            return fields;
        });

        console.log("Form Fields Extracted:");
        console.log(JSON.stringify(formFields, null, 2));

    } catch (e) {
        console.error("Error evaluating page:", e);
    } finally {
        await browser.close();
    }
})();

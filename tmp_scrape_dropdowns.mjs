import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    try {
        await page.goto('https://www.cognitoforms.com/AliBerry/NewLeadInputForm', { waitUntil: 'networkidle0' });
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const dropdownsData = await page.evaluate(async () => {
            const results = {};
            const dropdownEls = document.querySelectorAll('.el-select');
            
            for (let i = 0; i < dropdownEls.length; i++) {
                const el = dropdownEls[i];
                const input = el.querySelector('input');
                let parentLabel = el.closest('.cog-field')?.querySelector('label')?.innerText?.trim();
                
                // Click to open dropdown
                input.click();
                
                // wait for it to open
                await new Promise(r => setTimeout(r, 600));
                
                const popper = document.querySelector('.el-popper');
                if (popper) {
                    const items = Array.from(popper.querySelectorAll('li span')).map(item => item.innerText?.trim());
                    results[parentLabel || 'Dropdown ' + i] = items;
                }
            }
            return results;
        });

        console.log("Dropdown Data:", JSON.stringify(dropdownsData, null, 2));
    } catch (e) {
        console.error("Error evaluating page:", e);
    } finally {
        await browser.close();
    }
})();

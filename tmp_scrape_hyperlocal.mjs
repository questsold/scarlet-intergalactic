import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    try {
        await page.goto('https://www.cognitoforms.com/AliBerry/HyperLocalLeadInputForm', { waitUntil: 'networkidle0' });
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const formData = await page.evaluate(async () => {
            const results = {
                fields: [],
                dropdowns: {}
            };

            const fieldEls = document.querySelectorAll('.cog-field');
            for (let i = 0; i < fieldEls.length; i++) {
                const el = fieldEls[i];
                const label = el.querySelector('label')?.innerText?.trim();
                if (!label) continue;
                
                let type = 'text';
                if (el.querySelector('.el-select')) type = 'dropdown';
                else if (el.querySelector('textarea')) type = 'textarea';
                else if (el.querySelector('input[type="checkbox"]')) type = 'checkbox';
                else if (el.querySelector('input[type="radio"]')) type = 'radio';

                results.fields.push({ label, type });

                if (type === 'dropdown') {
                    const input = el.querySelector('input');
                    if (input) {
                        try {
                            input.click();
                            await new Promise(r => setTimeout(r, 600)); // Need to wait for rendering popper
                            
                            // Cognito usually renders the popper at the end of body
                            // Getting the visible popper items
                            const poppers = Array.from(document.querySelectorAll('.el-popper')).filter(p => p.style.display !== 'none');
                            if (poppers.length > 0) {
                                const lastPopper = poppers[poppers.length - 1];
                                const items = Array.from(lastPopper.querySelectorAll('li span')).map(item => item.innerText?.trim()).filter(Boolean);
                                results.dropdowns[label] = items;
                            }
                            
                            // Click again or somewhere else to close it, or just leave it
                            document.body.click();
                            await new Promise(r => setTimeout(r, 300));
                        } catch(e) {}
                    }
                }
            }
            return results;
        });

        console.log("Form Data:", JSON.stringify(formData, null, 2));
    } catch (e) {
        console.error("Error evaluating page:", e);
    } finally {
        await browser.close();
    }
})();

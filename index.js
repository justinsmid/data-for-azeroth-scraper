const puppeteer = require('puppeteer');
const fs = require('fs');

const DFA_URL = "https://www.dataforazeroth.com/collections/mounts";
const NEXT_PAGE_BTN_INDEX = 11;

(async () => {
    const elementText = (el, page) => page.evaluate((el) => el.textContent, el);

    const parsePage = async (page) => {
        await page.waitForSelector('#collection');

        const divs = await page.$$('#collection > div.row.m-0.collection > div');

        const result = {}
        for (const el of divs) {
            const nameDiv = await el.$('div.my-auto > div');
            const name = await elementText(nameDiv, page);

            const spans = await el.$$('span.badge');
            const spanTexts = await Promise.all(spans.map(el => elementText(el, page)));
            const ratio = spanTexts.find(text => /\d+%/.test(text));

            result[name] = ratio;
        }

        return result;
    }
    
    try {
        const browser = await puppeteer.launch({
            headless: false,
            'ignoreHTTPSErrors': true
        });

        const page = await browser.newPage();
        await page.goto(DFA_URL);

        let result = {};
        let hasNextPage = true;
        while (hasNextPage) {
            const pageResult = await parsePage(page);
            result = {...result, ...pageResult};

            const buttons = await page.$$('button.btn-primary');
            const nextPageButton = buttons[NEXT_PAGE_BTN_INDEX];
            const nextPageButtonIsDisabled = await page.evaluate((btn) => btn.disabled, nextPageButton);

            if (!nextPageButtonIsDisabled) {
                await nextPageButton.click();
                await page.waitForTimeout(3000);
            }
            hasNextPage = !nextPageButtonIsDisabled;
        }

        console.log(result);
        fs.writeFileSync('data.json', JSON.stringify(result));
    } catch (ex) {
        console.error(ex);
    }
})();
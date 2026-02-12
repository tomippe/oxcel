import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
await page.goto('http://localhost:5174/', { waitUntil: 'networkidle0' });

// Enter value in first octagon
await page.click('.octagon-content');
await page.waitForSelector('.octagon-input');
await page.type('.octagon-input', '30');
await page.keyboard.press('Enter');
await new Promise(r => setTimeout(r, 400));

// Enter value in second octagon (right)
const octagons = await page.$$('.octagon-content');
await octagons[1].click();
await page.waitForSelector('.octagon-input');
await page.type('.octagon-input', '+3');
await page.keyboard.press('Enter');
await new Promise(r => setTimeout(r, 400));

await page.screenshot({ path: 'screenshot.png', fullPage: true });
await browser.close();
console.log('Screenshot saved');

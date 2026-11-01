const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
 const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
 const page = await browser.newPage({ viewport: { width: 390, height: 844 }, timezoneId: 'America/Chicago' });
 const errors = []; page.on('pageerror', e => errors.push(e.message));
 const base = process.env.PREVIEW_URL || 'http://127.0.0.1:5192';
 try {
  await page.goto(base + '/results');
  await page.getByRole('heading', {name:'Weekly results'}).waitFor();
  await page.getByRole('link', {name:'Open my round', exact:true}).click();
  await page.getByRole('button', {name:'Start round', exact:true}).click();
  await page.getByLabel('Gross score for hole 1', {exact:true}).waitFor();
  await page.getByLabel('Gross score for hole 1', {exact:true}).fill('5');
  await page.getByRole('button', {name:'Save & next hole', exact:true}).click();
  await page.getByLabel('Gross score for hole 2', {exact:true}).waitFor();
  await page.reload();
  await page.getByLabel('Gross score for hole 2', {exact:true}).waitFor();
  assert.equal(await page.getByRole('button', {name:'Go to hole 1', exact:true}).innerText(), '1\n5');
  for (let i = 2; i <= 9; i++) {
   await page.getByLabel(`Gross score for hole ${i}`, {exact:true}).fill('4');
   await page.getByRole('button', {name:i===9 ? 'Save hole & review' : 'Save & next hole', exact:true}).click();
  }
  await page.getByRole('heading', {name:'Review your scorecard'}).waitFor();
  await page.getByRole('button', {name:'Edit hole 1', exact:true}).click();
  await page.getByLabel('Gross score for hole 1', {exact:true}).fill('3');
  await page.getByRole('button', {name:'Save & next hole', exact:true}).click();
  await page.getByRole('heading', {name:'Review your scorecard'}).waitFor();
  fs.mkdirSync('../../outputs/live-scoring', {recursive:true});
  for (const width of [320,390,1280]) {
   await page.setViewportSize({width,height:844});


   assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `review overflow at ${width}`);
  }
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'../../outputs/live-scoring/scorecard-review-mobile.png',fullPage:true});
  await page.getByRole('button', {name:'Submit score & lock card', exact:true}).click();
  await page.getByText('Score submitted', {exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:/Edit hole/}).count(),0);
  await page.reload();
  await page.getByText('Score submitted', {exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:/Edit hole/}).count(),0);
  await page.getByRole('link', {name:'View live leaderboard',exact:true}).click();
  await page.getByRole('link',{name:'View my submitted card',exact:true}).waitFor();
  assert.equal(await page.getByText('Submitted · Team',{exact:true}).count(),2);
  for (const width of [320,390,1280]) {
   await page.setViewportSize({width,height:844});
   assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `leaderboard overflow at ${width}`);
  }
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'../../outputs/live-scoring/leaderboard-mobile.png',fullPage:true});
  await page.getByRole('button',{name:'View card',exact:true}).first().click();
  await page.getByRole('table',{name:'Hole-by-hole scorecard'}).waitFor();
  await page.getByRole('link',{name:'My history',exact:true}).click();
  await page.getByRole('heading',{name:'My results',exact:true}).waitFor();
  assert.deepEqual(errors,[]);
  console.log('PASS: start, hole saves, reload/resume, review/edit, team submission, immutable submitted UI, weekly leaderboard, history and 320/390/1280px layouts.');
 } finally { await browser.close(); }
})().catch(e => {console.error(e);process.exitCode=1;});

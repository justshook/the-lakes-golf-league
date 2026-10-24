// Optional browser regression: npm install --no-save playwright; npx playwright install chromium
// PLAYWRIGHT_MODULE and CHROMIUM_BIN can point to externally installed tooling.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
(async () => {
 const server = spawn('node',['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5188'],{env:{...process.env,VITE_DEMO_MODE:'true'},stdio:'ignore'});
 let browser;
 try {
  for(let i=0;i<40;i++){try{await fetch('http://127.0.0.1:5188');break;}catch{await new Promise(r=>setTimeout(r,100));}}
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_BIN || undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,timezoneId:'America/Chicago'});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  fs.mkdirSync('docs/review/screenshots',{recursive:true});
  for(const width of (process.env.SKIP_LAYOUT ? [] : [320,390,1280])) {
   await page.setViewportSize({width,height:width===1280?900:844});
   for(const path of ['/','/schedule','/results','/money','/league','/players','/leaderboard','/skins','/rules','/admin','/login']) {
    await page.goto('http://127.0.0.1:5188'+path);await page.locator('main').waitFor();await page.waitForTimeout(150);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
    if(overflow)throw new Error(`Horizontal overflow at ${width}px ${path}`);
    if(await page.locator('main').innerText()==='')throw new Error(`Blank route ${path}`);
    console.log(`OK ${width}px ${path}`);
    if(width===390&&['/','/admin','/money','/schedule'].includes(path))await page.screenshot({path:`docs/review/screenshots/${path==='/'?'my-week':path.slice(1)}-mobile.png`,fullPage:true});
    if(width===1280&&path==='/')await page.screenshot({path:'docs/review/screenshots/my-week-desktop.png',fullPage:true});
   }
  }
  await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:5188/');
  await page.getByRole('button',{name:'Can’t make it',exact:true}).click();await page.getByRole('button',{name:'Confirm absence',exact:true}).click();await page.getByText('Taking a week off.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'I can play',exact:true}).click();await page.getByRole('button',{name:'Confirm I’m playing',exact:true}).click();console.log('OK absence + return');
  await page.getByRole('navigation',{name:'Mobile navigation'}).getByRole('link',{name:'Schedule',exact:true}).click();await page.getByRole('button',{name:'Edit',exact:true}).click();await page.getByRole('button',{name:'Save availability',exact:true}).click();await page.getByText('Your available tee times are saved for future schedules.').waitFor();console.log('OK availability save');
  await page.goto('http://127.0.0.1:5188/admin');if(!process.env.SKIP_SCHEDULE){await page.getByRole('button',{name:'Generate draft',exact:true}).click();await page.getByRole('button',{name:'Publish tee sheet',exact:true}).click();await page.getByText(/tee sheet published/i).waitFor();console.log('OK generate + publish');}
  const date = new Date(); date.setDate(date.getDate()+90); const newDate=date.toISOString().slice(0,10); const deadline=new Date(date);deadline.setDate(deadline.getDate()-1);
  await page.getByRole('button',{name:'Add round',exact:true}).click();await page.getByLabel('Round date',{exact:true}).fill(newDate);await page.getByLabel('Attendance deadline',{exact:true}).fill(deadline.toISOString().slice(0,10)+'T18:00');await page.getByRole('dialog').getByRole('button',{name:'Add round',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});await page.getByLabel('Choose a round').selectOption(newDate.replaceAll('-',''));console.log('OK create round');
  await page.getByLabel('Player',{exact:true}).selectOption('9001');await page.getByLabel('Amount ($)',{exact:true}).fill('25');await page.getByLabel('Payment or receipt reference',{exact:true}).fill('DEMO-BROWSER-PAYMENT');await page.getByRole('button',{name:'Review entry',exact:true}).click();await page.getByRole('button',{name:'Record entry',exact:true}).click();await page.getByText('Saved in this demo session.',{exact:true}).waitFor();console.log('OK record ledger entry');
  if(errors.length)throw new Error(errors.join('\n'));console.log('PASS browser review; enabled route checks and interactive workflows completed without JS errors.');
 } finally {if(browser)await browser.close();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1});

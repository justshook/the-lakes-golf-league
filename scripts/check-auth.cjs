// Mocked browser regression. No real emails, accounts, or provider settings are changed.
// PLAYWRIGHT_MODULE and CHROMIUM_BIN can point to externally installed tools.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const origin = 'http://127.0.0.1:5190';
const api = 'https://league-test.supabase.co';
const user = { id:'11111111-1111-4111-8111-111111111111', aud:'authenticated', role:'authenticated', email:'player@example.test', email_confirmed_at:'2026-01-01T00:00:00Z', confirmed_at:'2026-01-01T00:00:00Z', app_metadata:{provider:'email',providers:['email']}, user_metadata:{} };
const b64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const accessToken = `${b64({alg:'HS256',typ:'JWT'})}.${b64({sub:user.id,aud:'authenticated',role:'authenticated',email:user.email,exp:Math.floor(Date.now()/1000)+3600,iat:Math.floor(Date.now()/1000)})}.test-signature`;
const session = {access_token:accessToken,refresh_token:'mock-refresh-token',token_type:'bearer',expires_in:3600,user};
const fragment = `#access_token=${accessToken}&refresh_token=mock-refresh-token&type=magiclink`;
(async()=>{
 const server=spawn('node',['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5190'],{env:{...process.env,VITE_DEMO_MODE:'false',VITE_SUPABASE_URL:api,VITE_SUPABASE_ANON_KEY:'mock-public-key',VITE_GOOGLE_AUTH_ENABLED:'true'},stdio:'ignore'});
 let browser;
 try {
  for(let i=0;i<60;i++){try{await fetch(origin);break;}catch{await new Promise(r=>setTimeout(r,100));}}
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_BIN||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const errors=[],requests=[]; let missingSchema=false, claimed=false;
  page.on('pageerror',e=>errors.push(e.message));
  await page.route(api+'/**',async route=>{
   const req=route.request(),url=new URL(req.url()),path=url.pathname;
   let body;try{body=req.postDataJSON();}catch{}
   requests.push({path,method:req.method(),query:url.searchParams,body,claimed});
   const reply=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
   if(path==='/auth/v1/user')return reply(user);
   if(path==='/auth/v1/token')return body?.password==='incorrect-password' ? reply({error_code:'invalid_credentials',msg:'Invalid login credentials'},400) : reply(session);
   if(path==='/auth/v1/verify')return reply(session);
   if(['/auth/v1/otp','/auth/v1/recover','/auth/v1/logout'].includes(path))return reply({});
   if(path==='/auth/v1/authorize')return route.fulfill({status:200,contentType:'text/html',body:'<h1>Mock Google handoff</h1>'});
   if(path==='/rest/v1/rpc/claim_league_player'){await new Promise(r=>setTimeout(r,80));if(missingSchema)return reply({code:'PGRST202',message:'missing migration'},404);claimed=true;return reply({player_id:41,name:'Taylor Test',email:user.email,is_admin:false,availability:['4:00 PM']});}
   if(path.startsWith('/rest/v1/')) {
    const table=path.split('/').at(-1);
    const rows={league_public_players:[{id:41,name:'Taylor Test',handicap:14.2,availability:['4:00 PM'],type:'full-time'}],player_scores:[{id:1,week_id:1,player_id:41,gross_score:42,net_score:33,handicap_used:9,is_team_score:false}],player_money:[{id:1,week_id:1,player_id:41,category:'low_net',amount:25}],league_player_preferences:null};
    const data=Object.hasOwn(rows,table)?rows[table]:[];return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-expose-headers':'content-range','content-range':Array.isArray(data)?`0-${Math.max(0,data.length-1)}/${data.length}`:'*/0'},body:JSON.stringify(data)});
   }
   return reply({message:'Unexpected mock endpoint'},500);
  });
  const fresh=async()=>{missingSchema=false;await page.goto(origin+'/login');await page.evaluate(()=>{localStorage.clear();sessionStorage.clear();});claimed=false;await page.goto(origin+'/login');await page.getByLabel('Your league email',{exact:true}).waitFor();};
  const noOverflow=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await fresh();
  for(const width of [320,390,1280]){await page.setViewportSize({width,height:844});await noOverflow();}
  await page.setViewportSize({width:390,height:844});fs.mkdirSync('docs/review/screenshots',{recursive:true});
  await page.screenshot({path:'docs/review/screenshots/sign-in-mobile.png',fullPage:true});
  await page.getByRole('button',{name:'First time here? Set up login',exact:true}).click();
  await page.getByLabel('Your league email',{exact:true}).fill(user.email);await page.getByRole('button',{name:'Email me a setup link',exact:true}).click();await page.getByRole('heading',{name:'Check your inbox',exact:true}).waitFor();
  const otp=requests.findLast(r=>r.path==='/auth/v1/otp');assert.equal(otp.body.create_user,true);assert.equal(new URL(otp.query.get('redirect_to')).pathname,'/auth/callback');assert.equal(new URL(otp.query.get('redirect_to')).searchParams.get('next'),'/account/password');console.log('OK first-time email setup request');
  await page.goto(origin+'/auth/callback?next=%2Faccount%2Fpassword'+fragment);await page.getByLabel('New password',{exact:true}).waitFor();assert.equal(new URL(page.url()).hash,'');
  await page.goto(origin+'/profile');await page.getByLabel('New password',{exact:true}).waitFor();assert.equal(new URL(page.url()).pathname,'/account/password');
  await page.reload();await page.getByLabel('New password',{exact:true}).waitFor();console.log('OK verified setup callback + refresh/navigation guard');
  await page.getByLabel('New password',{exact:true}).fill('test correct horse battery');await page.getByLabel('Confirm new password',{exact:true}).fill('test correct horse battery');await page.getByRole('button',{name:'Save password',exact:true}).click();await page.waitForURL(origin+'/');
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('lakes:auth:pending-password-user')),null);
  await page.goto(origin+'/profile');await page.getByRole('heading',{name:'My profile',exact:true}).waitFor();await page.getByText('14.2',{exact:true}).waitFor();await page.getByRole('heading',{name:'2026 season',exact:true}).waitFor();await noOverflow();
  await page.screenshot({path:'docs/review/screenshots/profile-mobile.png',fullPage:true});console.log('OK password save + linked player handicap/history');
  await page.goto(origin+'/results?year=2025');await page.getByText(/No.*(result|round|score)/i).first().waitFor();assert.equal((await page.locator('main').innerText()).includes('Week 1'),false);console.log('OK unavailable earlier year does not show another season');
  await fresh();await page.getByRole('button',{name:'Forgot password?',exact:true}).click();await page.getByLabel('Your league email',{exact:true}).fill(user.email);await page.getByRole('button',{name:'Send password-reset link',exact:true}).click();await page.getByRole('heading',{name:'Check your inbox',exact:true}).waitFor();assert.equal(new URL(requests.findLast(r=>r.path==='/auth/v1/recover').query.get('redirect_to')).pathname,'/auth/callback');console.log('OK password reset request');
  await fresh();await page.getByLabel('Your league email',{exact:true}).fill(user.email);await page.getByLabel('Password',{exact:true}).fill('incorrect-password');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByRole('alert').filter({hasText:'Invalid login credentials'}).waitFor();console.log('OK failed password remains signed out');
  const loginStart=requests.length;await page.getByLabel('Password',{exact:true}).fill('test correct horse battery');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL(origin+'/');await page.getByRole('button',{name:'Open account for Taylor Test'}).waitFor();await page.waitForTimeout(150);const ledgerReads=requests.slice(loginStart).filter(r=>r.path==='/rest/v1/league_ledger_entries');assert.ok(ledgerReads.length);assert.ok(ledgerReads.every(r=>r.claimed));console.log('OK email/password sign-in + ledger read after roster claim');
  await fresh();await page.goto(origin+'/auth/confirm?token_hash=one-use&type=recovery');await page.getByLabel('New password',{exact:true}).waitFor();assert.equal(requests.filter(r=>r.path==='/auth/v1/verify').length,1);console.log('OK custom email callback exchanges one-use token once under StrictMode');
  await fresh();await page.goto(origin+'/my-week'+fragment);await page.waitForURL(origin+'/');await page.getByRole('button',{name:'Open account for Taylor Test'}).waitFor();console.log('OK old /my-week link completes sign-in');
  await fresh();missingSchema=true;await page.goto(origin+'/auth/callback?next=%2Faccount%2Fpassword'+fragment);await page.getByLabel('New password',{exact:true}).waitFor();await page.getByLabel('New password',{exact:true}).fill('test correct horse battery');await page.getByLabel('Confirm new password',{exact:true}).fill('test correct horse battery');await page.getByRole('button',{name:'Save password',exact:true}).click();await page.getByText('Player accounts are awaiting database setup. Please contact the commissioner.',{exact:true}).waitFor();await page.getByText('Signed in as '+user.email,{exact:true}).waitFor();console.log('OK database setup failure retains verified account/password update');
  await fresh();await page.goto(origin+'/auth/callback#error=access_denied&error_code=otp_expired&error_description=secret-test-value');await page.getByRole('alert').filter({hasText:'expired'}).waitFor();assert.equal(new URL(page.url()).hash,'');assert.equal((await page.locator('body').innerText()).includes('secret-test-value'),false);await page.getByRole('link',{name:'Return to sign in',exact:true}).click();await page.getByLabel('Your league email',{exact:true}).waitFor();console.log('OK expired link recovery with sanitized URL');
  await page.getByRole('button',{name:'Continue with Google',exact:true}).click();await page.waitForURL(api+'/auth/v1/authorize**');assert.equal(new URL(page.url()).searchParams.get('provider'),'google');assert.equal(new URL(new URL(page.url()).searchParams.get('redirect_to')).pathname,'/auth/callback');console.log('OK Google OAuth handoff and callback URL');
  assert.deepEqual(errors,[]);console.log('PASS auth browser flows using mocked Supabase; no live emails or Google authorization attempted.');
 }finally{if(browser)await browser.close();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});

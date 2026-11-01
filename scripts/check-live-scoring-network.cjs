// Exercise the real Supabase client against a synthetic transport. No live data.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const origin = 'http://127.0.0.1:5193', api = 'https://league-test.supabase.co';
const user = { id:'11111111-1111-4111-8111-111111111111', aud:'authenticated', role:'authenticated', email:'player@example.test', email_confirmed_at:'2026-01-01T00:00:00Z', app_metadata:{}, user_metadata:{} };
const b64 = v => Buffer.from(JSON.stringify(v)).toString('base64url');
const token = `${b64({alg:'HS256',typ:'JWT'})}.${b64({sub:user.id,exp:Math.floor(Date.now()/1000)+3600,aud:'authenticated',role:'authenticated'})}.test`;
const session = { access_token:token,refresh_token:'test-refresh',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user };
(async () => {
 const server = spawn('node',['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5193','--strictPort'], {env:{...process.env,VITE_DEMO_MODE:'false',VITE_SUPABASE_URL:api,VITE_SUPABASE_ANON_KEY:'mock-public-key'},stdio:'ignore'});
 let browser;
 try {
  for(let i=0;i<60;i++){try{await fetch(origin);break;}catch{await new Promise(r=>setTimeout(r,100));}}
  const {courseHoles} = await import('../src/constants.js');
  const date = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const weekId=date.replaceAll('-','');
  const round = {week_id:weekId,date,status:'published',score_submission_enabled:true,attendance_deadline:date+'T00:00:00-05:00',tee_sheet:[{time:'4:00 PM',players:[41,42],teams:[]}],rule_snapshot:{scoringMode:'individual',nineHoles:'front',gameName:'Individual stroke play'}};
  let card = null, failSave = true, failReads = false, reads = 0;
  browser = await chromium.launch({executablePath:process.env.CHROMIUM_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  const context = await browser.newContext({viewport:{width:390,height:844}});
  await context.addInitScript(({session}) => localStorage.setItem('sb-league-test-auth-token',JSON.stringify(session)), {session});
  await context.route(origin+'/api/registrations',route=>route.fulfill({status:200,json:{application:null,is_admin:false,player_id:41}}));
  await context.route(api+'/**', async route => {
   const request=route.request(), path=new URL(request.url()).pathname;
   const reply=(data,status=200,headers={})=>route.fulfill({status,contentType:'application/json',headers,body:JSON.stringify(data)});
   if(path==='/auth/v1/user')return reply(user);
   if(path==='/auth/v1/token')return reply(session);
   if(path==='/rest/v1/rpc/claim_league_player')return reply({player_id:41,name:'Taylor Test',email:user.email,is_admin:false,availability:['4:00 PM']});
   if(path==='/rest/v1/rpc/manage_league_scorecard') {
    const input=request.postDataJSON();
    assert.equal(input.p_week_id,weekId);
    if(input.p_action==='start') { card ||= {week_id:weekId,entry_key:'player:41',member_ids:[41],handicap_used:4,holes:courseHoles.slice(0,9),gross_scores:Array(9).fill(null),revision:0,submitted_at:null};return reply(card); }
    if(input.p_action==='save' && failSave){failSave=false;return reply({message:'Signal dropped. Retry saving.'},503);}
    if(input.p_revision!==card.revision)return reply({message:'This card changed on another device. Reload the card and review before trying again.',code:'40001'},409);
    card.gross_scores[input.p_hole-1]=input.p_gross;card.revision++;return reply(card);
   }
   const table=path.split('/').at(-1);
   if(table==='league_scorecards'){reads++;if(failReads)return reply({message:'Connection unavailable'},503);}
   const tables={league_public_players:[{id:41,name:'Taylor Test',handicap:8,availability:['4:00 PM']},{id:42,name:'Morgan Test',handicap:12,availability:['4:00 PM']}],league_rounds:[round],league_round_participants:[41,42].map(player_id=>({week_id:weekId,player_id,handicap_used:4,team_id:null,tee_time:'4:00 PM'})),league_scorecards:card?[card]:[],league_player_preferences:null};
   const data=Object.hasOwn(tables,table)?tables[table]:[];
   return reply(data,200,{'access-control-expose-headers':'content-range','content-range':Array.isArray(data)?`0-${Math.max(0,data.length-1)}/${data.length}`:'*/0'});
  });
  const page=await context.newPage(), spectator=await context.newPage(), errors=[];
  for(const p of [page,spectator])p.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.goto(origin+`/round/${weekId}`);
  await page.getByRole('button',{name:'Start round',exact:true}).click();
  await page.getByLabel('Gross score for hole 1',{exact:true}).fill('5');
  await page.getByRole('button',{name:'Save & next hole',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Signal dropped'}).waitFor();
  assert.equal(await page.getByLabel('Gross score for hole 1',{exact:true}).inputValue(),'5');
  await page.reload();
  assert.equal(await page.getByLabel('Gross score for hole 1',{exact:true}).inputValue(),'5');
  await page.getByRole('button',{name:'Save & next hole',exact:true}).click();
  await page.getByLabel('Gross score for hole 2',{exact:true}).fill('6');
  card.gross_scores[1]=4;card.revision++;
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await page.waitForTimeout(250);
  await page.getByRole('button',{name:'Save & next hole',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'changed on another device'}).waitFor();
  assert.equal(card.gross_scores[1],4,'stale edit must not replace a teammate’s newer score');
  await page.getByRole('button',{name:'Reload latest card',exact:true}).click();
  await page.waitForTimeout(150);
  assert.equal(await page.getByLabel('Gross score for hole 2',{exact:true}).inputValue(),'4');
  await spectator.goto(origin+'/results');
  await spectator.getByRole('heading',{name:'Live leaderboard',exact:true}).waitFor();
  await spectator.getByText('Gross 9 · Net 7',{exact:true}).waitFor();
  const before=reads;
  card.gross_scores[2]=2;card.revision++;
  await spectator.getByText('Gross 11 · Net 9',{exact:true}).waitFor({timeout:15000});
  assert.ok(reads>before,'other devices must refresh without manual reload');
  failReads=true;
  await spectator.getByRole('button',{name:'Refresh leaderboard'}).click();
  await spectator.getByText('Connection interrupted',{exact:true}).waitFor();
  assert.equal(await spectator.getByText('Gross 11 · Net 9',{exact:true}).count(),1,'keep last good data visibly stale');
  failReads=false;
  await spectator.getByRole('button',{name:'Refresh leaderboard'}).click();
  await spectator.getByText('Updates every 10 seconds',{exact:true}).waitFor();
  await spectator.goto(origin+'/results?year=2025');
  await spectator.waitForURL(origin+'/results/history?year=2025');
  assert.deepEqual(errors,[]);
  console.log('PASS: real client transport, failed-save retry, local draft recovery, stale revision rejection after polling, second-device automatic updates, stale-data notice/recovery and legacy history links.');
 } finally { if(browser)await browser.close();server.kill(); }
})().catch(error=>{console.error(error);process.exitCode=1;});

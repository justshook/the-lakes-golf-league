import test from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import { Readable } from 'node:stream';
import { paymentConfig, verifiedUser, sessionSnapshot, createCheckout, processEvent, readRawBody, requireOrigin, safeReceipt } from '../server/payments.js';
const config = { enabled:true, mode:'test', livemode:false, account:'acct_fixture',origin:'https://league.example' };
const order = { id:'00000000-0000-0000-0000-000000000001',amount_cents:25000,currency:'usd',status:'creating',livemode:false,account_id:'acct_fixture',expires_at:new Date(Date.now()+3600000).toISOString() };
const metadata = {application:'lakes-league',order_id:order.id};
const session = extra => ({id:'cs_fixture',mode:'payment',metadata,client_reference_id:order.id,amount_total:25000,currency:'usd',livemode:false,status:'open',payment_status:'unpaid',payment_intent:null,url:'https://checkout.stripe.com/c/pay/fixture',...extra});
const paid = () => session({status:'complete',payment_status:'paid',payment_intent:{id:'pi_fixture',metadata,status:'succeeded',amount_received:25000,currency:'usd',livemode:false,latest_charge:{id:'ch_fixture',paid:true,amount:25000,currency:'usd',livemode:false,receipt_url:'https://pay.stripe.com/receipts/fixture'}}});
const event = (type='checkout.session.completed') => ({id:'evt_fixture',livemode:false,type,data:{object:session()}});

test('payments default disabled and reject accidental live configuration',()=>{
 assert.equal(paymentConfig({}).enabled,false);
 assert.throws(()=>paymentConfig({STRIPE_MODE:'live'}),/not approved/);
 assert.throws(()=>paymentConfig({LEAGUE_PAYMENTS_ENABLED:'true',STRIPE_MODE:'test',STRIPE_SECRET_KEY:['sk','live','fixture'].join('_')}),/not configured/);
});
test('verified server identity required; browser claims are not trusted',async()=>{
 await assert.rejects(()=>verifiedUser({headers:{}},{}),/Sign in/);
 await assert.rejects(()=>verifiedUser({headers:{authorization:'Bearer fixture'}},{auth:{getUser:async()=>({data:{user:{id:'bad',email_confirmed_at:null}}})}}),/verified/);
 const user=await verifiedUser({headers:{authorization:'Bearer fixture'}},{auth:{getUser:async token=>{assert.equal(token,'fixture');return {data:{user:{id:'verified',email_confirmed_at:'today'}}};}}});
 assert.equal(user.id,'verified');
});
test('checkout POST origin is fixed and receipts cannot redirect off Stripe',()=>{
 assert.throws(()=>requireOrigin({headers:{origin:'https://evil.example'}},config),/origin/);
 assert.equal(safeReceipt('https://pay.stripe.com.evil.example/'),null);
 assert.equal(safeReceipt('javascript:alert(1)'),null);
 assert.equal(safeReceipt('https://pay.stripe.com/receipts/fixture'),'https://pay.stripe.com/receipts/fixture');
});
test('settlement requires amount, owner metadata, mode, account, paid session and matching successful intent',()=>{
 assert.equal(sessionSnapshot(paid(),order,config).status,'paid');
 for (const altered of [session({amount_total:1}),session({livemode:true}),session({client_reference_id:'another'}),session({metadata:{...metadata,order_id:'another'}}),paid()]) {
  if (altered.payment_intent) altered.payment_intent.amount_received=1;
  assert.throws(()=>sessionSnapshot(altered,order,config),/mismatch|match/);
 }
 assert.equal(sessionSnapshot(session({status:'complete'}),order,config).status,'pending');
 assert.equal(sessionSnapshot(session({status:'expired'}),order,config).status,'expired');
});
test('Checkout uses trusted SQL amount and identity with stable idempotency',async()=>{
 const calls=[];
 const db={rpc:async(name,args)=>{calls.push({name,args});return {data:name==='league_prepare_checkout'?order:null};}};
 const stripe={accounts:{retrieve:async()=>({id:'acct_fixture'})},checkout:{sessions:{create:async(params,options)=>{
  assert.equal(params.line_items[0].price_data.unit_amount,25000);
  assert.equal(params.client_reference_id,order.id);
  assert.equal(params.success_url,'https://league.example/my-money?checkout=returned');
  assert.equal(params.cancel_url,'https://league.example/my-money?checkout=cancelled');
  assert.equal(options.idempotencyKey,`lakes-checkout-${order.id}`);
  assert.equal(params.payment_method_types,undefined);
  return session();
 }}}};
 const result=await createCheckout({db,stripe,config},{id:'verified-user',amount:1,player_id:999});
 assert.equal(result.url,'https://checkout.stripe.com/c/pay/fixture');
 assert.deepEqual(calls[0].args,{p_user:'verified-user',p_account:'acct_fixture',p_live:false});
 assert.equal(calls[1].name,'league_attach_checkout');
});
test('pending or already settled orders do not create another Checkout',async()=>{
 for (const status of ['pending','paid','refunded']) {
  const db={rpc:async()=>({data:{...order,status}})};
  const stripe={accounts:{retrieve:async()=>({id:'acct_fixture'})}};
  assert.equal((await createCheckout({db,stripe,config},{id:'user'})).status,status);
 }
});
test('webhook refetches latest paid state and bounded refunds instead of trusting stale event body',async()=>{
 const calls=[];
 const db={rpc:async(name,args)=>{calls.push({name,args});return {data:name==='league_find_payment_order'?order:{processed:true}};}};
 const stripe={accounts:{retrieve:async()=>({id:'acct_fixture'})},checkout:{sessions:{retrieve:async()=>paid()}},refunds:{list:async function*(){yield {id:'re_fixture',amount:1000,status:'succeeded',currency:'usd',payment_intent:'pi_fixture'};}}};
 await processEvent(event('checkout.session.expired'),{db,stripe,config});
 assert.equal(calls[1].args.p_data.status,'paid');
 assert.equal(calls[1].args.p_data.refunds[0].amount_cents,1000);
 assert.equal(calls[1].args.p_data.event_id,'evt_fixture');
});
test('webhook rejects wrong Stripe context and retries database failures',async()=>{
 await assert.rejects(()=>processEvent({...event(),livemode:true},{config}),/mode/);
 await assert.rejects(()=>processEvent({...event(),account:'acct_other'},{config}),/account/);
 const db={rpc:async()=>({error:{code:'XX000',message:'sensitive internal detail'}})};
 await assert.rejects(()=>processEvent(event(),{config,db,stripe:{accounts:{retrieve:async()=>({id:'acct_fixture'})}}}),error=>error.status===503 && !error.message.includes('sensitive'));
});
test('Stripe SDK signature verification rejects unsigned, modified, and stale requests',()=>{
 const stripe=new Stripe(['sk','test','fixture'].join('_'));
 const secret='whsec_local_test_only';
 const payload=JSON.stringify(event());
 const header=stripe.webhooks.generateTestHeaderString({payload,secret});
 assert.equal(stripe.webhooks.constructEvent(Buffer.from(payload),header,secret).id,'evt_fixture');
 assert.throws(()=>stripe.webhooks.constructEvent(Buffer.from(payload+' '),header,secret));
 assert.throws(()=>stripe.webhooks.constructEvent(Buffer.from(payload),'',secret));
 const old=stripe.webhooks.generateTestHeaderString({payload,secret,timestamp:1});
 assert.throws(()=>stripe.webhooks.constructEvent(Buffer.from(payload),old,secret));
});
test('raw webhook reader preserves bytes and limits request size',async()=>{
 const raw=Buffer.from('{"raw": "a  b"}\n');
 assert.deepEqual(await readRawBody(Readable.from([raw.subarray(0,5),raw.subarray(5)])),raw);
 await assert.rejects(()=>readRawBody(Readable.from([raw]),2),/too large/);
});

test('pausing Checkout preserves configured webhook processing',()=>{
 const paused=paymentConfig({LEAGUE_PAYMENTS_ENABLED:'false',STRIPE_SECRET_KEY:['rk','test','fixture'].join('_'),STRIPE_WEBHOOK_SECRET:'whsec_fixture',STRIPE_ACCOUNT_ID:'acct_fixture',APP_ORIGIN:'https://league.example'});
 assert.equal(paused.enabled,false);
 assert.equal(paused.configured,true);
});

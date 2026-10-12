import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync(new URL('../assets/consent-init.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const GA = 'G-5Y67Z119TZ', ADS = 'AW-18388504691';

function fixture(consent, options = {}) {
  const local = new Map(), session = new Map(), scripts = [], callbacks = [];
  if (consent) local.set('barowo_consent_v1', JSON.stringify({version:options.version || '20261013',...consent}));
  const storage = map => ({getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)});
  let dialog;
  const node = () => ({setAttribute(){},remove(){},addEventListener(k,fn){this[k]=fn;},querySelector(){return {hasAttribute:()=>false,checked:false};}});
  const d = {readyState:'complete',referrer:options.referrer || '',addEventListener(){},createElement:node,
    head:{appendChild:n=>scripts.push(n.src)},body:{appendChild:n=>{dialog=n;}},getElementsByTagName:()=>[{parentNode:{insertBefore(n){scripts.push(n.src);}}}]};
  const url = new URL(options.url || 'https://barowo.com/');
  const w = {dataLayer:[],location:url,setTimeout,localStorage:storage(local),sessionStorage:storage(session)};
  w.gtag = (...args) => {
    w.dataLayer.push(args);
    if (args[0] === 'get') {
      if (options.delayed) callbacks.push(()=>args[3](args[2]==='client_id'?'1234.5678':'5678'));
      else if (!options.blocked) args[3](args[2]==='client_id'?'1234.5678':'5678');
    }
  };
  const ctx = vm.createContext({window:w,document:d,location:url,localStorage:w.localStorage,sessionStorage:w.sessionStorage,URL,URLSearchParams,Promise,Date,JSON});
  vm.runInContext(source,ctx);
  return {w,ctx,scripts,callbacks,local,session,choose(action){w.BAROWO_openConsentPreferences();dialog.click({target:{closest:()=>({getAttribute:()=>action})}});},
    configs:()=>w.dataLayer.filter(x=>x[0]==='config'),events:n=>w.dataLayer.filter(x=>x[0]==='event'&&x[1]===n)};
}
for (const [name,choice,ga,ads] of [
  ['no choice',undefined,false,false],['necessary only',{analytics:false,marketing:false},false,false],
  ['analytics only',{analytics:true,marketing:false},true,false],['marketing only',{analytics:false,marketing:true},false,true],
  ['both',{analytics:true,marketing:true},true,true]
]) test(`independent consent: ${name}`,()=>{
  const f=fixture(choice); assert.equal(f.configs().some(x=>x[1]===GA),ga); assert.equal(f.configs().some(x=>x[1]===ADS),ads);
  f.w.BAROWO_track('Lead',{content_name:'Formularz',lead_id:'deadbeef'});
  assert.equal(f.events('generate_lead').length,Number(ga)); assert.equal(f.events('conversion').length,Number(ads));
  assert.equal(f.scripts.some(x=>x.includes('fbevents')),ads);
});
test('previous consent version requires a new choice',()=>{const f=fixture({analytics:true,marketing:true},{version:'20261012'});assert.equal(f.configs().length,0);});
test('accepting analytics after Ads configures GA4 without loading Google twice',()=>{
  const f=fixture({marketing:true,analytics:false});f.choose('accept');
  assert.equal(f.configs().filter(x=>x[1]===GA).length,1);assert.equal(f.scripts.filter(x=>x.includes('gtag/js')).length,1);
});
test('revocation disables GA4 and later Ads/Meta lead events',()=>{
  const f=fixture({analytics:true,marketing:true});f.choose('reject');f.w.BAROWO_track('Lead');
  assert.equal(f.w['ga-disable-'+GA],true);assert.equal(f.events('generate_lead').length,0);assert.equal(f.events('conversion').length,0);
});
test('page URLs omit arbitrary query fields while UTM campaign attribution survives',()=>{
  const f=fixture({analytics:true},{url:'https://barowo.com/?email=private@example.invalid&utm_source=google&utm_medium=cpc&utm_campaign=Wigilia'});
  const c=f.configs().find(x=>x[1]===GA)[2];assert.equal(c.page_location,'https://barowo.com/');assert.equal(c.campaign_source,'google');assert.equal(c.campaign_medium,'cpc');assert.equal(c.campaign_name,'Wigilia');
  assert.ok(!JSON.stringify(c).includes('private@example'));
});
test('CRM receives anonymous IDs only with analytics consent',async()=>{
  const f=fixture({analytics:true,marketing:false});const body=new URLSearchParams({email:'private@example.invalid'});
  await f.w.BAROWO_prepareLead(body);assert.equal(body.get('analytics_consent'),'yes');assert.equal(body.get('ga_client_id'),'1234.5678');assert.equal(body.get('ga_session_id'),'5678');
  const no=fixture({marketing:true,analytics:false});await no.w.BAROWO_prepareLead(body);assert.equal(body.get('analytics_consent'),'no');assert.equal(body.get('ga_client_id'),null);
});
test('blocked Analytics times out without blocking a lead',async()=>{
  const f=fixture({analytics:true},{blocked:true});const body=new URLSearchParams();const start=Date.now();
  await f.w.BAROWO_prepareLead(body);assert.ok(Date.now()-start<1500);assert.equal(body.get('ga_client_id'),null);
});
test('revocation during identifier retrieval is respected before submission',async()=>{
  const f=fixture({analytics:true},{delayed:true}),body=new URLSearchParams();const pending=f.w.BAROWO_prepareLead(body);
  f.choose('reject');f.callbacks.forEach(fn=>fn());await pending;assert.equal(body.get('analytics_consent'),'no');assert.equal(body.get('marketing_consent'),'no');assert.equal(body.get('ga_client_id'),null);
});
test('only a newly saved CRM lead is counted once; spam/duplicates/errors are excluded',()=>{
  const f=fixture({analytics:true,marketing:true}),body=new URLSearchParams({source:'website',traffic_channel:'google_organic',email:'private@example.invalid'});
  for (const status of ['accepted','merged','spam']) f.w.BAROWO_trackLead({ok:true,status,uid:'deadbeef'},'Formularz',body);
  f.w.BAROWO_trackLead({ok:false,status:'created',uid:'deadbeef'},'Formularz',body);
  f.w.BAROWO_trackLead({ok:true,status:'created'},'Formularz',body);assert.equal(f.events('generate_lead').length,0);
  f.w.BAROWO_trackLead({ok:true,status:'created',uid:'deadbeef'},'Formularz',body);f.w.BAROWO_trackLead({ok:true,status:'created',uid:'deadbeef'},'Formularz',body);
  assert.equal(f.events('generate_lead').length,1);assert.equal(f.events('conversion').length,1);assert.equal(f.events('conversion')[0][2].transaction_id,'deadbeef');
  assert.ok(!JSON.stringify(f.events('generate_lead')).includes('private@example'));
});

async function submit(kind,response) {
  const f=fixture({analytics:true,marketing:true});let handler,posted;const statuses=[];
  const form={action:'https://relay.example.invalid/lead',reportValidity:()=>true,reset(){},addEventListener:(e,fn)=>{handler=fn;}};
  Object.assign(f.ctx,{contactForm:form,callbackForm:form,syncConsentState:()=>true,pageUrlField:null,referrerField:null,consentError:null,
    setFormStatus:type=>statuses.push(type),setSubmittingState(){},fillCallbackMeta(){},callbackSubmit:{},callbackSubmitLabel:'Wyślij',callbackConsent:null,
    markCallbackSubmitted(){},setCallbackStatus:type=>statuses.push(type),closeCallbackModal(){},
    FormData:class{forEach(fn){fn('TEST','name');fn('private@example.invalid','email');fn('yes','privacy_consent');}},
    fetch:async(u,init)=>{posted=init.body;if(response instanceof Error)throw response;return {ok:response.httpOk,json:async()=>response.payload};}});
  if(kind==='subpage_callback') {
    Object.assign(f.ctx,{form,fillMeta(){},setStatus:type=>statuses.push(type),submit:{},submitLabel:'Wyślij',markSubmitted(){},closeModal(){}});
    const asset=fs.readFileSync(new URL('../assets/callback-popup.js',import.meta.url),'utf8');
    vm.runInContext(asset.slice(asset.indexOf("form.addEventListener('submit', async function (event) {"),asset.lastIndexOf('\n})();')),f.ctx);
    await handler({preventDefault(){}});return {f,posted,statuses};
  }
  if(kind==='planner') {
    Object.assign(f.ctx,{validateStep:()=>true,currentStepIndex:0,endpoint:form.action,computeRecommendation:()=>({recommendedPackage:'Standard',recommendedBartenders:2}),
      buildLeadNote:()=>'',buildCustomerSummaryEmailData:()=>({}),deriveChocolateMode:()=>'',collectMetaFields:()=>({}),asArray:v=>Array.isArray(v)?v:[],
      state:{name:'TEST',phone:'600100200',email:'private@example.invalid',message:'Test',privacyConsent:true},els:{next:{},back:{}},setStatus:type=>statuses.push(type)});
    const asset=fs.readFileSync(new URL('../assets/wedding-planner.js',import.meta.url),'utf8');
    vm.runInContext(asset.slice(asset.indexOf('  async function submitPlanner() {'),asset.indexOf('\n  els.back.addEventListener("click"')),f.ctx);
    await f.ctx.submitPlanner();return {f,posted,statuses};
  }
  const start=html.indexOf(kind==='contact'?"contactForm.addEventListener('submit', async (event) => {":"callbackForm.addEventListener('submit', async (event) => {");
  const end=html.indexOf(kind==='contact'?'\n    }\n\n    const callbackModal':"\n    }\n\n    document.addEventListener('click'",start);
  assert.ok(start>0 && end>start);vm.runInContext(html.slice(start,end),f.ctx);await handler({preventDefault(){}});return {f,posted,statuses};
}
for (const kind of ['contact','callback','subpage_callback','planner']) {
  test(`${kind}: confirmed CRM lead carries identifiers and emits one event`,async()=>{
    const r=await submit(kind,{httpOk:true,payload:{ok:true,status:'created',uid:'deadbeef'}});
    assert.equal(r.posted.get('ga_client_id'),'1234.5678');assert.equal(r.f.events('generate_lead').length,1);assert.equal(r.f.events('conversion').length,1);assert.ok(r.statuses.includes('success'));
  });
  for (const [name,response] of [['HTTP error',{httpOk:false,payload:{ok:true}}],['CRM error',{httpOk:true,payload:{ok:false}}],['network error',new Error('offline')]])
    test(`${kind}: ${name} never counts a lead`,async()=>{const r=await submit(kind,response);assert.equal(r.f.events('generate_lead').length,0);assert.equal(r.f.events('conversion').length,0);assert.ok(r.statuses.includes('error'));});
}

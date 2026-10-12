import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';
const env={APPS_SCRIPT_WEBHOOK_URL:'https://crm.example.invalid/exec'};
const request=()=>new Request('https://relay.example.invalid/lead?format=json',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({name:'TEST',analytics_consent:'yes',ga_client_id:'1234.5678'})});
const original=globalThis.fetch;

test('Worker waits for the CRM commit and forwards its UID',async()=>{
  let finish,settled=false,forwarded;
  globalThis.fetch=async(url,init)=>{forwarded=new URLSearchParams(init.body);return new Promise(resolve=>{finish=resolve;});};
  try {
    const result=worker.fetch(request(),env,{waitUntil(){assert.fail('lead intake must await CRM');}}).then(r=>{settled=true;return r;});
    await new Promise(resolve=>setImmediate(resolve));assert.equal(settled,false);assert.equal(forwarded.get('ga_client_id'),'1234.5678');
    finish(new Response(JSON.stringify({ok:true,status:'created',uid:'deadbeef'})));assert.deepEqual(await (await result).json(),{ok:true,status:'created',uid:'deadbeef',redirect_url:'https://barowo.com/#contact'});
  } finally {globalThis.fetch=original;}
});
for(const [name,body,status] of [['CRM validation',{ok:false},200],['upstream HTTP',{ok:true,status:'created',uid:'deadbeef'},500],['missing UID',{ok:true,status:'created'},200],['unconfirmed acceptance',{ok:true,status:'accepted'},200],['invalid JSON','not-json',200]])
test(`Worker rejects ${name}`,async()=>{
  globalThis.fetch=async()=>new Response(typeof body==='string'?body:JSON.stringify(body),{status});
  try {const r=await worker.fetch(request(),env,{waitUntil(){}});assert.equal(r.status,502);assert.equal((await r.json()).ok,false);}finally{globalThis.fetch=original;}
});
test('merged and spam outcomes preserve their status for frontend exclusion',async()=>{
  for(const status of ['merged','spam']) {
    globalThis.fetch=async()=>new Response(JSON.stringify({ok:true,status,uid:status==='merged'?'deadbeef':''}));
    try {const r=await worker.fetch(request(),env,{waitUntil(){}});assert.equal((await r.json()).status,status);}finally{globalThis.fetch=original;}
  }
});
test('an enquiry merged into an imported CRM lead keeps its legacy identifier',async()=>{
  globalThis.fetch=async()=>new Response(JSON.stringify({ok:true,status:'merged',uid:'meta_123456789012345'}));
  try{const r=await worker.fetch(request(),env,{waitUntil(){}});assert.equal(r.status,200);assert.equal((await r.json()).uid,'meta_123456789012345');}finally{globalThis.fetch=original;}
});

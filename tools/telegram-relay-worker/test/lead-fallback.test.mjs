import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { retryQueuedLeads } from '../src/index.js';

const original = globalThis.fetch;
function kv() {
  const m = new Map();
  return { m, put: async (k, v) => { m.set(k, v); }, get: async k => m.get(k) ?? null, delete: async k => { m.delete(k); },
    list: async ({ prefix }) => ({ keys: [...m.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })) }) };
}
const env = (extra = {}) => ({ APPS_SCRIPT_WEBHOOK_URL: 'https://crm.example.invalid/exec', TELEGRAM_BOT_TOKEN: 'T', TELEGRAM_GROUP_CHAT_ID: '-100', LEAD_QUEUE: kv(), ...extra });
const lead = (extra = {}) => new Request('https://relay.example.invalid/lead?format=json', { method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ name: 'Anna <b>', email: 'anna@x.pl', privacy_consent: 'on', event_date: '12.06.2027', ...extra }) });

test('CRM outage: the lead is kept in KV, posted to the group and the visitor sees success', async () => {
  const e = env(), calls = [];
  globalThis.fetch = async (url, init) => { calls.push({ url: String(url), init });
    if (String(url).includes('api.telegram.org')) return new Response(JSON.stringify({ ok: true, result: { message_id: 77 } }));
    throw new Error('The operation was aborted due to timeout'); };
  try {
    const r = await worker.fetch(lead(), e, { waitUntil() {} });
    assert.equal(r.status, 200); const body = await r.json();
    assert.equal(body.ok, true); assert.equal(body.status, 'queued');
    const tg = calls.find(c => c.url.includes('sendMessage')); const text = JSON.parse(tg.init.body).text;
    assert.match(text, /Zgłoszenie awaryjne/); assert.match(text, /Anna &lt;b&gt;/); assert.match(text, /anna@x\.pl/);
    assert.equal(e.LEAD_QUEUE.m.size, 1);
    const stored = JSON.parse([...e.LEAD_QUEUE.m.values()][0]);
    assert.equal(stored.telegramId, 77); assert.match(new URLSearchParams(stored.params).get('submission_id'), /^[a-f0-9]{32}$/);
  } finally { globalThis.fetch = original; }
});

test('the cron retry adds the queued lead with the same submission id and confirms in the group', async () => {
  const e = env(); const sentIds = [];
  await e.LEAD_QUEUE.put('lead:abc', JSON.stringify({ params: new URLSearchParams({ name: 'Ola', email: 'o@x.pl', privacy_consent: 'on', submission_id: 'abcabcabc1', response: 'json' }).toString(), attempts: 0, telegramId: 5 }));
  globalThis.fetch = async (url, init) => {
    if (String(url).includes('api.telegram.org')) { const b = JSON.parse(init.body); sentIds.push(b); return new Response(JSON.stringify({ ok: true, result: { message_id: 6 } })); }
    assert.equal(new URLSearchParams(init.body).get('submission_id'), 'abcabcabc1');
    return new Response(JSON.stringify({ ok: true, status: 'created', uid: 'deadbeef' })); };
  try {
    const result = await retryQueuedLeads(e);
    assert.equal(result.added, 1); assert.equal(e.LEAD_QUEUE.m.size, 0);
    assert.match(sentIds[0].text, /jest już w CRM/); assert.equal(sentIds[0].reply_parameters.message_id, 5);
  } finally { globalThis.fetch = original; }
});

test('a still-failing CRM keeps the lead and counts attempts', async () => {
  const e = env();
  await e.LEAD_QUEUE.put('lead:x', JSON.stringify({ params: 'name=A&email=a%40x.pl&privacy_consent=on&submission_id=xxxxxxxx1', attempts: 0 }));
  globalThis.fetch = async (url) => String(url).includes('telegram') ? new Response('{"ok":true,"result":{"message_id":1}}') : new Response('oops', { status: 500 });
  try { await retryQueuedLeads(e); assert.equal(JSON.parse(e.LEAD_QUEUE.m.get('lead:x')).attempts, 1); } finally { globalThis.fetch = original; }
});

test('a rejected form or a bot submission is never queued', async () => {
  for (const [extra, reply] of [[{}, { ok: false, error: 'validation_failed' }], [{ company: 'bot' }, null]]) {
    const e = env();
    globalThis.fetch = async (url) => { if (String(url).includes('telegram')) assert.fail('no fallback'); if (!reply) throw new Error('down'); return new Response(JSON.stringify(reply)); };
    try { const r = await worker.fetch(lead(extra), e, { waitUntil() {} }); assert.equal(r.status, 502); assert.equal(e.LEAD_QUEUE.m.size, 0); }
    finally { globalThis.fetch = original; }
  }
});

test('/wypisz shows a confirmation page after the CRM records the unsubscribe', async () => {
  let asked;
  globalThis.fetch = async (url) => { asked = new URL(String(url)); return new Response(JSON.stringify({ ok: true, unsubscribed: true })); };
  try {
    const r = await worker.fetch(new Request('https://relay.example.invalid/wypisz?e=YUB4LnBs&t=tok'), env(), { waitUntil() {} });
    assert.equal(r.status, 200); assert.match(await r.text(), /Wypisano/);
    assert.equal(asked.searchParams.get('action'), 'unsubscribe'); assert.equal(asked.searchParams.get('t'), 'tok');
  } finally { globalThis.fetch = original; }
});

test('/mailing serves the panel and /mailing/api forwards the token to the CRM', async () => {
  const page = await worker.fetch(new Request('https://relay.example.invalid/mailing'), env(), { waitUntil() {} });
  assert.equal(page.status, 200); assert.match(await page.text(), /Mailing BAROWO/);
  let forwarded;
  globalThis.fetch = async (url, init) => { forwarded = new URLSearchParams(init.body); return new Response(JSON.stringify({ ok: true, contacts: [] })); };
  try {
    const token = 'a'.repeat(48);
    const r = await worker.fetch(new Request('https://relay.example.invalid/mailing/api', { method: 'POST', body: new URLSearchParams({ token, op: 'data', payload: '{}' }) }), env(), { waitUntil() {} });
    assert.equal((await r.json()).ok, true);
    assert.equal(forwarded.get('mailing_api'), '1'); assert.equal(forwarded.get('token'), token); assert.equal(forwarded.get('op'), 'data');
    const bad = await worker.fetch(new Request('https://relay.example.invalid/mailing/api', { method: 'POST', body: new URLSearchParams({ token: 'x', op: 'data' }) }), env(), { waitUntil() {} });
    assert.equal((await bad.json()).error, 'expired');
  } finally { globalThis.fetch = original; }
});

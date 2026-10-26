# BAROWO Telegram Relay Worker

Lightweight Cloudflare Worker that gives Telegram an instant `200 OK` webhook endpoint and forwards updates to the BAROWO Apps Script CRM.

The same Worker also exposes `/lead` for public website lead forms. Lead form POST requests return a fast accepted response and forward to Apps Script in the background, so visitors do not wait on CRM processing.

## Why this exists

Telegram retries aggressively when the direct Apps Script webhook responds with `302 Moved Temporarily`. A Worker fixes that by:

- receiving the Telegram webhook instantly
- returning `200 OK` immediately
- forwarding the update to Apps Script in the background

## Lead safety net (v46, 2026-10-26)

If the CRM does not confirm a website lead (timeout, HTTP error, broken reply), the Worker
keeps it in KV (`LEAD_QUEUE`, 7 days), posts it to the CRM Telegram group and tells the
visitor the enquiry was sent. A cron every 5 minutes retries with the same `submission_id`,
so the CRM never creates a duplicate; the group gets a confirmation when it is added.
`/wypisz` is the unsubscribe page for CRM mailings.

Requires Node 22 for wrangler: `npx -p node@22 -p wrangler@4 wrangler deploy`.

## Required secrets

- `APPS_SCRIPT_WEBHOOK_URL`
- `APPS_SCRIPT_RELAY_SECRET`
- `TELEGRAM_WEBHOOK_SECRET`
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_GROUP_CHAT_ID` (fallback messages)

## Local commands

```bash
npm install
npm run check
npm run deploy
```

## Cloudflare secrets

```bash
npx wrangler secret put APPS_SCRIPT_WEBHOOK_URL
npx wrangler secret put APPS_SCRIPT_RELAY_SECRET
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
```

## Telegram webhook

After deploy, point Telegram to your Worker URL and pass `secret_token=TELEGRAM_WEBHOOK_SECRET`.

# RemoteFlow

**Remote jobs for freshers. Worldwide.**

RemoteFlow collects remote and work-from-home opportunities from multiple job sources and filters them for fresher-friendly candidates.

## What it does

- 🎓 Focuses on fresher, entry-level, junior, graduate and internship roles
- 🌍 Collects worldwide remote opportunities
- 🚫 Filters obvious senior and experienced roles
- 🔁 Deduplicates jobs across sources
- 🗄️ Stores jobs in Supabase
- ⚡ Serves the website from the database
- 🔔 Sends a Telegram digest when genuinely new jobs are discovered
- 📱 Mobile-friendly interface

## Architecture

Job sources → Fresher filter → Deduplication → Daily Vercel Cron → Supabase → Website + Telegram alerts

## Environment variables

```
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` in the browser.

## Deployment

1. Run `supabase/schema.sql` in the Supabase SQL editor.
2. Configure the environment variables in Vercel.
3. Deploy the `main` branch.
4. The daily cron calls `/api/cron`.

## Notes

RemoteFlow is intentionally public and does not require user authentication.
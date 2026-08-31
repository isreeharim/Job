# Production Deployment

## 1. Install dependencies
`npm install`

## 2. Configure Supabase
Run `supabase/schema.sql` in the Supabase SQL editor.

## 3. Configure environment variables
Set these in your hosting provider:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- CRON_SECRET
- ALERT_MIN_SCORE

Never commit real secrets.

## 4. Deploy
Import this GitHub repository into Vercel. Set the environment variables for Production and deploy.

## 5. Verify
- Open `/`
- Check `/api/jobs`
- Check authentication at `/login`
- Verify the scheduled cron endpoint

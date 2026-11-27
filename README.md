# Wuzzy Arena
Local: `npm install`, copy `.env.example` to `.env`, run `supabase.sql` in Supabase, then `npm run scrape` and `npm run dev`.
Live: push to GitHub, enable Pages (Source: GitHub Actions), add the two Supabase secrets. The workflow in `.github/workflows/deploy.yml` refreshes stories and redeploys every 30 minutes.

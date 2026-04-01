# Weekly Ops Check-in

A Next.js + Supabase + Vercel app for weekly team check-ins across CGM, Shoe Tech, Chase, PFP, and Fitter teams.

---

## Step 1 — Set up the Supabase table

1. Go to https://supabase.com/dashboard and open your project
2. Click **SQL Editor** in the left sidebar
3. Click **New query**
4. Open the file `supabase-setup.sql` from this folder, copy the entire contents, paste into the editor
5. Click **Run**
6. You should see "Success. No rows returned." — the table is ready.

---

## Step 2 — Deploy to Vercel

### Option A — Deploy via GitHub (recommended)

1. Create a free account at https://github.com if you don't have one
2. Create a new repository (name it `ops-checkin` or anything you like)
3. Upload all the files from this folder to that repository
   - Click **Add file → Upload files** in GitHub
   - Drag the entire project folder contents in
   - Commit the files
4. Go to https://vercel.com and sign in with your GitHub account
5. Click **Add New → Project**
6. Select your `ops-checkin` repository
7. Vercel will auto-detect it as a Next.js project — leave all settings as-is
8. Before clicking Deploy, click **Environment Variables** and add:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://izridogmiqujwkjytuxz.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` = `sb_publishable_pZEQ1CLpPiGZC1fs_o86rQ_AT8fdJHc`
9. Click **Deploy**
10. In ~2 minutes you'll get a live URL like `ops-checkin.vercel.app`

### Option B — Deploy via Vercel CLI (if you have Node.js installed)

```bash
cd ops-checkin
npm install
npx vercel --prod
```

Follow the prompts. When asked about environment variables, add the two Supabase vars above.

---

## Step 3 — Share with your team

Copy the Vercel URL and share it with everyone. All submissions go to the same Supabase database, so the entire team sees the same History and Trends in real time.

---

## Making changes later

Come back to the Claude conversation where this was built and describe what you want changed. New fields, new team members, renamed metrics — everything can be updated and redeployed in minutes.

---

## Project structure

```
ops-checkin/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main app (all tabs)
│   ├── globals.css         # Global styles
│   └── api/checkins/
│       └── route.ts        # Supabase read/write API
├── components/
│   ├── MetricTable.tsx     # Metric rows with vs-last-week delta
│   └── TrendChart.tsx      # Chart.js line chart with toggles
├── utils/
│   ├── metrics.ts          # All metric definitions
│   └── supabase/
│       └── client.ts       # Supabase browser client
├── supabase-setup.sql      # Run this in Supabase SQL editor first
├── .env.local              # Supabase credentials (already filled in)
└── package.json
```

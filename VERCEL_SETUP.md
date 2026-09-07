# Deploying xmail to Vercel

## 1. Import the repo

Vercel → Add New → Project → import `systoai-design/xmail`. Framework, build
command and output directory are already set in `vercel.json`; leave the
detected values alone.

## 2. Environment variables

Set these for **Production, Preview and Development**. All five are public —
they ship inside the JavaScript bundle by design, so there is nothing secret
here. The values that must stay secret (the session signing key, the anchoring
wallet key, the Supabase service role key) live in Supabase, never in Vercel.

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://crqvsnwvwezchdxmknjy.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | the anon key from Supabase → Settings → API |
| `VITE_SUPABASE_PROJECT_ID` | `crqvsnwvwezchdxmknjy` |
| `VITE_KEY_REGISTRY_ADDRESS` | `0x1c9d3016fd775c1b35c02e418fa5866b0eaa45ff` |
| `VITE_MESSAGE_ANCHOR_ADDRESS` | `0xcf134d8c38552132a0ae105572597db26b73145a` |
| `VITE_ANCHOR_RELAYER` | `0xd5959d80fd9defa138c63745864c75bc4f3e5b71` |

`VITE_ANCHOR_RELAYER` has a correct default in code, so the build works without
it — but set it anyway, so moving the anchoring wallet later is a config change
rather than a code change.

Miss `VITE_MESSAGE_ANCHOR_ADDRESS` and the site still builds: `isDeployed`
turns false and every on-chain claim disappears from the UI. That is deliberate
— the site cannot advertise an anchor it has no address for — but it looks like
the blockchain features vanished, so check this one first if they do.

## 3. Domain

Point `xmail.today` at the Vercel project. Cloudflare currently fronts it, so
either set the Cloudflare DNS record to Vercel's target with proxy **off**
(grey cloud) while you verify, or move the nameservers to Vercel. Leaving the
orange cloud on during setup is the usual cause of a stuck domain verification.

## 4. After the first deploy

- Load `/inbox` directly, then hard-refresh it. If it 404s, the SPA rewrite in
  `vercel.json` is not being applied — that is the single most common broken
  Vite deploy.
- Connect a wallet and send yourself a message, then click "Verify against the
  chain".

## Known gap

There is no way to buy credits. Users get 25 on signup and then stop, while the
pricing page advertises tiers that cannot be purchased. Fine for a test group;
not a public launch.

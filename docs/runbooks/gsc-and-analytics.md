# Google Search Console + Analytics setup

## A. Google Search Console

1. Go to https://search.google.com/search-console.
2. Add property → **Domain property** (not URL prefix): `kloopik.com`. This covers both `www` and apex.
3. Verification method: DNS TXT record. Copy the TXT value Google gives you.
4. Cloudflare dashboard → kloopik.com zone → DNS → Records → Add TXT record:
   - Name: `@`
   - Content: `google-site-verification=...`
   - TTL: Auto
5. Back in GSC → Verify. Usually takes <60s.
6. **Submit sitemap:** GSC → Sitemaps → Add new sitemap → `sitemap-index.xml`. Submit.
7. Within 24–48h, GSC starts reporting.

## B. Google Analytics 4 (via GTM)

1. Go to https://analytics.google.com → Admin → Create property → `Kloopik`. Choose Web data stream for `https://www.kloopik.com`.
2. Note the Measurement ID (`G-XXXXXXXXXX`) — this goes into the `PUBLIC_GA4_ID` env var.
3. In GA4 → Admin → Property → Data Streams → click the stream → **Configure tag settings → Enable "Cookieless pings"** so the stream reports modeled data when consent is denied (requires Consent Mode v2, wired in Plan 1 Task 9).
4. Link GSC: GA4 → Admin → Product Links → Search Console → Link → pick the `kloopik.com` property.

## C. Google Tag Manager

1. Go to https://tagmanager.google.com → Create Account → `Kloopik`, Container name `www.kloopik.com`, target `Web`.
2. Note the container ID (`GTM-XXXXXXX`) — this goes into `PUBLIC_GTM_ID`.
3. Inside the container → Tags → New:
   - Name: `GA4 Configuration`
   - Tag type: Google Tag
   - Measurement ID: `G-...` (same as GA4 property).
   - Consent settings → "Requires additional consent" → add `analytics_storage` and `ad_storage`.
   - Trigger: **All Pages**.
4. Publish the container (top-right → Submit → name the version, publish).

## D. Cloudflare Web Analytics

1. Cloudflare dashboard → Analytics & Logs → Web Analytics → Add a site → `www.kloopik.com`.
2. Select "Automatic setup" if the domain is on Cloudflare (it is). Token is issued automatically; copy it into `PUBLIC_CF_ANALYTICS_TOKEN` in the Pages env vars.
3. The beacon is injected in `BaseLayout` in Plan 1 Task 10.

## E. Verify end-to-end

After the next deploy:

- Visit `https://www.kloopik.com/` in a private window.
- Dismiss consent banner → Accept.
- GA4 → Realtime → you should appear within ~30s.
- CF Web Analytics → page view appears within ~5 min regardless of consent.
- GTM → Preview mode → confirms GA4 Configuration fired after consent.

## F. Ongoing

- Monthly: GSC → Performance → export top queries → feed editorial calendar.
- Monthly: GA4 → Engagement → Pages → identify best-performing games → consider pinning via `src/data/featured.ts`.

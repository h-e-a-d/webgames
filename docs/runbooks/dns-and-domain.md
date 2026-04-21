# DNS + domain setup

## Goal state

- `www.kloopik.com` → Cloudflare Pages deployment (canonical).
- `kloopik.com` → 301 redirect to `https://www.kloopik.com/` (apex rule).
- All HTTP → HTTPS (Cloudflare default).
- `CNAME` file in repo root preserved (Cloudflare Pages uses it to validate the custom domain binding).

## Steps

1. **Confirm Pages project exists.** In Cloudflare dashboard → Workers & Pages → `kloopik`. It was created in Plan 1 Task 15.

2. **Production branch.** Project → Settings → Builds & deployments → Production branch = `main`. Build command: `npm run build`. Build output: `dist`. Root directory: `/`.

3. **Environment variables (production + preview).** Project → Settings → Environment variables → add for both Production and Preview:

   | Key | Value |
   |---|---|
   | `PUBLIC_GTM_ID` | `GTM-XXXXXXX` (from Task 18) |
   | `PUBLIC_GA4_ID` | `G-XXXXXXXXXX` (from Task 18) |
   | `PUBLIC_CF_ANALYTICS_TOKEN` | token from Cloudflare Web Analytics → Add a site |
   | `PUBLIC_SITE_URL` | `https://www.kloopik.com` |
   | `NODE_VERSION` | `20` |

4. **Custom domain binding.**
   - Project → Custom domains → Add custom domain → `www.kloopik.com`. Cloudflare DNS auto-creates a CNAME.
   - Add a second domain → `kloopik.com`. Cloudflare creates an apex record.

5. **Apex → www redirect.**
   - Cloudflare dashboard → kloopik.com zone → Rules → Redirect Rules → Create rule:
     - When: Hostname equals `kloopik.com`
     - Then: Static redirect to `https://www.kloopik.com$1` (status 301, preserve query string).

6. **Verify.**
   - `curl -I https://www.kloopik.com/` → 200.
   - `curl -I https://kloopik.com/` → 301 `location: https://www.kloopik.com/`.
   - `curl -I http://kloopik.com/` → 301 to https.

7. **TLS.** Cloudflare issues a certificate automatically within ~60s of custom domain binding.

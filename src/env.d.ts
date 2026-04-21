/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly PUBLIC_GTM_ID: string;
  readonly PUBLIC_GA4_ID: string;
  readonly PUBLIC_CF_ANALYTICS_TOKEN: string;
  readonly PUBLIC_SITE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

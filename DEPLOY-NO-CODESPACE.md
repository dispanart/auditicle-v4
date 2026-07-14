# Deploy Auditicle V4.8 without Codespaces

Use GitHub in a normal browser and Cloudflare Dashboard. The complete Indonesian procedure is in `SETUP-FROM-ZERO-TO-LIVE-ID.md`.

## Build settings

```text
Repository root: /
Production branch: main
Build command: npm run build
Deploy command: npx wrangler deploy
```

The source deploys one Cloudflare Worker containing React/Vite Static Assets, `/api/*`, Browser Rendering through `BROWSER`, and the `AuditicleQuotaCoordinator` Durable Object.

## Required first-deploy checks

1. Confirm the deployment applies Durable Object migration tag `v1`.
2. Add Secrets only in Cloudflare.
3. Open `/api/health` and confirm version `4.8.0`.
4. Open `/api/public-config` and confirm launch limits without exposing secrets.
5. Keep `workers.dev` or any other staging hostname out of the index; the Worker automatically sends `X-Robots-Tag: noindex, nofollow` and staging robots disallow rules.
6. Test one Server HTML audit before testing Auto or Rendered Browser mode.

## Never upload

- `.dev.vars` or `.env`
- API keys or tokens
- `node_modules/`, `dist/`, or `.wrangler/`
- credential screenshots

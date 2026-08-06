# Deploy

Manual workflow: **Actions → Deploy → Run workflow**.

## What it does

1. Builds `frontend` and `backend` on Node 22.
2. Uploads build artifacts.
3. Creates a GitHub Release with those artifacts (default on).
4. Optionally POSTs provider deploy hooks when secrets are set.
5. Runs post-deploy health checks against configured URLs.

## Provider configuration

Repository secrets:

- `FRONTEND_DEPLOY_HOOK` – HTTPS deploy hook for the frontend (Render/Vercel/Netlify/etc.)
- `BACKEND_DEPLOY_HOOK` – HTTPS deploy hook for the backend

Repository variables:

- `FRONTEND_HEALTH_URL` – URL that must return HTTP 2xx after frontend deploy
- `BACKEND_HEALTH_URL` – URL that must return HTTP 2xx after backend deploy

If deploy hooks are missing, the workflow still succeeds when release creation is enabled (artifact release is the deploy result). If both release creation and provider deploy are disabled/unavailable, the workflow fails.

## Rollback

1. Open the previous successful **Deploy** release under Releases.
2. Either:
   - re-run **Deploy** from the prior commit/tag, or
   - restore the previous provider revision using that provider's rollback UI, or
   - download the previous release artifacts and redeploy them manually.
3. Confirm `FRONTEND_HEALTH_URL` / `BACKEND_HEALTH_URL` return healthy responses.

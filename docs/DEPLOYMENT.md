# Deployment

## Supported executable MVP target

The executable MVP is currently a **single Docker instance with one persistent volume** when run in an environment where data durability matters. SQLite and private CV uploads deliberately share that volume. Do not scale this topology horizontally.

```bash
docker build -t job-app .
docker run -d --name job-app \
  --restart unless-stopped \
  -p 3000:3000 \
  -v job-data:/app/data \
  --env-file .env \
  job-app
```

Put an HTTPS reverse proxy/load balancer in front of port 3000. Set `APP_ORIGIN=https://your-domain.example` and run `NODE_ENV=production`.

## Render test staging blueprint

`render.yaml` defines a **free, disposable test environment only**. It is not the target production architecture and must not be treated as durable storage.

The Blueprint uses:

- Docker runtime from the repository `Dockerfile`,
- Frankfurt region,
- one free web-service instance,
- deploy from `main` only after repository CI checks pass,
- HTTP health check at `/api/health`,
- SQLite at `/app/data/job.sqlite`,
- private uploads below `/app/data/uploads`,
- no persistent disk.

The application automatically uses Render's `RENDER_EXTERNAL_URL` as its same-origin security value when `APP_ORIGIN` is not explicitly set. A custom domain can still override it with `APP_ORIGIN`.

### Disposable-data rule

All Render staging state is intentionally disposable. A restart, redeploy, platform recycle or other lifecycle event may remove the SQLite database, accounts, applications and uploaded CV files. This is acceptable because Render is used only as a real-network execution test bed.

Do not use production credentials, irreplaceable data or real candidate CVs for this environment. Use synthetic/test accounts and fixtures. Data persistence is verified separately by repository backup/restore tests and will be designed again for the eventual production infrastructure.

### Staging acceptance sequence

After the service is created from the Blueprint, run the disposable automated smoke flow:

```bash
STAGING_URL=https://job-mvp-staging.onrender.com npm run smoke:staging
```

The smoke command checks health/legal surfaces, creates a temporary account with analytics disabled, exercises profile → Career Truth → job parser → Decision Engine → application → outcome → export, and then deletes the temporary account.

For each staging acceptance run:

1. confirm the deployed commit is the intended `main` revision,
2. confirm `/api/health` returns HTTP 200 and reports `database: "ok"`,
3. confirm the smoke command ends with `STAGING_SMOKE_OK` and `STAGING_SMOKE_CLEANUP_OK`,
4. exercise one browser flow from registration through Decision Card on mobile and desktop widths,
5. inspect recent service logs for uncaught errors,
6. confirm synthetic CV/raw job text is not emitted to product analytics or general logs,
7. treat any data remaining after the run as expendable and never use persistence across Render lifecycle events as an acceptance requirement.

The repository CI already exercises lint, strict TypeScript, migration validation, API/unit tests, semantic backup/restore to another filesystem root, Chromium E2E on desktop/mobile, production container build and container smoke test. Render staging is an additional real-host/network gate, not a replacement for CI.

## Health

`GET /api/health`

## Data lifecycle

For a durable single-instance Docker deployment outside disposable staging:

- SQLite: `/app/data/job.sqlite`
- private uploads: `/app/data/uploads/<user-id>/...`

Back up the full volume consistently. Before destructive database changes, snapshot the volume and verify restoration.

For Render test staging, those same paths live only on the service's ephemeral filesystem and are intentionally not a backup source.

## Migration to production-scale architecture

Before external beta on stateless/horizontally scaled hosting:

1. migrate schema to PostgreSQL,
2. move uploads to private S3-compatible storage,
3. replace in-process rate limiter with shared rate limiting,
4. connect managed error/analytics services,
5. configure payment provider and managed auth if selected,
6. run E2E against staging and then production smoke tests.

The free Render test target does **not** satisfy any production durability requirement by itself.

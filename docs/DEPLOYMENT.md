# Deployment

## Supported executable MVP target

The executable MVP is currently a **single Docker instance with one persistent volume**. SQLite and private CV uploads deliberately share that volume. Do not scale this topology horizontally.

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

## Render staging blueprint

`render.yaml` defines the canonical internal staging target:

- Docker runtime from the repository `Dockerfile`,
- Frankfurt region,
- one `0.5c-512mb` instance,
- deploy from `main` only after repository CI checks pass,
- HTTP health check at `/api/health`,
- 1 GB persistent disk mounted at `/app/data`,
- SQLite at `/app/data/job.sqlite`,
- private uploads below `/app/data/uploads`.

The application automatically uses Render's `RENDER_EXTERNAL_URL` as its same-origin security value when `APP_ORIGIN` is not explicitly set. A custom domain can still override it with `APP_ORIGIN`.

A persistent Render disk is required for this staging topology, so this is not a free-tier deployment. The disk-backed topology is acceptable only for the closed/internal MVP staging gate.

### Staging acceptance sequence

After the service is created from the Blueprint:

1. confirm `GET /api/health` returns HTTP 200,
2. register a fresh test account and verify required legal consent is enforced,
3. complete profile → Career Truth → pasted job → Decision Card → application → outcome,
4. upload a small allowed CV fixture and verify it remains private,
5. redeploy/restart the service and confirm the test account, application and upload still exist,
6. run `npm run backup:data`, restore into an isolated copy and verify the restored database opens,
7. inspect logs for uncaught errors and confirm no CV/raw job text is emitted to product analytics,
8. only then mark the internal staging gate as passed.

The repository CI already exercises lint, strict TypeScript, migration validation, API/unit tests, Chromium E2E on desktop/mobile, production container build and container smoke test. Staging is an additional environment-level gate, not a replacement for CI.

## Health

`GET /api/health`

## Data lifecycle

- SQLite: `/app/data/job.sqlite`
- private uploads: `/app/data/uploads/<user-id>/...`

Back up the full volume consistently. Before destructive database changes, snapshot the volume and verify restoration.

## Migration to production-scale architecture

Before external beta on stateless/horizontally scaled hosting:

1. migrate schema to PostgreSQL,
2. move uploads to private S3-compatible storage,
3. replace in-process rate limiter with shared rate limiting,
4. connect managed error/analytics services,
5. configure payment provider and managed auth if selected,
6. run E2E against staging and then production smoke tests.

The Render disk-backed staging target does **not** satisfy these external-beta production requirements by itself.

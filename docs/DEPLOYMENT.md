# Deployment

## Current supported target

A single Docker instance with persistent disk/volume is the supported target for the executable MVP implementation.

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

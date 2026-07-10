# Turbo remote cache (self-hosted S3)

Docker Compose stack for [ducktors/turborepo-remote-cache](https://github.com/ducktors/turborepo-remote-cache).

```powershell
cd scripts/turbo-remote-cache
Copy-Item env.example .env
# Edit .env — S3 credentials + TURBO_TOKEN
docker compose up -d
```

Full setup: [`docs/monorepo-build-ci-setup.md`](../../docs/monorepo-build-ci-setup.md) · [`docs/turbo-remote-cache-s3.md`](../../docs/turbo-remote-cache-s3.md) · `yarn setup:turbo-cache`

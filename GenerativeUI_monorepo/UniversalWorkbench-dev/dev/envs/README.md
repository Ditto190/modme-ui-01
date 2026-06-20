# Environment Configuration

This directory contains environment-specific configurations for deploying the application across different stages.

## Structure

```
envs/
├── dev/          # Development environment
├── stg/          # Staging environment
└── prd/          # Production environment
```

## Environment Pinning

Each environment pins specific versions of application packages:

```json
{
  "dependencies": {
    "@adaptiveworx/api": "0.1.0",
    "@adaptiveworx/web": "0.1.0",
    "@adaptiveworx/agent": "0.1.0"
  }
}
```

## Usage

### Local Development
```bash
# Use root .env file
yarn dev
```

### Deploy to Staging
```bash
cd envs/stg
cp .env.example .env
# Edit .env with staging credentials
yarn deploy
```

### Deploy to Production
```bash
cd envs/prd
cp .env.example .env
# Edit .env with production credentials
yarn deploy
```

## CI/CD Integration

GitHub Actions can use this structure for multi-environment deploys:

```yaml
strategy:
  matrix:
    env: [dev, stg, prd]
steps:
  - run: yarn workspaces focus envs/${{ matrix.env }}
  - run: cd envs/${{ matrix.env }} && yarn deploy
```

## Version Promotion

1. Test in dev: `@adaptiveworx/api@0.2.0`
2. Promote to stg: Update `envs/stg/package.json`
3. Validate staging
4. Promote to prd: Update `envs/prd/package.json`

This ensures controlled rollouts and easy rollbacks.

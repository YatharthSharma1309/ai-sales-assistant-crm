# Security

## What must stay local

Never commit these to GitHub (or any public repo):

| Item | Location |
|------|----------|
| API keys (OpenRouter, Resend, HubSpot, Google, Salesforce, etc.) | `packages/api/.env` |
| `JWT_SECRET`, `SECRETS_ENCRYPTION_KEY` | `packages/api/.env` |
| Database URLs with real credentials | `packages/api/.env` |
| Your personal admin email/password | Local DB only — pass via CLI args or `TEST_OWNER_*` env vars |

Copy `packages/api/.env.example` to `packages/api/.env` and fill in values locally. That file is gitignored.

## Safe to publish

- `.env.example` files — placeholders only, no real keys
- Demo login after `npm run seed:demo`: `demo@example.com` / `DemoPass123!` (intentional for walkthroughs)

## Dev scripts

| Script | Credentials |
|--------|-------------|
| `create-owner.mjs` | Requires email argument; use your own password on the command line |
| `smoke-features.mjs`, `test-auth-rate-limit.mjs` | Default to demo account; set `TEST_OWNER_EMAIL` / `TEST_OWNER_PASSWORD` for a different local user |

## If you accidentally committed a secret

1. **Rotate the key immediately** (OpenRouter, Resend, JWT secret, etc.).
2. Remove the file from the working tree and add it to `.gitignore`.
3. If the secret was pushed, consider [removing it from git history](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository) with `git filter-repo` or BFG, then force-push — or revoke the credential so the leaked value is useless.

## Reporting issues

For security concerns about this project, open a private issue or contact the repository owner directly.

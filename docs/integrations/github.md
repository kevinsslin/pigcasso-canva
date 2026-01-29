# GitHub (Repository → Asset)

Pigcasso uses **Privy GitHub OAuth** to fetch user repositories and generate a meme-style asset from repo context.

## 0) User flow (what “connected” means)

In the app (`/repositories`) there are two distinct states:

1. **Linked (Privy)**: your Privy account is linked to GitHub (identity only).
2. **Connected (Repo access)**: you have authorized GitHub scopes and the app stored OAuth tokens (encrypted) to fetch repos.

If you are “linked but not connected”, click **Authorize GitHub** to reauthorize and store tokens.

## 1) Privy setup

In the Privy dashboard:

- Enable **GitHub** as a login method / linked account
- Configure **GitHub OAuth Client ID / Secret**
- Add scopes:
  - `repo` (required to list **private** repos; public repos may work without it)
  - `read:user` (recommended)
  - `read:org` (recommended if you want to list org repos)

If you change scopes later, users must **reauthorize** GitHub (the UI has an “Authorize GitHub” button).

## 2) Database migration

This integration stores tokens in Postgres (`github_connection` table). Make sure you have run:

```bash
bun run db:migrate
```

## 3) Server env vars

This integration stores OAuth tokens in Postgres encrypted at rest. Set:

- `GITHUB_OAUTH_ENCRYPTION_KEY`

If missing, the API will respond with `500` and error code `MISSING_GITHUB_OAUTH_ENCRYPTION_KEY`.

Generate a new key (32 bytes, base64) with:

```bash
openssl rand -base64 32
```

Set it in `.env.local` (and Vercel project env vars). Keep it stable; changing it will invalidate previously stored tokens and users will need to reconnect GitHub.

## 4) Where it shows up in the app

- Dashboard: `/repositories`
- Editor sidebar: “Repositories”

## 5) Troubleshooting

### “Server misconfigured: Missing GITHUB_OAUTH_ENCRYPTION_KEY”
- Set `GITHUB_OAUTH_ENCRYPTION_KEY` in `.env.local` / Vercel env vars.
- Redeploy (server runtime must load the env var).

### Linked but cannot see repositories
Check, in order:

1. Scopes include `repo` (private) and `read:org` (org repos).
2. You clicked **Authorize GitHub** after adding/changing scopes.
3. If your repo is in an org: the org may require approving the OAuth app / SSO before it can access repos.

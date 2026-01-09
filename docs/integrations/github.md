# GitHub (Repository → Asset)

Pigcasso uses **Privy GitHub OAuth** to fetch user repositories and generate a meme-style asset from repo context.

## 1) Privy setup

In the Privy dashboard:

- Enable **GitHub** as a login method / linked account
- Configure **GitHub OAuth Client ID / Secret**
- Add scopes:
  - `repo` (required to list **private** repos; public repos may work without it)
  - `read:user` (recommended)

If you change scopes later, users must **reauthorize** GitHub (the UI has an “Authorize GitHub” button).

## 2) Server env vars

This integration stores OAuth tokens in Postgres encrypted at rest. Set:

- `GITHUB_OAUTH_ENCRYPTION_KEY`

If missing, the API will respond with `500` and error code `MISSING_GITHUB_OAUTH_ENCRYPTION_KEY`.

Generate a new key (32 bytes, base64) with:

```bash
openssl rand -base64 32
```

Set it in `.env.local` (and Vercel project env vars). Keep it stable; changing it will invalidate previously stored tokens and users will need to reconnect GitHub.

## 3) Where it shows up in the app

- Dashboard: `/repositories`
- Editor sidebar: “Repositories”


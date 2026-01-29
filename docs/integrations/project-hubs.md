# Project Hubs Integration

Project Hubs are **B2B-curated** “community asset hubs” (KAITO-style). A hub groups **public templates** (rows in `project` where `isTemplate=true` and `isPublicTemplate=true`) under a shared Project + category, so users can browse, remix, and climb leaderboards.

## Auth & Admin

**User endpoints** require Privy auth (handled automatically in the app).

**Admin endpoints** require an admin token header:

- Set `PROJECT_HUB_ADMIN_TOKEN` as a **server** env var (Vercel / `.env.local`).
- Send `x-admin-token: <PROJECT_HUB_ADMIN_TOKEN>` in requests.

If `PROJECT_HUB_ADMIN_TOKEN` is not configured, admin endpoints return `501`.

## Categories

Template categories (v1):

- `avatar`
- `sticker`
- `seasonal`
- `campaign`
- `other`

## API

**List hubs (auth required)**

- `GET /api/project-hubs?page=1&limit=20`

**Get hub (auth required)**

- `GET /api/project-hubs/:slug`

**Create hub (admin only)**

- `POST /api/project-hubs`

Body:

```json
{
  "slug": "mantle",
  "name": "Mantle",
  "description": "Community asset hub",
  "logoUrl": "https://...",
  "bannerUrl": "https://...",
  "websiteUrl": "https://...",
  "xUrl": "https://x.com/...",
  "discordUrl": "https://discord.gg/...",
  "telegramUrl": "https://t.me/...",
  "ownerId": null
}
```

**Update hub metadata (admin only)**

- `PATCH /api/project-hubs/:slug`

Body supports any subset of:

- `name`, `description`
- `logoUrl`, `bannerUrl`
- `websiteUrl`, `xUrl`, `discordUrl`, `telegramUrl`
- `ownerId`

**List templates in hub (auth required)**

- `GET /api/project-hubs/:slug/templates?page=1&limit=20`
- Optional: `&category=avatar`

**Assign template to hub + category (admin only)**

- `PATCH /api/project-hubs/:slug/templates/:templateId`

Body:

```json
{ "templateCategory": "avatar" }
```

**Unassign template from hub (admin only)**

- `DELETE /api/project-hubs/:slug/templates/:templateId`

**Project leaderboards (auth required)**

- `GET /api/project-hubs/:slug/leaderboards`

**Recent activity (auth required)**

- `GET /api/project-hubs/:slug/activity`

**Rewards (auth required)**

- `GET /api/project-hubs/:slug/rewards` (currently `{ comingSoon: true }`)
- `GET /api/project-hubs/:slug/rewards/airdrop.csv` (CSV export for top contributors)

## Example cURL (admin)

```bash
curl -X POST "https://YOUR_APP_URL/api/project-hubs" \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $PROJECT_HUB_ADMIN_TOKEN" \
  -d '{"slug":"mantle","name":"Mantle","description":"Community asset hub"}'
```

```bash
curl -X PATCH "https://YOUR_APP_URL/api/project-hubs/mantle/templates/TEMPLATE_ID" \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $PROJECT_HUB_ADMIN_TOKEN" \
  -d '{"templateCategory":"seasonal"}'
```

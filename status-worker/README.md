# zachle.info status monitor

Cloudflare Worker that checks zachle.info every 5 minutes, stores the
results in D1, and serves the history at `https://zachle.info/api/status`
for the site's `/status` page.

## Deploy

```sh
npx wrangler@4 login
npx wrangler@4 d1 create zachle-status        # copy the database_id into wrangler.toml
npx wrangler@4 d1 execute zachle-status --remote --file=schema.sql
npx wrangler@4 deploy
```

Optional: set `ORIGIN_URL` in `wrangler.toml` to the Pages project's
`*.pages.dev` address for a second row that bypasses the custom domain.

Free-tier usage: 288 cron runs and about 600 D1 row writes a day.
History is kept for 95 days. Only the monitor's own checks are stored.

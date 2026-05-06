# Astro GitHub Support Form

This is a small Astro SSR example that turns a website feedback form into GitHub Issues through a GitHub App installation token. It is configured for Cloudflare Workers.

It is intentionally simple:

- one Astro page with a native HTML form
- one API route at `POST /api/feedback`
- server-side GitHub App authentication through Octokit
- Cloudflare Turnstile verification before issue creation
- no client-side framework
- no secret committed to the repository

## GitHub App setup

Create a GitHub App with these settings:

- App name: `D4P Support Form Demo`
- Homepage URL: this repository URL
- Webhooks: inactive
- Repository permissions:
  - Metadata: read
  - Issues: read and write
- Installation: selected repositories only, then choose this repository

Generate a private key in the app settings and copy the app ID.

## Local setup

```bash
bun install
cp .dev.vars.example .dev.vars
```

Fill `.dev.vars` for local Cloudflare Workers development:

```bash
GITHUB_APP_ID=1234567
GITHUB_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

`GITHUB_OWNER`, `GITHUB_REPO`, and the production `TURNSTILE_SITE_KEY` are defined in `wrangler.jsonc` because they are not secrets. The example `.dev.vars` values use Cloudflare's dummy Turnstile keys for local development.

GitHub downloads GitHub App private keys as PKCS#1 PEM files. Cloudflare Workers needs a PKCS#8 PEM for this dependency stack. Convert the downloaded key before putting it in `.dev.vars` or Cloudflare secrets:

```bash
openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt \
  -in github-app.private-key.pem \
  -out github-app.private-key.pkcs8.pem
```

Then run:

```bash
bun run dev
```

Open `http://localhost:4321`, submit the form, and check the Issues tab in this repository.

## Cloudflare Workers deployment

The demo uses `@astrojs/cloudflare` and `wrangler.jsonc`.

Create a production Turnstile widget for your Workers domain, then replace `TURNSTILE_SITE_KEY` in `wrangler.jsonc`.

Set production secrets in Cloudflare:

```bash
CLOUDFLARE_ACCOUNT_ID=your-account-id bun x wrangler secret put GITHUB_APP_ID
CLOUDFLARE_ACCOUNT_ID=your-account-id bun x wrangler secret put GITHUB_PRIVATE_KEY
CLOUDFLARE_ACCOUNT_ID=your-account-id bun x wrangler secret put TURNSTILE_SECRET_KEY
```

`GITHUB_OWNER`, `GITHUB_REPO`, and `TURNSTILE_SITE_KEY` are public variables in `wrangler.jsonc`.

Deploy:

```bash
CLOUDFLARE_ACCOUNT_ID=your-account-id bun run deploy
```

## API contract

`POST /api/feedback` accepts JSON:

```json
{
  "type": "bug",
  "title": "Calendar export fails",
  "message": "I clicked Export and the request returned a 500 response.",
  "email": "reader@example.com",
  "environment": "Safari 18, macOS 15",
  "consent": true,
  "turnstileToken": "token-from-cf-turnstile-response",
  "company": ""
}
```

Successful response:

```json
{
  "ok": true,
  "referenceId": "SUP-ABC12345"
}
```

## Production notes

For a real support system, create issues in a private repository, add rate limiting, add an anti-spam challenge, decide what personal data you store, and document the retention policy in your privacy notice.

# Astro GitHub Support Form

This is a small Astro SSR example that turns a website feedback form into GitHub Issues through a GitHub App installation token.

It is intentionally simple:

- one Astro page with a native HTML form
- one API route at `POST /api/feedback`
- server-side GitHub App authentication through Octokit
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
cp .env.example .env
```

Fill `.env`:

```bash
GITHUB_APP_ID=1234567
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GITHUB_OWNER=design4pro
GITHUB_REPO=astro-github-support-form
```

Then run:

```bash
bun run dev
```

Open `http://localhost:4321`, submit the form, and check the Issues tab in this repository.

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

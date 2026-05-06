declare module "cloudflare:workers" {
  export const env: {
    GITHUB_APP_ID?: string;
    GITHUB_PRIVATE_KEY?: string;
    GITHUB_OWNER?: string;
    GITHUB_REPO?: string;
    TURNSTILE_SITE_KEY?: string;
    TURNSTILE_SECRET_KEY?: string;
  };
}

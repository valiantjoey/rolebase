# Rolebase Pages

Static hiring funnel pages, built and managed by Aurelia.

## Structure

```
clients/
  {client-slug}/          ← one Vercel project, one subdomain
    {role-slug}/          ← one hiring page
      index.html
      thankyou.html
      api/
        ghl.js
        sheets.js
    vercel.json           ← routing config (auto-generated)
    feedback.js
    robots.txt
```

## Subdomains

| Client | Subdomain | Vercel Project |
|--------|-----------|----------------|
| Fiacon | fiacon.rolebase.com.au | rolebase-fiacon |
| Hikari Electrical | hikari-electrical.rolebase.com.au | rolebase-hikari-electrical |

## Adding a new client

1. Aurelia builds to `clients/{client-slug}/` via the build pipeline
2. Commit + push to this repo
3. Vercel auto-deploys the affected client project
4. Subdomain assigned once at project creation

## Do not deploy manually

All deployments go through GitHub → Vercel. Do not run `vercel --prod` directly.

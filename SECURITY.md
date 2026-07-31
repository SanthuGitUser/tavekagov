# Security Policy

## Supported versions

Security fixes apply to the latest commit on the `main` branch.

## Reporting a vulnerability

If you discover a security issue in this repository (for example, a committed secret, unsafe dependency, or exploitable bug in the web app):

1. **Do not** open a public GitHub issue for sensitive reports.
2. Open a [GitHub Security Advisory](https://github.com/santhugituser/tavekagov/security/advisories/new) if you have access, or contact the repository owner via GitHub.
3. Include steps to reproduce, affected files, and potential impact.

We will acknowledge reports as soon as possible and work on a fix.

## What is not a security issue

The following are **expected behavior** for this project and are not treated as vulnerabilities:

- **Public government data** — Press releases, G.O.s, directories, and similar content scraped from official Tamil Nadu portals are intentionally public.
- **Missing or stale JSON** — Sync delays, empty daily files, or parsing errors are data-quality issues, not security bugs.
- **Third-party API keys in local `.env`** — As long as they are gitignored and not committed. Report immediately if a key appears in git history.

## Secrets and credentials

- Never commit `Sync-Config/.env`, `web/.env.local`, or API keys.
- Use GitHub Actions **repository secrets** for `NEWSDATA_API_KEY` only.
- Rotate any key that was accidentally committed, even if removed in a later commit.

## Dependencies

- Python: each `TN-*/requirements.txt` and `Sync-Config/requirements.txt`
- Node: `web/package-lock.json`

Report dependency vulnerabilities through GitHub Issues or Security Advisories with the affected package name and version.

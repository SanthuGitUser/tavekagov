# Git identity (SanthuGitUser only)

Use this if a second GitHub account (for example `IntQu-Santhosh`) appears on the repo **Contributors** list because the same personal email was verified on both accounts.

## Correct identity for this repo

| Setting | Value |
|---------|--------|
| `user.name` | `SanthuGitUser` |
| `user.email` | `302114104+SanthuGitUser@users.noreply.github.com` |

Enable **Keep my email private** on GitHub: [github.com/settings/emails](https://github.com/settings/emails)

## One-time fix (already applied locally)

Commit history was rewritten so author/committer email is the GitHub **noreply** address above instead of `smvmsd07@gmail.com`. That email is only linked to `SanthuGitUser`, so `IntQu-Santhosh` should drop off Contributors after the push and GitHub refreshes.

### Push rewritten history

From the repo root (requires GitHub auth):

```powershell
git push --force-with-lease origin main
```

### Remove email from the other GitHub account

1. Log in as **IntQu-Santhosh**
2. [Settings → Emails](https://github.com/settings/emails)
3. Remove `smvmsd07@gmail.com` if it is listed
4. Keep that email **only** on **SanthuGitUser**

## Future commits (this machine)

Set globally so Cursor and terminal use the same identity:

```powershell
git config --global user.name "SanthuGitUser"
git config --global user.email "302114104+SanthuGitUser@users.noreply.github.com"
```

This repo also sets `user.email` in `.git/config` (local override).

## Verify

```powershell
git log -1 --format="%an <%ae>"
git config user.name
git config user.email
```

Expected email: `302114104+SanthuGitUser@users.noreply.github.com`

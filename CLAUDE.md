# CLAUDE.md

Notes for Claude Code when working in this repo.

## Build notes — tools to consider

Reminders saved for when we build something new (not necessarily for this
static site, but for anything with a backend).

### Appwrite — open-source all-in-one backend

- Free, open-source developer platform: <https://github.com/appwrite/appwrite>
- Covers **user auth/logins, database storage, file uploads, and web hosting**
  in one place, instead of stitching together separate services for each.
- Self-hostable (Docker) or Appwrite Cloud. SDKs for web, mobile, and server.
- Consider it first when a project needs auth + data + file storage and we'd
  otherwise reach for several separate vendors.

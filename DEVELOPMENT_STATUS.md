# Job Board Development Status

Last inspected: 2026-09-05

## Architecture and stack

- Frontend: React 19, TypeScript, Vite 7, React Router, TanStack Query, Zustand, Axios, Tailwind CSS, and Radix-based UI under `Frontend/`.
- Backend: FastAPI under `Backend/`, using SQLAlchemy 2, Pydantic Settings, PostgreSQL/psycopg2, and Alembic.
- Authentication: Argon2 password hashing; short-lived JWT access tokens; Redis-backed, rotating JWT refresh tokens; email verification; Google OAuth through Authlib and signed Starlette sessions.
- Async email: FastAPI `BackgroundTasks` submit registration-confirmation, application, and status-update messages to the Brevo Transactional Email API over HTTPS.
- Files: private Cloudflare R2 storage for resumes, avatars, and company logos, accessed through AWS Signature V4 requests made by the backend.

## Production infrastructure

- Frontend: Render Static Site — <https://job-portal-frontend-02z5.onrender.com>
- Backend: Render FastAPI Web Service — <https://job-portal-full-stack-python-react.onrender.com>
- PostgreSQL: Neon.
- Redis: Upstash.
- Object storage: Cloudflare R2.
- Transactional email: Brevo Transactional Email API over HTTPS (SMTP and SendGrid are no longer used).
- Identity provider: Google OAuth.
- Render blueprint note: `render.yaml` declares the backend web service plus secret `BREVO_API_KEY` and `MAIL_FROM` variables. The frontend and all other required production variables are configured outside that file. No worker service is required by the current email implementation.

## Deployed and verified

- The frontend and backend are deployed and publicly reachable.
- On 2026-09-05 both public URLs returned HTTP 200. `GET /health` returned `{"status":"ok","database":"ok"}`.
- On 2026-09-05 the previously deployed Alembic migration chain was successfully applied to Neon using `Backend/myenv`. Production still reports `5a32b9f3c1a4`; the new company-authorization migration must be reviewed, backed up, and deployed separately.
- `FRONTEND_ORIGIN` has been changed to the exact production frontend origin, and backend CORS is restricted to that configured origin.
- The health check executes `SELECT 1`; it verifies database connectivity only and does not verify application tables or Alembic revision state.
- The frontend uses build-time `VITE_API_BASE_URL`; the backend uses environment-based database, public URL, CORS, Redis, R2, Brevo API, Google OAuth, JWT, and session configuration.

## Email delivery

- On 2026-09-05, email delivery was migrated from Celery/Brevo SMTP to FastAPI `BackgroundTasks` and Brevo's HTTPS transactional-email endpoint.
- Registration confirmation, application confirmation, and application-status messages retain their existing subjects and HTML content.
- Celery code and dependency were removed. `redis==6.4.0` is now an explicit dependency because Redis remains required for authentication and job caching.
- `BREVO_API_KEY` replaces the SMTP host/port/username/password settings. `MAIL_FROM` remains the verified sender setting. The API key is optional at application startup but email delivery logs a generic configuration failure if it is absent.
- `Backend/.env.example`, `render.yaml`, and the root README document the new settings without containing a secret value. The four obsolete SMTP entries were removed from the ignored local `Backend/app/.env`; no API key was invented or copied from the unrelated SMTP credential.
- The Brevo HTTPS implementation has been deployed, and production confirmation-email delivery has been verified. Render must retain a real transactional `BREVO_API_KEY` secret and a verified `MAIL_FROM` value.
- On 2026-09-05, successful first-time confirmation was changed to return an HTTP 303 redirect to `FRONTEND_ORIGIN/login`. Invalid/expired-token handling and the existing already-verified response remain unchanged. Verify this behavior after Render redeploys the commit.
- Previous diagnosis found two confirmation tasks stranded in the old Upstash Celery queue with no worker. The new implementation intentionally does not consume that obsolete queue; those short-lived confirmation tokens will expire.

## Security and production changes already implemented

- Public registration creates a normal user and rejects client-supplied `role` or `is_admin` fields.
- Recruiting access is derived from company membership. Job and applicant operations enforce company authorization in the backend; company owners retain all seeker features.
- Platform administration uses the separate database-backed `users.is_admin` flag and cannot be assigned through public APIs.
- Access/refresh JWTs use immutable user IDs in `sub`; current-user resolution reloads the user and rejects inactive or unverified accounts.
- Refresh tokens are stored in Redis, atomically rotated on refresh, and revoked on logout. The frontend coalesces concurrent refresh attempts and prevents retry loops.
- Passwords use Argon2. Login errors do not distinguish an unknown email from a bad password.
- CORS uses the configured production origin. OAuth session cookies become HTTPS-only in production.
- Local public media serving was removed. R2 object keys are kept backend-side; resumes use authorized download endpoints, while avatar/logo proxy endpoints expose file bytes without revealing keys.
- Environment files and upload directories are ignored, and no credential values belong in source control or this document.

## Resolved incident: production schema was missing

- Registration from the production frontend had returned HTTP 500, with Render reporting `psycopg2.errors.UndefinedTable: relation "users" does not exist`.
- Root cause was an unmigrated Neon schema. The existing migrations were applied successfully on 2026-09-05, and the expected tables now exist.
- Production registration and Brevo confirmation delivery now succeed. Confirmation redirect behavior needs verification after the latest Render redeploy.

## Alembic migration state

- Alembic reads the runtime `DATABASE_URL` through `Backend/alembic/env.py`; no database URL is stored in `alembic.ini`.
- The repository has one linear migration chain and one head:
  1. `f1dd740dd6e3` (base) creates `users`, `jobs`, and `applications` plus their indexes and foreign keys.
  2. `e15f18201c45` depends on the base revision but is empty (`pass`).
  3. `5a32b9f3c1a4` depends on the empty revision and creates `saved_jobs`.
  4. `8c91a7f24b6d` creates companies and memberships, migrates legacy employers/jobs/admins, and removes the old account-role/company columns; it is the repository head but is not yet deployed.
- On 2026-09-05 `python -m alembic upgrade head` ran successfully against the confirmed Neon target using `Backend/myenv`.
- Production currently reports `5a32b9f3c1a4`. Offline migration SQL generation reports the repository head as `8c91a7f24b6d`.
- Before migration, only the obsolete `SENDGRID_API_KEY` and `R2_TOKEN_VALUE` entries were removed from the ignored `Backend/app/.env`. No secret values were displayed or copied, and no migration files were changed.

## Service flows and configuration notes

- Registration/email: `POST /users/register` commits an unverified user and schedules `send_confirmation_email` through FastAPI `BackgroundTasks`. The task submits to Brevo over HTTPS; its link targets `BACKEND_PUBLIC_URL/auth/confirm`, which marks the user verified.
- Password auth: `POST /auth/login` requires a valid password plus active and verified user, returns access and refresh tokens, and allowlists the refresh token in Upstash. `POST /auth/refresh` verifies the JWT and database user, then atomically replaces the Redis key. `POST /auth/logout` deletes it. The frontend stores both tokens in `localStorage`, attaches the access token with Axios, and rotates tokens after a 401.
- Redis: Upstash backs the refresh-token allowlist/rotation/revocation and the 60-second public job-list cache. It is no longer part of email delivery. Job-cache invalidation now occurs on create, update, and delete.
- R2: uploads are extension-checked, limited to 8 MiB, assigned private `resumes/`, `avatars/`, or `logos/` keys, and sent directly to the R2 S3-compatible endpoint with Signature V4. Replaced objects and failed database writes trigger best-effort cleanup. Resume downloads require authorization; avatars/logos are public backend proxies.
- Google OAuth: the backend uses configured Google client credentials and `GOOGLE_REDIRECT_URI`, relies on SessionMiddleware for OAuth state, creates/verifies a local user, and issues the same JWT/Redis token pair. The current callback returns token JSON directly. The active frontend login/register pages do not provide Google OAuth buttons or a callback/token-storage flow, so end-to-end Google sign-in is not presently wired in the UI.

## Remaining production tasks

1. Back up Neon, rehearse `8c91a7f24b6d` against a production-shaped copy, and deploy the company migration with the matching backend/frontend release.
2. Verify legacy employer/admin/job migration and the new onboarding, recruiting, apply, and save flows in production.
3. Retest application-confirmation and application-status email delivery.
4. Test Upstash-backed job caching/token rotation and R2 upload/download/delete behavior in production.
5. Complete and test the frontend Google OAuth redirect/callback integration, and confirm the Google console permits the exact production callback URI.

## Recommended immediate next action

- Rehearse the company migration on a backup/branch, then register a normal user and verify both seeker activity and employer onboarding with the same account.
- Existing accounts whose confirmations were stranded in the former Celery queue cannot simply re-register with the same email and may need a future resend-confirmation flow or controlled cleanup.

## Warnings and handoff constraints

- Never print, copy into logs/docs, commit, or expose passwords, database/Redis URLs, API keys, access tokens, OAuth client secrets, SMTP credentials, session/JWT secrets, or R2 credentials.
- Do not make further `.env`, application-code, migration, database, deployment, commit, or push changes without explicit approval for that next step.
- Before any migration, identify the target database using non-secret metadata and take/confirm an appropriate Neon backup or recovery point.
- The frontend token store uses `localStorage`, which remains an XSS-sensitive design tradeoff.
- FastAPI `BackgroundTasks` are best-effort and have no durable queue or automatic retry. This is acceptable for the current free portfolio deployment but should be replaced with a managed queue/worker for stronger delivery guarantees.
- Local Git state at inspection: `main` was ahead of `origin/main` by 7 commits and behind by 8, and `DEVELOPMENT_STATUS.md` already had uncommitted user changes. Preserve work and reconcile history deliberately; do not reset or force-push.

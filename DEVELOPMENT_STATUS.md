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
- On 2026-09-05 the existing Alembic migration chain was successfully applied to Neon using `Backend/myenv`. Alembic now reports `5a32b9f3c1a4 (head)`, and `alembic_version`, `users`, `jobs`, `applications`, and `saved_jobs` were confirmed present.
- `FRONTEND_ORIGIN` has been changed to the exact production frontend origin, and backend CORS is restricted to that configured origin.
- The health check executes `SELECT 1`; it verifies database connectivity only and does not verify application tables or Alembic revision state.
- The frontend uses build-time `VITE_API_BASE_URL`; the backend uses environment-based database, public URL, CORS, Redis, R2, Brevo API, Google OAuth, JWT, and session configuration.

## Email delivery fix implemented locally

- On 2026-09-05, email delivery was migrated from Celery/Brevo SMTP to FastAPI `BackgroundTasks` and Brevo's HTTPS transactional-email endpoint.
- Registration confirmation, application confirmation, and application-status messages retain their existing subjects and HTML content.
- Celery code and dependency were removed. `redis==6.4.0` is now an explicit dependency because Redis remains required for authentication and job caching.
- `BREVO_API_KEY` replaces the SMTP host/port/username/password settings. `MAIL_FROM` remains the verified sender setting. The API key is optional at application startup but email delivery logs a generic configuration failure if it is absent.
- `Backend/.env.example`, `render.yaml`, and the root README document the new settings without containing a secret value. The four obsolete SMTP entries were removed from the ignored local `Backend/app/.env`; no API key was invented or copied from the unrelated SMTP credential.
- The change has not yet been deployed. Before deployment, set a real Brevo transactional API key as the secret `BREVO_API_KEY` in the Render backend environment and retain a verified `MAIL_FROM` value.
- Previous diagnosis found two confirmation tasks stranded in the old Upstash Celery queue with no worker. The new implementation intentionally does not consume that obsolete queue; those short-lived confirmation tokens will expire.

## Security and production changes already implemented

- Public registration permits only `seeker` and `employer`; administrator accounts cannot be self-registered.
- User, job, application, saved-job, and resume operations have server-side authentication, role, ownership, or job-owner checks as appropriate.
- Access/refresh JWTs use immutable user IDs in `sub`; current-user resolution reloads the user and rejects inactive or unverified accounts.
- Refresh tokens are stored in Redis, atomically rotated on refresh, and revoked on logout. The frontend coalesces concurrent refresh attempts and prevents retry loops.
- Passwords use Argon2. Login errors do not distinguish an unknown email from a bad password.
- CORS uses the configured production origin. OAuth session cookies become HTTPS-only in production.
- Local public media serving was removed. R2 object keys are kept backend-side; resumes use authorized download endpoints, while avatar/logo proxy endpoints expose file bytes without revealing keys.
- Environment files and upload directories are ignored, and no credential values belong in source control or this document.

## Resolved incident: production schema was missing

- Registration from the production frontend had returned HTTP 500, with Render reporting `psycopg2.errors.UndefinedTable: relation "users" does not exist`.
- Root cause was an unmigrated Neon schema. The existing migrations were applied successfully on 2026-09-05, and the expected tables now exist.
- Production registration still needs an end-to-end retest after deploying the HTTPS email change.

## Alembic migration state

- Alembic reads the runtime `DATABASE_URL` through `Backend/alembic/env.py`; no database URL is stored in `alembic.ini`.
- The repository has one linear migration chain and one head:
  1. `f1dd740dd6e3` (base) creates `users`, `jobs`, and `applications` plus their indexes and foreign keys.
  2. `e15f18201c45` depends on the base revision but is empty (`pass`).
  3. `5a32b9f3c1a4` depends on the empty revision, creates `saved_jobs`, and is the current head.
- On 2026-09-05 `python -m alembic upgrade head` ran successfully against the confirmed Neon target using `Backend/myenv`.
- `python -m alembic current` reports `5a32b9f3c1a4 (head)`. A separate read-only SQLAlchemy inspection confirmed `alembic_version`, `users`, `jobs`, `applications`, and `saved_jobs` exist.
- Before migration, only the obsolete `SENDGRID_API_KEY` and `R2_TOKEN_VALUE` entries were removed from the ignored `Backend/app/.env`. No secret values were displayed or copied, and no migration files were changed.

## Service flows and configuration notes

- Registration/email: `POST /users/register` commits an unverified user and schedules `send_confirmation_email` through FastAPI `BackgroundTasks`. The task submits to Brevo over HTTPS; its link targets `BACKEND_PUBLIC_URL/auth/confirm`, which marks the user verified.
- Password auth: `POST /auth/login` requires a valid password plus active and verified user, returns access and refresh tokens, and allowlists the refresh token in Upstash. `POST /auth/refresh` verifies the JWT and database user, then atomically replaces the Redis key. `POST /auth/logout` deletes it. The frontend stores both tokens in `localStorage`, attaches the access token with Axios, and rotates tokens after a 401.
- Redis: Upstash backs the refresh-token allowlist/rotation/revocation and the 60-second public job-list cache. It is no longer part of email delivery. Job-cache invalidation occurs on update, but not create/delete, so those changes may remain stale for up to 60 seconds.
- R2: uploads are extension-checked, limited to 8 MiB, assigned private `resumes/`, `avatars/`, or `logos/` keys, and sent directly to the R2 S3-compatible endpoint with Signature V4. Replaced objects and failed database writes trigger best-effort cleanup. Resume downloads require authorization; avatars/logos are public backend proxies.
- Google OAuth: the backend uses configured Google client credentials and `GOOGLE_REDIRECT_URI`, relies on SessionMiddleware for OAuth state, creates/verifies a local user, and issues the same JWT/Redis token pair. The current callback returns token JSON directly. The active frontend login/register pages do not provide Google OAuth buttons or a callback/token-storage flow, so end-to-end Google sign-in is not presently wired in the UI.

## Remaining production tasks

1. Create a Brevo transactional API key, store it only as `BREVO_API_KEY` in the Render backend environment, and confirm `MAIL_FROM` is a verified sender.
2. Deploy the backend email changes and retest new-user registration, confirmation delivery/link handling, verified-user login, application confirmation, and status-update delivery.
3. Test Upstash-backed job caching/token rotation and R2 upload/download/delete behavior in production.
4. Complete and test the frontend Google OAuth redirect/callback integration, and confirm the Google console permits the exact production callback URI.
5. Consider making migrations an explicit controlled release step rather than silently running them on every web startup.

## Recommended immediate next action

- Set `BREVO_API_KEY` in Render without exposing it, deploy the current backend changes, and register a new seeker or employer with a fresh email address. Confirm the user row is created, the background task receives a successful Brevo API response, and the confirmation link verifies the account.
- Existing accounts whose confirmations were stranded in the former Celery queue cannot simply re-register with the same email and may need a future resend-confirmation flow or controlled cleanup.

## Warnings and handoff constraints

- Never print, copy into logs/docs, commit, or expose passwords, database/Redis URLs, API keys, access tokens, OAuth client secrets, SMTP credentials, session/JWT secrets, or R2 credentials.
- Do not make further `.env`, application-code, migration, database, deployment, commit, or push changes without explicit approval for that next step.
- Before any migration, identify the target database using non-secret metadata and take/confirm an appropriate Neon backup or recovery point.
- The frontend token store uses `localStorage`, which remains an XSS-sensitive design tradeoff.
- FastAPI `BackgroundTasks` are best-effort and have no durable queue or automatic retry. This is acceptable for the current free portfolio deployment but should be replaced with a managed queue/worker for stronger delivery guarantees.
- Local Git state at inspection: `main` was ahead of `origin/main` by 7 commits and behind by 8, and `DEVELOPMENT_STATUS.md` already had uncommitted user changes. Preserve work and reconcile history deliberately; do not reset or force-push.

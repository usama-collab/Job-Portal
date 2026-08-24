# Job Board Development Status

## Project

- Frontend: React + Vite under `Frontend/`.
- Backend: FastAPI under `Backend/`, with SQLAlchemy/PostgreSQL, Alembic, Redis/Celery, Brevo SMTP, Cloudflare R2, and Google OAuth support.
- Deployment target: public free-tier portfolio deployment.
- No deployment, commit, push, or remote history replacement has been performed.

## Completed work

### Phase 1 — Configuration and build preparation

- Replaced frontend hard-coded backend URLs with `VITE_API_BASE_URL` where appropriate.
- Added a backend public URL setting for confirmation-email links.
- Redis client and Celery broker/backend use `REDIS_URL`, including `redis://` and `rediss://` URLs.
- Alembic reads `DATABASE_URL` from the environment.
- SQLAlchemy echo is environment-controlled and disabled by default.
- Added consistent backend/frontend environment examples without real credentials.
- Fixed TypeScript `@/*` alias resolution and kept TypeScript/Vite aliases consistent.
- Removed the genuinely unused `isEmployer` variable from `Profile.tsx`.
- Frontend TypeScript checks and `npm run build` pass, with only a non-blocking large-chunk warning.

### Phase 2 — Authentication and authorization hardening

- Public registration no longer permits `admin` or arbitrary roles; admin provisioning requires a protected mechanism.
- User, job, application, saved-job, and resume operations use authentication, role checks, and ownership checks.
- Application access and status changes are authorized through the application-to-job owner relationship.
- `get_current_user` validates the database user and inactive-user state.
- JWT access and refresh tokens use the immutable user ID in the `sub` claim.
- Refresh tokens use consistent Redis keys, existence validation, rotation, and logout revocation.
- Login failures are normalized without exposing whether an email exists.
- OAuth and password authentication remain compatible with the existing flow.

### Pydantic compatibility

- SQLAlchemy response schemas use Pydantic v2 `from_attributes=True` configuration.
- Existing API response shapes were preserved.

### Phase 3A — Private persistent file storage

- Replaced local filesystem upload writes with Cloudflare R2 S3-compatible object storage.
- Resumes, avatars, and logos use object-key namespaces rather than absolute URLs.
- Resume downloads require authenticated applicant, owning employer, or authorized admin access.
- Public resume access through `/media` was removed.
- Avatar and company-logo proxy endpoints remain available.
- R2 credentials are backend-only and are not exposed through frontend variables.
- Existing database path columns are interpreted as object keys; legacy local-file records require a deliberate migration or cleanup plan.

### Phase 3B — Production authentication/session hardening

- CORS uses the exact configured `FRONTEND_ORIGIN`; wildcard credentialed CORS was removed.
- OAuth session-cookie security is configurable for local HTTP development and production HTTPS.
- Frontend logout calls backend logout before clearing local state, while still completing local logout if the backend is unavailable.
- Axios integrates with `/auth/refresh`, prevents infinite retries, and coalesces simultaneous refresh requests.
- Refresh-token rotation and revocation remain backend-authoritative.

### Phase 4 — Production preparation

- Added production environment examples and runtime version declarations.
- Added Render configuration using `$PORT` and `/health`.
- Added Cloudflare Pages SPA fallback configuration.
- Added production database pooling settings including `pool_pre_ping=True` and disabled echo by default.
- Verified Alembic can read the cloud database URL from `DATABASE_URL`.
- Documented R2, Brevo SMTP, Redis/Celery, PostgreSQL, and frontend configuration requirements.
- Updated `.gitignore` to prevent uploaded media from being tracked.

### Phase 4B — Git privacy cleanup

- Removed the 15 tracked uploaded avatar/resume files from all reachable Git history in the rewritten clone.
- Confirmed no media/upload files remain tracked in the rewritten clone.
- Confirmed no unreachable objects containing the removed media remain after cleanup.
- Preserved application source, configuration, migrations, `.env.example`, and the newer remote README.
- The rewritten clone is ready for final human review but remains uncommitted and disconnected from any remote history replacement.

## Remaining deployment and security tasks

1. Complete human review of the rewritten clone, including the final uncommitted diff.
2. Review and commit the rewritten history and integrated Phase 1–4 changes.
3. Only after explicit approval, replace the remote history with the reviewed rewritten history using the repository's approved force-push procedure.
4. Configure production secrets and variables in the hosting providers; do not commit them.
5. Provision the production PostgreSQL database and run `alembic upgrade head` against it.
6. Configure Render, Cloudflare Pages, R2, Brevo SMTP, Redis, and OAuth redirect/callback settings.
7. Decide whether Celery is required for the deployed feature set; if retained, provision a separate worker process and Redis service.
8. Perform live integration tests for database migrations, authentication, refresh rotation, email, R2 uploads/downloads, OAuth, and cross-domain frontend/backend behavior.
9. Determine how legacy local upload records will be migrated or retired; do not claim migration until files are actually copied to R2.
10. Review the frontend large-chunk warning and establish monitoring, rate limiting, backups, and operational alerting as the project matures.

## Verification status

- Backend AST validation passes for the application Python files.
- Frontend TypeScript compilation and `npm run build` pass.
- Git media/history and secret-filename scans pass for the rewritten clone.
- Backend runtime import requires an existing environment with the pinned dependencies installed; packages have not been installed during repository cleanup.

## Working rules

- Do not reveal secrets or commit secret values.
- Do not install packages, deploy, commit, or push without explicit approval.
- Preserve unrelated worktree changes; do not reset, stash, or revert them.
- Keep resumes private and do not reintroduce tracked or public uploaded media.

# Jobify-Job-Board-App-React-FastAPI
This is a high-quality project to have on your GitHub. Since it features a modern tech stack (FastAPI, React, PostgreSQL, and TanStack Query), your description should highlight the "Full-Stack" nature and the complex features like JWT authentication and the dual-state (Applied/Saved) job tracking.

Jobify: Modern Full-Stack Job Board Platform
Jobify is a high-performance, real-time job portal designed to bridge the gap between employers and job seekers. Built with a focus on sleek UI/UX and a robust asynchronous backend, it provides a seamless experience for managing career opportunities.

🚀 Features
For Job Seekers
Intelligent Job Discovery: Browse and filter jobs with real-time search functionality.

Dual-State Tracking: Manage your career journey with dedicated tabs for Saved jobs and Applied positions.

Instant Applications: Apply for positions with integrated resume and cover letter uploads.

Personal Dashboard: Track application statuses (Under Review, Shortlisted, Hired) in real-time.

For Employers
Recruitment Suite: Create, update, and manage job postings through a dedicated employer dashboard.

Applicant Management: Review candidates, view resumes directly in-browser, and update application statuses with instant feedback.

Company-Based Access: Every account can use job-seeker features, while company ownership unlocks recruiting tools with backend-enforced authorization.

Employer Onboarding: Users create a separate company profile before posting jobs; company data and permissions are not stored as a self-selected account role.

🛠️ Tech Stack
Backend (The Engine)
FastAPI: Asynchronous Python framework for high-concurrency API performance.

SQLAlchemy & PostgreSQL: Robust relational data modeling with complex join logic for saved/applied states.

Alembic: Database migrations management.

JWT Authentication: Secure, stateless session management.

Frontend (The Interface)
React (Vite): Optimized frontend build for speed and developer experience.

TanStack Query (React Query): Advanced server-state management for caching and "optimistic" UI updates.

Tailwind CSS & Shadcn/UI: Modern, responsive design system.

Lucide React: Beautiful, consistent iconography.

## Email configuration

The backend submits confirmation, application, and application-status emails to the Brevo Transactional Email API over HTTPS using FastAPI background tasks. Configure these environment variables in local development and production:

- `BREVO_API_KEY`: Brevo API key with transactional-email access
- `MAIL_FROM`: verified sender address

Keep the API key in the hosting provider's secret environment settings and do not commit it.

## Google login and signup

Both auth pages offer **Continue with Google**. Google must return a validated OpenID identity with a verified email. An exact email match signs into the existing account, preserves its profile and password, and verifies its email; otherwise a verified account is created. Inactive accounts cannot sign in. Success opens `/jobs` with “Welcome back”. Google sign-in itself does not require additional provider-specific database columns.

For local development, configure the backend environment (loaded from `Backend/app/.env`) with `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, a strong `SESSION_SECRET`, and a working `REDIS_URL`. Set:

```dotenv
GOOGLE_REDIRECT_URI=http://localhost:8000/googleauth/google/callback
FRONTEND_ORIGIN=http://localhost:5173
APP_ENV=development
SESSION_COOKIE_SECURE=false
```

Set `VITE_API_BASE_URL=http://localhost:8000` in the frontend environment. In Google Cloud's OAuth web client, register this exact authorized redirect URI: `http://localhost:8000/googleauth/google/callback`. Configure the consent screen and test users if the app is in testing. Start from `http://localhost:5173`; do not mix `localhost` and `127.0.0.1`, because browser session storage and OAuth cookies depend on the host.

For a production deployment using `https://api.example.com` and `https://jobs.example.com`, use:

```dotenv
GOOGLE_REDIRECT_URI=https://api.example.com/googleauth/google/callback
FRONTEND_ORIGIN=https://jobs.example.com
APP_ENV=production
SESSION_COOKIE_SECURE=true
# Frontend build environment:
VITE_API_BASE_URL=https://api.example.com
```

Replace those example hosts with the deployed hosts, and register the resulting backend callback URL exactly in Google's authorized redirect URIs. The frontend `/auth/google/callback` is an internal landing page, not Google's registered callback. Configure the frontend host to serve the SPA for this route. Use HTTPS on both hosts and a stable secret shared across backend instances; production enables secure session cookies with SameSite=Lax. Rebuild the frontend when changing its API URL.

The backend redirects with a random code in the fragment, never access or refresh tokens. Redis holds it for 60 seconds. `POST /googleauth/exchange` requires `{ code, verifier }`, checks the SHA-256 browser challenge associated with OAuth state, atomically consumes the code, rechecks the account, and registers the issued refresh token. Redis must permit `GET`, `SETEX`, `DEL`, and `EVAL`. The initiating tab must retain session storage; failure or expiration offers a retry from login.

Automated checks mock Google and Redis. Once credentials are configured, manually check consent success with a new account, repeat login with the same account, login matching an existing password account, cancellation, and a delayed/expired callback. Confirm `/jobs`, the welcome notification, unchanged existing profile data, and that replaying an exchanged code fails. Repository configuration does not verify deployed credentials or consent-screen settings; these checks must also be performed against production separately.

## Password recovery

The standalone `/forgot-password` and `/reset-password` pages implement account-neutral password recovery. `POST /auth/forgot-password` accepts an email and always returns `202` with the same message for eligible and ineligible accounts. Active, verified accounts receive a one-time link through Brevo; the opaque token is carried in the URL fragment so it is not sent in HTTP requests or referrers. `POST /auth/reset-password` accepts the token and new password, consumes the Redis record, and returns the same `400` response for invalid, expired, used, or superseded links.

Redis is required for reset-token storage and the per-email fixed-window request limit. Only SHA-256-derived identifiers appear in Redis keys; raw reset tokens are never persisted. Configure `PASSWORD_RESET_TOKEN_EXPIRE_MINUTES` (default `15`), `PASSWORD_RESET_REQUEST_LIMIT` (default `3`), and `PASSWORD_RESET_RATE_WINDOW_SECONDS` (default `3600`) alongside `REDIS_URL`, `BREVO_API_KEY`, `MAIL_FROM`, and `FRONTEND_ORIGIN`.

Every issued access and refresh JWT contains the user's `auth_version`. A successful password reset or authenticated password update increments this version and immediately invalidates all earlier sessions. Tokens issued before this rollout without a version claim are treated as version `0` only while the user's database version is still `0`.

Before deploying backend code containing this feature, apply the database migration:

```bash
cd Backend
alembic upgrade head
```

The migration adds the non-null `users.auth_version` column with a server default of `0`. Confirm before deployment that no case-colliding duplicate email records exist, since recovery lookup is case-insensitive.

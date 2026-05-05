# HOPS Backend — Security Notes

This document records the security posture of the HOPS backend at the time of the `refactor/best-practice` baseline pass and the residual work that the team should plan as a follow-up engagement.

## Reporting a vulnerability

Email security findings to `security@hopsthailand.com` (or the equivalent internal channel). Do not file public GitHub issues for vulnerabilities.

## OWASP Top 10 (2021) — current status

| Category | Status | Notes |
| --- | --- | --- |
| **A01 Broken Access Control** | mitigated | `JwtAuthGuard` + `RolesGuard` + `Roles()` decorator. `BookingsService.ownerScope` constrains HOTEL_OWNER to their own properties. Continue to thread the same scope through every list/detail/mutation endpoint as new modules are added. |
| **A02 Cryptographic Failures** | mitigated | Bcrypt cost 12 for passwords. JWTs signed with HS256 and a secret enforced ≥ 32 chars in production. Cookies set `httpOnly`, `sameSite=lax`, and `secure` when `NODE_ENV=production`. |
| **A03 Injection** | mitigated | All persistence goes through Prisma's parameterised queries; no raw SQL is interpolated. DTO inputs are validated and sanitised (`whitelist`, `forbidNonWhitelisted`, `transform`). |
| **A04 Insecure Design** | mitigated | Forgot-password constant-time response prevents account enumeration. OTP flow forces user inactivation until verification. Booking codes use a 32-char alphabet with retry-on-collision rather than a predictable sequence. |
| **A05 Security Misconfiguration** | mitigated | `helmet` defaults applied. `X-Powered-By` suppressed by Helmet. `assertEnv` refuses to boot the app on missing/weak secrets. Container runs as non-root `node` user. |
| **A06 Vulnerable & Outdated Components** | partial | `npm audit` reports advisories in transitive `@nestjs/core@10`, `multer`, `file-type`, `lodash`. Resolution requires upgrading to NestJS 11 — a breaking change that should be planned as a separate engagement. |
| **A07 Identification & Authentication Failures** | mitigated | Per-route throttling: login 10/min, OTP 10/min, forgot-password 3/min, public registration 5/min. JWTs re-validated against the database on every request so deactivated users are immediately locked out. |
| **A08 Software & Data Integrity Failures** | mitigated | Lockfile committed (`package-lock.json`); CI should run `npm ci` rather than `npm install`. Container image built from official `node:20-alpine`. |
| **A09 Security Logging & Monitoring** | partial | `AllExceptionsFilter` writes one structured log line per failure. Add aggregated log shipping (Loki / CloudWatch / Datadog) and alerting on 5xx spikes as a follow-up. |
| **A10 Server-Side Request Forgery** | not applicable | The backend does not currently perform outbound HTTP requests on behalf of the client. Re-evaluate when a webhook or remote-fetch feature is added. |

## Hardening landed in this baseline

- `helmet` middleware (HSTS, X-Frame, X-Content-Type-Options, Referrer-Policy, …).
- `@nestjs/throttler` registered as global guard (120 req/min) plus per-route tighter limits on every credential and OTP endpoint.
- `assertEnv` boot-time gate: refuses to start without `DATABASE_URL`, `JWT_SECRET`, and (in production) `ALLOWED_ORIGINS`; rejects JWT secrets shorter than 32 characters in production.
- `JwtModule` and `JwtStrategy` now throw if `JWT_SECRET` is unset (no silent fallback to a hard-coded development key).
- Upload controller validates **both** extension and MIME type, generates filenames from a server-side UUID, and runs `path.basename` on the client-supplied name to defeat path-traversal payloads.
- Global `AllExceptionsFilter` produces a uniform JSON error envelope and avoids leaking stack traces to the wire.
- Cookie `secure` flag is automatically gated on `NODE_ENV=production`.
- Dockerfile drops privileges to the non-root `node` user and adds an HTTP healthcheck.
- `.gitignore` revised so user-uploaded files in `public/uploads/` are no longer tracked.

## Recommended pen-test plan

The following plan was scoped against this codebase. It assumes a staging environment that mirrors production (same image, same env shape, isolated DB):

1. **Authenticated and unauthenticated reconnaissance.** Run `nuclei` against the public origin with the default templates; expect Helmet headers and HTTPS-only responses.
2. **Authentication brute force.** Hit `/auth/login`, `/auth/guest/login` and `/auth/forgot-password` with throttler-aware tooling (e.g. `ffuf` with `-rate 5/s`). Verify the throttler returns `429` after the documented quota.
3. **OTP enumeration.** Burst the `/auth/guest/verify-otp` endpoint with random 6-digit codes against a known refCode; confirm the throttler caps it and that an invalidated OTP cannot be reused.
4. **Account-enumeration timing.** Time `/auth/forgot-password` against valid vs invalid emails; both paths must return `200 OK` in indistinguishable time (constant-time response is in place; verify under load).
5. **IDOR sweep.** With a HOTEL_OWNER token, walk `/properties/:id`, `/properties/:id/rooms`, `/bookings/:id`, `/transport/:id` with ids known to belong to **another** owner. Expect `403`/`404`.
6. **JWT manipulation.** Strip the signature, swap `alg` to `none`, swap `sub` to a SUPER_ADMIN id, replay an expired token; all must `401`.
7. **File upload abuse.** POST PHP/JSP polyglots with image extensions, oversize files, and multipart payloads with `..` in the filename. Confirm rejection by extension+MIME, size limit, and that filenames on disk are UUIDs.
8. **Mass assignment.** POST `/auth/register-request` and `/properties` with extra fields (e.g. `role: "SUPER_ADMIN"`). The global `ValidationPipe` whitelist is expected to strip them silently and `forbidNonWhitelisted` should reject when explicit.
9. **CORS bypass.** Issue cross-origin XHRs from a non-whitelisted origin; expect Express to reject with the documented error.
10. **Dependency review.** Run `npm audit --omit=dev` after every release. Track the NestJS 10 → 11 upgrade as a stand-alone hardening ticket.

External penetration testing should be commissioned at least once per major release. A representative scope-of-work is to budget two consultant-days for the API surface plus one consultant-day for the admin console.

## Known gaps to address in a follow-up engagement

1. **NestJS 10 → 11 upgrade.** Closes the advisories surfaced by `npm audit`.
2. **Refresh-token rotation.** The current 7-day access token is fine for the operator console (cookie is HTTP-only) but the mobile guest flow would benefit from short-lived access tokens with rotated refresh tokens stored in the platform secure storage.
3. **Audit log table.** Persist auth events (login success/fail, password change, role change, booking state transitions) to a write-only table for forensic review.
4. **Object storage for uploads.** Move `public/uploads/` to S3-compatible storage with signed URLs so a compromised app instance cannot enumerate every uploaded document.
5. **Dependency-review automation.** Add `npm audit --audit-level=high` (production deps only) to CI as a non-blocking warning for the team to triage weekly.

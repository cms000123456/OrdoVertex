# Changelog

All notable changes to OrdoVertex will be documented in this file.

## [Unreleased]

### Security
- Added webhook rate limiting (60 req/min per IP) to prevent abuse
- Added `app.set('trust proxy', 1)` for accurate client IP behind reverse proxies
- Added HTML escaping in email templates (alert, verification, password-reset)
- Wrapped unprotected `JSON.parse` calls in webhook-response and ai-agent nodes
- Wrapped credentials PUT and GET /types/list routes with `asyncHandler`

### Fixed
- Fixed integration test race conditions by splitting Jest configs (parallel unit vs sequential integration)
- Fixed `setup.ts` cleanup order: 18 tables deleted in dependency order (children before parents)
- Fixed graceful shutdown: HTTP server and BullMQ workers now close properly on SIGTERM/SIGINT
- Added Redis error/reconnect handlers to prevent unhandled exceptions
- Fixed `pyshell.end` callback type in code-sandbox (`any` → `unknown`)

### Changed
- Replaced all backend `catch (error: any)` with `catch (error: unknown)` + `getErrorMessage()`
- Replaced all frontend `catch (error: any)` (58 instances across 19 components) with `unknown` + helpers
- Added `getAxiosErrorData()` helper to frontend for safe axios error extraction
- Removed 26 debug `console.log` calls from frontend components
- Tightened `VaultSecret` type: `[key: string]: any` → `[key: string]: unknown`

### Testing
- Added frontend vitest setup with jsdom environment
- Added 11 frontend tests for `error-helper` utility
- Backend: 139 unit tests + 60 integration tests passing

## [1.0.0] - 2026-03-22

### Security
- Fixed SQL injection vulnerabilities in sql-database node (parameterized queries)
- Removed hardcoded JWT/encryption secrets; made env vars mandatory with startup validation
- Added SSRF protection (blocks localhost, private ranges, cloud metadata endpoints)
- Added XSS prevention (CSP headers, input sanitization)
- Fixed Python sandbox escape vulnerability (restricted imports, disabled file operations)
- Fixed SQL pool race condition in database node
- Added encrypted SMTP password storage (AES-256-GCM)
- Added MFA backup code rate limiting
- Removed dead passport-saml dependency (CVSS 10.0)
- Added code sandboxing: JavaScript in isolated VM, Python with import whitelist

### Changed
- Applied `asyncHandler` to all 18 route files (removed 100+ redundant try/catch blocks)
- Replaced `error: any` with `unknown` across routes, nodes, engine, and utilities
- Added `getErrorMessage()` helper for safe error extraction
- Added `validateEnvOrExit()` called before any imports in `index.ts` and `worker.ts`
- Replaced 186 `console.log` calls with Winston structured logging across 28 files

### Infrastructure
- Docker multi-stage builds with non-root users (`nodejs`, `nginx-user`)
- Frontend Vite 8 migration
- Reduced frontend bundle by 59% (683KB → 280KB initial JS)
- Lazy-loaded 18 components
- Added global ErrorBoundary

### Testing
- Initial backend test suite: 23 integration tests covering 51/66 routes

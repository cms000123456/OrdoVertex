# OrdoVertex Security Report

**Date:** 2026-03-22  
**Version:** 1.0.0  
**Classification:** Internal

---

## Executive Summary

This report documents the security posture of the OrdoVertex workflow automation platform. The platform implements multiple security layers including encryption, authentication, and access controls. Recent improvements have addressed key vulnerabilities related to information disclosure, SSRF attacks, and missing security headers.

### Risk Assessment: **MODERATE**

| Category | Rating | Notes |
|----------|--------|-------|
| Authentication | ✅ Good | JWT with 24h expiry, bcrypt password hashing |
| Authorization | ⚠️ Moderate | Role-based access implemented, needs audit |
| Data Protection | ✅ Good | AES-256-GCM encryption for credentials |
| Input Validation | ⚠️ Moderate | Some validation, code execution risk exists |
| Infrastructure | ⚠️ Moderate | Missing security headers (now fixed) |

---

## Security Measures Implemented

### 1. Authentication & Authorization

| Feature | Implementation | Status |
|---------|----------------|--------|
| Password Hashing | bcrypt (10 rounds) | ✅ Active |
| JWT Tokens | 24-hour expiration | ✅ Active |
| API Key Auth | Database-backed with tracking | ✅ Active |
| Role-based Access | Admin/User roles | ✅ Active |
| Rate Limiting | Auth: 5/15min, API: 120/min | ✅ Active |
| 2FA Support | TOTP via speakeasy | ✅ Available |

**Files:** `backend/src/utils/auth.ts`, `backend/src/utils/rate-limit.ts`

### 2. Data Encryption

| Feature | Algorithm | Status |
|---------|-----------|--------|
| Credential Storage | AES-256-GCM | ✅ Active |
| Encryption Key | SHA-256 derived, 32+ chars required | ✅ Active |
| Data at Rest | PostgreSQL + encrypted credentials | ✅ Active |
| Data in Transit | HTTPS (production) | ⚠️ Config-dependent |

**Files:** `backend/src/utils/encryption.ts`

### 3. Network Security

| Feature | Implementation | Status |
|---------|----------------|--------|
| CORS | Configurable origins | ✅ Active |
| Security Headers | Helmet.js (newly added) | ✅ **FIXED** |
| Rate Limiting | Per-IP tracking | ✅ Active |
| SSRF Protection | URL validation (newly enhanced) | ✅ **FIXED** |
| Request Size Limit | 10MB | ✅ Active |

**Files:** `backend/src/index.ts`, `backend/src/utils/security.ts`

### 4. Recent Security Fixes (2026-03-22)

#### ✅ Quick Win #1: Security Headers (Helmet.js)
**Problem:** Missing security headers left application vulnerable to XSS, clickjacking, and MIME sniffing attacks.

**Solution:** Added Helmet.js middleware with:
- Content Security Policy (CSP)
- HSTS (1 year, includeSubDomains, preload)
- X-Frame-Options: DENY (clickjacking protection)
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin

**Code:**
```typescript
app.use(helmet({
  contentSecurityPolicy: { /* strict CSP rules */ },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  xFrameOptions: { action: 'deny' },
  // ... additional headers
}));
```

#### ✅ Quick Win #2: Error Sanitization
**Problem:** Error messages in production exposed internal system details (file paths, stack traces, database errors).

**Solution:** Created `sanitizedErrorHandler` middleware that:
- Logs detailed errors server-side for debugging
- Returns generic error messages to clients in production
- Preserves full error details in development mode

**Code:** `backend/src/utils/security.ts`

#### ✅ Quick Win #3: SSRF Protection Enhancement
**Problem:** HTTP Request node could potentially access internal services and cloud metadata endpoints.

**Solution:** Enhanced URL validation to block:
- Private IP ranges (10.x, 172.16-31.x, 192.168.x)
- Localhost variants (127.x, ::1, localhost)
- Link-local addresses (169.254.x)
- Cloud metadata endpoints (169.254.169.254, metadata.google.internal)

**Code:**
```typescript
if (isInternalUrl(url)) {
  throw new Error('Access to internal addresses is not allowed');
}
```

**Files:** `backend/src/utils/security.ts`, `backend/src/nodes/actions/http-request.ts`

---

## Security Checklist

### ✅ Implemented

- [x] Password hashing (bcrypt)
- [x] JWT authentication with expiration
- [x] API key authentication
- [x] CORS configuration
- [x] Rate limiting (auth + API)
- [x] Encryption at rest (AES-256-GCM)
- [x] SQL injection prevention (parameterized queries)
- [x] Security headers (Helmet.js)
- [x] Error message sanitization
- [x] SSRF protection
- [x] Input validation for identifiers
- [x] Request size limits

### ⚠️ Partial/Needs Attention

- [ ] Code execution sandboxing (JavaScript/Python Code nodes)
- [ ] Webhook signature verification
- [ ] Automatic HTTPS enforcement
- [ ] Redis-backed rate limiting (for multi-instance deployments)
- [ ] Content Security Policy refinements for inline scripts

### ❌ Not Implemented

- [ ] WAF (Web Application Firewall)
- [ ] Audit logging for all admin actions
- [ ] Automatic security scanning (dependency checks)
- [ ] Penetration testing schedule

---

## Known Risks

### 🔴 High Risk

#### 1. Code Injection (JavaScript/Python Code Nodes)
**Risk:** Users can execute arbitrary code within the workflow engine context.

**Current Mitigation:**
- Limited sandbox for JavaScript (restricted globals)
- Python runs in separate process via PythonShell

**Gap:** Not true isolation - Buffer and some Node.js APIs are available in JS sandbox.

**Recommendation:** 
- Implement vm2 or isolated-vm for JavaScript
- Use Docker containers for Python execution
- Add admin approval for workflows containing code nodes

**Priority:** HIGH

### 🟡 Medium Risk

#### 2. In-Memory Rate Limiting
**Risk:** Rate limiting store is in-memory and doesn't persist across restarts or scale across instances.

**Impact:** Users could bypass rate limits by hitting different server instances or waiting for a restart.

**Recommendation:** Migrate to Redis-backed rate limiting.

**Priority:** MEDIUM

#### 3. Webhook Security
**Risk:** Webhooks don't verify signatures or origins, making them vulnerable to:
- Replay attacks
- Unauthorized triggering
- Data injection

**Recommendation:** 
- Add optional webhook signature verification
- Implement webhook IP allowlisting
- Add webhook activity logging

**Priority:** MEDIUM

### 🟢 Low Risk

#### 4. Information Disclosure via Timing
**Risk:** Response timing differences could leak information about user existence.

**Mitigation:** Currently low impact - not a primary concern.

---

## Environment Security Requirements

### Production Deployment Checklist

```bash
# Required Environment Variables
JWT_SECRET="minimum-32-characters-long-random-string"
ENCRYPTION_KEY="minimum-32-characters-long-random-string"
CORS_ORIGIN="https://your-domain.com"
NODE_ENV="production"

# Optional but Recommended
HTTPS_CERT_PATH="/path/to/cert.pem"
HTTPS_KEY_PATH="/path/to/key.pem"
DISABLE_HTTPS="false"
AUTH_RATE_LIMIT_MAX="5"
AUTH_RATE_LIMIT_WINDOW_MS="900000"  # 15 minutes
API_RATE_LIMIT_MAX="120"
API_RATE_LIMIT_WINDOW_MS="60000"    # 1 minute
```

### Validation

Use the built-in security validator:

```typescript
import { validateSecurityEnv } from './utils/security';

const issues = validateSecurityEnv();
if (issues.length > 0) {
  console.error('Security configuration issues:', issues);
  process.exit(1);
}
```

---

## Penetration Testing Guide

### Areas to Test

1. **Authentication Bypass**
   - JWT manipulation
   - Session fixation
   - Token expiration handling

2. **Authorization Bypass**
   - Horizontal privilege escalation (access other users' data)
   - Vertical privilege escalation (user → admin)
   - Workspace isolation violations

3. **Injection Attacks**
   - SQL injection (SQL Database node)
   - Command injection (Code nodes)
   - Template injection (expression resolution)

4. **SSRF**
   - Internal service access via HTTP node
   - Cloud metadata endpoint access
   - File protocol handling

5. **Data Exposure**
   - Credential decryption
   - Execution log access
   - Error message information leakage

### Test Commands

```bash
# Test SSRF protection
curl -X POST http://localhost:3001/api/workflows \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"test","nodes":[{"type":"httpRequest","parameters":{"url":"http://169.254.169.254/latest/meta-data/"}}]}'

# Expected: Error - "Access to internal addresses is not allowed"

# Test error sanitization
curl http://localhost:3001/api/nonexistent-endpoint-that-causes-error
# Expected: Generic error message, no stack trace
```

---

## Security Contacts & Incident Response

### Reporting Security Issues

1. **DO NOT** create public GitHub issues for security vulnerabilities
2. Email security concerns to: [security@yourorganization.com]
3. Include:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Incident Response Plan

1. **Detection:** Monitor logs for suspicious activity
2. **Containment:** Disable affected workflows/users
3. **Investigation:** Review access logs and execution history
4. **Remediation:** Patch vulnerability
5. **Recovery:** Restore services with fixes applied
6. **Lessons Learned:** Update security measures

---

## Recommendations Summary

### Immediate Actions (This Week)

1. ✅ **DONE:** Add Helmet.js security headers
2. ✅ **DONE:** Implement error sanitization
3. ✅ **DONE:** Enhance SSRF protection
4. Review and set strong `JWT_SECRET` and `ENCRYPTION_KEY` in production
5. Enable HTTPS in production deployment

### Short-term (Next Month)

1. Implement webhook signature verification
2. Add audit logging for admin actions
3. Set up automated dependency vulnerability scanning (Dependabot/Snyk)
4. Conduct internal penetration testing

### Long-term (Next Quarter)

1. Implement true code sandboxing (isolated-vm / Docker)
2. Migrate to Redis-backed rate limiting
3. Implement WAF rules
4. Third-party security audit

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-03-22 | Added Helmet.js, error sanitization, SSRF protection | Security Audit |
| 2026-03-15 | Fixed template expression resolution | Dev Team |
| 2026-03-10 | Added execution logging with data truncation | Dev Team |
| 2026-03-01 | Initial security baseline established | Dev Team |

---

**Next Review Date:** 2026-06-22 (Quarterly)

**Document Owner:** Security Team / DevOps

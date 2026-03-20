# Security Policy

## Supported Versions

The following versions of OrdoVertex are currently supported with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please follow these steps:

### 1. Do Not Open a Public Issue

Security vulnerabilities should **NOT** be reported through public GitHub issues. This helps prevent exposing the vulnerability to malicious actors before a fix is available.

### 2. Report Privately

Please report security vulnerabilities by emailing: **security@ordovertex.dev** (or create a private security advisory on GitHub if enabled)

Include the following information:
- **Description**: Clear description of the vulnerability
- **Impact**: What could an attacker accomplish?
- **Steps to Reproduce**: Detailed steps to reproduce the issue
- **Affected Versions**: Which versions are affected?
- **Suggested Fix**: If you have one (optional)
- **Your Contact**: How to reach you for follow-up questions

### 3. Response Timeline

We will respond to security reports within **48 hours** and aim to:

| Phase | Timeline |
|-------|----------|
| Initial Response | 48 hours |
| Assessment Complete | 7 days |
| Fix Released | 30 days (critical), 90 days (high) |

### 4. Disclosure Policy

We follow **responsible disclosure**:

1. We acknowledge receipt of your report
2. We investigate and confirm the vulnerability
3. We develop and test a fix
4. We release the fix and credit you (if desired)
5. We publicly disclose the vulnerability after 30 days or when a fix is widely adopted

## Security Measures

OrdoVertex implements the following security measures:

### Authentication & Authorization
- JWT-based authentication with configurable expiry (default: 24h)
- Role-based access control (RBAC): Admin, User
- Multi-factor authentication (MFA/TOTP) support
- SAML SSO integration

### Data Protection
- AES-256-GCM encryption for credentials
- Parameterized queries to prevent SQL injection
- Input validation and sanitization on all endpoints
- No hardcoded secrets - all secrets must be provided via environment variables

### Network Security
- CORS origin restrictions in production
- Rate limiting: 5 auth attempts per 15 minutes, 120 API requests per minute
- SSRF protection - internal IPs blocked
- HTTPS required for production (deployer responsibility via reverse proxy)

### Audit & Monitoring
- Full execution logging
- Audit trail for all workflow changes
- Security event logging

## Automated Security Scanning

This repository uses automated security scanning:

- **Dependabot**: Daily checks for outdated dependencies with security vulnerabilities
- **GitHub Actions**: 
  - `npm audit` on every push and PR
  - CodeQL static analysis
  - Trivy container vulnerability scanning
  - Secret scanning
- **Weekly Schedule**: Full security scan every Monday at 9 AM UTC

## Security Best Practices for Deployers

When deploying OrdoVertex in production:

### Required Configuration
1. **Generate strong secrets**:
   ```bash
   openssl rand -base64 32  # For JWT_SECRET
   openssl rand -base64 32  # For ENCRYPTION_KEY
   ```

2. **Configure CORS**: Set `CORS_ORIGIN` to your exact domain(s)

3. **Use HTTPS**: Set up nginx/traefik reverse proxy with TLS 1.2+

4. **Restrict file watch directories**: Set `ALLOWED_WATCH_DIRECTORIES`

5. **Keep dependencies updated**:
   ```bash
   cd backend && npm audit fix
   cd frontend && npm audit fix
   ```

### Infrastructure Security
- Run behind a reverse proxy (nginx/traefik)
- Do not expose PostgreSQL or Redis ports publicly
- Use network segmentation (Docker networks)
- Enable automated backups
- Set up monitoring and alerting

## Security Updates

Security updates are released as:

- **Critical**: Emergency patches, released immediately
- **High**: Released within 7 days
- **Moderate**: Released within 30 days
- **Low**: Bundled with next regular release

Subscribe to GitHub releases or watch this repository to be notified of security updates.

## Acknowledgments

We thank the following security researchers who have responsibly disclosed vulnerabilities:

*No vulnerabilities have been reported yet. Be the first!*

## License

This security policy is part of the OrdoVertex project and is released under the MIT License.

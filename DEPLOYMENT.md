# Production Deployment Guide

This guide covers deploying OrdoVertex to production. The application code is secure and ready - you only need to configure environment variables and set up a reverse proxy for HTTPS.

## Prerequisites

- Docker & Docker Compose
- Domain name (e.g., `ordovertex.yourcompany.com`)
- Server with ports 80 and 443 available

---

## Step 1: Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Generate secure secrets
openssl rand -base64 32  # Copy output to JWT_SECRET
openssl rand -base64 32  # Copy output to ENCRYPTION_KEY

# Edit the .env file
nano .env
```

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | JWT signing key (32+ chars) | `abc123...` |
| `ENCRYPTION_KEY` | Credential encryption key (32+ chars) | `xyz789...` |
| `DB_PASSWORD` | PostgreSQL password | `YourStrongDBPass` |
| `CORS_ORIGIN` | Your frontend domain | `https://ordovertex.yourcompany.com` |

---

## Step 2: Deploy Application

```bash
# Start production services
docker-compose -f docker-compose.prod.yml up -d

# Verify all containers are running
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f api
```

At this point, the application is running on:
- Frontend: http://localhost:3000 (internal only)
- API: http://localhost:3001 (internal only)

**Note:** These ports are bound to localhost only and are NOT exposed to the internet.

---

## Step 3: Configure HTTPS with Nginx

**This step is YOUR responsibility as the deployer.** The application does not handle HTTPS directly - you must use a reverse proxy.

### Quick Setup with Let's Encrypt

```bash
# Install nginx and certbot
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

# Copy the example nginx config
sudo cp nginx.example.conf /etc/nginx/sites-available/ordovertex

# Edit with your domain
sudo nano /etc/nginx/sites-available/ordovertex
# Change: server_name ordovertex.yourcompany.com;

# Enable the site
sudo ln -s /etc/nginx/sites-available/ordovertex /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d ordovertex.yourcompany.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### What the Nginx Config Does

The provided `nginx.example.conf` handles:
- ✅ **HTTPS/TLS 1.2+** encryption
- ✅ **HTTP to HTTPS redirect**
- ✅ **Rate limiting** (additional layer)
- ✅ **Security headers** (CSP, HSTS, XSS protection)
- ✅ **Gzip compression**
- ✅ **Request forwarding** to Docker containers

### Security Headers Included

```nginx
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'
```

---

## Step 4: Verify Deployment

```bash
# Check HTTPS is working
curl -I https://ordovertex.yourcompany.com

# Check API health
curl https://ordovertex.yourcompany.com/api/health

# Verify SSL certificate
openssl s_client -connect ordovertex.yourcompany.com:443 -servername ordovertex.yourcompany.com
```

---

## Step 5: Configure Backups (Optional but Recommended)

```bash
# Create backup script
cat > /opt/backup-ordovertex.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/backups/ordovertex

# Database backup
docker exec ordovertex-db pg_dump -U ordovertex ordovertex | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Cleanup old backups (keep 7 days)
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete
EOF

chmod +x /opt/backup-ordovertex.sh

# Add to crontab (daily at 2 AM)
echo "0 2 * * * /opt/backup-ordovertex.sh" | sudo crontab -
```

---

## Architecture Overview

```
Internet
    │
    ▼
┌─────────────┐
│   Nginx     │ ← HTTPS/TLS termination (your responsibility)
│  (Port 443) │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Docker    │
│  Network    │
│  (Internal) │
└──────┬──────┘
       │
   ┌───┴───┐
   ▼       ▼
┌──────┐ ┌──────┐
│Frontend│ │  API  │
│:3000  │ │:3001  │
└──────┘ └──────┘
   │       │
   └───┬───┘
       ▼
  ┌────────┐
  │PostgreSQL│
  │  Redis  │
  └────────┘
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs api

# Common issue: Missing secrets
# Error: "JWT_SECRET environment variable is required"
# Fix: Set JWT_SECRET in .env file
```

### Database Connection Failed

```bash
# Check database is healthy
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs postgres
```

### HTTPS Not Working

```bash
# Check nginx configuration
sudo nginx -t

# Check certbot certificates
sudo certbot certificates

# Check nginx error logs
sudo tail -f /var/log/nginx/error.log
```

---

## Security Checklist for Deployers

Before going live, verify:

- [ ] JWT_SECRET is set to a random 32+ character string
- [ ] ENCRYPTION_KEY is set to a different random 32+ character string
- [ ] DB_PASSWORD is strong and unique
- [ ] HTTPS is working (not HTTP)
- [ ] SSL certificate is valid
- [ ] Database is NOT exposed to internet (no port 5432 open)
- [ ] Redis is NOT exposed to internet (no port 6379 open)
- [ ] API port (3001) is bound to localhost only
- [ ] Backups are configured
- [ ] Monitoring is set up (optional but recommended)

---

## Support

- **Code Issues:** https://github.com/cms000123456/OrdoVertex/issues
- **Security:** See SECURITY_AUDIT.md
- **Documentation:** See README.md

---

**Remember:** HTTPS/TLS and reverse proxy configuration is YOUR responsibility as the deployer. The application provides example configurations, but you must implement them in your infrastructure.

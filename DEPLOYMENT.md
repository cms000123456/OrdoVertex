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

### Initial Admin User

**Development:** A default admin user is automatically created on first startup:
- **Email:** `admin@example.com`
- **Password:** `admin123`

**Production:** Set custom credentials via environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `ADMIN_EMAIL` | Admin user email | `admin@yourcompany.com` |
| `ADMIN_PASSWORD` | Admin user password | `StrongAdminPass123!` |

**Important:** 
- These variables are only used if no admin user exists
- Once an admin is created, these variables are ignored
- For production, always set strong custom credentials
- You can also create the first admin manually via Prisma Studio or SQL

### Rate Limiting (Optional)

Configure authentication rate limiting to prevent brute force attacks:

| Variable | Description | Default (Dev) | Default (Prod) |
|----------|-------------|---------------|----------------|
| `AUTH_RATE_LIMIT_MAX` | Max login attempts per window | 100 | 5 |
| `AUTH_RATE_LIMIT_WINDOW_MS` | Time window in milliseconds | 60000 (1 min) | 900000 (15 min) |

**Production Recommendation:** Leave unset to use strict defaults (5 attempts per 15 minutes).

**Development:** Defaults are more permissive (100 attempts per minute). Override if needed.

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

## Step 5: Create Admin User (If Not Done Automatically)

If you didn't set `ADMIN_EMAIL` and `ADMIN_PASSWORD` before starting the application, you can create the first admin user manually:

### Option 1: Using Prisma Studio (Recommended for First Setup)

```bash
# Access the database UI
docker-compose -f docker-compose.prod.yml exec api npx prisma studio

# Then open http://localhost:5555 in your browser
# 1. Click on "User" table
# 2. Create a new user or edit existing one
# 3. Set role to "admin"
```

### Option 2: Using SQL

```bash
# Connect to database
docker-compose -f docker-compose.prod.yml exec postgres psql -U ordovertex -d ordovertex

# Promote existing user to admin
UPDATE "User" SET role = 'admin' WHERE email = 'user@example.com';

# Or create new admin (password must be bcrypt hashed)
# First, generate a bcrypt hash using the API or a tool
```

### Option 3: API (After Registering a Regular User)

1. Register a regular user at `/api/auth/register`
2. Use Prisma Studio to change their role to `admin`
3. Subsequent users can be created/promoted via Admin UI

---

## Step 6: Data Storage & Backups

### Persistent Data Location

Data is stored in the `.data/` directory within the project folder:

```
ordovertex/
├── .data/
│   ├── postgres/    # PostgreSQL database files
│   └── redis/       # Redis data files
```

This directory is:
- ✅ Created automatically on first start
- ✅ Persisted across container restarts
- ✅ Included in `.gitignore` (not committed to git)
- ⚠️ Should be backed up regularly

### Backup Strategy

#### Option 1: Database Dump (Recommended)

```bash
# Create backup script
cat > /opt/backup-ordovertex.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/backups/ordovertex

# Create backup directory if not exists
mkdir -p $BACKUP_DIR

# Database backup
docker exec ordovertex-db pg_dump -U ordovertex ordovertex | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup .data directory (includes Redis)
tar -czf $BACKUP_DIR/data_$DATE.tar.gz -C /path/to/ordovertex .data/

# Cleanup old backups (keep 7 days)
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete
EOF

chmod +x /opt/backup-ordovertex.sh

# Add to crontab (daily at 2 AM)
echo "0 2 * * * /opt/backup-ordovertex.sh" | sudo crontab -
```

#### Option 2: Directory Backup

Simply backup the entire `.data/` directory:

```bash
# Manual backup
tar -czf ordovertex-backup-$(date +%Y%m%d).tar.gz .data/

# Restore
tar -xzf ordovertex-backup-20240320.tar.gz
```

### Restore from Backup

```bash
# Stop containers
docker-compose -f docker-compose.prod.yml down

# Restore .data directory
tar -xzf ordovertex-backup-20240320.tar.gz

# Or restore database only
docker-compose -f docker-compose.prod.yml up -d postgres
sleep 5
gunzip < backup.sql.gz | docker exec -i ordovertex-db psql -U ordovertex ordovertex

# Start all services
docker-compose -f docker-compose.prod.yml up -d
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

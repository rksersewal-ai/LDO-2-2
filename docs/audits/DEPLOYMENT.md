# LDO-2 EDMS Deployment Guide

**Enterprise Document Management System** — Complete stack setup for Windows LAN, IIS, Gunicorn, and Nginx deployments.

---

## Table of Contents

1. [Stack Architecture](#stack-architecture)
2. [Prerequisites](#prerequisites)
3. [Backend Setup (Django)](#backend-setup-django)
4. [Frontend Setup (React)](#frontend-setup-react)
5. [Database Setup (PostgreSQL)](#database-setup-postgresql)
6. [Windows IIS Deployment](#windows-iis-deployment)
7. [Linux Gunicorn + Nginx](#linux-gunicorn--nginx)
8. [Port Configuration](#port-configuration)
9. [SSL/TLS Setup](#ssltls-setup)
10. [Monitoring & Logs](#monitoring--logs)

---

## Stack Architecture

### Frontend
- **Framework**: React 18+ with Vite
- **Styling**: Tailwind CSS + Glassmorphism UI
- **Fonts**: DM Sans (body), IBM Plex Mono (code)
- **Port**: 4173 (production) / 5173 (dev)
- **Build**: `pnpm build` → `dist/` folder

### Backend
- **Framework**: Django 5.2 + Django REST Framework 3.16
- **Auth**: JWT (djangorestframework-simplejwt)
- **OCR**: Tesseract + PyMuPDF + Pillow
- **Port**: 8765 (Gunicorn)
- **Workers**: CPU count × 2 + 1 (default)

### Database
- **Engine**: PostgreSQL 18
- **Port**: 5432
- **Driver**: psycopg2

### Deployment Options
- **Windows LAN**: IIS + Backend Service
- **Linux Production**: Nginx reverse proxy + Gunicorn + PostgreSQL

---

## Prerequisites

### Windows System
```
Windows Server 2019 / 2022
- IIS 10+ enabled
- .NET Framework 4.7+
- Python 3.11+
- PostgreSQL 18
- Node.js 18+ (for frontend build)
```

### Linux System
```
Ubuntu 20.04+ / CentOS 8+
- Nginx 1.20+
- Python 3.11+
- PostgreSQL 18
- Node.js 18+ (for frontend build)
```

---

## Backend Setup (Django)

### 1. Environment Setup

Create `.env` file in backend root:

```env
# Django
SECRET_KEY=your-secret-key-generate-with-django-utils
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,edms.example.com

# Database
DB_ENGINE=django.db.backends.postgresql
DB_NAME=edms_db
DB_USER=postgres
DB_PASSWORD=secure_password
DB_HOST=localhost
DB_PORT=5432

# Auth
JWT_SECRET=your-jwt-secret-key
JWT_ALGORITHM=HS256
JWT_EXPIRY_HOURS=24

# OCR
TESSERACT_PATH=C:\Program Files\Tesseract-OCR\tesseract.exe  # Windows path
TESSERACT_PATH=/usr/bin/tesseract  # Linux path
OCR_ENABLED=True

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173,https://edms.example.com

# Email (for alerts & notifications)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@example.com
EMAIL_HOST_PASSWORD=app-password
DEFAULT_FROM_EMAIL=noreply@edms.example.com
```

### 2. Install Dependencies

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

pip install -r requirements.txt
```

### 3. Database Migrations

```bash
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser  # Admin user
```

### 4. Static Files & Media

```bash
python manage.py collectstatic --noinput
mkdir -p media/documents media/uploads media/ocr_results
```

### 5. Run Development Server

```bash
python manage.py runserver 0.0.0.0:8765
```

---

## Frontend Setup (React)

### 1. Install Dependencies

```bash
cd artifacts/edms
pnpm install
```

### 2. Environment Configuration

Create `.env` file in frontend root:

```env
VITE_API_BASE_URL=http://localhost:8765
VITE_API_TIMEOUT=30000
VITE_APP_TITLE=LDO-2 EDMS
VITE_ENABLE_OCR=true
VITE_MAX_UPLOAD_SIZE=104857600  # 100MB
```

For production:

```env
VITE_API_BASE_URL=https://edms.example.com/api
VITE_API_TIMEOUT=30000
VITE_APP_TITLE=LDO-2 EDMS
VITE_ENABLE_OCR=true
VITE_MAX_UPLOAD_SIZE=104857600
```

### 3. Development Server

```bash
pnpm dev
# Open http://localhost:5173
```

### 4. Production Build

```bash
pnpm build
# Output: dist/ folder (ready for deployment)

# Preview build locally
pnpm preview
```

---

## Database Setup (PostgreSQL)

### Windows Installation

1. Download PostgreSQL installer from https://www.postgresql.org/download/windows/
2. Run installer, set password for `postgres` user
3. Keep port 5432
4. Launch pgAdmin or psql client

### Create EDMS Database

```sql
-- Connect as postgres user first
psql -U postgres

-- Create database and user
CREATE DATABASE edms_db;
CREATE USER edms_user WITH PASSWORD 'secure_password';

-- Grant privileges
ALTER ROLE edms_user SET client_encoding TO 'utf8';
ALTER ROLE edms_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE edms_user SET default_transaction_deferrable TO on;
ALTER ROLE edms_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE edms_db TO edms_user;

-- Connect to database and grant schema permissions
\c edms_db
GRANT ALL ON SCHEMA public TO edms_user;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For full-text search
```

### Verify Connection

```bash
psql -U edms_user -d edms_db -h localhost
```

---

## Windows IIS Deployment

### 1. Install Required Components

Open PowerShell as Administrator:

```powershell
# Enable IIS with required modules
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServer
Enable-WindowsOptionalFeature -Online -FeatureName IIS-CommonHttpFeatures
Enable-WindowsOptionalFeature -Online -FeatureName IIS-Rewrite

# Install URL Rewrite module (for React SPA routing)
# Download from: https://www.iis.net/downloads/microsoft/url-rewrite
```

### 2. Create IIS Application Pool

In **IIS Manager**:

1. Right-click → **Add Application Pool**
2. Name: `EDMS-Frontend`
3. .NET CLR version: `No Managed Code` (for static files)
4. Managed pipeline mode: **Integrated**
5. **Start** the pool

### 3. Create Website

1. Right-click **Sites** → **Add Website**
2. Site name: `EDMS-Frontend`
3. Physical path: `C:\inetpub\wwwroot\edms\dist`
4. Binding: 
   - Type: `https`
   - IP: `All Unassigned`
   - Port: `443`
   - SSL certificate: (see [SSL Setup](#ssltls-setup))
5. Application pool: `EDMS-Frontend`
6. Click **OK**

### 4. Configure web.config

Copy the provided `web.config` to the website root (already in `artifacts/edms/web.config`):

```
C:\inetpub\wwwroot\edms\dist\web.config
```

This enables:
- React Router (SPA) URL rewriting
- Gzip compression
- Static file caching
- Security headers

### 5. Deploy Frontend Build

```bash
cd artifacts/edms
pnpm build
# Copy dist/* to C:\inetpub\wwwroot\edms\dist
```

### 6. Deploy Backend Service

Option A: **Windows Service with NSSM**

```bash
# Download NSSM from https://nssm.cc/download
nssm install EDMS-Backend "C:\Python311\python.exe" "C:\edms-backend\manage.py" "runserver" "0.0.0.0:8765"
nssm set EDMS-Backend AppDirectory "C:\edms-backend"
nssm set EDMS-Backend AppEnvironmentExtra DATABASE_URL=postgresql://user:pass@localhost:5432/edms_db
nssm start EDMS-Backend
```

Option B: **Task Scheduler**

1. Create task to run: `python manage.py runserver 0.0.0.0:8765`
2. Set to run at startup
3. Run as `edms_service` user (created with necessary permissions)

### 7. Check Port Status

Run `scripts/check_ports.bat`:

```batch
@echo off
echo [PORT 8765 - EDMS Backend]
netstat -ano | findstr :8765

echo [PORT 443 - HTTPS Frontend]
netstat -ano | findstr :443

echo [PORT 5432 - PostgreSQL]
netstat -ano | findstr :5432
```

---

## Linux Gunicorn + Nginx

### 1. Deploy Backend

```bash
# Create app directory
sudo mkdir -p /opt/edms-backend
sudo chown $USER:$USER /opt/edms-backend

# Clone/copy backend code
cp -r backend/* /opt/edms-backend/

# Create Python virtual environment
cd /opt/edms-backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
```

### 2. Set Up Gunicorn

Copy `gunicorn_config.py`:

```bash
cp backend/gunicorn_config.py /opt/edms-backend/
```

### 3. Create Systemd Service

Create `/etc/systemd/system/edms-backend.service`:

```ini
[Unit]
Description=LDO-2 EDMS Backend
After=network.target postgresql.service

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/opt/edms-backend
Environment="PATH=/opt/edms-backend/venv/bin"
ExecStart=/opt/edms-backend/venv/bin/gunicorn --config gunicorn_config.py
Restart=on-failure
RestartSec=10s

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable edms-backend
sudo systemctl start edms-backend
sudo systemctl status edms-backend
```

### 4. Deploy Frontend

```bash
# Build frontend
cd artifacts/edms
pnpm build

# Deploy
sudo mkdir -p /var/www/edms
sudo cp -r dist/* /var/www/edms/dist/
sudo chown -R www-data:www-data /var/www/edms
```

### 5. Configure Nginx

Copy `nginx.conf`:

```bash
sudo cp backend/nginx.conf /etc/nginx/sites-available/edms
sudo ln -s /etc/nginx/sites-available/edms /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # Disable default site

# Update domain in config
sudo sed -i 's/edms.example.com/your-domain.com/g' /etc/nginx/sites-available/edms
```

Test and enable:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## Port Configuration

| Service | Port | Protocol | Notes |
|---------|------|----------|-------|
| Frontend (Dev) | 5173 | HTTP | Vite dev server |
| Frontend (Prod) | 4173/443 | HTTP/HTTPS | IIS/Nginx |
| Backend | 8765 | HTTP | Gunicorn |
| PostgreSQL | 5432 | TCP | Local only |
| OCR Worker | (internal) | — | Async task queue |
| DSC Signer | 8000 | HTTP | Do NOT use (reserved) |

**Windows LAN Setup**:
- Frontend: https://edms-server.local:443 (IIS)
- Backend: http://edms-server.local:8765 (Django/Gunicorn)
- Database: localhost:5432 (PostgreSQL)

---

## SSL/TLS Setup

### Windows (Self-Signed for LAN)

```powershell
# Generate self-signed certificate valid for 10 years
$cert = New-SelfSignedCertificate -CertStoreLocation cert:\LocalMachine\My `
  -DnsName "edms-server.local" -FriendlyName "EDMS LAN" -NotAfter (Get-Date).AddYears(10)

# Export certificate
Export-PfxCertificate -Cert $cert -FilePath C:\edms.pfx -Password (ConvertTo-SecureString -String "password" -AsPlainText -Force)

# Import in IIS:
# 1. Open IIS Manager
# 2. Select server → Server Certificates
# 3. Import → Select edms.pfx → Enter password
# 4. Bind to HTTPS in website settings
```

### Linux (Let's Encrypt for production)

```bash
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot certonly --nginx -d edms.example.com

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Verify renewal
sudo certbot renew --dry-run
```

---

## Monitoring & Logs

### Backend Logs

**Windows**:
```
C:\edms-backend\logs\
```

**Linux**:
```bash
# Gunicorn logs
sudo tail -f /opt/edms-backend/logs/error.log
sudo tail -f /opt/edms-backend/logs/access.log

# Systemd logs
sudo journalctl -u edms-backend -f
```

### Frontend Logs

**Browser Console**: `F12` → Console tab (check for API errors)

**Nginx Access**: `sudo tail -f /var/log/nginx/edms_access.log`

### Database Logs

**PostgreSQL**:
```bash
# Windows
tail -f "C:\Program Files\PostgreSQL\18\data\pg_log\postgresql.log"

# Linux
sudo tail -f /var/log/postgresql/postgresql-18-main.log
```

### Health Checks

```bash
# Backend health
curl http://localhost:8765/health

# Frontend
curl https://edms.example.com/

# Database
psql -U edms_user -d edms_db -c "SELECT version();"
```

---

## Troubleshooting

### Frontend Returns 404 on Route Refresh

**Cause**: URL rewriting not working
**Fix**: 
- Windows IIS: Verify `web.config` is in site root with URL Rewrite module installed
- Nginx: Check `try_files $uri $uri/ /index.html;` in location block

### Backend Connection Refused

**Cause**: Gunicorn/Django not running on port 8765
**Fix**:
```bash
# Windows: Run check_ports.bat
# Linux: sudo systemctl status edms-backend
# Ensure firewall allows port 8765
```

### Database Connection Error

**Cause**: PostgreSQL not running or wrong credentials
**Fix**:
```bash
# Test connection
psql -U edms_user -d edms_db -h localhost
# Verify .env DATABASE_URL setting
```

### OCR Not Working

**Cause**: Tesseract not installed
**Fix**:
- Windows: Download from https://github.com/UB-Mannheim/tesseract/wiki
- Linux: `sudo apt install tesseract-ocr`
- Update `TESSERACT_PATH` in `.env`

### SSL Certificate Errors

**Cause**: Certificate expired or misconfigured
**Fix**:
- Check expiration: `openssl x509 -in cert.crt -noout -dates`
- Renew: `sudo certbot renew --force-renewal`
- IIS: Ensure binding uses correct certificate

---

## Performance Tuning

### Nginx Caching (Linux)

Add to nginx.conf in http block:

```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=100m;

location /api/ {
    proxy_cache api_cache;
    proxy_cache_valid 200 10m;
    proxy_cache_bypass $http_pragma $http_authorization;
}
```

### Gunicorn Worker Tuning

In `gunicorn_config.py`:

```python
# For I/O bound workload (default):
workers = multiprocessing.cpu_count() * 2 + 1

# For CPU bound OCR tasks:
workers = multiprocessing.cpu_count()
worker_class = 'sync'
```

### Database Connection Pool

In Django settings:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'CONN_MAX_AGE': 600,
        'OPTIONS': {
            'connect_timeout': 10,
            'options': '-c statement_timeout=30000'
        }
    }
}
```

---

## Backup & Disaster Recovery

### Database Backup (Daily)

**Windows**:
```batch
pg_dump -U edms_user -d edms_db -F c > C:\backups\edms_%date:~10,4%%date:~4,2%%date:~7,2%.backup
```

**Linux**:
```bash
pg_dump -U edms_user -d edms_db | gzip > /backups/edms_$(date +%Y%m%d).sql.gz
```

### Restore Database

```bash
pg_restore -U edms_user -d edms_db -c < edms_backup.backup
# OR
gunzip < edms_backup.sql.gz | psql -U edms_user -d edms_db
```

### Document Backup

Backup the media directory:

```bash
# Linux
tar czf edms_documents_$(date +%Y%m%d).tar.gz /opt/edms-backend/media/

# Windows
Compress-Archive -Path C:\edms-backend\media -DestinationPath C:\backups\edms_documents_$(Get-Date -f yyyy-MM-dd).zip
```

---

## Security Checklist

- [ ] Django `DEBUG=False` in production
- [ ] `SECRET_KEY` is unique and strong
- [ ] PostgreSQL user has minimal required permissions
- [ ] CORS only allows frontend domain
- [ ] SSL/TLS enabled (HTTPS everywhere)
- [ ] Firewall blocks unnecessary ports
- [ ] Database backups encrypted and stored offsite
- [ ] JWT tokens have expiration set
- [ ] Rate limiting enabled on API endpoints
- [ ] Logging enabled for audit trail
- [ ] Regular security updates applied

---

**Support**: Contact development team or check Django/DRF documentation for troubleshooting.

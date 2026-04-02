# Deployment Guide

## Option 1: VPS + Docker (Recommended)

### Requirements
- Ubuntu 22.04 VPS (min 2GB RAM, 2 vCPU)
- Domain name pointing to VPS IP
- SSH access

### Step 1: Server Setup
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install docker.io docker-compose-plugin git -y
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

### Step 2: Clone & Configure
```bash
git clone https://github.com/pundhirdevvrat/anymentor.git /opt/anymentor
cd /opt/anymentor

# Backend config
cp backend/.env.example backend/.env.prod
nano backend/.env.prod  # Fill all required values
```

### Step 3: Configure Domain in nginx.conf
```bash
sed -i 's/${DOMAIN}/yourdomain.com/g' nginx.conf
```

### Step 4: Deploy
```bash
docker-compose -f docker-compose.prod.yml up -d --build

# Run migrations
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# Seed data (first time only)
docker-compose -f docker-compose.prod.yml exec backend node prisma/seed.js
```

### Step 5: SSL Certificate
```bash
docker-compose -f docker-compose.prod.yml run certbot certonly \
  --webroot -w /var/www/certbot \
  -d yourdomain.com \
  --email admin@yourdomain.com \
  --agree-tos --no-eff-email

docker-compose -f docker-compose.prod.yml restart nginx
```

### Auto-renew SSL (cron)
```bash
# Add to crontab (runs twice daily)
echo "0 12 * * * docker-compose -f /opt/anymentor/docker-compose.prod.yml run certbot renew --quiet && docker-compose -f /opt/anymentor/docker-compose.prod.yml restart nginx" | crontab -
```

---

## Option 2: cPanel / Shared Hosting

### Requirements
- Node.js support (most modern cPanel hosts)
- PostgreSQL database (or use MongoDB Atlas as external)
- SSH access

### Steps
```bash
# 1. Upload backend/ folder via FTP or Git
# 2. In cPanel > Setup Node.js App
#    - Node version: 20.x
#    - Application mode: Production
#    - Application root: /home/user/anymentor/backend
#    - Application startup file: server.js

# 3. Set environment variables in cPanel > Node.js App > Environment Variables
#    (copy from .env.example)

# 4. In cPanel SSH Terminal:
cd ~/anymentor/backend
npm install --production
npx prisma generate
npx prisma migrate deploy
node prisma/seed.js

# 5. Frontend: Build and upload dist/ to public_html
cd ~/anymentor/frontend
npm install && npm run build
cp -r dist/* ~/public_html/
```

---

## Option 3: GitHub Actions Automated Deploy

### Setup Secrets in GitHub Repository
Go to: Settings → Secrets and Variables → Actions

```
VPS_HOST       = your.vps.ip.address
VPS_USER       = ubuntu (or your SSH user)
VPS_SSH_KEY    = (paste your private SSH key)
VPS_PORT       = 22
```

### Trigger Deploy
```bash
git push origin main   # Auto-deploys via .github/workflows/deploy.yml
```

---

## Monitoring & Logs

```bash
# View all service logs
docker-compose -f docker-compose.prod.yml logs -f

# Backend logs only
docker-compose -f docker-compose.prod.yml logs -f backend

# Application logs (files)
docker-compose -f docker-compose.prod.yml exec backend ls logs/

# Health check
curl https://yourdomain.com/api/v1/health
```

---

## Database Backup

```bash
# Backup
docker-compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U anymentor anymentor_db > backup_$(date +%Y%m%d).sql

# Restore
docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U anymentor anymentor_db < backup_20240101.sql
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Container won't start | `docker-compose logs backend` — check for missing env vars |
| DB connection failed | Verify `DATABASE_URL` in `.env.prod` matches service name `postgres` |
| 502 Bad Gateway | Backend not running — check `docker-compose ps` |
| Email not sending | Verify SMTP credentials, use Gmail App Password (not regular password) |
| Payment webhook failing | Verify webhook secret matches in gateway dashboard |
| SSL not working | Check certbot ran successfully, nginx config has correct domain |

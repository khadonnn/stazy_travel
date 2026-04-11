# VPS Deployment Guide - 2GB RAM (Budget VPS)

## 🚀 Pre-Deployment Checklist

### Local Machine

- [ ] Code committed & pushed to `deploy-vps-giare` branch
- [ ] Environment variables prepared (IP, domain, passwords)
- [ ] ngrok account ready (backup option if no domain yet)

### VPS (1 Core CPU, 2GB RAM)

- [ ] SSH access confirmed
- [ ] Root atau sudo access available

---

## 🛠 Step-by-Step Deployment

### 1️⃣ SSH into VPS & Create Swap (CRITICAL!)

```bash
ssh root@<YOUR_VPS_IP>

# Check current disk space
df -h

# Create 4GB swap file (MANDATORY to prevent OOM during build)
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# Make swap permanent (survive reboot)
echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab

# Verify
free -h
```

**Output should show 4GB swap available**

---

### 2️⃣ Install Docker & Docker Compose

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify
docker --version
docker-compose --version
```

---

### 3️⃣ Clone Repository & Checkout Deploy Branch

```bash
# Create app directory
mkdir -p /home/stazy
cd /home/stazy

# Clone repo and checkout deploy branch
git clone <YOUR_REPO_URL> .
git checkout deploy-vps-giare

# Verify you're on right branch and docker-compose.yml is in root
pwd  # Should be /home/stazy
ls docker-compose.yml  # Should exist
```

---

### 4️⃣ Prepare Environment Variables

```bash
# Copy example env
cp .env.example .env.vps

# Edit with VPS-specific values
nano .env.vps
```

**Update these crucial values:**

```env
# Database
DATABASE_URL=postgresql://admin:YOUR_STRONG_PASSWORD@localhost:5432/products
MONGO_URI=mongodb://localhost:27017/bookings
REDIS_HOST=localhost
REDIS_PORT=6379

# Kafka (keep localhost since running in docker network)
KAFKA_BROKERS=localhost:9094,localhost:9095,localhost:9096

# Clerk & Stripe (same as local, or update if needed)
CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
STRIPE_SECRET_KEY=sk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Service URLs (important: point to localhost since behind Nginx)
PRODUCT_SERVICE_URL=http://localhost:8000
BOOKING_SERVICE_URL=http://localhost:8001
PAYMENT_SERVICE_URL=http://localhost:8002
```

---

### 5️⃣ Start Infrastructure (Kafka, PostgreSQL, Redis)

```bash
cd /home/stazy

# Start services in background
docker-compose up -d

# Watch logs (Ctrl+C to exit)
docker-compose logs -f

# When ready, check all containers running
docker ps
```

**Should see:**

- kafka-broker-1
- stazy-db (Postgres)
- stazy-redis

---

### 6️⃣ Initialize Database

```bash
# Wait 30 seconds for Postgres to be ready
sleep 30

# Generate Prisma client and run migrations
docker exec stazy-db psql -U admin -d postgres -c "CREATE DATABASE products;" 2>/dev/null || true
docker exec stazy-db psql -U admin -d products -f /docker-entrypoint-initdb.d/*.sql 2>/dev/null || true

# (Optional) Seed initial data if you have seed script
# docker exec stazy-db psql -U admin -d products -f /seed.sql
```

---

### 7️⃣ Install Nginx & Certbot (For Stripe Webhook HTTPS)

```bash
# Install Nginx and Certbot
apt install -y nginx certbot python3-certbot-nginx

# Copy nginx config to proper location
cp /home/stazy/nginx.conf /etc/nginx/sites-available/stazy
ln -s /etc/nginx/sites-available/stazy /etc/nginx/sites-enabled/ 2>/dev/null || true

# Remove default site if exists
rm -f /etc/nginx/sites-enabled/default

# Test nginx config
nginx -t

# Reload Nginx
systemctl reload nginx
```

---

### 8️⃣ Setup SSL Certificate (Option A: If You Have Domain)

```bash
# Replace "your-domain.com" with actual domain
# Make sure domain DNS points to VPS IP first

certbot certonly \
  --nginx \
  -d your-domain.com \
  -d www.your-domain.com \
  --non-interactive \
  --agree-tos \
  -m your-email@example.com

# Uncomment SSL directives in \etc/nginx/sites-available/stazy
# Edit the file and update these lines with your domain:
# ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
# ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

nano /etc/nginx/sites-available/stazy

# Reload Nginx
systemctl reload nginx

# Auto-renew certificate
systemctl enable certbot.timer
systemctl start certbot.timer
```

---

### 9️⃣ Setup SSL Certificate (Option B: Self-Signed If No Domain Yet)

```bash
# Generate self-signed cert (valid 365 days)
openssl req -x509 -newkey rsa:2048 -keyout /etc/ssl/private/stazy.key -out /etc/ssl/certs/stazy.crt -days 365 -nodes \
  -subj "/CN=stazy-vps/O=STAZY Demo/C=VN"

# Update nginx config to use self-signed certs (temporary)
# In /etc/nginx/sites-available/stazy, change SSL paths to:
# ssl_certificate /etc/ssl/certs/stazy.crt;
# ssl_certificate_key /etc/ssl/private/stazy.key;

nano /etc/nginx/sites-available/stazy

# Reload
systemctl reload nginx
```

---

### 🔟 Build & Deploy Application Services

⚠️ **IMPORTANT**: Use `turbo prune --docker` - see [DOCKER_BUILD_SAFETY.md](DOCKER_BUILD_SAFETY.md) for details

#### Option A: Build on VPS (Recommended with Swap)

```bash
cd /home/stazy

# Build product service using turbo prune (safe for 2GB RAM)
docker build -t stazy-product-service -f Dockerfile.product-service .

# Optionally build booking and payment services
docker build -t stazy-booking-service -f Dockerfile.booking-service .
docker build -t stazy-payment-service -f Dockerfile.payment-service .

# Check image sizes (should be 250-300MB each)
docker images | grep stazy

# Monitor RAM during build (should not exceed swap significantly)
watch -n 1 'free -h && docker stats --no-stream'
```

#### Option B: Build Locally, Push to Registry (Faster)

```bash
# Local machine
docker build -t <YOUR_REGISTRY>/stazy-product-service -f Dockerfile.product-service .
docker push <YOUR_REGISTRY>/stazy-product-service

# On VPS
docker pull <YOUR_REGISTRY>/stazy-product-service
docker tag <YOUR_REGISTRY>/stazy-product-service stazy-product-service
```

#### Option C: Multi-service Parallel Build

```bash
# Build multiple services in background (respects RAM limits)
cd /home/stazy
docker build -t stazy-product-service -f Dockerfile.product-service . &
docker build -t stazy-booking-service -f Dockerfile.booking-service . &
docker build -t stazy-payment-service -f Dockerfile.payment-service . &
wait

# Verify all built
docker images | grep stazy
```

#### Start Application Services

```bash
# Create docker-compose.services.yml or use existing docker-compose.yml
# Make sure image: entries match built images above

docker-compose up -d product-service booking-service payment-service

# OR start all including infrastructure
docker-compose up -d
```

---

### 1️⃣1️⃣ Configure Stripe Webhook

Get your VPS's public IP or domain:

```bash
# Get public IP
curl -s http://whatismyipaddress.com
# Or if you have domain: your-domain.com
```

In **Stripe Dashboard**:

1. Go to Developers → Webhooks
2. Add endpoint: `https://<YOUR_VPS_IP_OR_DOMAIN>/webhooks/stripe`
   - Or with ngrok: `https://<ngrok-url>/webhooks/stripe`
3. Select events: `checkout.session.completed`, `charge.refunded`, etc.
4. Copy Webhook Signing Secret → update `STRIPE_WEBHOOK_SECRET` in `.env.vps`

---

### 1️⃣2️⃣ Verify Everything is Working

```bash
# Health checks
curl http://localhost:8000/health
curl http://localhost:8001/health
curl http://localhost:8002/health

# Via Nginx (HTTPS)
curl -k https://localhost/health
curl -k https://localhost/webhooks/stripe

# Check Docker resources
docker stats

# Monitor logs
docker-compose logs -f payment-service
docker-compose logs -f product-service
```

---

## 🔄 Ongoing Maintenance

### Update & Redeploy

```bash
# Pull latest code
cd /home/stazy
git pull origin deploy-vps-giare

# Rebuild image
docker build -t stazy-product-service -f Dockerfile.product-service .

# Restart containers
docker-compose restart payment-service
docker-compose restart product-service
# etc.
```

### Monitor Resources

```bash
# Real-time monitoring
docker stats

# Check swap usage (should not hit 100%)
free -h

#If near limit, increase swap or optimize services
```

### Backup & Recovery

```bash
# Backup database
docker exec stazy-db pg_dump -U admin -d products > backup-$(date +%Y%m%d).sql

# Restore from backup
docker exec -i stazy-db psql -U admin -d products < backup-20260411.sql

# Backup Redis
docker exec stazy-redis redis-cli BGSAVE
docker cp stazy-redis:/data/dump.rdb ./redis-backup-$(date +%Y%m%d).rdb
```

---

## ⚠️ Troubleshooting

### OOM Kill (Most Common on 2GB VPS)

```bash
# Check if process killed by OOM
dmesg | grep -i "killed process"

# Solution: Already handled by Swap created in Step 1
# If still happening: reduce Kafka/Postgres memory limits in docker-compose.yml
```

### Port Already in Use

```bash
# Find process using port
lsof -i :8002
# or
netstat -tlnp | grep 8002

# Kill it
kill -9 <PID>
```

### SSL Certificate Issues

```bash
# Check certificate status
certbot certificates

# Renew manually
certbot renew --force-renewal

# Test auto-renewal dry-run
certbot renew --dry-run
```

### Database Connection Failed

```bash
# Check if Postgres is running
docker ps | grep db

# Restart it
docker-compose restart postgres

# Check logs
docker-compose logs postgres
```

---

## 📊 Expected Resource Usage (2GB VPS)

| Component     | Memory             | CPU %  |
| ------------- | ------------------ | ------ |
| Kafka         | 400-500MB          | 10-20% |
| Postgres      | 350-400MB          | 5-10%  |
| Redis         | 100-150MB          | <1%    |
| Nginx         | ~20MB              | <1%    |
| App Services  | 300-500MB          | 5-15%  |
| **Total**     | ~1.2-1.7GB         | 20-45% |
| **Available** | ~300-800MB         | -      |
| **Swap**      | ~2-3GB (if needed) | -      |

---

## 🎯 Post-Deployment Checklist

- [ ] All containers running: `docker ps` shows all services
- [ ] Health checks passing: `curl http://localhost:8000/health`
- [ ] Database initialized: Can connect to Postgres
- [ ] Nginx proxying: `curl https://localhost/health`
- [ ] Stripe webhook configured in dashboard
- [ ] SSL certificate valid (if using domain)
- [ ] SSH backup configured
- [ ] Monitor Swap usage (should not exceed 50%)
- [ ] Test payment flow end-to-end

---

**Questions?** Check logs with: `docker-compose logs <service-name>`

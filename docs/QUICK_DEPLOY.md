# Quick Deploy Checklist - STAZY VPS (2GB RAM)

## 📋 Before You Deploy

### On Your Local Machine

- [ ] Push code to `deploy-vps-giare` branch
- [ ] Files in root are present:
  - [ ] `docker-compose.yml` (tối ưu cho VPS)
  - [ ] `Dockerfile.product-service`
  - [ ] `nginx.conf`
  - [ ] `.env.vps.example`
  - [ ] `DEPLOYMENT_VPS_GUIDE.md`

```bash
# Quick check
git checkout deploy-vps-giare
ls -la docker-compose.yml Dockerfile.product-service nginx.conf .env.vps.example
```

### On Your VPS (via SSH)

```bash
ssh root@<VPS_IP>

# STEP 1: Create 4GB Swap (⚠️ CRITICAL - prevents OOM)
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab

# STEP 2: Install Docker
curl -fsSL https://get.docker.com | sh
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# STEP 3: Clone code
mkdir -p /home/stazy && cd /home/stazy
git clone <YOUR_REPO> .
git checkout deploy-vps-giare

# STEP 4: Setup environment
cp .env.vps.example .env.vps
nano .env.vps  # Fill in actual values

# STEP 5: Start infrastructure
docker-compose up -d

# STEP 6: Install Nginx
apt install -y nginx certbot python3-certbot-nginx
cp nginx.conf /etc/nginx/sites-available/stazy
ln -s /etc/nginx/sites-available/stazy /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# STEP 7: Setup SSL (replace with your domain)
certbot certonly --nginx -d your-domain.com --non-interactive --agree-tos -m your-email@gmail.com
# Then edit nginx.conf to uncomment SSL directives
nano /etc/nginx/sites-available/stazy
systemctl reload nginx

# STEP 8: Build Product Service (will use 4GB Swap if needed)
docker build -t stazy-product-service -f Dockerfile.product-service .

# STEP 9: Verify
docker ps
free -h  # Check swap usage
curl http://localhost:8000/health
curl -k https://localhost/health
```

---

## 🎯 Stripe Webhook Setup

1. Get your VPS URL: `https://your-domain.com` (or `https://<VPS_IP>` if self-signed)
2. In **Stripe Dashboard** → Webhooks → Add Endpoint
3. Endpoint URL: `https://your-domain.com/webhooks/stripe`
4. Events: Select `checkout.session.completed`, `charge.refunded`, etc.
5. Copy Signing Secret → paste into `.env.vps` as `STRIPE_WEBHOOK_SECRET`
6. Restart payment service: `docker-compose restart payment-service`

---

## ✅ Post-Deployment

```bash
# All should return status 200
curl http://localhost:8000/health      # Product Service
curl http://localhost:8001/health      # Booking Service
curl http://localhost:8002/health      # Payment Service
curl -k https://localhost/health       # Via Nginx HTTPS
```

**Resource Usage** (should be < 2GB active):

```bash
docker stats
free -h
```

---

## 🆘 If Something Goes Wrong

| Problem                           | Solution                                                            |
| --------------------------------- | ------------------------------------------------------------------- |
| "Out of Memory" error             | Swap already created in STEP 1. Check: `free -h`                    |
| "Port already in use"             | `lsof -i :8002` then `kill -9 <PID>`                                |
| "Cannot connect to Docker daemon" | `docker ps` - if fails, check Docker is running                     |
| SSL certificate error             | Make sure domain DNS resolves to VPS IP first                       |
| Nginx reverse proxy not working   | Check `nginx -t` for syntax errors                                  |
| Stripe webhook not received       | Verify endpoint URL in Stripe Dashboard matches nginx reverse proxy |

---

## 📖 Full Details

See `DEPLOYMENT_VPS_GUIDE.md` for complete step-by-step guide with explanations.

---

**Last Updated:** April 11, 2026

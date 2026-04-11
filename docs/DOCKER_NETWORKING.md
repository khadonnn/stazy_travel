# 🌐 Docker Networking Guide - Container Communication

## 📋 Tổng Quan

Khi deploy lên VPS, các service chạy trong Docker container cần giao tiếp với nhau:

- Product Service → Database (PostgreSQL)
- Booking Service → Kafka, Redis
- Payment Service → Kafka, ngrok webhook
- Tất cả → Nginx reverse proxy

Docker Compose tự động tạo internal network, nhưng cần cấu hình environment variables đúng.

---

## 🔧 Docker Compose Network Setup

### docker-compose.yml

Ở root của project, cấu hình như thế này:

```yaml
version: "3.8"

services:
  postgres:
    image: pgvector/pgvector:pg16
    container_name: stazy-db
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: products
    ports:
      - "5432:5432" # Only internal/local access, not public
    networks:
      - stazy-network

  redis:
    image: redis:7.2-alpine
    container_name: stazy-redis
    ports:
      - "6379:6379" # Only internal/local access
    networks:
      - stazy-network

  kafka-broker:
    image: apache/kafka:3.7.1
    container_name: kafka-broker-1
    ports:
      - "9094:9094"
    networks:
      - stazy-network
    environment:
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka-broker-1:9092,EXTERNAL://0.0.0.0:9094

  product-service:
    image: stazy-product-service:latest
    container_name: stazy-product
    environment:
      NODE_ENV: production
      PORT: 8000
      DATABASE_URL: postgresql://admin:${DB_PASSWORD}@postgres:5432/products
      KAFKA_BROKERS: kafka-broker-1:9092 # Internal container name!
      REDIS_HOST: redis # Internal container name!
      REDIS_PORT: 6379
      CLERK_SECRET_KEY: ${CLERK_SECRET_KEY}
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - redis
      - kafka-broker
    networks:
      - stazy-network
    restart: unless-stopped

  booking-service:
    image: stazy-booking-service:latest
    container_name: stazy-booking
    environment:
      NODE_ENV: production
      PORT: 8001
      DATABASE_URL: postgresql://admin:${DB_PASSWORD}@postgres:5432/products
      KAFKA_BROKERS: kafka-broker-1:9092
      REDIS_HOST: redis
      REDIS_PORT: 6379
    ports:
      - "8001:8001"
    depends_on:
      - postgres
      - redis
      - kafka-broker
    networks:
      - stazy-network
    restart: unless-stopped

  payment-service:
    image: stazy-payment-service:latest
    container_name: stazy-payment
    environment:
      NODE_ENV: production
      PORT: 8002
      KAFKA_BROKERS: kafka-broker-1:9092
      DATABASE_URL: postgresql://admin:${DB_PASSWORD}@postgres:5432/products
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
      STRIPE_WEBHOOK_SECRET: ${STRIPE_WEBHOOK_SECRET}
    ports:
      - "8002:8002"
    depends_on:
      - postgres
      - kafka-broker
    networks:
      - stazy-network
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    container_name: stazy-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro # SSL certs
    depends_on:
      - payment-service
    networks:
      - stazy-network
    restart: unless-stopped

networks:
  stazy-network:
    driver: bridge
```

---

## 🔑 Environment Variables Chính Xác

### Internal URLs (Container → Container)

```env
# ✅ CORRECT - Inside docker network
DATABASE_URL=postgresql://admin:${DB_PASSWORD}@postgres:5432/products
KAFKA_BROKERS=kafka-broker-1:9092
REDIS_HOST=redis
REDIS_PORT=6379

# ❌ WRONG - Won't work in container
DATABASE_URL=postgresql://admin:${DB_PASSWORD}@localhost:5432/products
KAFKA_BROKERS=localhost:9092
REDIS_HOST=127.0.0.1
```

### External URLs (Client → API)

```env
# ✅ CORRECT - From outside docker network (e.g., client browser)
NEXT_PUBLIC_PRODUCT_SERVICE_URL=https://your-vps.com/api/product
NEXT_PUBLIC_PAYMENT_SERVICE_URL=https://your-vps.com/api/payment

# Or with Nginx reverse proxy:
NEXT_PUBLIC_PRODUCT_SERVICE_URL=http://localhost:8000
NEXT_PUBLIC_PAYMENT_SERVICE_URL=http://localhost:8002
```

---

## 🏗️ Network Communication Flow

```
┌─────────────────────────────────────────┐
│  Docker Bridge Network: stazy-network   │
├─────────────────────────────────────────┤
│                                         │
│  Product Service (8000)                 │
│  └─> postgres:5432 (direct)             │
│  └─> redis:6379 (direct)                │
│  └─> kafka-broker-1:9092 (direct)       │
│                                         │
│  Booking Service (8001)                 │
│  └─> postgres:5432                      │
│  └─> redis:6379 (Redlock)               │
│  └─> kafka-broker-1:9092                │
│                                         │
│  Payment Service (8002)                 │
│  └─> postgres:5432                      │
│  └─> kafka-broker-1:9092                │
│                                         │
│  Nginx (80, 443)                        │
│  └─> product-service:8000 (proxy)       │
│  └─> payment-service:8002 (proxy)       │
│                                         │
└─────────────────────────────────────────┘
         ▲                ▲
         │ External       │ SSL
         │ HTTP/HTTPS     │ Webhooks
         │                │
    ┌────┴────┐      ┌────┴────┐
    │ Browser │      │ Stripe  │
    └─────────┘      └─────────┘
```

---

## .env.vps.example - Correct Format

```env
# ============================================================================
# DATABASE & CACHE (Internal Docker network - use container names)
# ============================================================================
DATABASE_URL=postgresql://admin:strong_password_here@postgres:5432/products
MONGODB_URI=mongodb://mongo:27017/bookings
REDIS_HOST=redis
REDIS_PORT=6379

# ============================================================================
# KAFKA (Internal Docker network)
# ============================================================================
# If accessing from within container:
KAFKA_BROKERS=kafka-broker-1:9092

# If accessing from outside VPS (e.g., local client):
# KAFKA_BROKERS=<VPS_IP>:9094,<VPS_IP>:9095,<VPS_IP>:9096

# ============================================================================
# SERVICE PORTS (Inside container)
# ============================================================================
PORT=8000  # Product Service listens on 8000
PAYMENT_SERVICE_PORT=8002

# ============================================================================
# SERVICE URLs (From client perspective)
# ============================================================================
# Option 1: Nginx reverse proxy (recommended)
NEXT_PUBLIC_PRODUCT_SERVICE_URL=https://your-domain.com/api/product
NEXT_PUBLIC_PAYMENT_SERVICE_URL=https://your-domain.com/api/payment

# Option 2: Direct ports (development or without Nginx)
NEXT_PUBLIC_PRODUCT_SERVICE_URL=http://<VPS_IP>:8000
NEXT_PUBLIC_PAYMENT_SERVICE_URL=http://<VPS_IP>:8002

# ============================================================================
# EXTERNAL WEBHOOKS (Stripe → Nginx → Payment Service)
# ============================================================================
STRIPE_WEBHOOK_URL=https://your-domain.com/webhooks/stripe
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

---

## 🎯 Docker Network Troubleshooting

### Container A không kết nối được Container B

```bash
# 1. Check nếu container đang chạy
docker ps | grep stazy

# 2. Check logs
docker logs stazy-product
docker logs stazy-postgres

# 3. Test kết nối từ bên trong container
docker exec stazy-product sh
ping postgres  # Should respond

# 4. Check network
docker network ls
docker network inspect stazy-network

# 5. Check environment variables
docker exec stazy-product env | grep DATABASE
```

### Database connection timeout

```bash
# Thường do DATABASE_URL sử dụng localhost thay vì container name
# ❌ WRONG:
DATABASE_URL=postgresql://admin:pass@localhost:5432/products

# ✅ CORRECT:
DATABASE_URL=postgresql://admin:pass@postgres:5432/products
```

### Port conflict

```bash
# Check nếu port 5432, 6379, 9092 đã bị chiếm
lsof -i :5432
lsof -i :6379
lsof -i :9092

# Kill nếu cần
kill -9 <PID>
```

---

## 📊 Production Best Practices

### 1. Don't expose database ports publicly

```yaml
# ❌ BAD - Exposes to internet
postgres:
  ports:
    - "5432:5432"  # DANGEROUS!

# ✅ GOOD - Only internal network
postgres:
  networks:
    - stazy-network
```

### 2. Use environment variables for secrets

```yaml
# ✅ Load from .env.vps
environment:
  DATABASE_URL: ${DATABASE_URL}
  STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}

# ❌ NEVER hardcode
environment:
  STRIPE_SECRET_KEY: sk_live_xxxxx  # DON'T DO THIS!
```

### 3. Health checks

```yaml
product-service:
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s
```

### 4. Resource limits

```yaml
booking-service:
  deploy:
    resources:
      limits:
        cpus: "0.5"
        memory: 512M
```

---

## 🔄 Common Patterns

### Pattern 1: Service → Database → Cache

```typescript
// src/database.ts
const pgClient = new pg.Client({
  host: process.env.DB_HOST || "postgres", // Container name!
  port: 5432,
  database: process.env.DB_NAME || "products",
  user: process.env.DB_USER || "admin",
  password: process.env.DB_PASSWORD,
});

const redis = new Redis({
  host: process.env.REDIS_HOST || "redis", // Container name!
  port: process.env.REDIS_PORT || 6379,
});
```

### Pattern 2: Service → Kafka

```typescript
// src/kafka.ts
const kafka = new Kafka({
  clientId: "product-service",
  brokers: (process.env.KAFKA_BROKERS || "kafka-broker-1:9092").split(","),
});
```

### Pattern 3: Health check endpoint (required)

```typescript
// src/routes/health.ts
app.get("/health", (req, res) => {
  // Check database connection
  // Check Redis connection
  // Check Kafka connection
  res.json({ status: "healthy" });
});
```

---

## ✅ Verification Checklist

- [ ] `.env.vps` sử dụng container names (postgres, redis, kafka-broker-1)
- [ ] Tất cả services trong cùng network (`stazy-network`)
- [ ] Database, Redis, Kafka chỉ expose internal, không public
- [ ] Nginx reverse proxy port 80/443 public
- [ ] Health endpoints hoạt động
- [ ] `docker-compose up -d` tất cả container chạy
- [ ] `docker logs <service>` không có connection errors
- [ ] Nginx có thể proxy tới services không lỗi

---

Với setup này, container sẽ giao tiếp trơn tru và maintain security cho VPS của bạn!

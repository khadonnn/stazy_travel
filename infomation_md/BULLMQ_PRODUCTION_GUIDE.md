# 🚀 BullMQ Production Guide - Booking Platform

> Comprehensive guide for managing Kafka + Outbox + BullMQ + Redis Lock in production

---

## 📋 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    EVENT-DRIVEN MICROSERVICES                   │
├─────────────────────────────────────────────────────────────────┤
│
│  🔵 BOOKING SERVICE
│  ├─ HTTP: POST /bookings → Redis Lock → DB Transact
│  │  └─ OUTBOX: creates booking + timeout BullMQ job
│  └─ Saga Timeout Queue (15 min) → Compensation if no payment
│
│  💳 PAYMENT SERVICE
│  ├─ BullMQ Queue: payment:process (5 retries, expo backoff)
│  │  └─ Worker → Stripe API → Outbox (SUCCESS/FAILED event)
│  └─ DLQ: payment:dlq (manual review)
│
│  📧 EMAIL SERVICE
│  ├─ BullMQ Queue: email:send (5 retries, priority-based)
│  │  └─ Worker → SendMail → Outbox (delivery tracking)
│  └─ DLQ: email:dlq (bounce handling)
│
│  🔄 OUTBOX RELAY
│  └─ Polls DB every 5s → Publishes to Kafka → Mark SENT
│
│  🔗 REDIS
│  ├─ Distributed Lock: locks:hotel:{hotelId}:{date}
│  └─ BullMQ Backend: queues, delayed jobs, retry state
│
│  📨 KAFKA (Integration Bus)
│  ├─ booking-events (Outbox → Relay)
│  ├─ payment-events (Outbox → Relay)
│  └─ email-events (Outbox → Relay)
│
```

---

## 🎯 Queue Configuration Reference

### 1. BOOKING SERVICE: `saga:timeout`

| Property    | Value                         | Reason                                |
| ----------- | ----------------------------- | ------------------------------------- |
| Delay       | 15 min                        | Standard payment timeout              |
| Attempts    | 1                             | No retry (it's a deadline)            |
| Concurrency | 10                            | Can process many timeouts in parallel |
| Action      | Cancel booking + Outbox event | No direct Kafka publish               |
| Idempotency | Per sagaId                    | Prevent duplicate compensation        |

**When to use:**

- Booking created (PENDING status)
- Payment not received in 15 minutes
- Auto-triggers BOOKING_CANCELLED

---

### 2. PAYMENT SERVICE: `payment:process`

| Property        | Value                         | Reason                                    |
| --------------- | ----------------------------- | ----------------------------------------- |
| Attempts        | 5                             | Stripe webhooks may be delayed            |
| Backoff         | Exponential (2s start)        | Retry pattern: 2s → 6s → 18s → 54s → 162s |
| Concurrency     | 10                            | Process 10 payments in parallel           |
| Remove Complete | 1 hour                        | Keep audit trail briefly                  |
| Priority        | N/A                           | FIFO, but enqueue order matters           |
| Action          | Outbox event (SUCCESS/FAILED) | Outbox relay publishes to Kafka           |

**Retry logic:**

```
Attempt 1: Immediate
Attempt 2: 2 seconds
Attempt 3: 6 seconds
Attempt 4: 18 seconds
Attempt 5: 54 seconds
───────────────────────────
Total: 80 seconds (~1.3 minutes)
```

**DLQ Trigger:**

- After 5 failed attempts → Move to `payment:dlq`
- Manual review required for fraud/edge cases

---

### 3. EMAIL SERVICE: `email:send`

| Property        | Value                  | Reason                                    |
| --------------- | ---------------------- | ----------------------------------------- |
| Attempts        | 5                      | SMTP providers have temp failures         |
| Backoff         | Exponential (3s start) | Retry pattern: 3s → 9s → 27s → 81s → 243s |
| Concurrency     | 10                     | Send 10 emails in parallel                |
| Priority Levels | 2-10 (lower = urgent)  | Priority queuing                          |
| DLQ Trigger     | After 5 fails          | Bounce/blacklist handling                 |

**Priority Map:**

```typescript
PAYMENT_FAILED    → Priority 2 (URGENT)
PAYMENT_SUCCESS   → Priority 3 (HIGH)
BOOKING_CANCELLED → Priority 4 (HIGH-MED)
BOOKING_CREATED   → Priority 5 (MEDIUM)
WELCOME           → Priority 10 (LOW)
```

**Rate Limiting:**

- Concurrency: 10 emails/second
- Respects SMTP provider limits (Gmail: 15k/day, etc.)

---

## 🛡️ Idempotency Key Strategy

Every consumer must implement idempotency checks BEFORE processing:

```typescript
// 1. Generate consistent key
const key = generateIdempotencyKey("saga|payment|email", ...parts);

// 2. Check cache
if (checkIdempotency(key)?.processed) {
  return { skipped: true };
}

// 3. Process
const result = await processJob();

// 4. Record
recordIdempotency(key, true, result);
```

**Key Format:**

| Layer   | Format                                | Example                              |
| ------- | ------------------------------------- | ------------------------------------ |
| Saga    | `saga:{bookingId}:{requestId}`        | `saga:uuid:req-123`                  |
| Payment | `payment:{bookingId}:{transactionId}` | `payment:uuid:txn-456`               |
| Email   | `email:{messageId}:{emailType}`       | `email:booking-uuid:PAYMENT_SUCCESS` |

---

## ⚙️ Retry Policy Best Practices

### ❌ DON'T: Multiple Retry Layers

```typescript
// BAD: Retry at 3 layers simultaneously
Outbox retry → Kafka consumer retry → BullMQ retry
// Result: Duplicate events + spam
```

### ✅ DO: Single Retry Layer

```typescript
// GOOD: Centralized retry
Event Path:
  DB → Outbox (one-time attempt)
    ↓
  Kafka (at-least-once delivery)
    ↓
  Consumer enqueues → BullMQ (5 retries)
    ↓
  Success → DB update
  Failure → DLQ → manual review
```

### Config Example:

```typescript
// Payment: Outbox writes to DB once
await tx.outboxMessage.create({
  dedupKey: `payment:${id}`, // Unique per payment
  status: "PENDING",
  attempts: 0, // Outbox worker increments
});

// Outbox worker: Single attempt per message
if (message.attempts >= OUTBOX_MAX_ATTEMPTS) {
  status = "FAILED"; // Stop, let consumer DLQ it
}

// Kafka consumer: Receives event (possibly multiple times)
if (idempotencyCheck) return; // Skip if already processed

// BullMQ worker: Full 5-retry policy
queue.add(job, { attempts: 5, backoff: exponential });
```

---

## 📊 Observability & Monitoring

### 1. Key Metrics to Track

```typescript
// Every minute, log:
{
  "queue": "saga:timeout",
  "active": 12,      // Currently processing
  "completed": 452,  // Successfully processed
  "failed": 3,       // Dead letter queue
  "delayed": 0,      // Waiting for delay window

  "health": "OK",
  "avgProcessTime": "1200ms",
  "p95ProcessTime": "3500ms",
}
```

### 2. Alert Thresholds

| Condition     | Threshold | Action                 |
| ------------- | --------- | ---------------------- |
| Failed jobs   | > 10      | Page on-call           |
| Queue backlog | > 1000    | Scale up workers       |
| P95 latency   | > 5s      | Investigate bottleneck |
| DLQ size      | > 50      | Manual review needed   |
| Worker crash  | Any       | Restart + investigate  |

### 3. Dashboard Setup (Grafana)

```promql
# Payment queue success rate
rate(bullmq_job_completed_total{queue="payment:process"}[5m]) /
rate(bullmq_job_total{queue="payment:process"}[5m])

# Email DLQ growth
rate(bullmq_dlq_size{service="email"}[1h])

# Saga timeout fire rate
rate(bullmq_job_completed_total{queue="saga:timeout", reason="timeout"}[1h])
```

---

## 🔴 DLQ Management (Dead Letter Queue)

### When Jobs Enter DLQ:

1. **Payment Queue**: After 5 failed payment attempts
2. **Email Queue**: After 5 failed send attempts
3. **Saga Timeout**: Never (timeout failures are final)

### Manual Recovery Procedure:

```bash
# 1. Inspect DLQ
const dlqJobs = await dlqQueue.getJobs(['active', 'failed']);
console.log(dlqJobs[0].data); // Review failure reason

# 2. Fix Root Cause
- If Stripe API down: Wait for recovery
- If SMTP quota exceeded: Upgrade account
- If email bounced: Remove invalid address

# 3. Re-enqueue
await dlqQueue.remove(jobId);
await originalQueue.add(jobData, { attempts: 3 }); // Fresh attempts

# 4. Monitor
Watch for failures, don't blindly retry 100x
```

---

## 🚀 Deployment Checklist

### Pre-Deployment

- [ ] Redis instance running (cluster recommended for HA)
- [ ] Kafka topics created: `booking-events`, `payment-events`, `email-events`
- [ ] PostgreSQL Outbox table exists with indexes
- [ ] Environment variables set:
  ```
  REDIS_HOST=stazy-redis
  REDIS_PORT=6379
  OUTBOX_POLL_INTERVAL_MS=5000
  OUTBOX_BATCH_SIZE=20
  OUTBOX_MAX_ATTEMPTS=5
  ```

### Deployment

```bash
# 1. Scale Redis
# Minimum: 2GB RAM for 100k jobs/day
# Recommended: 4GB RAM + Cluster mode

# 2. Deploy services
docker-compose -f docker-compose.yml up -d

# 3. Verify health
curl http://localhost:8001/health # Booking
curl http://localhost:8002/health # Payment
curl http://localhost:8003/health # Email

# 4. Monitor initial logs
docker logs -f booking-service
docker logs -f payment-service
docker logs -f email-service
```

### Post-Deployment

- [ ] Health checks passing
- [ ] Verify queue creation in Redis
- [ ] Test end-to-end: Create booking → Email queued
- [ ] Check Outbox relay running
- [ ] Setup monitoring alerts

---

## 🔧 Troubleshooting Guide

### Problem: Queues Growing Indefinitely

```bash
# Symptom: Active/delayed count increasing, never decreasing

# Cause: Worker crashed or stalled
docker logs payment-service | grep ERROR

# Fix:
1. Restart worker: docker restart payment-service
2. Check Redis connection: redis-cli ping
3. Verify concurrency not set too high
```

### Problem: Jobs Never Processing

```bash
# Symptom: Jobs stay in 'delayed' state

# Cause: Delay calculation wrong
# Example: delayMs set to 1000 years instead of 1000ms

# Fix:
const job = await queue.getJob(jobId);
console.log(job.delay); // Should be <= 15*60*1000 for saga
console.log(job.processAfter); // Should be soon
```

### Problem: Duplicate Events

```bash
# Symptom: Same booking created multiple times in DB

# Cause: Idempotency not checked
const idempotencyKey = generateIdempotencyKey(...);
if (checkIdempotency(idempotencyKey)) {
  return { skipped: true }; // ADD THIS!
}
```

### Problem: High Memory Usage

```bash
# Symptom: Redis memory climbing

# Cause: Too many completed jobs not being removed
// Check retention settings:
removeOnComplete: {
  age: 3600, // Remove after 1 hour ✅
}

// Or manual cleanup:
queue.clean(60000); // Remove jobs older than 1 minute
```

---

## 📝 Maintenance Schedule

| Task                  | Frequency | Command                           |
| --------------------- | --------- | --------------------------------- |
| Check queue sizes     | Daily     | `redis-cli llen bull:queue-name*` |
| Review DLQ            | Daily     | Manual inspection                 |
| Clean old jobs        | Weekly    | `queue.clean(7*24*3600*1000)`     |
| Retry DLQ jobs        | As needed | Manual case-by-case               |
| Redis persistence     | Daily     | Check AOF/RDB backup              |
| Monitor growth trends | Weekly    | Dashboard review                  |

---

## 🎓 Example: End-to-End Flow

```
1. USER CLICKS "ĐẶT PHÒNG"
   ↓
2. Booking Service: POST /bookings
   ├─ Acquire Redis lock (hotel:date)
   ├─ Check DB for conflicts
   ├─ Create booking (status=PENDING)
   ├─ Create Outbox: BOOKING_CREATED
   ├─ Enqueue Saga Timeout (15 min)
   └─ Release lock

3. Outbox Relay (polls every 5s)
   ├─ Find: BOOKING_CREATED (PENDING)
   ├─ Publish to Kafka topic: booking-events
   └─ Update: status=SENT

4. Email Service Receives Event
   ├─ Enqueue job: email:send
   │  ├─ Attempts: 5
   │  ├─ Priority: 5 (MEDIUM)
   │  └─ Template: BOOKING_CREATED

5. Email Worker (processes job)
   ├─ Check idempotency
   ├─ Send via nodemailer
   ├─ Success → Record idempotency
   └─ Failure → Retry with backoff (auto)

6. Payment Service Receives Event
   ├─ Enqueue job: payment:process
   │  ├─ Attempts: 5
   │  ├─ Backoff: exponential
   │  └─ Data: amount, stripeSessionId

7. Payment Worker (processes job)
   ├─ Check idempotency
   ├─ Call Stripe API
   ├─ Success:
   │  ├─ Create Outbox: PAYMENT_SUCCESS
   │  └─ Job completes
   ├─ Failure:
   │  ├─ Retry automatically (BullMQ)
   │  └─ After 5 retries → Move to DLQ

8. Outbox Relay Picks Up PAYMENT_SUCCESS
   ├─ Publish to Kafka: payment-events

9. Booking Service Receives PAYMENT_SUCCESS
   ├─ Update booking: status=CONFIRMED
   ├─ Remove Saga Timeout job (no compensation needed)

10. Saga Timeout (if payment never received)
    ├─ After 15 minutes → Job fires
    ├─ Check booking status (still PENDING?)
    ├─ Cancel booking
    ├─ Create Outbox: BOOKING_CANCELLED_TIMEOUT
    ├─ Outbox relay publishes to Kafka

✅ END-TO-END CONSISTENT DELIVERY
```

---

## 📞 Support & Escalation

| Issue                  | Owner        | Escalation               |
| ---------------------- | ------------ | ------------------------ |
| Redis down             | DevOps       | Page on-call             |
| Kafka partition full   | DevOps       | Scale Kafka              |
| High email bounce rate | Product      | Review bounced addresses |
| Stripe API failing     | Payment Team | Contact Stripe support   |
| Database slow queries  | DBA          | Optimize indexes         |

---

## 🔗 Related Documentation

- [REDIS_LOCK_OVERBOOKING.md](./REDIS_LOCK_OVERBOOKING.md) - Redis lock implementation
- [RECOMMENDATION_ARCHITECTURE.md](./RECOMMENDATION_ARCHITECTURE.md) - Async processing patterns
- [ROLE_AUTHORIZATION.md](./ROLE_AUTHORIZATION.md) - Idempotency best practices

---

**Last Updated:** 2026-04-27  
**Maintained By:** Senior Backend Engineers  
**Review Cycle:** Quarterly

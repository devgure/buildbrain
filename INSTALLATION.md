# BuildBrain Platform - Detailed Installation Guide

Complete installation guide with detailed explanations for setting up BuildBrain on Windows, macOS, and Linux.

---

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Pre-Installation Setup](#pre-installation-setup)
3. [Component-by-Component Installation](#component-by-component-installation)
4. [Verification Checklist](#verification-checklist)
5. [Production vs Development](#production-vs-development)
6. [Scaling & Performance](#scaling--performance)

---

## System Requirements

### Minimum Requirements
- **CPU**: 2 cores
- **RAM**: 8GB
- **Disk**: 20GB SSD (databases + code)
- **Network**: 100 Mbps internet

### Recommended Requirements
- **CPU**: 4+ cores
- **RAM**: 16GB
- **Disk**: 50GB SSD
- **Network**: 1 Gbps

### Operating Systems

**Supported:**
- macOS 11+ (Intel or Apple Silicon)
- Ubuntu 20.04 LTS / 22.04 LTS
- Windows 10/11 with WSL2
- Linux (RHEL, CentOS, Fedora)

**Not Supported:**
- macOS < 10.15
- Windows 7/8 (without WSL)
- 32-bit systems

---

## Pre-Installation Setup

### 1. Install Node.js & npm

**On macOS (using Homebrew):**
```bash
brew install node@18
node --version  # v18.x.x
npm --version   # v8.x.x or higher
```

**On Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs npm
```

**On Windows:**
- Download from https://nodejs.org/
- Run installer
- Accept defaults
- Verify: `node --version`

**Upgrade npm to latest:**
```bash
npm install -g npm@latest
npm install -g yarn  # optional, for faster installations
```

### 2. Install Docker & Docker Compose

**On macOS:**
```bash
brew install --cask docker
# Then open Docker.app from Applications
```

**On Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose
sudo usermod -aG docker $USER
# Log out and back in for group changes to take effect
```

**On Windows:**
- Download Docker Desktop: https://www.docker.com/products/docker-desktop
- Run installer
- Ensure WSL2 backend is enabled
- Restart computer

**Verify installation:**
```bash
docker --version        # Docker version 20.10+
docker-compose --version # Docker Compose version 2.0+
docker run hello-world  # Should see "Hello from Docker!"
```

### 3. Install Git & Git LFS

**On macOS:**
```bash
brew install git git-lfs
git lfs install
```

**On Ubuntu/Debian:**
```bash
sudo apt-get install -y git git-lfs
git lfs install
```

**On Windows:**
- Download from https://git-scm.com/download/win
- Run installer (use defaults)
- Download Git LFS from https://git-lfs.com/
- Run installer

**Verify:**
```bash
git --version       # v2.30+
git lfs --version   # v3.0+
```

### 4. Increase System Resources (Optional but Recommended)

**On macOS:**
- Open Docker Desktop
- Settings → Resources
- Set CPU: 4, Memory: 8GB
- Click Apply & Restart

**On Windows (WSL2):**
Create `%USERPROFILE%\.wslconfig`:
```ini
[wsl2]
memory=8GB
processors=4
swap=2GB
```

**On Linux:**
```bash
# Check available resources
free -h
nproc

# No configuration needed - Docker uses all available resources
```

---

## Component-by-Component Installation

### Step 1: Clone Repository

```bash
# HTTPS (requires password for each push)
git clone https://github.com/your-org/buildbrain.git
cd buildbrain

# Or SSH (requires SSH key setup)
git clone git@github.com:your-org/buildbrain.git
cd buildbrain

# Verify structure
ls -la
# Should see: services/, client/, backend/, data/, infra/, docker-compose.dev.yml, package.json
```

### Step 2: Install Node Dependencies

```bash
# Install root dependencies (monorepo setup)
npm install

# This will automatically install dependencies for all workspaces
# Progress indicator shows:
# added XXX packages in XXs

# If facing issues, use npm ci (clean install)
npm cache clean --force
npm ci

# Verify npm workspaces
npm ls -a | head -20
```

**Troubleshooting npm install:**

If you see `WARN deprecated` warnings, they're usually safe to ignore. If installation fails:

```bash
# Delete lock files and caches
rm -rf node_modules package-lock.json
rm -rf backend/node_modules backend/package-lock.json
rm -rf services/*/node_modules services/*/package-lock.json

# Reinstall
npm install --legacy-peer-deps  # If peer dependency conflicts

# For monorepo issues
npm install -g lerna@6
lerna bootstrap  # Bootstrap monorepo packages
```

### Step 3: Start Docker Infrastructure

```bash
# Create required directories
mkdir -p data/postgres
mkdir -p data/mongodb
mkdir -p data/redis
mkdir -p data/qdrant

# Start services
docker-compose -f docker-compose.dev.yml up -d

# Wait ~30 seconds for services to initialize
sleep 30

# Check status
docker-compose -f docker-compose.dev.yml ps

# Expected statuses:
# postgres         running (healthy)
# mongodb          running (healthy)
# redis            running (healthy)
# qdrant           Up
# minio            running
# pgadmin          running
# mongo-express    running
```

**Verify each service:**

```bash
# PostgreSQL
psql -U postgres -h localhost -d buildbrain_dev -c "SELECT version();"

# MongoDB
mongosh --authenticationDatabase admin --username admin --password admin mongodb://localhost:27017

# Redis
redis-cli ping
# Expected: PONG

# Qdrant (needs curl)
curl http://localhost:6333/health
# Expected: {"status":"ok"}
```

If any service fails, check logs:
```bash
docker-compose -f docker-compose.dev.yml logs postgres  # Replace service name
docker-compose -f docker-compose.dev.yml logs -f        # Follow all logs
```

### Step 4: Configure Environment Variables

```bash
# Copy example file
cp .env.example .env

# Edit configuration
nano .env  # or vim, VSCode, etc.
```

**Minimal configuration for local development:**

```env
# Database URLs (default values work for local docker-compose setup)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/buildbrain_dev
REDIS_URL=redis://localhost:6379
MONGODB_URI=mongodb://admin:admin@localhost:27017/buildbrain?authSource=admin

# Server configuration
API_PORT=3001
API_HOST=localhost
NODE_ENV=development

# Security (stub values for development)
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRATION=24h

# AI Services (get free tier keys or stubs)
OPENAI_API_KEY=sk-...  # https://platform.openai.com/api-keys
GOOGLE_API_KEY=...     # https://console.cloud.google.com

# Payment Services (requires account setup)
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# S3 Storage (local Minio)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=buildbrain-dev

# Email Service
SENDGRID_API_KEY=...  # Optional, can test in console

# Compliance & KYC
PERSONA_API_KEY=...  # From Persona.com
SUMSUM_API_KEY=...   # From SumSub.com
```

### Step 5: Initialize Database

```bash
# Navigate to backend
cd backend

# Create database (if not already created)
npm run db:create

# Run migrations
npm run db:migrate
# Expected output:
# Migrations to apply:
# migrations/20240115_initial_schema.sql
# Running migrations...
# ✓ Completed

# Seed test data
npm run db:seed
# Expected output:
# Seeding database...
# Created 5 test users
# Created 2 projects with 3 milestones
# Created 2 jobs with 2 bids
# Created 1 payment record
# ✓ Seeding completed

# Verify data was seeded
npx prisma studio  # Opens interactive database viewer on http://localhost:5555
```

### Step 6: Start Individual Microservices

Each service runs as a separate Node.js process. Open 6 separate terminals:

**Terminal 1 - Auth Service:**
```bash
cd services/auth-service
npm run dev

# Expected output:
# [Nest] 12345 - 01/15/2024, 10:15:30 AM     LOG [NestFactory] Starting Nest application...
# [Nest] 12345 - 01/15/2024, 10:15:33 AM     LOG Server running on http://localhost:3001
```

**Terminal 2 - Payment Service:**
```bash
cd services/payment-service
npm run dev
# Runs on http://localhost:3002
```

**Terminal 3 - Project Service:**
```bash
cd services/project-service
npm run dev
# Runs on http://localhost:3003
```

**Terminal 4 - Marketplace Service:**
```bash
cd services/marketplace-service
npm run dev
# Runs on http://localhost:3004
```

**Terminal 5 - Compliance Service:**
```bash
cd services/compliance-service
npm run dev
# Runs on http://localhost:3005
```

**Terminal 6 - AI Service:**
```bash
cd services/ai-service
npm run dev
# Runs on http://localhost:3006
```

### Step 7: Start Frontend

**Terminal 7 - Web Frontend:**
```bash
cd client/web-desktop
npm run dev

# Expected output:
# ▲ Next.js 14.0.0
# - Local:        http://localhost:3000
#
# ✓ Ready in 2.5s
```

**Terminal 8 - Mobile (Optional):**
```bash
cd client/mobile
npx expo start

# Press 'i' for iOS, 'a' for Android, 'w' for web
```

---

## Verification Checklist

After installation, verify everything works:

### 1. Service Health Check

```bash
# Check all services are running
for port in 3000 3001 3002 3003 3004 3005 3006; do
  echo "Port $port:"
  curl -s http://localhost:$port/health || echo "Not responding"
done
```

### 2. API Endpoints

```bash
# Test auth service
curl http://localhost:3001/api/v1/auth/health

# Test payment service
curl http://localhost:3002/api/v1/payments/health

# All should return 200 OK
```

### 3. Database Connectivity

```bash
# PostgreSQL
psql -U postgres -h localhost -d buildbrain_dev \
  -c "SELECT COUNT(*) as user_count FROM \"User\";"
# Should show: user_count = 5

# MongoDB
mongosh --eval "db.getCollectionNames()" \
  mongodb://admin:admin@localhost:27017/buildbrain?authSource=admin
# Should list collections

# Redis
redis-cli DBSIZE
# Should show: integer 0 (or > 0 if cached)
```

### 4. Web Application

- Open http://localhost:3000
- Should see BuildBrain login page
- Try logging in with seeded account:
  - Email: `john@aceconstruction.com`
  - Password: (check `.env` or database)

### 5. API Documentation

- Open http://localhost:3001/api/docs
- Should see Swagger UI with all endpoints documented
- Try executing a test endpoint

### 6. Admin Panels

| URL | Access |
|-----|--------|
| http://localhost:5050/pgadmin | PostgreSQL (email: admin@buildbrain.io) |
| http://localhost:8081 | MongoDB admin |
| http://localhost:9001 | Minio S3 (minioadmin/minioadmin) |

---

## Production vs Development

### Development Configuration

**Characteristics:**
- Hot reload enabled
- Debug logging
- Seed data included
- Less strict validation
- Single server instance
- No load balancing

**Run with:**
```bash
NODE_ENV=development npm run dev
```

### Production Configuration

**Characteristics:**
- Single build artifact
- Minimal logging
- No seed data
- Full validation
- Multiple instances
- Load balancing required

**Build for production:**
```bash
NODE_ENV=production npm run build
npm run start  # Single server

# Or with Docker
docker build -t buildbrain:latest .
docker run -e NODE_ENV=production buildbrain:latest
```

**Key environment differences:**

| Setting | Development | Production |
|---------|-------------|-----------|
| NODE_ENV | development | production |
| DEBUG | true | false |
| LOG_LEVEL | debug | error |
| DATABASE_POOL_SIZE | 5 | 20 |
| CACHE_TTL | 60s | 3600s |
| RATE_LIMIT | disabled | 100 req/min |

See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for production setup with Kubernetes.

---

## Scaling & Performance

### Single Server Scaling

```bash
# Increase Node.js memory
NODE_OPTIONS="--max-old-space-size=4096" npm run start

# Run multiple instances with PM2
npm install -g pm2
pm2 start npm --name "auth-service" -- "run" "dev" -i max
```

### Database Optimization

```bash
# Add PostgreSQL indexes
npm run db:index

# Analyze query performance
psql -U postgres -d buildbrain_dev \
  -c "EXPLAIN ANALYZE SELECT * FROM \"Project\" WHERE status='ACTIVE';"

# Monitor with pgAdmin
# Open http://localhost:5050
```

### Caching Optimization

```bash
# Monitor Redis memory usage
redis-cli INFO memory

# Clear cache if needed
redis-cli FLUSHALL

# Set cache eviction policy in redis.conf
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

### Container Resource Limits

In `docker-compose.dev.yml`, add resource limits:

```yaml
services:
  postgres:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

---

## Next Steps

1. **Complete Quick Start**: See [QUICK_START.md](./QUICK_START.md)
2. **Learn Architecture**: See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
3. **API Reference**: See [docs/API.md](./docs/API.md)
4. **Deployment Guide**: See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)
5. **Contributing**: See [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## Support

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Email**: support@buildbrain.io
- **Documentation**: docs/ directory

**Happy coding! 🚀**

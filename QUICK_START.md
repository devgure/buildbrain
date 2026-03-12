# BuildBrain Platform - Quick Start Guide

Get the entire BuildBrain platform running locally in **15 minutes**.

## Prerequisites

Ensure you have the following installed:
- **Node.js 18+** ([download](https://nodejs.org/))
- **Docker & Docker Compose** ([download](https://www.docker.com/products/docker-desktop))
- **Git** ([download](https://git-scm.com/))
- **Git LFS** (for large files): `git lfs install`

**System Requirements:**
- **RAM**: 8GB minimum (16GB recommended)
- **Disk Space**: 10GB free
- **OS**: macOS, Linux, or Windows (WSL2)

---

## Installation Steps

### 1. Clone Repository

```bash
git clone https://github.com/your-org/buildbrain.git
cd buildbrain
```

### 2. Install Dependencies

```bash
# Install all dependencies for monorepo
npm install

# If npm install fails, try:
npm ci
npm install -g lerna
lerna bootstrap
```

### 3. Start Infrastructure (Docker)

```bash
# Start all databases and services via Docker Compose
docker-compose -f docker-compose.dev.yml up -d

# Verify all services are running
docker-compose -f docker-compose.dev.yml ps

# Expected output:
# postgres         running
# mongodb          running
# redis            running
# qdrant           running
# minio            running
# rabbitmq         running
# pgadmin          running (port 5050)
# mongo-express    running (port 8081)
```

**Wait 30-60 seconds for all services to be healthy before proceeding.**

### 4. Configure Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your local settings
# Default values work for local development - no changes needed
nano .env  # or open in your editor

# Key local settings (already set):
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/buildbrain_dev
REDIS_URL=redis://localhost:6379
MONGODB_URI=mongodb://admin:admin@localhost:27017/buildbrain
OPENAI_API_KEY=sk-test-key  # Add real key for AI features
STRIPE_SECRET_KEY=sk_test_...  # Add real key for payments
STRIPE_PUBLIC_KEY=pk_test_...
DWOLLA_API_KEY=...  # Add real key for ACH payments
```

### 5. Initialize Database

```bash
# Navigate to backend directory
cd backend

# Create database
npm run db:create

# Run migrations
npm run db:migrate

# Seed with test data
npm run db:seed

# Expected output:
# ✓ Seeding database
# ✓ Created 5 test users
# ✓ Created 2 test projects
# ✓ Database seeding complete
```

### 6. Start Backend Services

**Open 6 separate terminal windows/tabs and run:**

```bash
# Terminal 1: Auth Service
cd services/auth-service
npm run dev

# Terminal 2: Payment Service
cd services/payment-service
npm run dev

# Terminal 3: Project Service
cd services/project-service
npm run dev

# Terminal 4: Marketplace Service
cd services/marketplace-service
npm run dev

# Terminal 5: Compliance Service
cd services/compliance-service
npm run dev

# Terminal 6: AI Service
cd services/ai-service
npm run dev

# Expected output from each:
# [Nest] 12345 - 01/15/2024, 10:15:30 AM     LOG [NestFactory] Starting Nest application...
# [Nest] 12345 - 01/15/2024, 10:15:32 AM     LOG [InstanceLoader] DatabaseModule dependencies initialized
# [Nest] 12345 - 01/15/2024, 10:15:33 AM     LOG Server running on http://localhost:3001
```

### 7. Start Frontend (New Terminal)

```bash
# Navigate to frontend
cd client/web-desktop

# Start Next.js development server
npm run dev

# Expected output:
# ▲ Next.js 14.0.0
# - Local:        http://localhost:3000
# - Environments: .env.local
#
# ✓ Ready in 2.5s
```

### 8. Start Mobile App (Optional, New Terminal)

```bash
# Navigate to mobile app (iOS/Android via Expo)
cd client/mobile

# Start Expo development server
npx expo start

# Then press:
# i - Open in iOS Simulator
# a - Open in Android Emulator
# w - Open in web browser
```

---

## Access Applications

Once all services are running, access:

| Service | URL | Credentials |
|---------|-----|-------------|
| **Web Dashboard** | http://localhost:3000 | Demo account (created by seed) |
| **API Documentation** | http://localhost:4000/api/docs | (Swagger UI) |
| **PostgreSQL Admin** | http://localhost:5050/pgadmin | admin@buildbrain.io / admin |
| **MongoDB Admin** | http://localhost:8081 | admin / admin |
| **Minio S3 Storage** | http://localhost:9001 | minioadmin / minioadmin |
| **RabbitMQ** | http://localhost:15672 | guest / guest |

---

## Test the Platform

### Create Test Account

After seeding, use these pre-created accounts:

**General Contractor Accounts:**
```
Email: john@aceconstruction.com
Password: (Set in seed, or check database)
Wallet: $250,000 USD
```

**Worker Accounts:**
```
Email: mike@electrician.com
Password: (Set in seed, or check database)
Wallet: $12,400 USD
Skills: Electrical Work (8 years)
```

### Run Integration Tests

```bash
# From backend directory
npm run test:integration

# Expected output:
# PASS  api.test.ts
#   ✓ User can register (45ms)
#   ✓ User can login (32ms)
#   ✓ GC can create project (120ms)
#   ✓ GC can create milestone (85ms)
#   ...
#
# Test Suites: 1 passed, 1 total
# Tests: 30 passed, 30 total
```

### Test Payment Flow

```bash
# Create a test payment using API
curl -X POST http://localhost:3001/payments/request \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "projectId": "project-1",
    "milestoneId": "milestone-1",
    "recipientId": "worker-1",
    "method": "INTERNAL_LEDGER",
    "description": "Test payment"
  }'
```

### Verify All APIs

```bash
# From backend directory
npm run lint

# Expected output:
# 0 errors, 0 warnings
```

---

## Common Issues & Troubleshooting

### Port Already in Use

```bash
# Kill process on specific port
# macOS/Linux:
lsof -i :3000
kill -9 <PID>

# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Database Connection Error

```bash
# Check PostgreSQL is running
docker-compose -f docker-compose.dev.yml logs postgres

# Restart database
docker-compose -f docker-compose.dev.yml restart postgres

# Verify connection
psql -U postgres -h localhost -d buildbrain_dev -c "SELECT version();"
```

### Redis Connection Error

```bash
# Check Redis is running
docker-compose -f docker-compose.dev.yml logs redis

# Restart Redis
docker-compose -f docker-compose.dev.yml restart redis

# Test connection
redis-cli ping
# Expected: PONG
```

### npm install Issues

```bash
# Clear npm cache
npm cache clean --force

# Delete lock files and reinstall
rm -rf node_modules package-lock.json
npm install

# For monorepo issues
rm -rf node_modules packages/*/node_modules
npm install
```

### Docker Issues

```bash
# Prune unused images and containers
docker system prune -a --volumes

# Rebuild containers
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml build
docker-compose -f docker-compose.dev.yml up -d
```

### Out of Memory

If services crash with OOM:
```bash
# Increase Docker memory (Desktop app settings)
# Or in docker-compose.dev.yml, add:
# services:
#   postgres:
#     deploy:
#       resources:
#         limits:
#           memory: 2G
```

---

## IDE Setup (VS Code)

### Recommended Extensions

Install these extensions for better development experience:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "prisma.prisma",
    "apollographql.vscode-apollo",
    "redhat.vscode-yaml",
    "ms-azuretools.vscode-docker",
    "eamodio.gitlens",
    "wakatime.vscode-wakatime"
  ]
}
```

**Install via VS Code:**
```
Ctrl+P (or Cmd+P on Mac)
ext install dbaeumer.vscode-eslint esbenp.prettier-vscode prisma.prisma
```

### VS Code Settings

Create `.vscode/settings.json`:

```json
{
  "eslint.validate": ["javascript", "typescript", "typescriptreact"],
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true
  },
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

---

## Next Steps

### After Installation

1. **Create Your Account**
   - Sign up on http://localhost:3000
   - Complete KYC verification
   - Add payment method

2. **Create Your First Project**
   - Fill project details
   - Create milestones
   - Post to marketplace

3. **Post a Job**
   - Describe your work
   - Set budget and timeline
   - Review worker bids

4. **Review Documentation**
   - [API Documentation](./API.md)
   - [Architecture Guide](./docs/ARCHITECTURE.md)
   - [Database Schema](./docs/SCHEMA.md)

### Development Workflow

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes
# Edit files in services/

# 3. Run tests and linting
npm run lint
npm run test:unit

# 4. Commit and push
git add .
git commit -m "feat: add new feature"
git push origin feature/my-feature

# 5. Create pull request on GitHub
```

### Useful Commands

```bash
# Watch for changes and auto-reload
npm run dev:watch

# Run tests
npm run test:unit
npm run test:integration
npm run test:e2e

# Build for production
npm run build

# View database
npx prisma studio

# Generate API types
npm run generate:types

# Format code
npm run format

# Check for vulnerabilities
npm audit

# Update dependencies
npm update
npm outdated
```

---

## Environment Variables Reference

Key environment variables for local development:

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/buildbrain_dev
REDIS_URL=redis://localhost:6379
MONGODB_URI=mongodb://admin:admin@localhost:27017/buildbrain?authSource=admin

# API
API_PORT=3001
API_HOST=localhost
NODE_ENV=development

# Security (not used in dev, stub values)
JWT_SECRET=dev-secret-key-change-in-production
REFRESH_TOKEN_SECRET=dev-refresh-secret-change-in-production

# External Services (get real keys for full features)
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...

DWOLLA_API_KEY=...
DWOLLA_API_SECRET=...

OPENAI_API_KEY=sk-...

# Optional: Use ngrok for webhook testing
NGROK_URL=http://localhost:3001

# S3/Minio
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=buildbrain-dev

# Email (test in console, or use SendGrid key)
SENDGRID_API_KEY=...

# Google/OAuth (optional)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

---

## Getting Help

- **Documentation**: `docs/` directory
- **Issues**: Open issue on GitHub
- **Discussions**: GitHub Discussions tab
- **Email**: support@buildbrain.io
- **Slack**: [Join community Slack](link)

---

## Production Deployment

After development testing, see [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for:
- Building Docker images
- Pushing to registry
- Deploying to Kubernetes
- AWS/EKS configuration
- CI/CD pipeline setup

---

## License

See [LICENSE](./LICENSE) file.

**Happy building! 🏗️**

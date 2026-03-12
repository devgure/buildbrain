# Development Setup Guide

This guide will get you from zero to a running BuildBrainOS development environment in about 15 minutes.

## Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Docker & Docker Compose** ([Download](https://www.docker.com/products/docker-desktop))
- **Git** ([Download](https://git-scm.com/))
- **PostgreSQL** 14+ (via Docker, or local install)
- **Redis** 7+ (via Docker, or local install)

## Step 1: Clone Repository

```bash
git clone https://github.com/yourusername/buildbrain.git
cd buildbrain
```

## Step 2: Install Dependencies

```bash
# Install root dependencies
npm install

# Install service-level dependencies (done automatically for monorepo)
# npm installs across all workspaces
```

## Step 3: Start Infrastructure Stack

The docker-compose includes PostgreSQL, MongoDB, Redis, and Qdrant:

```bash
# Start all services
docker-compose up -d

# Verify services are running
docker-compose ps

# View logs
docker-compose logs -f postgres redis mongodb
```

**Services:**
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- MongoDB: `localhost:27017`
- Qdrant: `localhost:6333`

## Step 4: Setup Environment Variables

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your values (most defaults work for local dev)
nano .env
```

**Key variables for development:**
```env
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/buildbrain_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-key-change-in-production
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

## Step 5: Initialize Database

```bash
# Create database
npm run db:create

# Run migrations
npm run db:migrate

# Seed with test data
npm run db:seed
```

**Database file structure:**
- `/data/schema.prisma` - Data model
- `/data/migrations/` - Migration files
- `/data/seed.ts` - Seed script

## Step 6: Start Development Servers

Open multiple terminals and run:

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

# Terminal 5: AI Service (Python)
cd services/ai-service
python -m uvicorn main:app --reload

# Terminal 6: API Gateway/API Server
cd backend
npm run dev

# Terminal 7: Frontend (Next.js)
cd client/web-desktop
npm run dev
```

## Step 7: Access the Application

- **Web Dashboard**: http://localhost:3000
- **API**: http://localhost:4000/api/v1
- **API Docs (Swagger)**: http://localhost:4000/api/docs
- **PostgreSQL Admin (pgAdmin)**: http://localhost:5050
  - Email: admin@buildbrain.io
  - Password: admin

## Step 8: Create Test Account

```bash
# Via CLI
npm run cli:register-user -- \
  --email test@buildbrain.io \
  --password TestPassword123! \
  --role GC \
  --company "Test Construction"

# Via API (cURL)
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@buildbrain.io",
    "password": "TestPassword123!",
    "role": "GC",
    "companyName": "Test Construction"
  }'
```

## Common Development Tasks

### Run Tests

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# With coverage
npm run test:coverage
```

### Lint & Format

```bash
# Lint all code
npm run lint

# Fix linting issues
npm run lint:fix

# Format with Prettier
npm run format
```

### Database Management

```bash
# Reset database (WARNING: Deletes all data)
npm run db:reset

# Create migration for schema changes
npm run db:migrate:create -- --name your_migration_name

# View database GUI
npm run db:studio
```

### Docker Management

```bash
# Stop all services
docker-compose down

# Remove volumes (WARNING: Deletes data)
docker-compose down -v

# View logs for specific service
docker-compose logs -f postgres

# Rebuild containers
docker-compose build
```

## Troubleshooting

### Port Already in Use

If port 3000, 4000, etc. are already in use:

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
```

### Database Connection Failed

```bash
# Verify PostgreSQL is running
docker-compose logs postgres

# Check database URL in .env
echo $DATABASE_URL

# Reset database
npm run db:reset
```

### Redis Connection Error

```bash
# Verify Redis is running
docker-compose logs redis

# Test connection
redis-cli ping
# Should return PONG
```

### Node_modules Corruption

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm run db:migrate
npm run dev
```

## IDE Setup

### VS Code Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "prisma.prisma",
    "GraphQL.vscode-graphql",
    "REST Client.rest-client"
  ]
}
```

Install with: `code --install-extension dbaeumer.vscode-eslint`

### VS Code Settings

Create `.vscode/settings.json`:

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "eslint.enable": true,
  "[prisma]": {
    "editor.defaultFormatter": "Prisma.prisma"
  }
}
```

## Next Steps

1. Read [ARCHITECTURE.md](./ARCHITECTURE.md) to understand system design
2. Review [API.openapi.yaml](./docs/API.openapi.yaml) for endpoint documentation
3. Check [services/auth-service/README.md](./services/auth-service/README.md) for service-specific setup
4. Look at [DEPLOYMENT_AWS.md](./docs/DEPLOYMENT_AWS.md) to understand production setup

## Getting Help

- **Docs**: Check `/docs/` folder
- **Issues**: GitHub Issues tracker
- **Slack**: #buildbrain-dev Slack channel
- **Email**: dev@buildbrain.io

## Next: Production Deployment

Once development is working locally:

1. Follow [DEPLOYMENT_AWS.md](./docs/DEPLOYMENT_AWS.md) for AWS/EKS setup
2. Configure GitHub Actions CI/CD (`.github/workflows/`)
3. Set up monitoring with Prometheus/Grafana
4. Configure AlertManager for on-call notifications

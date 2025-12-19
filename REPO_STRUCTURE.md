# BuildBrain — Repository File Structure

This document lists the repository layout (folders and important files) for the BuildBrain project and short descriptions for each area.

Root
- README.md — project overview and quickstart (updated with Codecov badge/instructions)
- brouillon.txt — product notes / brainstorming
- docker-compose.yml — optional local dev compose (GPU/CPU hints)
- .env.example — example env variables

Folders
- ai-agents/
  - blueprint-analyzer/ (agent) — Dockerfile, main.py
  - material-delay-bot/ — Dockerfile, main.py
  - safety-inspector/ — Dockerfile, main.py
  - sub-coordinator/ — Dockerfile, main.py

- api-gateway/
  - auth0-script.js
  - kong.yaml
  - import_jwks.py / import_jwks_auto.py — JWKS fetcher and Kong upload helper
  - tests/ — pytest tests for importer/templates

- backend/
  - index.js — Express app entry (mounts routes)
  - routes/
    - upload.js — file upload + OCR ingestion
    - rfi.js — RFI CRUD routes
    - email.js — inbound email webhook
    - billing.js — Stripe checkout endpoints
    - stripe_webhooks.js — raw webhook handler
  - services/
    - minioClient.js — S3/MinIO wrapper
    - ocrService.js — Tesseract wrapper
    - donutClient.js / ocr_donut/ — Donut model client & FastAPI stubs
    - embeddingsService.js — OpenAI/fallback embeddings
    - qdrantClient.js / pinecone_stub/ — vector index clients and stub
    - stripeService.js — create checkout sessions
    - i18nService.js — simple translation helper (Google Translate)
    - emailParser.js — email parsing logic (now supports translations)
  - prismaClient.js — Prisma client initialization
  - tests/ — Jest tests (rfi.routes.test.js, upload.routes.test.js, translate smoke tests)
  - package.json — Node dependencies & scripts

- business-logic/
  - compliance-rules/main.py
  - risk-model/main.py
  - schedule-engine/main.py

- clients/
  - field-app/ — React web/mobile client scaffold
  - procore-plugin/ — plugin scaffold
  - web-portal/ — frontend app scaffold (Vite/React)

- data-layer/
  - mongodb/init.js
  - neo4j/init.cypher
  - pinecone/init.py
  - redis/init.sh

- external-integrations/
  - bluebeam/main.py
  - insurance-api/main.py
  - procore/main.py

- orchestrator/
  - docker-compose.yml
  - temporal/
    - worker.go
    - workflow.go

- prisma/
  - schema.prisma — MongoDB models (User, Project, RFI, Billing models: Subscription, Invoice)

- backend/pinecone_stub/
  - app.py — Flask stub exposing Pinecone-compatible API for local testing

- backend/ocr_donut/
  - app.py (FastAPI extract endpoint), Dockerfile.prod, Dockerfile.gpu.prod

- deploy/
  - scripts/deploy.sh
  - README-ubuntu-vps.md
  - systemd/ — unit files for services (backend, donut, temporal-worker, qdrant, minio, kong, pinecone-stub)
  - nginx/buildbrain.conf

- .github/
  - workflows/
    - node-tests.yml — simple node test workflow (optional)
    - ci.yml — combined CI (Node matrix, Python matrix, caching, coverage, Codecov steps)

- scripts/
  - create_pr.sh — helper to create branch, commit and call `gh pr create`
  - create_pr.ps1 — PowerShell variant

Notes on testing & CI
- CI runs Node Jest tests and Python pytest tests with coverage; artifacts uploaded. Codecov uploads will run only when `CODECOV_TOKEN` secret is present.
- Local test commands are documented in the README.

Next actions / Suggestions
- Add integration tests that spin up `docker compose` (Mongo, MinIO, Qdrant) and run end-to-end smoke tests.
- Add secrets management / vault instructions and CI environment secrets (`CODECOV_TOKEN`, Stripe keys, Auth0 keys).
- Finish frontend build & Dockerfile, and wire frontend to API gateway (Kong) for local dev.

If you want, I can convert this into a tree output file (`repo-tree.txt`) or add companion `ls`/`tree` scripts that reproduce this structure.

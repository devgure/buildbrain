# BuildBrain Platform - API Reference

Complete API documentation for all BuildBrain microservices.

**Base URL**: `http://localhost:4000/api/v1` (Development)

**Authentication**: All endpoints require JWT token in `Authorization: Bearer <TOKEN>` header

---

## Table of Contents

1. [Authentication Service](#authentication-service)
2. [Payment Service](#payment-service)
3. [Project Service](#project-service)
4. [Marketplace Service](#marketplace-service)
5. [Compliance Service](#compliance-service)
6. [AI Service](#ai-service)
7. [Common Responses](#common-responses)

---

## Authentication Service

### Register User

```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe",
  "phone": "+1-555-123-4567",
  "company": "Acme Construction",
  "role": "GC"  // GC, SUBCONTRACTOR, WORKER, GOVERNMENT, SUPPLIER
}
```

**Response 201 Created:**
```json
{
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "GC",
    "kycTier": "TIER_1",
    "kycStatus": "PENDING",
    "rating": 0
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response 200 OK:**
```json
{
  "user": { /* user object */ },
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

### Refresh Token

```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJ..."
}
```

**Response 200 OK:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

### Get Current User

```http
GET /auth/me
Authorization: Bearer <TOKEN>
```

**Response 200 OK:**
```json
{
  "id": "user-123",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "GC",
  "kycTier": "TIER_3",
  "kycStatus": "APPROVED",
  "rating": 4.8,
  "company": "Acme Construction",
  "phone": "+1-555-123-4567"
}
```

---

## Payment Service

### Request Payment

Initiate a payment between users (requires sender approval).

```http
POST /payments/request
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "amount": 5000.00,
  "projectId": "project-456",
  "milestoneId": "milestone-789",
  "recipientId": "user-worker-123",
  "method": "INTERNAL_LEDGER",  // INTERNAL_LEDGER, ACH, CARD, USDC
  "description": "Payment for electrical work - Milestone 1"
}
```

**Response 201 Created:**
```json
{
  "id": "payment-123",
  "senderId": "user-gc-456",
  "recipientId": "user-worker-123",
  "amount": "5000.00",
  "method": "INTERNAL_LEDGER",
  "status": "PENDING",
  "projectId": "project-456",
  "createdAt": "2024-01-15T10:30:00Z",
  "approvedAt": null
}
```

### Approve Payment

```http
PATCH /payments/:paymentId/approve
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "method": "INTERNAL_LEDGER"  // Optionally override payment method
}
```

**Response 200 OK:**
```json
{
  "id": "payment-123",
  "status": "COMPLETED",
  "completedAt": "2024-01-15T10:31:00Z",
  "externalTransactionId": null  // Set if using STRIPE, DWOLLA, etc.
}
```

### Reject Payment

```http
PATCH /payments/:paymentId/reject
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "reason": "Work not satisfactory"
}
```

**Response 200 OK:**
```json
{
  "id": "payment-123",
  "status": "REJECTED",
  "rejectedAt": "2024-01-15T10:35:00Z",
  "reason": "Work not satisfactory"
}
```

### Get Payment Details

```http
GET /payments/:paymentId
Authorization: Bearer <TOKEN>
```

**Response 200 OK:**
```json
{
  "id": "payment-123",
  "sender": {
    "id": "user-gc-456",
    "name": "John Doe",
    "email": "john@acme.com"
  },
  "recipient": {
    "id": "user-worker-123",
    "name": "Mike Smith",
    "email": "mike@electrician.com"
  },
  "amount": "5000.00",
  "method": "INTERNAL_LEDGER",
  "status": "COMPLETED",
  "createdAt": "2024-01-15T10:30:00Z",
  "approvedAt": "2024-01-15T10:31:00Z"
}
```

### Get Wallet Balance

```http
GET /payments/wallet/balance
Authorization: Bearer <TOKEN>
```

**Response 200 OK:**
```json
{
  "userId": "user-123",
  "usdBalance": "25000.50",
  "usdcBalance": "5000.00",
  "platformCredits": 250,
  "kycTierLimit": "999999.00",  // Maximum monthly limit for KYC tier
  "settlementPending": "2000.00"  // Funds awaiting completion
}
```

### Request Withdrawal

```http
POST /payments/withdraw
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "amount": 5000.00,
  "method": "ACH",  // ACH, CARD, USDC
  "bankAccountNumber": "123456789",  // Only for ACH
  "routingNumber": "021000021"        // Only for ACH
}
```

**Response 201 Created:**
```json
{
  "id": "withdrawal-123",
  "amount": "5000.00",
  "method": "ACH",
  "status": "PENDING",
  "estimatedDelivery": "2024-01-17",  // T+2 for ACH
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### Get Transaction History

```http
GET /payments/history?skip=0&take=20&status=COMPLETED
Authorization: Bearer <TOKEN>
```

**Response 200 OK:**
```json
{
  "items": [
    {
      "id": "payment-123",
      "type": "PAYMENT",  // PAYMENT, WITHDRAWAL, DEPOSIT
      "amount": "5000.00",
      "direction": "OUTGOING",  // INCOMING, OUTGOING
      "counterparty": {
        "id": "user-worker-123",
        "name": "Mike Smith"
      },
      "status": "COMPLETED",
      "description": "Payment for electrical work",
      "timestamp": "2024-01-15T10:31:00Z"
    }
  ],
  "total": 42,
  "skip": 0,
  "take": 20
}
```

---

## Project Service

### Create Project

```http
POST /projects
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "title": "Downtown Office Building Renovation",
  "description": "Complete renovation of 50,000 sqft office space",
  "budget": 1200000.00,
  "scope": "General construction",
  "location": "123 Main St, San Francisco, CA 94105",
  "city": "San Francisco",
  "state": "CA",
  "zipCode": "94105",
  "startDate": "2024-02-01",
  "endDate": "2024-12-31",
  "type": "COMMERCIAL"  // RESIDENTIAL, COMMERCIAL, INDUSTRIAL
}
```

**Response 201 Created:**
```json
{
  "id": "project-123",
  "gcId": "user-gc-456",
  "title": "Downtown Office Building Renovation",
  "description": "...",
  "budget": "1200000.00",
  "status": "PLANNING",  // PLANNING, ACTIVE, ON_HOLD, COMPLETED
  "location": "123 Main St, San Francisco, CA 94105",
  "startDate": "2024-02-01",
  "endDate": "2024-12-31",
  "type": "COMMERCIAL",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### List Projects

```http
GET /projects?status=ACTIVE&skip=0&take=10
Authorization: Bearer <TOKEN>
```

**Query Parameters:**
- `status`: PLANNING, ACTIVE, ON_HOLD, COMPLETED
- `skip`: Pagination offset (default 0)
- `take`: Items per page (default 10)

**Response 200 OK:**
```json
{
  "items": [
    { /* project objects */ }
  ],
  "total": 42,
  "skip": 0,
  "take": 10
}
```

### Get Project Details

```http
GET /projects/:projectId
Authorization: Bearer <TOKEN>
```

**Response 200 OK:**
```json
{
  "id": "project-123",
  "title": "Downtown Office Building Renovation",
  "description": "...",
  "budget": "1200000.00",
  "spent": "450000.50",  // Total paid out
  "remaining": "750000.00",
  "status": "ACTIVE",
  "gc": {
    "id": "user-gc-456",
    "name": "John Doe",
    "company": "Acme Construction",
    "rating": 4.8
  },
  "milestones": [
    {
      "id": "milestone-1",
      "title": "Foundation",
      "amount": "200000.00",
      "percentage": 16.67,
      "status": "COMPLETED",
      "dueDate": "2024-03-31",
      "completedAt": "2024-03-28"
    },
    {
      "id": "milestone-2",
      "title": "Structural Steel",
      "amount": "350000.00",
      "percentage": 29.17,
      "status": "IN_PROGRESS",
      "dueDate": "2024-05-31"
    }
  ],
  "documents": [
    {
      "id": "doc-123",
      "fileName": "project_blueprint_v2.pdf",
      "fileType": "pdf",
      "url": "https://s3.amazonaws.com/buildbrain-docs/project_blueprint_v2.pdf",
      "status": "PROCESSING",  // PENDING, PROCESSING, COMPLETED
      "uploadedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "workers": [
    {
      "id": "assignment-123",
      "workerId": "user-worker-123",
      "workerName": "Mike Smith",
      "role": "Electrician",
      "status": "ACTIVE",
      "startDate": "2024-02-01"
    }
  ],
  "timeline": {
    "startDate": "2024-02-01",
    "endDate": "2024-12-31",
    "daysRemaining": 315,
    "completionPercentage": 40,
    "overdueMilestones": 0
  }
}
```

### Update Project

```http
PATCH /projects/:projectId
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "title": "Updated Title",
  "status": "ACTIVE",  // Only if in PLANNING
  "endDate": "2024-11-30"  // Can extend/reduce
}
```

**Response 200 OK:**
```json
{ /* updated project */ }
```

### Create Milestone

```http
POST /projects/:projectId/milestones
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "title": "Foundation & Excavation",
  "amount": 250000.00,
  "percentage": 20.83,  // Will validate against project budget
  "dueDate": "2024-03-15",
  "deliverables": [
    "Foundation grade beams",
    "Concrete footings",
    "Site preparation"
  ]
}
```

**Response 201 Created:**
```json
{
  "id": "milestone-123",
  "projectId": "project-123",
  "title": "Foundation & Excavation",
  "amount": "250000.00",
  "percentage": 20.83,
  "status": "PENDING",
  "dueDate": "2024-03-15",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### Complete Milestone

```http
PATCH /projects/:projectId/milestones/:milestoneId/complete
Authorization: Bearer <TOKEN>
```

**Response 200 OK:**
```json
{
  "id": "milestone-123",
  "status": "COMPLETED",
  "completedAt": "2024-03-15T16:30:00Z"
}
```

### Upload Project Document

```http
POST /projects/:projectId/documents
Authorization: Bearer <TOKEN>
Content-Type: multipart/form-data

file: <PDF, image, or office document>
```

**Response 201 Created:**
```json
{
  "id": "doc-123",
  "projectId": "project-123",
  "fileName": "blueprint_v2.pdf",
  "fileType": "pdf",
  "url": "https://s3.amazonaws.com/buildbrain-docs/blueprint_v2.pdf",
  "status": "PROCESSING",
  "uploadedAt": "2024-01-15T10:30:00Z",
  "uploadedBy": {
    "id": "user-gc-456",
    "name": "John Doe"
  }
}
```

### Get Budget Analysis

```http
GET /projects/:projectId/budget
Authorization: Bearer <TOKEN>
```

**Response 200 OK:**
```json
{
  "projectId": "project-123",
  "totalBudget": "1200000.00",
  "spent": "450000.50",
  "pending": "200000.00",  // Approved but not completed payments
  "remaining": "550000.00",
  "utilizationPercent": 37.5,
  "burnRate": "12500.00/day",  // Average daily spend
  "projectedCompletionCost": "1245000.00",  // Exceeds budget by $45k
  "costOverrunRisk": "HIGH"
}
```

### Get Project Timeline

```http
GET /projects/:projectId/timeline
Authorization: Bearer <TOKEN>
```

**Response 200 OK:**
```json
{
  "projectId": "project-123",
  "startDate": "2024-02-01",
  "endDate": "2024-12-31",
  "completionPercentage": 40,
  "daysElapsed": 14,
  "daysRemaining": 315,
  "milestoneStatus": {
    "completed": 1,
    "inProgress": 2,
    "pending": 4,
    "overdue": 0
  },
  "schedule": [
    {
      "milestoneId": "milestone-1",
      "title": "Foundation",
      "originalDueDate": "2024-03-31",
      "actualCompletionDate": "2024-03-28",
      "status": "COMPLETED",
      "daysEarlyLate": "3 days early"
    }
  ]
}
```

### Assign Worker to Project

```http
POST /projects/:projectId/workers
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "workerId": "user-worker-123",
  "role": "Electrician",
  "startDate": "2024-02-01",
  "endDate": "2024-06-30"
}
```

**Response 201 Created:**
```json
{
  "id": "assignment-123",
  "projectId": "project-123",
  "workerId": "user-worker-123",
  "role": "Electrician",
  "status": "ACTIVE",
  "startDate": "2024-02-01",
  "endDate": "2024-06-30"
}
```

---

## Marketplace Service

### Post Job

```http
POST /marketplace/jobs
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "title": "Electrical Wiring - Commercial Building",
  "description": "Complete electrical installation for 50,000 sqft commercial space...",
  "category": "ELECTRICAL",  // ELECTRICAL, PLUMBING, HVAC, CARPENTRY, etc.
  "requiredSkills": ["Electrical Work", "Commercial Wiring", "Code Compliance"],
  "minRate": 75.00,
  "maxRate": 150.00,
  "currency": "USD",
  "location": "123 Main St, San Francisco, CA 94105",
  "geoLat": 37.7749,
  "geoLng": -122.4194,
  "openPositions": 2,
  "description": "Detailed job description...",
  "timeline": "3-4 weeks starting Feb 1",
  "estimatedHours": null
}
```

**Response 201 Created:**
```json
{
  "id": "job-123",
  "createdBy": "user-gc-456",
  "title": "Electrical Wiring - Commercial Building",
  "category": "ELECTRICAL",
  "status": "OPEN",  // OPEN, IN_PROGRESS, COMPLETED, CANCELLED
  "minRate": "75.00",
  "maxRate": "150.00",
  "location": "123 Main St, San Francisco, CA 94105",
  "openPositions": 2,
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### Search Jobs

```http
GET /marketplace/jobs/search?category=ELECTRICAL&minRate=75&maxRate=150&location=San%20Francisco&skip=0&take=10
Authorization: Bearer <TOKEN>
```

**Query Parameters:**
- `category`: ELECTRICAL, PLUMBING, HVAC, CARPENTRY, etc.
- `minRate`, `maxRate`: Hourly rate range
- `location`: City or address
- `skills`: Comma-separated required skills
- `skip`: Pagination offset
- `take`: Items per page (max 50)

**Response 200 OK:**
```json
{
  "items": [
    {
      "id": "job-123",
      "title": "Electrical Wiring - Commercial Building",
      "category": "ELECTRICAL",
      "minRate": "75.00",
      "maxRate": "150.00",
      "location": "San Francisco, CA",
      "requiredSkills": ["Electrical Work", "Commercial Wiring"],
      "openPositions": 2,
      "creatorRating": 4.8,
      "matchScore": 92,  // AI-calculated relevance to current user
      "bidCount": 5,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 42,
  "skip": 0,
  "take": 10
}
```

### Get Job Details

```http
GET /marketplace/jobs/:jobId
Authorization: Bearer <TOKEN>
```

**Response 200 OK:**
```json
{
  "id": "job-123",
  "title": "Electrical Wiring - Commercial Building",
  "description": "Complete electrical installation for 50,000 sqft commercial space...",
  "category": "ELECTRICAL",
  "minRate": "75.00",
  "maxRate": "150.00",
  "location": "123 Main St, San Francisco, CA 94105",
  "geoLat": 37.7749,
  "geoLng": -122.4194,
  "openPositions": 2,
  "requiredSkills": ["Electrical Work", "Commercial Wiring"],
  "createdBy": {
    "id": "user-gc-456",
    "name": "John Doe",
    "company": "Acme Construction",
    "rating": 4.8,
    "projectsCompleted": 12
  },
  "status": "OPEN",
  "bids": {
    "count": 5,
    "topBids": [
      {
        "id": "bid-1",
        "bidderId": "user-worker-789",
        "bidderName": "Mike Smith",
        "bidderRating": 4.9,
        "amount": "95.00/hr",
        "proposal": "I have 8 years of commercial electrical experience...",
        "aiScore": 92,  // AI matching score
        "status": "PENDING"
      }
    ]
  },
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### Submit Bid

```http
POST /marketplace/jobs/:jobId/bids
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "amount": 95.00,
  "currency": "USD",
  "proposal": "I have 8 years of commercial electrical experience with multiple high-rise projects...",
  "portfolio": [
    {
      "title": "Downtown Tower Electrical Retrofit",
      "description": "Led electrical team for 30-story renovation",
      "url": "https://example.com/portfolio/tower-project"
    }
  ],
  "expectedDuration": "3 weeks",
  "availability": "Available to start February 1st"
}
```

**Response 201 Created:**
```json
{
  "id": "bid-123",
  "jobId": "job-123",
  "bidderId": "user-worker-789",
  "amount": "95.00",
  "proposal": "...",
  "portfolio": [ /* portfolio items */ ],
  "status": "SUBMITTED",
  "aiScore": 92,  // AI calculated match score 0-100
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### Accept Bid

Once job creator selects winning bid:

```http
PATCH /marketplace/jobs/:jobId/bids/:bidId/accept
Authorization: Bearer <TOKEN>
```

**Response 200 OK:**
```json
{
  "id": "bid-123",
  "status": "ACCEPTED",
  "acceptedAt": "2024-01-15T10:45:00Z",
  "assignment": {
    "id": "assignment-123",
    "projectId": "project-123",
    "workerId": "user-worker-789",
    "role": "Electrician",
    "status": "ACTIVE",
    "startDate": "2024-02-01"
  }
}
```

All other bids automatically rejected.

### Get My Jobs/Bids

```http
GET /marketplace/my-jobs?type=employer  // or 'worker'
Authorization: Bearer <TOKEN>
```

**Response 200 OK:**
```json
{
  "items": [
    {
      "id": "job-123",
      "title": "Electrical Wiring",
      "myRole": "CREATOR",  // CREATOR, BIDDER, ASSIGNED
      "bidStatus": "ACCEPTED",
      "amount": "95.00/hr",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 8
}
```

### Submit Review

After job completion:

```http
POST /marketplace/jobs/:jobId/reviews
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "rating": 5,  // 1-5 stars
  "comment": "Mike did excellent work. Very professional and on schedule. Highly recommend!",
  "workerId": "user-worker-789"
}
```

**Response 201 Created:**
```json
{
  "id": "review-123",
  "jobId": "job-123",
  "reviewerId": "user-gc-456",
  "revieweeId": "user-worker-789",
  "rating": 5,
  "comment": "...",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

## Compliance Service

### Initiate KYC Verification

```http
POST /compliance/kyc/initiate
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-15",
  "socialSecurityNumber": "123-45-6789",
  "email": "john@example.com",
  "phone": "+1-555-123-4567",
  "address": {
    "street": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "zipCode": "94105"
  },
  "businessName": "Acme Construction",
  "ein": "12-3456789"
}
```

**Response 201 Created:**
```json
{
  "status": "APPROVED",  // APPROVED, PENDING, REJECTED, MANUAL_REVIEW
  "tier": "TIER_3",  // TIER_1 ($1k/mo), TIER_2 ($10k/mo), TIER_3 (unlimited)
  "monthlyLimit": "999999.00",
  "verification": {
    "identity": true,
    "address": true,
    "bankAccount": false,
    "businessDocuments": true
  },
  "riskScore": 12,  // 0-100, lower is better
  "message": "Your identity has been verified! You can now use all platform features."
}
```

### Verify License

```http
POST /compliance/license/verify
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "licenseNumber": "C-123456",
  "licenseType": "CONTRACTOR",  // CONTRACTOR, ELECTRICIAN, PLUMBER, HVAC
  "issuingState": "CA"
}
```

**Response 201 Created:**
```json
{
  "licenseNumber": "C-123456",
  "licenseType": "CONTRACTOR",
  "issuingState": "CA",
  "status": "ACTIVE",  // ACTIVE, EXPIRED, SUSPENDED, NOT_FOUND
  "expirationDate": "2026-12-31",
  "verified": true,
  "verificationDate": "2024-01-15T10:30:00Z"
}
```

### Verify Insurance

```http
POST /compliance/insurance/verify
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "type": "GENERAL_LIABILITY",  // GENERAL_LIABILITY, WORKERS_COMP, PROFESSIONAL_LIABILITY
  "provider": "State Farm",
  "policyNumber": "POL-123456789",
  "expirationDate": "2025-12-31",
  "documentUrl": "https://s3.amazonaws.com/insurance-doc.pdf"
}
```

**Response 201 Created:**
```json
{
  "verified": true,
  "message": "GENERAL_LIABILITY verified until 2025-12-31"
}
```

### Get Compliance Status

```http
GET /compliance/status
Authorization: Bearer <TOKEN>
```

**Response 200 OK:**
```json
{
  "kycStatus": "APPROVED",
  "kycTier": "TIER_3",
  "certifications": [
    {
      "id": "cert-123",
      "name": "CONTRACTOR License",
      "issuedBy": "CA",
      "verified": true,
      "expirationDate": "2026-12-31"
    }
  ],
  "insurance": {
    "generalLiability": {
      "type": "GENERAL_LIABILITY",
      "provider": "State Farm",
      "expirationDate": "2025-12-31",
      "verified": true
    },
    "workersComp": null,
    "professionalLiability": null
  },
  "expiringSoon": false,
  "expiringDocuments": [],
  "complianceScore": 92  // 0-100
}
```

---

## AI Service

### Extract Document Data

```http
POST /ai/documents/extract
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "documentId": "doc-123",
  "documentUrl": "https://s3.amazonaws.com/buildbrain-docs/contract.pdf",
  "documentType": "CONTRACT"  // Optional hint
}
```

**Response 201 Created:**
```json
{
  "documentId": "doc-123",
  "documentType": "CONTRACT",
  "extractedText": "This contract is entered into between...",
  "structuredData": {
    "parties": ["John Doe", "ABC Construction"],
    "amount": 50000,
    "startDate": "2024-02-01",
    "endDate": "2024-12-31"
  },
  "confidence": 87,  // 0-100
  "extractionTime": 2340,  // milliseconds
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Analyze Document

```http
POST /ai/documents/analyze
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "documentId": "doc-123",
  "documentType": "CONTRACT",
  "extractedData": {
    "parties": ["Party A", "Party B"],
    "amount": 50000,
    "startDate": "2024-02-01"
  }
}
```

**Response 201 Created:**
```json
{
  "summary": "This contract outlines a construction services agreement for $50,000 between two parties.",
  "keyTerms": ["payment terms", "schedule", "deliverables", "liability", "insurance"],
  "risksIdentified": [
    "No liability cap specified",
    "Payment terms heavily favor contractor",
    "Vague deliverables definition"
  ],
  "recommendations": [
    "Add liability cap of $500k",
    "Clarify payment milestones",
    "Define specific deliverables",
    "Add insurance requirements"
  ],
  "estimatedValue": 50000,
  "completionDate": "2024-12-31"
}
```

### Match Workers for Job

```http
POST /ai/jobs/match-workers
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "jobId": "job-123",
  "jobDescription": "Experienced electrician needed for commercial building wiring. Requires 5+ years experience..."
}
```

**Response 201 Created:**
```json
[
  {
    "workerId": "user-worker-123",
    "matchScore": 92,  // 0-100
    "reasoning": "Based on strong skill match (8 years) and excellent rating (4.9/5)"
  },
  {
    "workerId": "user-worker-456",
    "matchScore": 85,
    "reasoning": "Based on relevant certifications and commercial experience"
  }
]
```

### Generate Job Proposal

```http
POST /ai/proposals/generate
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "jobId": "job-123",
  "jobDescription": "Experienced electrician needed for commercial building wiring..."
}
```

**Response 201 Created:**
```json
{
  "proposal": "Project Overview:\nWe propose to provide complete electrical wiring installation...\n\nTimeline:\n- Week 1-2: Planning and site assessment\n- Week 3-6: Main installation\n- Week 7: Testing and inspection\n\nQuality Assurance: 100% inspection before completion.",
  "estimatedCost": 15000,  // Total project cost
  "estimatedDuration": "3-4 weeks"
}
```

---

## Common Responses

### Error Response 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    },
    {
      "field": "budget",
      "message": "Budget must be positive number"
    }
  ]
}
```

### Error Response 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Invalid or missing JWT token"
}
```

### Error Response 403 Forbidden

```json
{
  "statusCode": 403,
  "message": "Forbidden",
  "error": "Only project GC can modify this resource"
}
```

### Error Response 404 Not Found

```json
{
  "statusCode": 404,
  "message": "Not Found",
  "error": "Project with ID 'xyz' not found"
}
```

### Error Response 500 Internal Server Error

```json
{
  "statusCode": 500,
  "message": "Internal Server Error",
  "error": "Database connection failed"
}
```

### Pagination Response

All list endpoints follow this format:

```json
{
  "items": [ /* array of items */ ],
  "total": 42,      // Total count
  "skip": 0,        // Requested offset
  "take": 10,       // Requested limit
  "hasMore": true   // Are there more items available?
}
```

---

## Rate Limiting

Production API implements rate limiting:

**Headers in responses:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1705334400
```

**Rate Limits:**
- **Default**: 100 requests per minute per user
- **Auth endpoints**: 10 requests per minute per IP
- **Payment endpoints**: 5 requests per minute per user

When rate limited, returns **429 Too Many Requests**:

```json
{
  "statusCode": 429,
  "message": "Too Many Requests",
  "retryAfter": 45  // seconds
}
```

---

## Webhooks

The platform sends webhooks for important events. Configure in Settings → Webhooks.

### Payment Completed Event

```json
{
  "event": "payment.completed",
  "timestamp": "2024-01-15T10:31:00Z",
  "data": {
    "paymentId": "payment-123",
    "amount": "5000.00",
    "senderId": "user-gc-456",
    "recipientId": "user-worker-123",
    "projectId": "project-123"
  }
}
```

### Job Bid Received Event

```json
{
  "event": "job.bid_received",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "jobId": "job-123",
    "bidderId": "user-worker-789",
    "bidAmount": "95.00",
    "aiScore": 92
  }
}
```

---

## OpenAPI/Swagger

Full API specification available at:

```
http://localhost:4000/api/docs
http://localhost:4000/api-json
```

Download Swagger JSON:
```bash
curl http://localhost:4000/api-json > openapi.json
```

---

**API Version**: 1.0
**Last Updated**: 2024-01-15
**Status**: In Development

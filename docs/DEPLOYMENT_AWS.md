# BuildBrainOS - AWS Deployment Guide

## Table of Contents
1. Prerequisites
2. Architecture Overview
3. Infrastructure Setup (Terraform)
4. Kubernetes Deployment
5. Database Setup
6. Monitoring & Logging
7. CI/CD Pipeline
8. Scaling & Performance
9. Disaster Recovery
10. Security Hardening

---

## Prerequisites

### Required Tools
- AWS Account with appropriate IAM permissions
- AWS CLI v2.x configured with credentials
- kubectl 1.24+
- Terraform 1.3+
- Docker & Docker Compose (for local testing)
- Git for version control

### AWS Service Quotas to Check
- EC2 (EKS node capacity): Minimum 5 vCPUs
- RDS: Database storage quota
- ALB: Target group and listener limits
- NAT Gateway: IP address limits

### Estimated Costs
- Small deployment (dev/staging): ~$800/month
  - 2x t3.medium EKS nodes ($0.0416/hr each)
  - PostgreSQL db.t3.small ($0.036/hr)
  - NAT Gateway ($0.045/hr)
  - CloudFront + S3

- Medium deployment (production): ~$3,500/month
  - 5x t3.large EKS nodes ($0.1664/hr each)
  - PostgreSQL db.r5.large ($0.272/hr)
  - 2x NAT Gateways ($0.045/hr each)
  - RDS Multi-AZ backup
  - Advanced monitoring/logging

---

## Architecture Overview

### High-Level Design
```
┌─────────────────────────────────────────────────────┐
│                   CloudFront CDN                     │
├─────────────────────────────────────────────────────┤
│              Application Load Balancer (ALB)         │
├─────────────────────────────────────────────────────┤
│     EKS Cluster (Kubernetes)                        │
│  ┌────────────────────────────────────────┐        │
│  │ Multiple Availability Zones (AZs)      │        │
│  │                                        │        │
│  │ Pod Replicas:                          │        │
│  │ - Auth Service (3 replicas)            │        │
│  │ - User Service (3 replicas)            │        │
│  │ - Project Service (3 replicas)         │        │
│  │ - Payment Service (3 replicas)         │        │
│  │ - Marketplace Service (3 replicas)     │        │
│  │ - Compliance Service (2 replicas)      │        │
│  │ - AI Service (2 replicas CPU-optimized)│        │
│  │ - Gov Procurement Service (2 replicas) │        │
│  │ - Notification Service (2 replicas)    │        │
│  │ - Analytics Service (2 replicas)       │        │
│  │ - API Gateway (3 replicas)             │        │
│  │ - Prometheus (1 replica)               │        │
│  │ - Grafana (1 replica)                  │        │
│  └────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│        Data Layer (Multi-Region if applicable)      │
├─────────────────────────────────────────────────────┤
│ - RDS PostgreSQL (Multi-AZ)                         │
│ - ElastiCache Redis (Cluster mode)                  │
│ - MongoDB Atlas (or DocumentDB)                     │
│ - Qdrant Vector DB (self-hosted in EKS)            │
│ - S3 (for document storage)                         │
│ - DynamoDB (optional: for real-time streams)       │
└─────────────────────────────────────────────────────┘
         ↓              ↓              ↓
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Backup     │ │   Logging    │ │  Monitoring  │
│   (S3)       │ │ (CloudWatch) │ │  (Datadog)   │
└──────────────┘ └──────────────┘ └──────────────┘
```

### Regional Deployment
- **Primary Region**: us-east-1 (N. Virginia)
- **Secondary Region**: us-west-2 (Oregon) - for DR
- **Global Accelerator**: Route traffic to nearest region

---

## Infrastructure Setup (Terraform)

### Project Structure
```
infrastructure/
├── terraform/
│   ├── main.tf                 # Main configuration
│   ├── variables.tf            # Input variables
│   ├── outputs.tf              # Output values
│   ├── vpc.tf                  # Network configuration
│   ├── eks.tf                  # EKS cluster
│   ├── rds.tf                  # RDS database
│   ├── elasticache.tf          # Redis cache
│   ├── s3.tf                   # Object storage
│   ├── iam.tf                  # IAM roles/policies
│   ├── security_groups.tf      # Security rules
│   ├── monitoring.tf           # CloudWatch/Datadog
│   ├── secrets.tf              # Secrets Manager
│   ├── alb.tf                  # Load balancer
│   ├── cloudfront.tf           # CDN configuration
│   ├── route53.tf              # DNS configuration
│   ├── environments/
│   │   ├── dev.tfvars          # Dev environment
│   │   ├── staging.tfvars      # Staging environment
│   │   └── prod.tfvars         # Production environment
│   └── modules/
│       ├── vpc/
│       ├── eks/
│       ├── rds/
│       └── networking/
```

### Key Terraform Files

#### variables.tf
```hcl
variable "aws_region" {
  default = "us-east-1"
}

variable "environment" {
  description = "Environment name: dev, staging, prod"
  default     = "dev"
}

variable "cluster_name" {
  description = "EKS cluster name"
  default     = "buildbrain-eks"
}

variable "cluster_version" {
  description = "Kubernetes version"
  default     = "1.27"
}

variable "node_group_desired_size" {
  description = "Desired number of worker nodes"
  default     = 3
}

variable "node_instance_types" {
  description = "EC2 instance types for nodes"
  default     = ["t3.large"]
}

variable "rds_instance_class" {
  description = "RDS instance class"
  default     = "db.t3.small"
}

variable "rds_allocated_storage" {
  description = "RDS storage in GB"
  default     = 100
}

variable "multi_az" {
  description = "Enable Multi-AZ RDS"
  default     = true
}

variable "enable_monitoring" {
  description = "Enable CloudWatch monitoring"
  default     = true
}

variable "tags" {
  description = "Common tags for all resources"
  default = {
    Project     = "BuildBrainOS"
    ManagedBy   = "Terraform"
    Environment = "Production"
  }
}
```

#### main.tf
```hcl
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = var.tags
  }
}

terraform {
  required_version = ">= 1.3"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
    }
  }

  backend "s3" {
    bucket         = "buildbrain-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}

# Configure Kubernetes provider
provider "kubernetes" {
  host                   = aws_eks_cluster.main.endpoint
  cluster_ca_certificate = base64decode(aws_eks_cluster.main.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.main.token
}

provider "helm" {
  kubernetes {
    host                   = aws_eks_cluster.main.endpoint
    cluster_ca_certificate = base64decode(aws_eks_cluster.main.certificate_authority[0].data)
    token                  = data.aws_eks_cluster_auth.main.token
  }
}

data "aws_eks_cluster_auth" "main" {
  name = aws_eks_cluster.main.name
}

data "aws_availability_zones" "available" {
  state = "available"
}

# VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "buildbrain-vpc"
  }
}

# Public Subnets (for NAT Gateway & ALB)
resource "aws_subnet" "public" {
  count                   = 3
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.${count.index + 1}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "buildbrain-public-${count.index + 1}"
    Type = "Public"
  }
}

# Private Subnets (for EKS nodes)
resource "aws_subnet" "private" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "buildbrain-private-${count.index + 1}"
    Type = "Private"
  }
}

# Database Subnets
resource "aws_subnet" "database" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 20}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "buildbrain-database-${count.index + 1}"
    Type = "Database"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "buildbrain-igw"
  }
}

# NAT Gateway (for private subnet internet access)
resource "aws_eip" "nat" {
  count  = 3
  domain = "vpc"

  tags = {
    Name = "buildbrain-nat-${count.index + 1}"
  }
}

resource "aws_nat_gateway" "main" {
  count         = 3
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = {
    Name = "buildbrain-nat-${count.index + 1}"
  }

  depends_on = [aws_internet_gateway.main]
}

# Route Tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "buildbrain-public-rt"
  }
}

resource "aws_route_table" "private" {
  count  = 3
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }

  tags = {
    Name = "buildbrain-private-rt-${count.index + 1}"
  }
}

# Route table associations
resource "aws_route_table_association" "public" {
  count          = 3
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = 3
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# EKS Cluster
resource "aws_eks_cluster" "main" {
  name            = var.cluster_name
  role_arn        = aws_iam_role.eks_cluster.arn
  version         = var.cluster_version

  vpc_config {
    subnet_ids              = concat(aws_subnet.public[*].id, aws_subnet.private[*].id)
    endpoint_private_access = true
    endpoint_public_access  = true
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy
  ]

  tags = {
    Name = var.cluster_name
  }
}

# EKS Node Group
resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${var.cluster_name}-node-group"
  node_role_arn   = aws_iam_role.eks_node.arn
  subnet_ids      = aws_subnet.private[*].id

  scaling_config {
    desired_size = var.node_group_desired_size
    max_size     = var.node_group_desired_size + 2
    min_size     = 2
  }

  instance_types = var.node_instance_types

  tags = {
    Name = "${var.cluster_name}-node-group"
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_container_registry_policy
  ]
}

# RDS PostgreSQL
resource "aws_rds_cluster" "main" {
  cluster_identifier      = "buildbrain-postgres"
  engine                  = "aurora-postgresql"
  engine_version          = "15.2"
  database_name           = "buildbrainos"
  master_username         = "postgres"
  master_password         = random_password.rds_password.result
  db_subnet_group_name    = aws_db_subnet_group.main.name
  vpc_security_group_ids  = [aws_security_group.rds.id]
  backup_retention_period = 30
  multi_az                = var.multi_az
  skip_final_snapshot     = false
  final_snapshot_identifier = "buildbrain-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"
  
  enable_http_endpoint    = false
  storage_encrypted       = true
  kms_key_id             = aws_kms_key.rds.arn

  tags = {
    Name = "buildbrain-postgres"
  }
}

resource "aws_rds_cluster_instance" "main" {
  count              = 2
  cluster_identifier = aws_rds_cluster.main.id
  instance_class     = var.rds_instance_class
  engine              = aws_rds_cluster.main.engine
  engine_version      = aws_rds_cluster.main.engine_version
  publicly_accessible = false

  monitoring_interval    = var.enable_monitoring ? 60 : 0
  monitoring_role_arn    = aws_iam_role.rds_monitoring.arn
  performance_insights_enabled = true

  tags = {
    Name = "buildbrain-postgres-${count.index + 1}"
  }
}

resource "aws_db_subnet_group" "main" {
  name       = "buildbrain-db-subnet-group"
  subnet_ids = aws_subnet.database[*].id

  tags = {
    Name = "buildbrain-db-subnet-group"
  }
}

# ElastiCache Redis Cluster
resource "aws_elasticache_cluster" "main" {
  cluster_id           = "buildbrain-redis"
  engine               = "redis"
  engine_version       = "7.0"
  node_type            = "cache.t3.medium"
  num_cache_nodes      = 3
  parameter_group_name = "default.redis7"
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis.id]
  
  automatic_failover_enabled = true
  multi_az_enabled           = true
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  tags = {
    Name = "buildbrain-redis"
  }
}

resource "aws_elasticache_subnet_group" "main" {
  name       = "buildbrain-redis-subnet-group"
  subnet_ids = aws_subnet.private[*].id
}

# S3 Bucket for Documents
resource "aws_s3_bucket" "documents" {
  bucket = "buildbrain-documents-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name = "buildbrain-documents"
  }
}

resource "aws_s3_bucket_versioning" "documents" {
  bucket = aws_s3_bucket.documents.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "documents" {
  bucket = aws_s3_bucket.documents.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "main" {
  origin {
    domain_name = aws_lb.main.dns_name
    origin_id   = "alb"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  enabled = true
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "alb"

    forwarded_values {
      query_string = true

      cookies {
        forward = "all"
      }

      headers = ["*"]
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
  }

  cache_behavior {
    path_pattern     = "/static/*"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "alb"

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "https-only"
    min_ttl                = 0
    default_ttl            = 31536000
    max_ttl                = 31536000
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
    # For production: use ACM certificate
    # acm_certificate_arn      = aws_acm_certificate.main.arn
    # ssl_support_method       = "sni-only"
    # minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Name = "buildbrain-cdn"
  }
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "buildbrain-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = true
  enable_http2              = true

  tags = {
    Name = "buildbrain-alb"
  }
}

# Data sources
data "aws_caller_identity" "current" {}

# Random password for RDS
resource "random_password" "rds_password" {
  length  = 32
  special = true
}

# KMS Key for encryption
resource "aws_kms_key" "rds" {
  description             = "KMS key for RDS encryption"
  deletion_window_in_days = 10
  enable_key_rotation     = true

  tags = {
    Name = "buildbrain-rds-key"
  }
}

# Secrets Manager
resource "aws_secretsmanager_secret" "rds_password" {
  name = "buildbrain/rds/password"

  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "rds_password" {
  secret_id     = aws_secretsmanager_secret.rds_password.id
  secret_string = random_password.rds_password.result
}
```

---

## Kubernetes Deployment

### Deploy with Helm

```bash
# Add Helm repositories
helm repo add stable https://charts.helm.sh/stable
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Create namespaces
kubectl create namespace buildbrain
kubectl create namespace monitoring

# Install Metrics Server
helm install metrics-server metrics-server/metrics-server -n kube-system

# Install Prometheus & Grafana
helm install prometheus prometheus-community/kube-prometheus-stack -n monitoring

# Install Nginx Ingress Controller
helm install nginx-ingress bitnami/nginx-ingress-controller -n ingress-nginx --create-namespace

# Create secret for Docker registry (if using private images)
kubectl create secret docker-registry regcred \
  --docker-server=docker.io \
  --docker-username=YOUR_USERNAME \
  --docker-password=YOUR_PASSWORD \
  -n buildbrain

# Create secret for API keys
kubectl create secret generic api-secrets \
  --from-literal=stripe-key=$STRIPE_SECRET_KEY \
  --from-literal=dwolla-key=$DWOLLA_SECRET_KEY \
  --from-literal=openai-key=$OPENAI_API_KEY \
  -n buildbrain

# Create ConfigMap for app config
kubectl create configmap app-config \
  --from-literal=api-port=4000 \
  --from-literal=environment=production \
  -n buildbrain

# Deploy BuildBrainOS microservices
helm install buildbrain ./kubernetes/helm/buildbrain \
  -n buildbrain \
  -f kubernetes/helm/values-prod.yaml

# Verify deployments
kubectl get pods -n buildbrain
kubectl get svc -n buildbrain
```

### Sample Kubernetes Manifest (auth-service)

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: buildbrain

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
  namespace: buildbrain
spec:
  replicas: 3
  selector:
    matchLabels:
      app: auth-service
  template:
    metadata:
      labels:
        app: auth-service
        version: v1
    spec:
      serviceAccountName: buildbrain
      securityContext:
        fsGroup: 1000
      containers:
      - name: auth-service
        image: buildbrain/auth-service:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 3001
          name: http
        env:
        - name: NODE_ENV
          value: production
        - name: PORT
          value: "3001"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: jwt-secret
        - name: API_GATEWAY_URL
          value: http://api-gateway:4000
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 5
        securityContext:
          runAsNonRoot: true
          runAsUser: 1000
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop: [ALL]

---
apiVersion: v1
kind: Service
metadata:
  name: auth-service
  namespace: buildbrain
spec:
  selector:
    app: auth-service
  ports:
  - port: 3001
    targetPort: 3001
    name: http
  type: ClusterIP

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: auth-service-hpa
  namespace: buildbrain
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: auth-service
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80

---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: auth-service-pdb
  namespace: buildbrain
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: auth-service
```

---

## Database Setup

### Initialize RDS PostgreSQL

```bash
# Get RDS endpoint
RDS_ENDPOINT=$(aws rds describe-db-clusters \
  --query 'DBClusters[0].Endpoint' \
  --output text)

# Run Prisma migrations
npx prisma migrate deploy --skip-generate

# Seed initial data
npx prisma db seed

# Verify connection
psql -h $RDS_ENDPOINT -U postgres -d buildbrainos -c "SELECT version();"
```

### Backup Strategy

```bash
# Enable automated backups (30 days retention)
aws rds modify-db-cluster \
  --db-cluster-identifier buildbrain-postgres \
  --backup-retention-period 30 \
  --preferred-backup-window "03:00-04:00" \
  --apply-immediately

# Create manual snapshot
aws rds create-db-cluster-snapshot \
  --db-cluster-identifier buildbrain-postgres \
  --db-cluster-snapshot-identifier buildbrain-backup-$(date +%Y%m%d)
```

---

## Monitoring & Logging

### CloudWatch Setup

```bash
# Create log group
aws logs create-log-group --log-group-name /aws/eks/buildbrain

# Set retention
aws logs put-retention-policy \
  --log-group-name /aws/eks/buildbrain \
  --retention-in-days 30

# Create CloudWatch alarms
aws cloudwatch put-metric-alarm \
  --alarm-name buildbrain-high-cpu \
  --alarm-description "Alert when CPU > 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT_ID:alerts
```

### Prometheus & Grafana

```bash
# Port-forward to Grafana
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80

# Default credentials: admin/prom-operator
# Import dashboards from grafana.com

# Scrape config for custom metrics
kubectl apply -f - <<EOF
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: buildbrain-services
  namespace: buildbrain
spec:
  selector:
    matchLabels:
      monitoring: enabled
  endpoints:
  - port: metrics
    interval: 30s
EOF
```

---

## CI/CD Pipeline (GitHub Actions)

```yaml
name: Deploy to AWS EKS

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Build Docker images
      run: |
        docker build -t buildbrain/auth-service:${{ github.sha }} ./services/auth-service
        docker build -t buildbrain/payment-service:${{ github.sha }} ./services/payment-service
        # ... build all services
    
    - name: Push to Docker Hub
      run: |
        echo "${{ secrets.DOCKER_PASSWORD }}" | docker login -u "${{ secrets.DOCKER_USERNAME }}" --password-stdin
        docker push buildbrain/auth-service:${{ github.sha }}
        # ... push all images
    
    - name: Deploy to EKS
      if: github.ref == 'refs/heads/main'
      env:
        AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
        AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
      run: |
        aws eks update-kubeconfig --region us-east-1 --name buildbrain-eks
        helm upgrade --install buildbrain ./kubernetes/helm/buildbrain \
          --set image.tag=${{ github.sha }} \
          -n buildbrain
```

---

## Scaling & Performance Optimization

### Auto-scaling Configuration

```bash
# Cluster Autoscaler
helm install cluster-autoscaler autoscaling/cluster-autoscaler \
  -n kube-system \
  --set autoDiscovery.clusterName=buildbrain-eks \
  --set awsRegion=us-east-1

# Horizontal Pod Autoscaler (already defined in manifests)
# Vertical Pod Autoscaler (optional, for resource optimization)
helm install vpa autoscaling/vertical-pod-autoscaler -n kube-system
```

### Performance Tuning

```bash
# Enable Pod Disruption Budgets
kubectl apply -f kubernetes/manifests/pdb.yaml

# Configure QoS classes (Guaranteed, Burstable, BestEffort)
# Already defined in deployment manifests with requests/limits

# Enable node affinity for computation/storage optimization
# CPU-optimized nodes for AI service
# Memory-optimized nodes for cache/database
```

---

## Disaster Recovery

### RDS Multi-AZ

```bash
# Enable Multi-AZ (automatic failover)
aws rds modify-db-cluster \
  --db-cluster-identifier buildbrain-postgres \
  --multi-az \
  --apply-immediately

# Cross-region read replica
aws rds create-db-cluster-snapshot \
  --source-db-cluster-identifier buildbrain-postgres \
  --db-cluster-snapshot-identifier buildbrain-backup-for-copy

aws rds copy-db-cluster-snapshot \
  --source-db-cluster-snapshot-identifier arn:aws:rds:us-east-1:123456789012:cluster-snapshot:buildbrain-backup-for-copy \
  --target-db-cluster-snapshot-identifier buildbrain-backup-for-copy-west \
  --source-region us-east-1
```

### Regular Testing

```bash
# Disaster Recovery Drill (monthly)
# 1. Restore RDS from snapshot to staging environment
# 2. Restore EKS cluster in secondary region
# 3. Run integration tests
# 4. Failover DNS to secondary region
# 5. Verify application functionality
# 6. Document recovery time and any issues

# RTO (Recovery Time Objective): < 1 hour
# RPO (Recovery Point Objective): < 4 hours (backup frequency)
```

---

## Security Hardening

### IAM & RBAC

```bash
# Create RBAC roles for operators
kubectl apply -f - <<EOF
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: buildbrain-developer
  namespace: buildbrain
rules:
- apiGroups: ["apps"]
  resources: ["deployments", "statefulsets"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["pods", "services"]
  verbs: ["get", "list", "watch", "logs"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: buildbrain-developer-binding
  namespace: buildbrain
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: buildbrain-developer
subjects:
- kind: User
  name: developer@example.com
EOF
```

### Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: buildbrain-default-deny
  namespace: buildbrain
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: api-gateway
  egress:
  - to:
    - podSelector: {}
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-dns
    ports:
    - protocol: UDP
      port: 53
```

### Secrets Encryption

```bash
# Enable encryption at rest
aws kms create-key --description "BuildBrainOS Secrets"

# Rotate secrets monthly
aws secretsmanager rotate-secret \
  --secret-id buildbrain/api-keys \
  --rotation-rules AutomaticallyAfterDays=30
```

---

## Deployment Checklist

- [ ] AWS account configured with correct IAM permissions
- [ ] Terraform backend S3 bucket created
- [ ] VPC and subnets created
- [ ] EKS cluster deployed
- [ ] RDS PostgreSQL accessible
- [ ] ElastiCache Redis operational
- [ ] S3 buckets for documents created
- [ ] CloudFront distribution configured
- [ ] ALB health checks passing
- [ ] Kubernetes namespaces created
- [ ] Secrets and ConfigMaps deployed
- [ ] All microservices deployed and healthy
- [ ] Database migrations completed
- [ ] Monitoring and logging configured
- [ ] SSL/TLS certificates installed
- [ ] Backup procedures tested
- [ ] Disaster recovery tested
- [ ] Performance benchmarks met
- [ ] Security scanning completed
- [ ] Load testing completed (target: 1000+ concurrent users)

---

## Cost Monitoring

```bash
# Install Kubecost (optional, but recommended)
helm repo add kubecost https://kubecost.github.io/cost-analyzer/
helm install kubecost kubecost/cost-analyzer --namespace kubecost --create-namespace

# Use AWS Cost Explorer for billing analysis
# Set up budget alerts
aws budgets create-budget \
  --account-id $(aws sts get-caller-identity --query Account --output text) \
  --budget file://budget.json
```

---

## Support & Troubleshooting

For issues:
1. Check EKS cluster health: `kubectl describe nodes`
2. Review pod logs: `kubectl logs -f deployment/service-name -n buildbrain`
3. Check services: `kubectl get svc -n buildbrain`
4. Run health checks: `curl https://api.buildbrainos.com/health`
5. Contact: support@buildbrainos.com or ops-team@buildbrain.io

---

**Last Updated**: February 2024  
**Maintained By**: DevOps Team  
**Next Review**: Q2 2024

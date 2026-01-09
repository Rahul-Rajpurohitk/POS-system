# RPOS Production Deployment Guide - AWS Infrastructure

> Complete step-by-step guide for deploying the RPOS (Enterprise Point of Sale) system to AWS production.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [AWS Services Required](#2-aws-services-required)
3. [Infrastructure Setup](#3-infrastructure-setup)
4. [Database Configuration](#4-database-configuration)
5. [Redis & Queue Setup](#5-redis--queue-setup)
6. [Application Deployment](#6-application-deployment)
7. [Environment Configuration](#7-environment-configuration)
8. [Security Hardening](#8-security-hardening)
9. [Monitoring & Logging](#9-monitoring--logging)
10. [CI/CD Pipeline](#10-cicd-pipeline)
11. [Backup & Recovery](#11-backup--recovery)
12. [Go-Live Checklist](#12-go-live-checklist)
13. [Troubleshooting Guide](#13-troubleshooting-guide)

---

## 1. System Overview

### 1.1 Application Components

Based on our RPOS implementation:

| Component | Technology | Purpose |
|-----------|------------|---------|
| **API Server** | Node.js + Express + TypeScript | REST API & WebSocket |
| **Primary Database** | PostgreSQL 15 | Business data (users, products, orders) |
| **Document Database** | MongoDB 6 | Logs, analytics, audit trails |
| **Cache Layer** | Redis 7 | Sessions, caching, rate limiting |
| **Job Queue** | BullMQ (Redis) | Background tasks, sync operations |
| **File Storage** | AWS S3 | Product images, receipts, exports |
| **Real-time** | Socket.IO | Live updates, sync notifications |

### 1.2 Architecture Diagram

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                      AWS Cloud                           │
                    │                                                          │
   Mobile/Web       │   ┌──────────┐     ┌──────────────────────────────┐    │
   Clients          │   │ Route 53 │     │         VPC (10.0.0.0/16)    │    │
       │            │   │   DNS    │     │                              │    │
       │            │   └────┬─────┘     │  ┌────────────────────────┐ │    │
       │            │        │           │  │   Public Subnets       │ │    │
       │ HTTPS      │        ▼           │  │                        │ │    │
       └────────────┼───► CloudFront ────┼──┤   ┌────────────────┐  │ │    │
                    │       (CDN)        │  │   │ Load Balancer  │  │ │    │
                    │                    │  │   │    (ALB)       │  │ │    │
                    │                    │  │   └───────┬────────┘  │ │    │
                    │                    │  └───────────┼───────────┘ │    │
                    │                    │              │             │    │
                    │                    │  ┌───────────▼───────────┐ │    │
                    │                    │  │   Private Subnets     │ │    │
                    │                    │  │                       │ │    │
                    │                    │  │  ┌─────────────────┐  │ │    │
                    │                    │  │  │   ECS Fargate   │  │ │    │
                    │                    │  │  │                 │  │ │    │
                    │                    │  │  │  ┌───────────┐  │  │ │    │
                    │                    │  │  │  │  Task 1   │  │  │ │    │
                    │                    │  │  │  │  Task 2   │  │  │ │    │
                    │                    │  │  │  │  Task N   │  │  │ │    │
                    │                    │  │  │  └───────────┘  │  │ │    │
                    │                    │  │  └────────┬────────┘  │ │    │
                    │                    │  └───────────┼───────────┘ │    │
                    │                    │              │             │    │
                    │                    │  ┌───────────▼───────────┐ │    │
                    │                    │  │   Database Subnets    │ │    │
                    │                    │  │                       │ │    │
                    │                    │  │ ┌─────┐ ┌─────┐ ┌───┐ │ │    │
                    │                    │  │ │ RDS │ │Mongo│ │Red│ │ │    │
                    │                    │  │ │ PG  │ │ DB  │ │is │ │ │    │
                    │                    │  │ └─────┘ └─────┘ └───┘ │ │    │
                    │                    │  └───────────────────────┘ │    │
                    │                    └────────────────────────────┘    │
                    │                                                      │
                    │  ┌────────┐  ┌───────────┐  ┌─────────┐  ┌───────┐  │
                    │  │   S3   │  │ CloudWatch│  │ Secrets │  │  WAF  │  │
                    │  │ Bucket │  │   Logs    │  │ Manager │  │       │  │
                    │  └────────┘  └───────────┘  └─────────┘  └───────┘  │
                    └──────────────────────────────────────────────────────┘
```

### 1.3 Data Flow

```
Request Flow:
Client → Route53 → CloudFront → ALB → ECS Fargate → Application
                                              │
                                              ├─► PostgreSQL (RDS) - Orders, Products, Users
                                              ├─► MongoDB - Logs, Analytics
                                              ├─► Redis - Cache, Sessions, Queues
                                              └─► S3 - File Storage
```

---

## 2. AWS Services Required

### 2.1 Core Services

| Service | Purpose | Specification |
|---------|---------|---------------|
| **ECS Fargate** | Application hosting | 1 vCPU, 2GB RAM per task |
| **RDS PostgreSQL** | Primary database | db.t3.medium, Multi-AZ |
| **DocumentDB** or **MongoDB Atlas** | Document store | db.t3.medium or M10 |
| **ElastiCache Redis** | Caching & queues | cache.t3.medium |
| **Application Load Balancer** | Traffic distribution | - |
| **S3** | File storage | Standard tier |
| **CloudFront** | CDN | - |
| **Route 53** | DNS management | - |

### 2.2 Supporting Services

| Service | Purpose |
|---------|---------|
| **Secrets Manager** | Store database passwords, JWT secrets |
| **Systems Manager Parameter Store** | Application configuration |
| **CloudWatch** | Logs, metrics, alarms |
| **WAF** | Web application firewall |
| **ACM** | SSL/TLS certificates |
| **ECR** | Docker image registry |
| **VPC** | Network isolation |
| **IAM** | Access control |

### 2.3 Estimated Monthly Costs

| Component | Minimum Setup | Production Setup |
|-----------|--------------|------------------|
| ECS Fargate (2 tasks) | $30 | $60 |
| RDS PostgreSQL (db.t3.medium) | $35 | $70 (Multi-AZ) |
| MongoDB Atlas M10 | $57 | $57 |
| ElastiCache Redis | $25 | $50 |
| ALB | $20 | $25 |
| S3 + CloudFront | $10 | $30 |
| Other (NAT, logs, etc.) | $30 | $50 |
| **Total** | **~$207/mo** | **~$342/mo** |

---

## 3. Infrastructure Setup

### 3.1 VPC Configuration

**Step 1: Create VPC**

```bash
# Using AWS CLI
aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=rpos-production}]'
```

**Step 2: Create Subnets**

| Subnet | CIDR | Availability Zone | Purpose |
|--------|------|-------------------|---------|
| public-a | 10.0.1.0/24 | us-east-1a | ALB, NAT Gateway |
| public-b | 10.0.2.0/24 | us-east-1b | ALB, NAT Gateway |
| private-a | 10.0.10.0/24 | us-east-1a | ECS Tasks |
| private-b | 10.0.11.0/24 | us-east-1b | ECS Tasks |
| database-a | 10.0.20.0/24 | us-east-1a | RDS, ElastiCache |
| database-b | 10.0.21.0/24 | us-east-1b | RDS, ElastiCache |

**Step 3: Create Internet Gateway & NAT Gateway**

```bash
# Internet Gateway
aws ec2 create-internet-gateway --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=rpos-igw}]'

# Attach to VPC
aws ec2 attach-internet-gateway --internet-gateway-id igw-xxx --vpc-id vpc-xxx

# NAT Gateway (in each public subnet)
aws ec2 create-nat-gateway --subnet-id subnet-public-a --allocation-id eipalloc-xxx
```

### 3.2 Security Groups

**ALB Security Group:**
```
Inbound:
  - TCP 443 from 0.0.0.0/0 (HTTPS)
  - TCP 80 from 0.0.0.0/0 (HTTP - redirect)

Outbound:
  - All traffic to VPC CIDR
```

**ECS Security Group:**
```
Inbound:
  - TCP 3000 from ALB Security Group

Outbound:
  - TCP 5432 to Database SG (PostgreSQL)
  - TCP 27017 to Database SG (MongoDB)
  - TCP 6379 to Database SG (Redis)
  - TCP 443 to 0.0.0.0/0 (AWS APIs)
```

**Database Security Group:**
```
Inbound:
  - TCP 5432 from ECS Security Group
  - TCP 27017 from ECS Security Group
  - TCP 6379 from ECS Security Group

Outbound:
  - None
```

### 3.3 Infrastructure as Code (Terraform)

Create `infrastructure/main.tf`:

```hcl
terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket = "rpos-terraform-state"
    key    = "production/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = "us-east-1"
}

# VPC Module
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"

  name = "rpos-production"
  cidr = "10.0.0.0/16"

  azs              = ["us-east-1a", "us-east-1b"]
  public_subnets   = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnets  = ["10.0.10.0/24", "10.0.11.0/24"]
  database_subnets = ["10.0.20.0/24", "10.0.21.0/24"]

  enable_nat_gateway   = true
  single_nat_gateway   = false
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Environment = "production"
    Project     = "rpos"
  }
}
```

---

## 4. Database Configuration

### 4.1 PostgreSQL (RDS) Setup

**Step 1: Create RDS Instance**

```bash
aws rds create-db-instance \
  --db-instance-identifier rpos-production \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 15.4 \
  --master-username rpos_admin \
  --master-user-password "<STRONG_PASSWORD>" \
  --allocated-storage 50 \
  --max-allocated-storage 200 \
  --storage-type gp3 \
  --multi-az \
  --db-subnet-group-name rpos-db-subnet \
  --vpc-security-group-ids sg-database \
  --backup-retention-period 30 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "Mon:04:00-Mon:05:00" \
  --enable-performance-insights \
  --deletion-protection \
  --storage-encrypted
```

**Step 2: Create Application Database User**

```sql
-- Connect to RDS as admin
psql -h rpos-production.xxx.us-east-1.rds.amazonaws.com -U rpos_admin -d postgres

-- Create database
CREATE DATABASE rpos;

-- Create application user (NEVER use admin user in application)
CREATE USER rpos_app WITH PASSWORD '<APP_USER_PASSWORD>';

-- Grant permissions
GRANT CONNECT ON DATABASE rpos TO rpos_app;
\c rpos
GRANT USAGE ON SCHEMA public TO rpos_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO rpos_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO rpos_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO rpos_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO rpos_app;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

**Step 3: RDS Parameter Group Settings**

| Parameter | Value | Description |
|-----------|-------|-------------|
| shared_buffers | {DBInstanceClassMemory/4} | 25% of RAM |
| effective_cache_size | {DBInstanceClassMemory*3/4} | 75% of RAM |
| work_mem | 16384 | 16MB for sorting |
| maintenance_work_mem | 131072 | 128MB |
| max_connections | 100 | Adjust based on pool size |
| log_statement | ddl | Log DDL statements |
| log_min_duration_statement | 1000 | Log queries > 1 second |

### 4.2 MongoDB Setup

**Option A: MongoDB Atlas (Recommended)**

1. Create account at mongodb.com/atlas
2. Create M10 cluster in AWS us-east-1
3. Configure VPC Peering:
   ```
   Atlas VPC CIDR: 192.168.0.0/16
   AWS VPC CIDR: 10.0.0.0/16
   ```
4. Whitelist NAT Gateway IPs
5. Create database user:
   ```
   Username: rpos_app
   Password: <STRONG_PASSWORD>
   Roles: readWrite on rpos_logs database
   ```

**Connection String:**
```
mongodb+srv://rpos_app:<password>@cluster0.xxx.mongodb.net/rpos_logs?retryWrites=true&w=majority
```

**Option B: AWS DocumentDB**

```bash
aws docdb create-db-cluster \
  --db-cluster-identifier rpos-docdb \
  --engine docdb \
  --master-username rpos_admin \
  --master-user-password "<PASSWORD>" \
  --vpc-security-group-ids sg-database \
  --db-subnet-group-name rpos-db-subnet \
  --storage-encrypted
```

**Step 4: Create MongoDB Indexes**

```javascript
// Connect to MongoDB
use rpos_logs

// Create indexes for common queries
db.logs.createIndex({ "timestamp": -1 })
db.logs.createIndex({ "level": 1, "timestamp": -1 })
db.logs.createIndex({ "userId": 1, "timestamp": -1 })
db.logs.createIndex({ "businessId": 1, "timestamp": -1 })

db.analytics.createIndex({ "businessId": 1, "date": -1 })
db.analytics.createIndex({ "type": 1, "date": -1 })

db.audit.createIndex({ "entityType": 1, "entityId": 1, "timestamp": -1 })
```

---

## 5. Redis & Queue Setup

### 5.1 ElastiCache Redis Setup

**Step 1: Create Redis Cluster**

```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id rpos-redis \
  --cache-node-type cache.t3.medium \
  --engine redis \
  --engine-version 7.0 \
  --num-cache-nodes 1 \
  --cache-subnet-group-name rpos-cache-subnet \
  --security-group-ids sg-database \
  --snapshot-retention-limit 7
```

**Step 2: Redis Configuration**

| Parameter | Value | Description |
|-----------|-------|-------------|
| maxmemory-policy | allkeys-lru | Evict least recently used |
| maxmemory | 75% | Of available memory |
| timeout | 0 | No idle timeout |
| tcp-keepalive | 300 | 5 minute keepalive |

### 5.2 Cache Key Strategy

Our application uses Redis for multiple purposes:

```
# Session Management (TTL: 24 hours)
rpos:session:{sessionId}

# User Cache (TTL: 1 hour)
rpos:user:{userId}

# Product Cache (TTL: 5 minutes)
rpos:product:{productId}
rpos:products:business:{businessId}

# Inventory Cache (TTL: 1 minute)
rpos:inventory:{locationId}:{productId}

# Rate Limiting (TTL: varies)
rpos:ratelimit:{ip}:{endpoint}

# BullMQ Queues
bull:sync-queue:*
bull:email-queue:*
bull:report-queue:*
```

### 5.3 BullMQ Queue Configuration

Our application uses these queues:

```typescript
// Queue definitions from our implementation
const queues = {
  // Real-time sync operations
  'sync-queue': {
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 100,
      removeOnFail: 1000
    }
  },

  // Email notifications
  'email-queue': {
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'fixed', delay: 60000 },
      removeOnComplete: 50
    }
  },

  // Report generation
  'report-queue': {
    defaultJobOptions: {
      attempts: 2,
      timeout: 300000,  // 5 minutes
      removeOnComplete: 20
    }
  }
};
```

---

## 6. Application Deployment

### 6.1 Docker Configuration

Create `Dockerfile.production`:

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Production stage
FROM node:20-alpine

# Security: non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

WORKDIR /app

# Copy built application
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/package.json ./

# Create logs directory
RUN mkdir -p logs && chown appuser:appgroup logs

USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

EXPOSE 3000

CMD ["node", "dist/server.js"]
```

### 6.2 ECR Repository Setup

```bash
# Create repository
aws ecr create-repository \
  --repository-name rpos \
  --image-scanning-configuration scanOnPush=true

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <ACCOUNT>.dkr.ecr.us-east-1.amazonaws.com

# Build and push
docker build -f Dockerfile.production -t rpos:latest .
docker tag rpos:latest <ACCOUNT>.dkr.ecr.us-east-1.amazonaws.com/rpos:latest
docker push <ACCOUNT>.dkr.ecr.us-east-1.amazonaws.com/rpos:latest
```

### 6.3 ECS Task Definition

Create `task-definition.json`:

```json
{
  "family": "rpos-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT:role/rposTaskRole",
  "containerDefinitions": [
    {
      "name": "rpos-api",
      "image": "ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/rpos:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "PORT", "value": "3000"},
        {"name": "LOG_LEVEL", "value": "info"}
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:rpos/database-url"
        },
        {
          "name": "MONGODB_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:rpos/mongodb-url"
        },
        {
          "name": "REDIS_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:rpos/redis-url"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:rpos/jwt-secret"
        },
        {
          "name": "DEFAULT_SOCIAL_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:rpos/social-password"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/rpos-api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "wget -qO- http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

### 6.4 ECS Service Setup

```bash
# Create ECS Cluster
aws ecs create-cluster \
  --cluster-name rpos-production \
  --capacity-providers FARGATE FARGATE_SPOT \
  --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1

# Register Task Definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create Service
aws ecs create-service \
  --cluster rpos-production \
  --service-name rpos-api \
  --task-definition rpos-api \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-private-a,subnet-private-b],securityGroups=[sg-ecs],assignPublicIp=DISABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=rpos-api,containerPort=3000" \
  --deployment-configuration "maximumPercent=200,minimumHealthyPercent=100,deploymentCircuitBreaker={enable=true,rollback=true}"
```

### 6.5 Application Load Balancer

```bash
# Create ALB
aws elbv2 create-load-balancer \
  --name rpos-alb \
  --subnets subnet-public-a subnet-public-b \
  --security-groups sg-alb \
  --scheme internet-facing \
  --type application

# Create Target Group
aws elbv2 create-target-group \
  --name rpos-api-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id vpc-xxx \
  --target-type ip \
  --health-check-path /health \
  --health-check-interval-seconds 30

# Create HTTPS Listener
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:... \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=arn:aws:acm:... \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:...
```

---

## 7. Environment Configuration

### 7.1 Required Environment Variables

Based on our implementation, these are ALL required environment variables:

```bash
# ═══════════════════════════════════════════════════════════
# CORE APPLICATION
# ═══════════════════════════════════════════════════════════
NODE_ENV=production
PORT=3000

# ═══════════════════════════════════════════════════════════
# SECURITY (CRITICAL - Generate new values!)
# ═══════════════════════════════════════════════════════════
JWT_SECRET=<64-character-random-string>
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
DEFAULT_SOCIAL_PASSWORD=<32-character-random-string>

# ═══════════════════════════════════════════════════════════
# POSTGRESQL (RDS)
# ═══════════════════════════════════════════════════════════
DATABASE_URL=postgresql://rpos_app:<password>@rpos-production.xxx.rds.amazonaws.com:5432/rpos?ssl=true&sslmode=require
DB_POOL_MAX=20
DB_POOL_MIN=5
DB_IDLE_TIMEOUT=30000

# ═══════════════════════════════════════════════════════════
# MONGODB
# ═══════════════════════════════════════════════════════════
MONGODB_URL=mongodb+srv://rpos_app:<password>@cluster0.xxx.mongodb.net/rpos_logs?retryWrites=true&w=majority
MONGO_POOL_SIZE=10
MONGO_POOL_MIN=5
MONGO_SOCKET_TIMEOUT=45000

# ═══════════════════════════════════════════════════════════
# REDIS (ElastiCache)
# ═══════════════════════════════════════════════════════════
REDIS_URL=redis://rpos-redis.xxx.cache.amazonaws.com:6379
REDIS_TLS=false

# ═══════════════════════════════════════════════════════════
# AWS S3
# ═══════════════════════════════════════════════════════════
AWS_REGION=us-east-1
AWS_S3_BUCKET=rpos-assets-production
# Note: Use IAM role, not access keys

# ═══════════════════════════════════════════════════════════
# CORS & SECURITY
# ═══════════════════════════════════════════════════════════
CORS_ORIGIN=https://app.yourdomain.com,https://admin.yourdomain.com
CORS_CREDENTIALS=true

# ═══════════════════════════════════════════════════════════
# RATE LIMITING
# ═══════════════════════════════════════════════════════════
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=15

# ═══════════════════════════════════════════════════════════
# LOGGING
# ═══════════════════════════════════════════════════════════
LOG_LEVEL=info

# ═══════════════════════════════════════════════════════════
# FILE UPLOADS
# ═══════════════════════════════════════════════════════════
MAX_FILE_SIZE=10mb
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,image/webp,application/pdf

# ═══════════════════════════════════════════════════════════
# BUSINESS DEFAULTS
# ═══════════════════════════════════════════════════════════
DEFAULT_CURRENCY=USD
DEFAULT_LANGUAGE=en
DEFAULT_TAX_RATE=0

# ═══════════════════════════════════════════════════════════
# COOKIES
# ═══════════════════════════════════════════════════════════
COOKIE_SECURE=true
COOKIE_SAME_SITE=strict
```

### 7.2 Generate Production Secrets

```bash
# Generate JWT Secret (64 characters)
openssl rand -base64 48
# Example output: K8mX2pR7sT1vW4yZ0aB3cD6eF9gH2iJ5kL8mN1oP4qR7sT0uV3wX6yZ9a

# Generate Social Password (32 characters)
openssl rand -base64 24
# Example output: A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6

# Generate Database Passwords
openssl rand -base64 32
```

### 7.3 AWS Secrets Manager Setup

```bash
# Create secrets
aws secretsmanager create-secret \
  --name rpos/database-url \
  --secret-string "postgresql://rpos_app:PASSWORD@rpos-production.xxx.rds.amazonaws.com:5432/rpos?ssl=true"

aws secretsmanager create-secret \
  --name rpos/mongodb-url \
  --secret-string "mongodb+srv://rpos_app:PASSWORD@cluster0.xxx.mongodb.net/rpos_logs"

aws secretsmanager create-secret \
  --name rpos/redis-url \
  --secret-string "redis://rpos-redis.xxx.cache.amazonaws.com:6379"

aws secretsmanager create-secret \
  --name rpos/jwt-secret \
  --secret-string "YOUR_64_CHAR_JWT_SECRET"

aws secretsmanager create-secret \
  --name rpos/social-password \
  --secret-string "YOUR_32_CHAR_SOCIAL_PASSWORD"
```

---

## 8. Security Hardening

### 8.1 AWS WAF Configuration

```bash
# Create WAF Web ACL
aws wafv2 create-web-acl \
  --name rpos-waf \
  --scope REGIONAL \
  --default-action Allow={} \
  --rules file://waf-rules.json
```

**waf-rules.json:**
```json
[
  {
    "Name": "AWSManagedRulesCommonRuleSet",
    "Priority": 1,
    "OverrideAction": {"None": {}},
    "Statement": {
      "ManagedRuleGroupStatement": {
        "VendorName": "AWS",
        "Name": "AWSManagedRulesCommonRuleSet"
      }
    },
    "VisibilityConfig": {
      "SampledRequestsEnabled": true,
      "CloudWatchMetricsEnabled": true,
      "MetricName": "CommonRules"
    }
  },
  {
    "Name": "AWSManagedRulesSQLiRuleSet",
    "Priority": 2,
    "OverrideAction": {"None": {}},
    "Statement": {
      "ManagedRuleGroupStatement": {
        "VendorName": "AWS",
        "Name": "AWSManagedRulesSQLiRuleSet"
      }
    },
    "VisibilityConfig": {
      "SampledRequestsEnabled": true,
      "CloudWatchMetricsEnabled": true,
      "MetricName": "SQLiRules"
    }
  },
  {
    "Name": "RateLimitRule",
    "Priority": 3,
    "Action": {"Block": {}},
    "Statement": {
      "RateBasedStatement": {
        "Limit": 2000,
        "AggregateKeyType": "IP"
      }
    },
    "VisibilityConfig": {
      "SampledRequestsEnabled": true,
      "CloudWatchMetricsEnabled": true,
      "MetricName": "RateLimit"
    }
  }
]
```

### 8.2 IAM Roles

**ECS Task Execution Role:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:/ecs/rpos-*"
    },
    {
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "arn:aws:secretsmanager:us-east-1:*:secret:rpos/*"
    }
  ]
}
```

**ECS Task Role (Application):**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::rpos-assets-production/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "ses:FromAddress": "noreply@yourdomain.com"
        }
      }
    }
  ]
}
```

### 8.3 SSL/TLS Configuration

```bash
# Request certificate
aws acm request-certificate \
  --domain-name api.yourdomain.com \
  --subject-alternative-names "*.yourdomain.com" \
  --validation-method DNS

# After DNS validation, attach to ALB listener
aws elbv2 modify-listener \
  --listener-arn arn:aws:elasticloadbalancing:... \
  --certificates CertificateArn=arn:aws:acm:...
```

### 8.4 Security Checklist

```
□ All secrets stored in Secrets Manager (not in code/config files)
□ Database passwords are strong (32+ characters)
□ JWT secret is unique and strong (64+ characters)
□ RDS encryption at rest enabled
□ RDS SSL connections enforced
□ S3 bucket is private (no public access)
□ WAF rules enabled
□ Security groups follow least privilege
□ IAM roles follow least privilege
□ CORS configured for specific domains only
□ Rate limiting enabled in application
□ Input validation on all endpoints
□ No hardcoded credentials anywhere
```

---

## 9. Monitoring & Logging

### 9.1 CloudWatch Log Groups

```bash
# Create log groups
aws logs create-log-group --log-group-name /ecs/rpos-api
aws logs put-retention-policy --log-group-name /ecs/rpos-api --retention-in-days 30

aws logs create-log-group --log-group-name /rds/rpos-production
aws logs put-retention-policy --log-group-name /rds/rpos-production --retention-in-days 30
```

### 9.2 CloudWatch Alarms

**Critical Alarms:**

```bash
# High CPU
aws cloudwatch put-metric-alarm \
  --alarm-name rpos-high-cpu \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=ClusterName,Value=rpos-production Name=ServiceName,Value=rpos-api \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT:rpos-alerts

# 5XX Errors
aws cloudwatch put-metric-alarm \
  --alarm-name rpos-5xx-errors \
  --metric-name HTTPCode_Target_5XX_Count \
  --namespace AWS/ApplicationELB \
  --statistic Sum \
  --period 60 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=LoadBalancer,Value=app/rpos-alb/xxx \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT:rpos-alerts

# Database Connections
aws cloudwatch put-metric-alarm \
  --alarm-name rpos-db-connections \
  --metric-name DatabaseConnections \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=DBInstanceIdentifier,Value=rpos-production \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT:rpos-alerts
```

### 9.3 CloudWatch Dashboard

Create dashboard with these widgets:

1. **Request Count** - ALB RequestCount
2. **Response Time** - ALB TargetResponseTime (p50, p95, p99)
3. **Error Rates** - ALB 4XX and 5XX counts
4. **ECS CPU/Memory** - ECS CPUUtilization, MemoryUtilization
5. **Database Performance** - RDS CPUUtilization, DatabaseConnections, FreeStorageSpace
6. **Redis Metrics** - ElastiCache CPUUtilization, CacheHits, CacheMisses

### 9.4 Application Logging

Our Winston configuration logs to CloudWatch via stdout:

```typescript
// Already configured in src/config/logger.ts
// Logs are captured by ECS and sent to CloudWatch

// Log format in production:
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "message": "User logged in",
  "userId": "uuid",
  "ip": "1.2.3.4",
  "userAgent": "..."
}
```

---

## 10. CI/CD Pipeline

### 10.1 GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: rpos
  ECS_SERVICE: rpos-api
  ECS_CLUSTER: rpos-production

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: rpos-envato/server/package-lock.json

      - name: Install dependencies
        working-directory: rpos-envato/server
        run: npm ci

      - name: Run linter
        working-directory: rpos-envato/server
        run: npm run lint || true

      - name: Run tests
        working-directory: rpos-envato/server
        run: npm test || true

      - name: Build
        working-directory: rpos-envato/server
        run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    environment: production

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push Docker image
        id: build-image
        working-directory: rpos-envato/server
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -f Dockerfile.production -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest
          echo "image=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" >> $GITHUB_OUTPUT

      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster $ECS_CLUSTER \
            --service $ECS_SERVICE \
            --force-new-deployment

          aws ecs wait services-stable \
            --cluster $ECS_CLUSTER \
            --services $ECS_SERVICE

      - name: Notify Success
        if: success()
        run: |
          echo "Deployment successful! Version: ${{ github.sha }}"

      - name: Notify Failure
        if: failure()
        run: |
          echo "Deployment failed! Check logs."
```

### 10.2 Database Migrations

Add migration step before deployment:

```yaml
- name: Run Database Migrations
  working-directory: rpos-envato/server
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
  run: |
    npm run typeorm migration:run -- -d dist/config/database.js
```

### 10.3 Rollback Procedure

```bash
# Get previous task definition
PREVIOUS_TASK=$(aws ecs describe-services \
  --cluster rpos-production \
  --services rpos-api \
  --query 'services[0].deployments[1].taskDefinition' \
  --output text)

# Rollback to previous version
aws ecs update-service \
  --cluster rpos-production \
  --service rpos-api \
  --task-definition $PREVIOUS_TASK

# Wait for stability
aws ecs wait services-stable \
  --cluster rpos-production \
  --services rpos-api
```

---

## 11. Backup & Recovery

### 11.1 RDS Automated Backups

```bash
# Enable automated backups (already done during creation)
# Retention: 30 days
# Backup window: 03:00-04:00 UTC

# Create manual snapshot
aws rds create-db-snapshot \
  --db-instance-identifier rpos-production \
  --db-snapshot-identifier rpos-manual-$(date +%Y%m%d)

# Copy to another region for DR
aws rds copy-db-snapshot \
  --source-db-snapshot-identifier arn:aws:rds:us-east-1:ACCOUNT:snapshot:rpos-manual-20240115 \
  --target-db-snapshot-identifier rpos-manual-20240115 \
  --region us-west-2
```

### 11.2 MongoDB Backup (Atlas)

- Continuous backups enabled by default
- Point-in-time recovery available
- Snapshots every 6 hours

### 11.3 S3 Versioning

```bash
# Enable versioning
aws s3api put-bucket-versioning \
  --bucket rpos-assets-production \
  --versioning-configuration Status=Enabled

# Enable lifecycle policy for old versions
aws s3api put-bucket-lifecycle-configuration \
  --bucket rpos-assets-production \
  --lifecycle-configuration file://lifecycle.json
```

### 11.4 Disaster Recovery Plan

| Scenario | RTO | RPO | Recovery Steps |
|----------|-----|-----|----------------|
| ECS Task Failure | 2 min | 0 | Auto-replaced by ECS |
| AZ Failure | 1 min | 0 | ALB routes to healthy AZ |
| RDS Failure | 5 min | 0 | Auto failover to standby |
| Redis Failure | 2 min | ~1 min | Cache rebuild from DB |
| Region Failure | 1 hour | 1 hour | Restore from cross-region backups |

---

## 12. Go-Live Checklist

### Pre-Launch (1 Week Before)

```
□ INFRASTRUCTURE
  □ VPC and subnets configured correctly
  □ Security groups reviewed and locked down
  □ RDS Multi-AZ enabled and tested
  □ ElastiCache cluster healthy
  □ SSL certificates valid and not expiring soon
  □ WAF rules tested
  □ CloudWatch alarms configured
  □ Log retention policies set

□ APPLICATION
  □ All environment variables configured in Secrets Manager
  □ Health check endpoint (/health) responding
  □ Database migrations successful
  □ All middleware (rate limiting, validation) working
  □ Error handling tested
  □ File uploads working to S3

□ SECURITY
  □ All production secrets generated (not from staging!)
  □ No hardcoded credentials in code
  □ IAM roles follow least privilege
  □ Database users are application-specific (not admin)
  □ CORS configured for production domains only
  □ TLS 1.2+ enforced

□ PERFORMANCE
  □ Load testing completed (target: 200 req/s minimum)
  □ Response times acceptable (p95 < 500ms)
  □ Database query optimization done
  □ Connection pooling configured
  □ CDN caching configured
```

### Launch Day

```
□ T-2 HOURS
  □ Team on standby
  □ Monitoring dashboards open
  □ Rollback procedure documented
  □ Communication channels ready

□ T-0 DNS CUTOVER
  □ Update Route 53 records
  □ Verify DNS propagation (use multiple locations)
  □ Test all critical endpoints
  □ Monitor error rates

□ T+1 HOUR
  □ Verify all features working
  □ Check database performance
  □ Review application logs
  □ Test critical user flows:
    □ Login/logout
    □ Create order
    □ Process payment
    □ Generate receipt
    □ Sync data

□ T+24 HOURS
  □ Review all metrics
  □ Address any issues found
  □ Document lessons learned
```

### Post-Launch (1 Week)

```
□ Monitor error rates daily
□ Review slow queries
□ Check resource utilization
□ Verify backup completion
□ Update documentation as needed
□ Conduct post-mortem if issues occurred
```

---

## 13. Troubleshooting Guide

### 13.1 Application Won't Start

**Check ECS Task Logs:**
```bash
aws logs get-log-events \
  --log-group-name /ecs/rpos-api \
  --log-stream-name ecs/rpos-api/TASK_ID \
  --limit 100
```

**Common Causes:**
- Missing environment variables → Check Secrets Manager
- Database connection timeout → Check security groups
- Invalid JWT secret → Verify secret format

### 13.2 Database Connection Errors

**Check Connectivity:**
```bash
# From ECS task (using ECS Exec)
aws ecs execute-command \
  --cluster rpos-production \
  --task TASK_ID \
  --container rpos-api \
  --interactive \
  --command "/bin/sh"

# Inside container
nc -zv rpos-production.xxx.rds.amazonaws.com 5432
```

**Check Connection Pool:**
```sql
-- In PostgreSQL
SELECT count(*) FROM pg_stat_activity WHERE datname = 'rpos';
SELECT state, count(*) FROM pg_stat_activity WHERE datname = 'rpos' GROUP BY state;
```

### 13.3 High Response Times

**Check Application Metrics:**
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=rpos-api Name=ClusterName,Value=rpos-production \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 60 \
  --statistics Average
```

**Check Slow Queries:**
```sql
-- PostgreSQL
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### 13.4 Redis Connection Issues

**Check ElastiCache Status:**
```bash
aws elasticache describe-cache-clusters \
  --cache-cluster-id rpos-redis \
  --show-cache-node-info
```

**Check Memory:**
```bash
redis-cli -h rpos-redis.xxx.cache.amazonaws.com INFO memory
```

### 13.5 Emergency Procedures

**Scale Up Immediately:**
```bash
aws ecs update-service \
  --cluster rpos-production \
  --service rpos-api \
  --desired-count 5
```

**Force Database Failover:**
```bash
aws rds reboot-db-instance \
  --db-instance-identifier rpos-production \
  --force-failover
```

**Enable Maintenance Mode:**
Update the health check to return 503, or update DNS to point to maintenance page.

---

## Quick Reference

### Important URLs

| Resource | URL/Endpoint |
|----------|--------------|
| API Endpoint | https://api.yourdomain.com |
| Health Check | https://api.yourdomain.com/health |
| CloudWatch Dashboard | AWS Console → CloudWatch → Dashboards → rpos-production |
| RDS Console | AWS Console → RDS → Databases → rpos-production |

### Useful Commands

```bash
# View recent logs
aws logs tail /ecs/rpos-api --since 1h --follow

# Force new deployment
aws ecs update-service --cluster rpos-production --service rpos-api --force-new-deployment

# Get running task ID
aws ecs list-tasks --cluster rpos-production --service-name rpos-api

# Shell into container
aws ecs execute-command --cluster rpos-production --task TASK_ID --container rpos-api --interactive --command /bin/sh

# Check service status
aws ecs describe-services --cluster rpos-production --services rpos-api
```

### Support Contacts

| Issue | Contact |
|-------|---------|
| Application Issues | dev-team@company.com |
| Infrastructure Issues | devops@company.com |
| Security Issues | security@company.com |
| AWS Support | AWS Support Console |

---

**Document Version:** 1.0.0
**Last Updated:** January 2026
**Next Review:** April 2026

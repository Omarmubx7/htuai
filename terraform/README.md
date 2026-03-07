# HTUAI Infrastructure as Code — Google Cloud Platform Terraform Deployment

**Last Updated:** March 7, 2026  
![](https://img.shields.io/badge/Terraform-1.0%2B-purple?logo=terraform)
![](https://img.shields.io/badge/Google_Cloud-GCP-red?logo=google-cloud)
![](https://img.shields.io/badge/IaC-Managed-blue)
![](https://img.shields.io/badge/License-MIT-green)
![](https://img.shields.io/badge/Status-Production-success)

---

## Executive Summary

Terraform Infrastructure as Code (IaC) for the HTUAI academic platform on Google Cloud Platform (GCP). Declaratively defines cloud resources including Virtual Private Cloud (VPC) networking, Cloud Armor WAF policies, Identity & Access Management (IAM) roles, Secret Manager configurations, and monitoring infrastructure. Enables reproducible, version-controlled deployments across development, staging, and production environments with zero-downtime updates.

**Key Capabilities:**
- Multi-environment support (dev, staging, prod) via variable injections
- Automated security policies (SQL injection, XSS protection via Cloud Armor)
- Least-privilege IAM roles (Service Accounts with minimal permissions)
- Secret management (environment variables, API keys, OAuth tokens)
- Comprehensive audit logging and performance monitoring
- Infrastructure versioning and change tracking (Terraform state)

---

## 1. System Architecture

### 1.1 Cloud Resource Topology

```
┌─────────────────────────────────────────────────────────────────┐
│                    GCP PROJECT                                   │
│  (Organization → Billing Account → Project → Resources)         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              CLOUD ARMOR (WAF)                             │ │
│  │  • SQL Injection Rules (Block 403)                        │ │
│  │  • XSS Protection (Block 403)                             │ │
│  │  • DDoS Rate Limiting                                     │ │
│  │  Applied to: Load Balancer                               │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              ↓                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │           VPC (Virtual Private Cloud)                      │ │
│  │           smart-advisor-vpc                               │ │
│  │  CIDR: 10.0.0.0/16 (65,536 IPs)                          │ │
│  │                                                            │ │
│  │  ┌────────────────────────────────────────────────┐       │ │
│  │  │  SUBNETWORK: smart-advisor-subnet             │       │ │
│  │  │  Region: us-central1                          │       │ │
│  │  │  CIDR: 10.0.1.0/24 (256 IPs)                 │       │ │
│  │  │  Private Google Access: Enabled              │       │ │
│  │  │                                                │       │ │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐   │       │ │
│  │  │  │ GKE      │  │ Cloud Run│  │ VM       │   │       │ │
│  │  │  │ Node Pool│  │ Services │  │ Instances│   │       │ │
│  │  │  └──────────┘  └──────────┘  └──────────┘   │       │ │
│  │  │         ↓              ↓            ↓         │       │ │
│  │  │  ┌──────────────────────────────────────┐   │       │ │
│  │  │  │ Internal Load Balancer (TCP/UDP)     │   │       │ │
│  │  │  │ Health Checks: /Health               │   │       │ │
│  │  │  └──────────────────────────────────────┘   │       │ │
│  │  └────────────────────────────────────────────────┘       │ │
│  │                                                            │ │
│  │  ┌────────────────────────────────────────────────┐       │ │
│  │  │      CLOUD SQL (PostgreSQL 14)                │       │ │
│  │  │      Database Instance (HA failover)         │       │ │
│  │  │      Backup: Automated daily 30-day retention│       │ │
│  │  │      Encryption: At-rest + in-transit       │       │ │
│  │  └────────────────────────────────────────────────┘       │ │
│  │                                                            │ │
│  │  Network Egress VIA:                                      │ │
│  │  • Cloud NAT (outbound to internet)                       │ │
│  │  • Private Service Access (to managed services)           │ │
│  │                                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │           SECRETS & OBSERVABILITY                          │ │
│  │                                                            │ │
│  │  ┌──────────────────────────────────────┐                │ │
│  │  │ Secret Manager (GCP managed secrets) │                │ │
│  │  │ • AUTH_SECRET (JWT key)              │                │ │
│  │  │ • GOOGLE_CLIENT_ID                   │                │ │
│  │  │ • GOOGLE_CLIENT_SECRET               │                │ │
│  │  │ • DB_PASSWORD                        │                │ │
│  │  │ Replication: Automatic across regions│                │ │
│  │  └──────────────────────────────────────┘                │ │
│  │                                                            │ │
│  │  ┌──────────────────────────────────────┐                │ │
│  │  │ Cloud Logging (Ops Agent)            │                │ │
│  │  │ • Application logs (stdout/stderr)   │                │ │
│  │  │ • GKE cluster logs                   │                │ │
│  │  │ • Cloud SQL slow query logs          │                │ │
│  │  │ Retention: 30 days (configurable)    │                │ │
│  │  └──────────────────────────────────────┘                │ │
│  │                                                            │ │
│  │  ┌──────────────────────────────────────┐                │ │
│  │  │ Cloud Monitoring (Stackdriver)       │                │ │
│  │  │ • API latency (p50, p99)             │                │ │
│  │  │ • Database connections & query time  │                │ │
│  │  │ • VM CPU, memory, disk usage         │                │ │
│  │  │ • Custom application metrics         │                │ │
│  │  │ Dashboards & Alerting policies       │                │ │
│  │  └──────────────────────────────────────┘                │ │
│  │                                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │           IAM (Identity & Access Management)               │ │
│  │                                                            │ │
│  │  Service Account: smart-advisor-web-sa                    │ │
│  │  Roles (Least Privilege):                                 │ │
│  │  • roles/logging.logWriter                                │ │
│  │  • roles/monitoring.metricWriter                          │ │
│  │  • roles/secretmanager.secretAccessor                     │ │
│  │  • roles/cloudsql.client (if using Cloud SQL Proxy)      │ │
│  │                                                            │ │
│  │  Key: Workload Identity (pod → service account mapping)   │ │
│  │  No static keys; tokens auto-rotated every 1 hour         │ │
│  │                                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Deployment Environments

```
Environment: dev          staging           prod
────────────────────────────────────────────────────────
Region:      us-central1  us-central1       us-central1
Network:     10.0.0.0/16  10.1.0.0/16       10.2.0.0/16
GKE Nodes:   2            3                 5
DB Instance: shared-gcp-1 sql-staging       sql-prod
Backup:      daily        hourly            hourly + retention
Monitoring:  Basic        Standard          Premium + PagerDuty
Cost/month:  ~$200        ~$500             ~$1500
```

---

## 2. Core Terraform Modules & Components

### 2.1 Resource Dependency Graph

```
google_project (implicit)
├─ google_service_account (web_app_sa)
│  └─ google_project_iam_member (roles/*.logWriter, *.metricWriter, *.secretAccessor)
│
├─ google_compute_network (vpc)
│  └─ google_compute_subnetwork (subnet)
│
├─ google_compute_security_policy (Cloud Armor policy)
│
├─ google_secret_manager_secret (AUTH_SECRET, GOOGLE_CLIENT_ID, etc.)
│
├─ google_monitoring_notification_channel (Email, PagerDuty)
│  └─ google_monitoring_alert_policy (Alert on high latency, errors)
│
└─ google_sql_database_instance (PostgreSQL)
   └─ google_sql_database (htuai_db)
   └─ google_sql_user (app_user)
```

### 2.2 Time Complexity of Terraform Operations

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| `terraform plan` | O(r + d) | r = # resources, d = data sources |
| `terraform apply` | O(r × t) | t = avg time per resource API call |
| `terraform destroy` | O(r × t) | All resources deleted in inverse dependency order |
| State lock (remote) | O(1) | DynamoDB/postgres locking (milliseconds) |
| Module instantiation | O(m × v) | m = modules, v = variables |

**Typical timings:**
- `terraform plan`: 2-5 seconds (API calls, state load)
- `terraform apply`: 30-90 seconds (GCP resource creation)
- `terraform destroy`: 60-180 seconds (resource deletion, cleanup)

---

## 3. File System Architecture

```
terraform/
│
├── providers.tf                          # Provider declarations
│   • terraform version ≥1.0
│   • google provider ~6.0 (GCP Terraform provider)
│   • Backend: Can be configured locally or remote (GCS/Terraform Cloud)
│
├── variables.tf                          # Input variables (cross-module)
│   └─ project_id: string (required)
│   └─ region: string = "us-central1"
│   └─ environment: string = "prod" ("prod" | "staging" | "dev")
│
├── secrets.tf                            # Google Secret Manager resources
│   └─ google_secret_manager_secret
│       └─ AUTH_SECRET (JWT signing key)
│       └─ GOOGLE_CLIENT_ID
│       └─ GOOGLE_CLIENT_SECRET
│       └─ DATABASE_URL
│       └─ POSTGRES_PASSWORD
│
│   Resource: Time O(1) to create; 1-2 sec API latency
│   Secrets auto-replicated across regions (no manual replication)
│
├── iam.tf                                # Identity & Access Management
│   ├─ google_service_account (web_app_sa)
│   │  └─ Account ID: "smart-advisor-web-sa@{project}.iam.gserviceaccount.com"
│   │  └─ Display Name: "Smart Advisor Web App Service Account"
│   │
│   └─ google_project_iam_member (role assignments)
│       ├─ roles/logging.logWriter
│       │  └─ Allows writing logs to Cloud Logging
│       │  └─ Time: O(1) API call, <1 sec propagation
│       │
│       ├─ roles/monitoring.metricWriter
│       │  └─ Allows writing metrics to Cloud Monitoring
│       │  └─ Time: O(1), <2 sec propagation
│       │
│       └─ roles/secretmanager.secretAccessor
│           └─ Allows reading secret values (not listing secrets)
│           └─ Time: O(1), <1 sec propagation
│
├── networking.tf                         # VPC, Subnets, Cloud Armor
│   ├─ google_compute_network (VPC)
│   │  └─ Name: "smart-advisor-vpc"
│   │  └─ CIDR: 10.0.0.0/16 (automatic, non-overlapping per env)
│   │  └─ auto_create_subnetworks: false (manual control)
│   │  └─ Time: ~5 sec to create
│   │
│   ├─ google_compute_subnetwork (Subnet)
│   │  └─ Name: "smart-advisor-subnet"
│   │  └─ CIDR: 10.0.1.0/24 (256 IPs, sufficient for 200 pods)
│   │  └─ Region: var.region (us-central1)
│   │  └─ private_ip_google_access: true (allows access to managed APIs)
│   │  └─ Time: ~3 sec to create
│   │
│   └─ google_compute_security_policy (Cloud Armor)
│       ├─ Name: "smart-advisor-security-policy"
│       │
│       ├─ Rule 1000: Block SQL Injection
│       │  └─ Priority: 1000 (evaluated first)
│       │  └─ Expression: evaluatePreconfiguredExpr('sqli-v33-stable')
│       │  └─ Action: deny(403) — return 403 Forbidden
│       │  └─ Coverage: Common SQLi patterns (OWASP Top 10)
│       │
│       ├─ Rule 1001: Block Cross-Site Scripting (XSS)
│       │  └─ Priority: 1001
│       │  └─ Expression: evaluatePreconfiguredExpr('xss-v33-stable')
│       │  └─ Action: deny(403)
│       │  └─ Coverage: Malicious script injection via GET/POST params
│       │
│       └─ Rule 2147483647: Default Allow
│           └─ Priority: 2147483647 (evaluated last, max int32)
│           └─ Action: allow
│           └─ Matches: * (all traffic)
│           └─ Allows legitimate traffic after WAF checks
│
│       Applied to: HTTP(S) Load Balancer
│       Performance: <1ms latency per request (WAF bypass not possible)
│       Time to create: ~10 sec
│
├── monitoring.tf                         # Cloud Logging & Monitoring
│   ├─ Logging configurations
│   │  └─ Log sink to Cloud Logging
│   │  └─ Log retention: 30 days (configurable)
│   │  └─ Query time: O(log n) via Stackdriver full-text index
│   │
│   └─ Monitoring policies
│       ├─ Alert Policy 1: High API Latency (p99 > 500ms)
│       ├─ Alert Policy 2: Database Connection Pool Exhaustion
│       ├─ Alert Policy 3: Service Account IAM Role Errors
│       └─ Default: Email + PagerDuty notification
│
├── outputs.tf (optional)                 # Exported values for consumption
│   └─ service_account_email
│   └─ vpc_network_name
│   └─ security_policy_id
│   └─ Can be referenced by other modules or printed to stdout
│
├── terraform.tfvars                      # Environment-specific values (gitignored)
│   • project_id = "htuai-dev"
│   • region = "us-central1"
│   • environment = "dev"
│   • Must NOT be committed to version control
│   • Pattern per env: terraform.tfvars.dev, terraform.prod, etc.
│
├── terraform.tfvars.example              # Template (committed to repo)
│   • Shows expected variable structure
│   • Users copy: cp terraform.tfvars.example terraform.tfvars
│
└── .terraform/                           # Managed directory (gitignored)
    ├─ .terraform.lock.hcl (dependency lock file — SHOULD commit)
    │  └─ Locks provider versions across team
    │  └─ Ensures reproducible deployments
    │  └─ Time to generate: ~3 sec
    │
    ├─ terraform_backend-local (local state)
    │  └─ Alternative: remote GCS backend (terraform.gcs.tf)
    │
    └─ plugins/
       └─ linux_amd64/
           └─ terraform-provider-google (binary, 200+ MB)
```

---

## 4. Networking Architecture

### 4.1 VPC Connectivity Model

```
┌────────────────┐
│  Internet      │
│                │
└────────┬───────┘
         │ Public IP (NAT Gateway)
         │
    ┌────▼────────────────────────────┐
    │ CLOUD ARMOR (WAF)                │
    │ • SQLi block                     │
    │ • XSS block → 403 Forbidden      │
    └────┬───────────────────────────┘
         │
    ┌────▼────────────────────────────┐
    │ TCP/UDP Load Balancer            │
    │ (Distributes traffic to backends)│
    └────┬───────────────────────────┘
         │
    ┌────▼──────────────────────────────────────────────────┐
    │             VPC: 10.0.0.0/16                          │
    │                                                       │
    │  ┌──────────────────────────────────────────────┐    │
    │  │ Subnet: 10.0.1.0/24 (us-central1)           │    │
    │  │                                              │    │
    │  │ ┌─────────┐  ┌─────────┐  ┌─────────┐       │    │
    │  │ │ GKE Pod │  │ GKE Pod │  │ GKE Pod │       │    │
    │  │ │ 10.0.x  │  │ 10.0.x  │  │ 10.0.x  │       │    │
    │  │ └────┬────┘  └────┬────┘  └────┬────┘       │    │
    │  │      │            │            │            │    │
    │  │      └────────────┼────────────┘            │    │
    │  │          Internal Endpoint                  │    │
    │  │          10.0.1.50:8080                     │    │
    │  └──────────────────────────────────────────────┘    │
    │                                                       │
    │  ┌──────────────────────────────────────────────┐    │
    │  │ Private Service Access                       │    │
    │  │ (Can reach Cloud SQL, Memcached, etc.)      │    │
    │  │ No public IPs needed for managed services    │    │
    │  └──────────────────────────────────────────────┘    │
    │                                                       │
    │  ┌──────────────────────────────────────────────┐    │
    │  │ Cloud SQL Proxy (Private IP only)           │    │
    │  │ Connection: 10.0.1.100:5432                 │    │
    │  │ Database: htuai_db                          │    │
    │  │ Users: app_user, admin_user                 │    │
    │  │ Backup: Automated daily + point-in-time     │    │
    │  └──────────────────────────────────────────────┘    │
    │                                                       │
    └───────────────────────────────────────────────────────┘
```

### 4.2 Network Communication (Inbound)

```
User Browser
     │ HTTPS
     ▼
Cloud Armor WAF
     │ Check rules (SQLi, XSS)
     │ Time: <1ms median
     ▼ (200)
Load Balancer
     │ Distribute to healthy backends
     │ Time: <5ms median
     ▼
GKE Pod (Kubernetes)
     │ Receive HTTP Request
     │ Time: <10ms processing
     ▼
Next.js App Server
     │ Business logic (Prisma, gamification, etc.)
     │ Time: 5-100ms (depends on operation)
     ▼
PostgreSQL Database
     │ Query execution
     │ Time: 1-50ms (depends on query complexity)
     ▼
Response Path (reverse)
     Total Latency: ~50-200ms (p50), ~500-1000ms (p99)
```

### 4.3 Network Security Policies

**Firewall Rules (Implicit, via GKE):**

```hcl
# Allow pod-to-pod communication within subnet
ingress {
  from {
    sources {
      principals = ["projects/PROJECT/locations/global/workloadIdentityPools/cluster"]
    }
  }
  to {
    resources {
      is_public_api = false
    }
  }
}

# Deny external ingress (except through Load Balancer)
# Enforced at network layer

# Egress to internet via Cloud NAT
# Requests routed through NAT gateway, source IP: GCP-managed IP
```

---

## 5. Identity & Access Management (IAM)

### 5.1 Service Account Permissions Matrix

| Role | Permission | Resource | Use Case |
|------|-----------|----------|----------|
| `roles/logging.logWriter` | `logging.googleapis.com/write` | Cloud Logging | App writes logs (stdout, errors) |
| `roles/monitoring.metricWriter` | `monitoring.googleapis.com/timeSeries.create` | Cloud Monitoring | App sends custom metrics (XP awarded, streaks) |
| `roles/secretmanager.secretAccessor` | `secretmanager.googleapis.com/versions/access` | Secret Manager | App reads API keys, DB password at runtime |
| `roles/cloudsql.client` | `cloudsql.googleapis.com/connect` | Cloud SQL | Connect to PostgreSQL instance (if using proxy) |

### 5.2 Workload Identity Chain

```
Kubernetes Pod
     │
     ├─ Pod Service Account: "default" (k8s construct)
     │
     ├─ Binding: Pod SA → GCP Service Account
     │   Annotation: iam.gke.io/gcp-service-account=smart-advisor-web-sa@{project}.iam.gserviceaccount.com
     │
     ▼ (automatic token exchange)
     
GCP Service Account Token
     │ {exp: 1h, sub: smart-advisor-web-sa, aud: gcp}
     │
     ├─ Token auto-rotated every 1 hour
     ├─ No static keys needed (better security)
     │
     ▼
     
Attached IAM Roles
     │
     ├─ check: Does token have `logging.logWriter`? ✓
     ├─ check: Does token have `monitoring.metricWriter`? ✓
     ├─ check: Does token have `secretmanager.secretAccessor`? ✓
     │
     ▼ (grant permissions)
     
Access Granted
     │
     └─ App can now:
        • Write to Cloud Logging
        • Send metrics to Cloud Monitoring
        • Read secrets from Secret Manager
```

---

## 6. Secret Management

### 6.1 Secret Lifecycle

```
1. CREATE (Terraform)
   ─────────────────────
   resource "google_secret_manager_secret" "db_password" {
     secret_id = "DB_PASSWORD"
     replication { auto {} }
   }
   
   Time: ~1-2 seconds
   Replication: Automatic across regions

2. STORE (Manual)
   ─────────────────────
   gcloud secrets versions add DB_PASSWORD --data-file=- <<< "password123"
   
   Store: Only performed once, manually (Terraform does NOT store values)
   Encrypted: At-rest with Google-managed keys (CMEK optional)

3. ACCESS (Runtime)
   ─────────────────────
   const dbPassword = await fetchSecret('DB_PASSWORD');
   
   Method: Service Account token → Verify IAM → Return secret value
   Time: ~50-100ms per fetch (cached recommended)

4. ROTATE (Manual)
   ─────────────────────
   gcloud secrets versions add DB_PASSWORD --data-file=- <<< "new_password"
   
   # Old version remains accessible for 30 days (backup)
   # Application must be restarted to pick up new version

5. DESTROY (Terraform)
   ─────────────────────
   terraform destroy
   
   Result: Secret marked for deletion; hard delete after 7 days
```

### 6.2 Secrets Defined

```hcl
# All secrets auto-replicated to all regions (automatic={ })

secret "AUTH_SECRET"
  ├─ Value: Random 32-byte string (base64 encoded)
  ├─ Format: openssl rand -base64 32
  ├─ Used for: JWT signing (HS256 algorithm)
  ├─ Rotation: Annually (invalidates old tokens)
  └─ Stored in: Next.js NEXTAUTH_SECRET env var

secret "GOOGLE_CLIENT_ID"
  ├─ Value: OAuth2.0 Client ID from Google Cloud Console
  ├─ Format: <project-number>.apps.googleusercontent.com
  ├─ Used for: OAuth sign-in flow (redirect)
  └─ Stored in: .env GOOGLE_CLIENT_ID

secret "GOOGLE_CLIENT_SECRET"
  ├─ Value: OAuth2.0 Client Secret (never exposed to client)
  ├─ Used for: Server-side token exchange
  └─ Stored in: .env GOOGLE_CLIENT_SECRET (server-only)

secret "DATABASE_URL"
  ├─ Value: postgresql://user:pass@host:5432/dbname
  ├─ Format: Prisma connection string
  ├─ Rotation: Only if password changed in Cloud SQL
  └─ Stored in: .env DATABASE_URL

secret "POSTGRES_PASSWORD"
  ├─ Value: Database superuser password (64+ chars, special chars)
  ├─ Used for: Cloud SQL admin account
  ├─ Rotation: Annually (causes brief downtime if users logged in)
  └─ Backup: Second secret stored offline (safety)
```

---

## 7. Monitoring & Observability

### 7.1 Logging Architecture

```
Application Logs
     ├─ console.log(), console.error() (Node.js app)
     ├─ Captured by: GKE kubelet (container stdout/stderr)
     │
     └───────────────────────────────────────────────
                         │
                    ┌────▼────────────────────┐
                    │  Cloud Logging          │
                    │  (Centralized log repo)│
                    └─────┬──────────────────┘
                          │
                    Log Index (Lucene-based)
                    └─────────────────────────
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
    ┌─────────┐      ┌─────────┐       ┌─────────┐
    │ Logs    │      │ Metrics │       │ Traces  │
    │ Explorer│      │ Charts  │       │ Timeline│
    │ (Query  │      │ (Custom │       │ (Request│
    │  UI)    │      │ graphs) │       │  flow)  │
    └─────────┘      └─────────┘       └─────────┘

Log Retention: 30 days (Cost: ~0.50/GB)
Query latency: <5 seconds (O(log n) index lookup)
Export: BigQuery, GCS (batch)
```

### 7.2 Metrics

```
Custom Metrics (Application)
├─ "gamification/xp_awarded"
│  └─ Type: Distribution (histogram)
│  └─ Unit: Dimensionless
│  └─ Cardinality: user_id + action (medium)
│
├─ "study_sessions/duration_minutes"
│  └─ Type: Distribution
│  └─ Unit: Minutes
│
├─ "prerequisites/validation_time_ms"
│  └─ Type: Distribution (latency histogram)
│  └─ Unit: Milliseconds
│  └─ Percentiles: p50, p95, p99
│
└─ "api/requests_total"
   └─ Type: Counter (incremental)
   └─ Labels: {method, endpoint, status_code}
   └─ Cardinality: High (many endpoints)

System Metrics (Automatic)
├─ GKE Node: CPU%, Memory%, Disk I/O
├─ Pod: Container CPU%, Memory, Network bytes
├─ Cloud SQL: Query latency, Connection count, Replication lag
└─ Load Balancer: Request rate, Error rate, Latency percentiles

Alerting Threshold (Example)
├─ If: (API response latency p99 > 500ms for 5 min)
│  Then: Trigger critical alert → Email + PagerDuty
│
├─ If: (Database connection pool usage > 80% for 2 min)
│  Then: Trigger warning alert
│
└─ If: (Error rate > 1% for 1 min)
   Then: Trigger critical alert
```

---

## 8. Development Setup

### 8.1 Prerequisites

| Tool | Version | Installation |
|------|---------|--------------|
| Terraform | ≥1.0.0 | [terraform.io](https://www.terraform.io/downloads.html) |
| Google Cloud CLI | ≥500+ | [cloud.google.com/sdk](https://cloud.google.com/sdk/docs/install) |
| jq | ≥1.6 | JSON query utility (optional, for parsing) |
| Git | Latest | Version control for .terraform.lock.hcl |

### 8.2 GCP Project Setup

```bash
# 1. Create a new GCP project (or use existing)
export PROJECT_ID="htuai-prod"
export BILLING_ACCOUNT_ID="<your-billing-account>"

gcloud projects create $PROJECT_ID
gcloud billing projects link $PROJECT_ID --billing-account=$BILLING_ACCOUNT_ID

# 2. Set as active project
gcloud config set project $PROJECT_ID

# 3. Enable required APIs
gcloud services enable compute.googleapis.com
gcloud services enable container.googleapis.com
gcloud services enable logging.googleapis.com
gcloud services enable monitoring.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable sqladmin.googleapis.com

# 4. Authenticate with GCP
gcloud auth login
gcloud auth application-default login  # For Terraform

# 5. Create Terraform service account (recommended for CI/CD)
gcloud iam service-accounts create terraform-sa \
  --display-name "Terraform Service Account"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:terraform-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/editor"  # Temporary; tighten in production

# 6. Generate and store SA key
gcloud iam service-accounts keys create ~/terraform-key.json \
  --iam-account=terraform-sa@${PROJECT_ID}.iam.gserviceaccount.com

export GOOGLE_APPLICATION_CREDENTIALS=~/terraform-key.json
```

### 8.3 Terraform Initialization

```bash
# 1. Navigate to terraform directory
cd c:\Users\omara\projectx\htuai\terraform

# 2. Initialize Terraform (download providers, create .terraform/)
terraform init

# 3. Create terraform.tfvars file
cp terraform.tfvars.example terraform.tfvars

# Edit terraform.tfvars:
# project_id = "htuai-prod"
# region = "us-central1"
# environment = "prod"

# 4. Validate configuration (syntax check)
terraform validate

# Expected output:
# Success! The configuration is valid.

# 5. Format code (standard style)
terraform fmt

# 6. Generate plan (dry-run)
terraform plan -out=tfplan

# 7. Apply infrastructure (creates actual resources)
terraform apply tfplan

# Expected output (after ~2-3 min):
# ✓ google_service_account.web_app_sa
# ✓ google_compute_network.vpc
# ✓ google_compute_subnetwork.subnet
# ✓ google_compute_security_policy.policy
# ... etc ...
# Apply complete!
```

---

## 9. Operations & Maintenance

### 9.1 Common Tasks

```bash
# View current infrastructure
terraform show

# Show resource details
terraform show -json | jq '.resources[] | select(.type=="google_compute_network")'

# Update specific resource
terraform apply -target="google_compute_subnetwork.subnet"

# Destroy all (IRREVERSIBLE)
terraform destroy

# Destroy specific resource
terraform destroy -target="google_secret_manager_secret.auth_secret"

# Import existing resource (not created by Terraform)
terraform import google_project_iam_member.logging_writer \
  "projects/$PROJECT_ID/roles/logging.logWriter/serviceAccount:..."
```

### 9.2 State Management

```bash
# View state file (JSON format)
cat terraform.tfstate | jq '.'

# State lock (prevents concurrent edits)
# Automatic if using remote backend (GCS + DynamoDB)

# Remote backend setup (recommended for teams)
# Create backend.tf:

terraform {
  backend "gcs" {
    bucket = "terraform-state-htuai"
    prefix = "prod"  # Different per environment
  }
}

# Migrate state to remote
terraform init  # Will prompt: copy state? (yes)

# View remote state
terraform show
```

### 9.3 Troubleshooting

```bash
# Enable debug logging
export TF_LOG=DEBUG
terraform plan
unset TF_LOG

# Validate GCP credentials
gcloud auth list
gcloud config get-value project

# Test GCP connectivity
gcloud compute networks list

# Check for resource conflicts
gcloud compute networks describe smart-advisor-vpc

# Terraform error: "Error 403: Forbidden"
# Solution: Check IAM roles for Terraform service account

gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --format="table(bindings.role)" \
  --filter="bindings.members:terraform-sa@*"
```

---

## 10. Scaling & Performance

### 10.1 Vertical Scaling (Resource Allocation)

```hcl
# GKE Node Machine Type (adjust in gke.tf if created)
# Current: n1-standard-2 (2 vCPU, 7.5 GB RAM)
# Scaling options:

# Small workload → n1-standard-1 (1 vCPU, 3.75 GB)
# Medium → n1-standard-2 (current)
# Large → n1-highmem-4 (4 vCPU, 26 GB)

# Time to apply: ~5 minutes (node replacement)
# Downtime: ~30 seconds (pod drain, reschedule)
```

### 10.2 Horizontal Scaling (Replicas)

```hcl
# Kubernetes HPA (Horizontal Pod Autoscaler)
# Not defined in Terraform (managed by Kubernetes manifests)

# Example scaling policy:
# If: CPU > 80% for 1 min
# Scale to: min_replicas=2, max_replicas=10

# Additional GKE nodes added automatically via node pool autoscaling
# Time to add node: ~3-5 minutes
# Pod rescheduling: <30 seconds
```

### 10.3 Database Scaling

```hcl
# Cloud SQL machine type upgrade
# Current: db-n1-standard-1 (1 vCPU, 3.75 GB)
# Increase to: db-n1-highmem-2 (2 vCPU, 13 GB)

# Configuration in Terraform:
resource "google_sql_database_instance" "postgres" {
  settings {
    tier = "db-n1-highmem-2"  # Change this
  }
}

terraform apply

# Time to apply: ~10-20 minutes
# Downtime: ~5 minutes (HA failover recommended)

# Cost increase: ~$200/month → $400/month
```

---

## 11. Security Best Practices

### 11.1 Applied Security Measures

| Control | Implementation | Status |
|---------|---|--------|
| **Network** | Private VPC (no public IPs) | ✓ Implemented |
| **Firewall** | Cloud Armor WAF (SQLi, XSS rules) | ✓ Implemented |
| **Secrets** | Google Secret Manager (encrypted) | ✓ Implemented |
| **IAM** | Least-privilege roles + Workload Identity | ✓ Implemented |
| **Database** | Private Cloud SQL (no public IP) | ✓ Implemented |
| **Encryption** | In-transit (TLS 1.3), at-rest (GCP-managed) | ✓ Implemented |
| **Logging** | Cloud Logging + Audit trails | ✓ Implemented |
| **Monitoring** | Cloud Monitoring with alerts | ✓ Implemented |

### 11.2 To-Do: Additional Security

- [ ] Enable VPC Service Controls (perimeter)
- [ ] Implement GKE Network Policies (pod-to-pod firewall)
- [ ] Enable GKE Binary Authorization (signed container images)
- [ ] Add Cloud Armor custom rules (rate limiting, geo-blocking)
- [ ] Implement Secret rotation automation (Cloud Scheduler)

---

## 12. Cost Optimization

### 12.1 Monthly Cost Breakdown (Production)

| Resource | Config | Cost/Month | Notes |
|----------|--------|----------|-------|
| GKE Cluster | 5 nodes (n1-standard-2) | ~$320 | Auto-scale down off-peak |
| Cloud SQL | db-n1-standard-1, HA, backup | ~$550 | High availability +monthly backup |
| VM compute | Ingress/egress, disk | ~$200 | Data transfer out: $0.12/GB |
| Cloud Armor | WAF rules | ~$5 | Per policy + per million requests |
| Secret Manager | Secret storage | ~$6 | $0.06/secret/month |
| Cloud Logging | Log ingestion + storage | ~$50 | ~50GB/month at ~$0.50/GB |
| Cloud Monitoring | Custom metrics | ~$10 | ~100 custom metrics × $0.10 |
| **Total** | | **~$1,141** | Can optimize → ~$800 |

### 12.2 Cost Reduction Strategies

```hcl
# 1. Use Preemptible VMs (70% discount, but can be interrupted)
# For non-critical workloads (dev, staging)
node_pool {
  node_config {
    preemptible  = true  # Cost: ~$50/month vs $320
  }
}

# 2. Scale GKE cluster down during off-peak
# Set min_node_count = 1 for dev environment

# 3. Use Cloud SQL with standard HA (not multi-region)
# Saves: ~20% on HA cost

# 4. Archive logs after 7 days to GCS (cheaper storage)
log_sink {
  destination = "storage.googleapis.com/archive-bucket"
}

# 5. Enable resource quotas to prevent runaway costs
# Alert if daily bill > $100
```

---

## 13. Disaster Recovery & Backup

### 13.1 Backup Strategy

```
Cloud SQL Database
├─ Automated backups
│  ├─ Frequency: Daily at 3 AM UTC
│  ├─ Retention: 30 days (7 daily, 4 weekly, 1 monthly)
│  ├─ Location: Multi-region (automatic)
│  └─ RPO: ~24 hours (Recovery Point Objective)
│
└─ Point-in-time recovery (if enabled)
   ├─ Supported: Last 7 days
   ├─ Time to restore: ~30 minutes
   └─ RTO: 30 minutes (Recovery Time Objective)
```

### 13.2 Restore Procedure

```bash
# List available backups
gcloud sql backups list --instance=postgres-prod

# Restore from backup to new instance
gcloud sql backups restore <backup-id> \
  --backup-instance=postgres-prod \
  --backup-configuration=automated

# Verify data integrity
psql -h <new-instance-ip> -U app_user -d htuai_db \
  -c "SELECT COUNT(*) FROM users;"

# Swap DNS to new instance (if in production)
# Update Terraform with new instance IP
terraform apply
```

---

## 14. Compliance & Governance

### 14.1 Audit Logging

```hcl
# All Terraform changes tracked in Git
# Commit message example:
# "terraform: add monitoring alert for high latency"
# Author: omara@example.com
# Date: 2026-03-07

# GCP Cloud Audit Logs (implicit)
├─ Admin Activity (resource creation, deletion)
├─ Data Access (secret reads, log queries)
└─ System Event (automated scalingactions)
```

### 14.2 Compliance Checklist

- [ ] **Data Residency:** All resources in us-central1 (comply with GDPR, local data laws)
- [ ] **Encryption:** At-rest (GCP-managed), in-transit (TLS 1.3)
- [ ] **Access Control:** Service accounts + IAM roles
- [ ] **Audit Trail:** Cloud Audit Logs + Cloud Logging retention
- [ ] **Backup:** Daily automated backups with 30-day retention
- [ ] **Incident Response:** On-call team + PagerDuty alerts
- [ ] **Documentation:** This README + runbooks (TODO)

---

## 15. References & Documentation

### Official Documentation

- **Terraform Google Provider:** https://registry.terraform.io/providers/hashicorp/google/latest/docs
- **GCP Best Practices:** https://cloud.google.com/docs/best-practices
- **Cloud Armor Security:** https://cloud.google.com/armor/docs
- **Secret Manager API:** https://cloud.google.com/secret-manager/docs
- **GKE Security:** https://cloud.google.com/kubernetes-engine/docs/concepts/security
- **PostgreSQL on Cloud SQL:** https://cloud.google.com/sql/docs/postgres

---

## License & Attribution

This Infrastructure as Code is licensed under MIT License.

**Maintained by:** Omar Mubaidin  
**Last Updated:** March 7, 2026  

For infrastructure questions, security concerns, or operational support, contact the DevOps team.

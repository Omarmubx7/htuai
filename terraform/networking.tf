# Cloud Armor Security Policy
resource "google_compute_security_policy" "policy" {
  name = "smart-advisor-security-policy"

  # Default rule: allow all but with Cloud Armor protection
  rule {
    action   = "allow"
    priority = "2147483647"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    description = "default rule"
  }

  # Block SQLi
  rule {
    action   = "deny(403)"
    priority = "1000"
    match {
      expr {
        expression = "evaluatePreconfiguredExpr('sqli-v33-stable')"
      }
    }
    description = "Block SQL injection"
  }

  # Block XSS
  rule {
    action   = "deny(403)"
    priority = "1001"
    match {
      expr {
        expression = "evaluatePreconfiguredExpr('xss-v33-stable')"
      }
    }
    description = "Block Cross-site scripting"
  }
}

# VPC and Subnet (Basic)
resource "google_compute_network" "vpc" {
  name                    = "smart-advisor-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "subnet" {
  name          = "smart-advisor-subnet"
  ip_cidr_range = "10.0.1.0/24"
  region        = var.region
  network       = google_compute_network.vpc.id
  
  # Enabling Private Google Access for better security
  private_ip_google_access = true
}

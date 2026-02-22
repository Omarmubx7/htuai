# Enable Security Command Center (SCC) - Note: premium requires manual billing setup
# We enable standard logging here

resource "google_project_service" "logging" {
  service = "logging.googleapis.com"
}

resource "google_project_service" "monitoring" {
  service = "monitoring.googleapis.com"
}

resource "google_project_service" "secretmanager" {
  service = "secretmanager.googleapis.com"
}

resource "google_project_service" "cloudarmor" {
  service = "compute.googleapis.com"
}

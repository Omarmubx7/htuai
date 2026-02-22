# Service Account for the Web Application
resource "google_service_account" "web_app_sa" {
  account_id   = "smart-advisor-web-sa"
  display_name = "Smart Advisor Web App Service Account"
}

# Grant necessary permissions (Least Privilege)
# Logging writer
resource "google_project_iam_member" "logging_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.web_app_sa.email}"
}

# Monitoring metric writer
resource "google_project_iam_member" "metric_writer" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.web_app_sa.email}"
}

# Secret Manager Access (Specific secrets should be limited in a real env)
resource "google_project_iam_member" "secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.web_app_sa.email}"
}

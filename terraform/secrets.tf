# Define secrets in Secret Manager
resource "google_secret_manager_secret" "auth_secret" {
  secret_id = "AUTH_SECRET"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "google_client_id" {
  secret_id = "GOOGLE_CLIENT_ID"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "google_client_secret" {
  secret_id = "GOOGLE_CLIENT_SECRET"
  replication {
    auto {}
  }
}

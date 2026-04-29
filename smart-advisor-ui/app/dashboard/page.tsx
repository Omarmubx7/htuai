import { redirect } from "next/navigation";

/**
 * Bug Fix: Dashboard Route 404
 * The dashboard is technically the root "/" with HomeClient handling state.
 * Direct navigation to /dashboard should redirect to / to ensure session logic runs correctly.
 */
export default function DashboardRedirect() {
    redirect("/");
}

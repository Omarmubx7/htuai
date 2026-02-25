import { Metadata } from "next";
import PlannerHomeClient from "@/components/PlannerHomeClient";

export const metadata: Metadata = {
    title: "HTUAI Planner — Academic Hub",
    description: "Manage your semesters, track grades, and earn gamification XP.",
};

export default function PlannerPage() {
    return <PlannerHomeClient />;
}

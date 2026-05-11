import { Metadata } from "next";
import PlannerHomeClient from "@/components/PlannerHomeClient";

export const metadata: Metadata = {
    title: "Semester Planner",
    description: "Plan your semesters, track grades, predict your CGPA, and earn gamification XP with MUBXAI's free semester planner for Al Hussein Technical University students.",
};

export default function PlannerPage() {
    return <PlannerHomeClient />;
}

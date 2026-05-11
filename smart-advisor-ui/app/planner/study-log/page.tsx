import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import PlannerStudyLogClient from "@/components/PlannerStudyLogClient";

export const metadata: Metadata = {
    title: "Study Log — Semester Planner",
    description: "Log and track your study sessions, build consistency streaks, and earn XP with MUBXAI's gamified study tracker.",
};
export default async function PlannerStudyLogPage() {
    const session = await getServerSession(authOptions);
    if (!session) {
        redirect("/");
    }

    return <PlannerStudyLogClient />;
}

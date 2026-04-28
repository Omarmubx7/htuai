import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import PlannerStudyLogClient from "@/components/PlannerStudyLogClient";

export const metadata: Metadata = {
    title: "Semester Planner | HTUAI",
    description: "Track your study sessions and stay consistent with learning.",
};
export default async function PlannerStudyLogPage() {
    const session = await getServerSession(authOptions);
    if (!session) {
        redirect("/");
    }

    return <PlannerStudyLogClient />;
}

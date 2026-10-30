import type { Metadata } from "next";
import PlannerSemesterList from "@/components/PlannerSemesterList";

export const metadata: Metadata = {
    title: "Semesters",
    description: "Manage the semesters in your MUBXAI degree plan.",
    alternates: {
        canonical: "https://ai.mubx.dev/planner/semesters",
    },
    robots: { index: false, follow: true },
};

export default function PlannerSemestersPage() {
    return <PlannerSemesterList />;
}

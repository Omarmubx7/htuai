import type { Metadata } from "next";
import PlannerGamification from "@/components/PlannerGamification";

export const metadata: Metadata = {
    title: "Gamification",
    description: "Track XP, streaks and study achievements in your MUBXAI planner.",
    alternates: {
        canonical: "https://ai.mubx.dev/planner/gamification",
    },
    robots: { index: false, follow: true },
};

export default function GamificationPage() {
    return <PlannerGamification />;
}

import { Metadata } from "next";
import { Suspense } from "react";
import PlannerSettings from "@/components/PlannerSettings";

export const metadata: Metadata = {
    title: "Planner Settings",
    description: "Configure your MUBXAI semester planner preferences, Google Calendar sync, and academic profile settings.",
    alternates: {
        canonical: "https://ai.mubx.dev/planner/settings",
    },
    // Settings is a user-specific, auth-gated page — no indexing value
    robots: {
        index: false,
        follow: false,
    },
};

export default function SettingsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#edf1f6] flex items-center justify-center"><div className="w-8 h-8 rounded-xl bg-[#edf1f6] animate-pulse" /></div>}>
            <PlannerSettings />
        </Suspense>
    );
}

import { Metadata } from "next";
import { Suspense } from "react";
import PlannerSettings from "@/components/PlannerSettings";

export const metadata: Metadata = {
    title: "Semester Planner | HTUAI",
    description: "Configure your academic planner preferences and calendar sync.",
};

export default function SettingsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><div className="w-8 h-8 rounded-xl bg-white/5 animate-pulse" /></div>}>
            <PlannerSettings />
        </Suspense>
    );
}

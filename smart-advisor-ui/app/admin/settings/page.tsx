import { Suspense } from "react";
import SettingsTab from "@/components/admin/SettingsTab";

export default function AdminSettingsPage() {
    return (
        <Suspense fallback={null}>
            <div className="space-y-6">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#222d32]">Site Settings</h1>
                    <p className="text-xs text-[#5a6472]">Control uploads, limits, content and feature flags.</p>
                </div>
                <SettingsTab />
            </div>
        </Suspense>
    );
}
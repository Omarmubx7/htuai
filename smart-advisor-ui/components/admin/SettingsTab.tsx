"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Save, Upload, BookOpen, Type, Zap, Wrench } from "lucide-react";
import { useAdminSecret } from "@/components/AdminGate";
import { AdminCard, Field, TextInput, TextArea, Toggle, AdminButton } from "@/components/admin/ui";
import {
    DEFAULT_SETTINGS,
    mergeSettings,
    type SiteSettings,
    type DeepPartial,
} from "@/lib/site-settings";

export default function SettingsTab() {
    const adminSecret = useAdminSecret();
    const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

    const load = useCallback(async () => {
        if (!adminSecret) return;
        setLoading(true);
        try {
            const res = await fetch("/api/admin/settings", {
                headers: { "x-admin-secret": adminSecret },
                cache: "no-store",
            });
            if (!res.ok) throw new Error("Failed to load settings");
            const data = await res.json();
            setSettings(mergeSettings(DEFAULT_SETTINGS, data.settings));
        } catch {
            setMessage({ kind: "err", text: "Could not load settings." });
        }
        setLoading(false);
    }, [adminSecret]);

    useEffect(() => {
        void load();
    }, [load]);

    /** Immutably patch one section of settings. */
    function patch<K extends keyof SiteSettings>(section: K, value: DeepPartial<SiteSettings[K]>) {
        setSettings((prev) => ({ ...prev, [section]: { ...prev[section], ...value } }));
        setMessage(null);
    }

    async function save() {
        if (!adminSecret) return;
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch("/api/admin/settings", {
                method: "PUT",
                headers: { "x-admin-secret": adminSecret, "Content-Type": "application/json" },
                body: JSON.stringify(settings),
            });
            if (!res.ok) throw new Error("Failed to save");
            const data = await res.json();
            setSettings(mergeSettings(DEFAULT_SETTINGS, data.settings));
            setMessage({ kind: "ok", text: "Settings saved." });
        } catch {
            setMessage({ kind: "err", text: "Could not save settings." });
        }
        setSaving(false);
    }

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-sm text-[#5a6472]">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading settings…
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-[#5a6472]">Changes apply to everyone as soon as you save.</p>
                <AdminButton onClick={save} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {saving ? "Saving…" : "Save changes"}
                </AdminButton>
            </div>

            {message && (
                <div
                    className={`rounded-xl border px-4 py-2.5 text-sm ${
                        message.kind === "ok"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-[#dc4835]/30 bg-[#dc4835]/5 text-[#dc4835]"
                    }`}
                >
                    {message.text}
                </div>
            )}

            <AdminCard
                title="Upload limits"
                description="Caps that keep the directory useful and safe."
                icon={<Upload className="h-4 w-4" />}
            >
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Field label="Max file size (MB)">
                        <TextInput
                            type="number"
                            min={1}
                            max={1024}
                            value={settings.upload.maxFileSizeMb}
                            onChange={(e) => patch("upload", { maxFileSizeMb: Number(e.target.value) })}
                        />
                    </Field>
                    <Field label="Files per upload">
                        <TextInput
                            type="number"
                            min={1}
                            max={100}
                            value={settings.upload.maxFilesPerBatch}
                            onChange={(e) => patch("upload", { maxFilesPerBatch: Number(e.target.value) })}
                        />
                    </Field>
                    <Field label="Uploads / user / day">
                        <TextInput
                            type="number"
                            min={1}
                            max={1000}
                            value={settings.upload.maxUploadsPerDay}
                            onChange={(e) => patch("upload", { maxUploadsPerDay: Number(e.target.value) })}
                        />
                    </Field>
                    <Field label="Total resources / user">
                        <TextInput
                            type="number"
                            min={1}
                            max={10000}
                            value={settings.upload.maxTotalResources}
                            onChange={(e) => patch("upload", { maxTotalResources: Number(e.target.value) })}
                        />
                    </Field>
                </div>
                <div className="mt-4">
                    <Field
                        label="Allowed file extensions"
                        hint="Comma-separated. Anything not listed is rejected (html/svg/scripts are always blocked)."
                    >
                        <TextArea
                            rows={3}
                            value={settings.upload.allowedExtensions.join(", ")}
                            onChange={(e) =>
                                patch("upload", {
                                    allowedExtensions: e.target.value
                                        .split(",")
                                        .map((s) => s.trim().replace(/^\./, "").toLowerCase())
                                        .filter(Boolean),
                                })
                            }
                        />
                    </Field>
                </div>
            </AdminCard>

            <AdminCard
                title="Resources & moderation"
                description="Feature switches and the report auto-hide threshold."
                icon={<BookOpen className="h-4 w-4" />}
            >
                <Toggle
                    checked={settings.resources.enabled}
                    onChange={(v) => patch("resources", { enabled: v })}
                    label="Resources feature"
                    description="Master switch for the whole Resources section."
                />
                <Toggle
                    checked={settings.resources.uploadsEnabled}
                    onChange={(v) => patch("resources", { uploadsEnabled: v })}
                    label="Accept new uploads"
                    description="When off, browsing stays available but uploads are blocked."
                />
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field label="Report auto-hide threshold" hint="Publicly hidden at or above this many reports.">
                        <TextInput
                            type="number"
                            min={1}
                            max={1000}
                            value={settings.resources.reportHideThreshold}
                            onChange={(e) => patch("resources", { reportHideThreshold: Number(e.target.value) })}
                        />
                    </Field>
                    <Field label="List results cap">
                        <TextInput
                            type="number"
                            min={1}
                            max={5000}
                            value={settings.resources.listLimit}
                            onChange={(e) => patch("resources", { listLimit: Number(e.target.value) })}
                        />
                    </Field>
                </div>
            </AdminCard>

            <AdminCard
                title="Content & copy"
                description="Rules and disclaimer shown on the Resources page."
                icon={<Type className="h-4 w-4" />}
            >
                <div className="grid gap-4">
                    <Field label="Contact email">
                        <TextInput
                            type="email"
                            value={settings.content.contactEmail}
                            onChange={(e) => patch("content", { contactEmail: e.target.value })}
                        />
                    </Field>
                    <Field label="Rules subtitle">
                        <TextInput
                            value={settings.content.uploadRulesSubtitle}
                            onChange={(e) => patch("content", { uploadRulesSubtitle: e.target.value })}
                        />
                    </Field>
                    <Field label="Allowed to upload (one per line)">
                        <TextArea
                            rows={4}
                            value={settings.content.uploadRulesAllowed.join("\n")}
                            onChange={(e) =>
                                patch("content", {
                                    uploadRulesAllowed: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                                })
                            }
                        />
                    </Field>
                    <Field label="Not allowed (one per line)">
                        <TextArea
                            rows={4}
                            value={settings.content.uploadRulesDisallowed.join("\n")}
                            onChange={(e) =>
                                patch("content", {
                                    uploadRulesDisallowed: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                                })
                            }
                        />
                    </Field>
                    <Field label="Disclaimer">
                        <TextArea
                            rows={3}
                            value={settings.content.uploadDisclaimer}
                            onChange={(e) => patch("content", { uploadDisclaimer: e.target.value })}
                        />
                    </Field>
                    <Field label="Terms &quot;last updated&quot;">
                        <TextInput
                            value={settings.content.termsLastUpdated}
                            onChange={(e) => patch("content", { termsLastUpdated: e.target.value })}
                        />
                    </Field>
                </div>
            </AdminCard>

            <AdminCard title="AI limits" description="Daily per-user AI request ceiling." icon={<Zap className="h-4 w-4" />}>
                <Field label="AI requests / user / day">
                    <TextInput
                        type="number"
                        min={1}
                        max={10000}
                        className="max-w-40"
                        value={settings.ai.dailyLimit}
                        onChange={(e) => patch("ai", { dailyLimit: Number(e.target.value) })}
                    />
                </Field>
            </AdminCard>

            <AdminCard
                title="Maintenance"
                description="Show a maintenance notice across the site."
                icon={<Wrench className="h-4 w-4" />}
            >
                <Toggle
                    checked={settings.maintenance.enabled}
                    onChange={(v) => patch("maintenance", { enabled: v })}
                    label="Maintenance mode"
                    description="Displays a notice. Does not block access yet."
                />
                <div className="mt-3">
                    <Field label="Maintenance message">
                        <TextArea
                            rows={2}
                            value={settings.maintenance.message}
                            onChange={(e) => patch("maintenance", { message: e.target.value })}
                        />
                    </Field>
                </div>
            </AdminCard>
        </div>
    );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { FileText, Save, Loader2, CheckCircle2, Megaphone } from 'lucide-react';
import { AdminCard, AdminButton, Field, TextInput, TextArea, Toggle } from '@/components/admin/ui';
import type { SiteSettings } from '@/lib/site-settings';

function linesToArray(value: string): string[] {
    return value
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
}

export default function ContentTab({ adminSecret }: { readonly adminSecret: string }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');
    const [settings, setSettings] = useState<SiteSettings | null>(null);

    const load = useCallback(async () => {
        if (!adminSecret) return;
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/admin/settings', {
                headers: { 'x-admin-secret': adminSecret },
                cache: 'no-store',
            });
            if (!res.ok) throw new Error('Failed to load settings');
            const data = await res.json();
            setSettings(data.settings);
        } catch {
            setError('Could not load content settings.');
        } finally {
            setLoading(false);
        }
    }, [adminSecret]);

    useEffect(() => {
        void load();
    }, [load]);

    const patchContent = (patch: Partial<SiteSettings['content']>) => {
        setSettings((prev) =>
            prev ? { ...prev, content: { ...prev.content, ...patch } } : prev
        );
        setSaved(false);
    };

    const patchMaintenance = (patch: Partial<SiteSettings['maintenance']>) => {
        setSettings((prev) =>
            prev ? { ...prev, maintenance: { ...prev.maintenance, ...patch } } : prev
        );
        setSaved(false);
    };

    const save = async () => {
        if (!settings || !adminSecret) return;
        setSaving(true);
        setError('');
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: { 'x-admin-secret': adminSecret, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: settings.content,
                    maintenance: settings.maintenance,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Failed to save');
            setSettings(data.settings ?? settings);
            setSaved(true);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <AdminCard title="Content" icon={<FileText className="h-4 w-4" />}>
                <p className="py-6 text-center text-xs text-[#5a6472]">Loading content settings…</p>
            </AdminCard>
        );
    }

    if (!settings) {
        return (
            <AdminCard title="Content" icon={<FileText className="h-4 w-4" />}>
                <p className="py-6 text-center text-xs text-[#dc4835]">{error || 'Unavailable.'}</p>
            </AdminCard>
        );
    }

    const { content, maintenance } = settings;

    return (
        <div className="space-y-6">
            <AdminCard
                title="Upload rules & disclaimer"
                description="Shown to every student on the Resources page."
                icon={<FileText className="h-4 w-4" />}
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Title">
                        <TextInput
                            value={content.uploadRulesTitle}
                            onChange={(e) => patchContent({ uploadRulesTitle: e.target.value })}
                        />
                    </Field>
                    <Field label="Subtitle">
                        <TextInput
                            value={content.uploadRulesSubtitle}
                            onChange={(e) => patchContent({ uploadRulesSubtitle: e.target.value })}
                        />
                    </Field>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field label="Do upload" hint="One item per line.">
                        <TextArea
                            rows={7}
                            value={content.uploadRulesAllowed.join('\n')}
                            onChange={(e) => patchContent({ uploadRulesAllowed: linesToArray(e.target.value) })}
                        />
                    </Field>
                    <Field label="Don't upload" hint="One item per line.">
                        <TextArea
                            value={content.uploadRulesDisallowed.join('\n')}
                            onChange={(e) => patchContent({ uploadRulesDisallowed: linesToArray(e.target.value) })}
                        />
                    </Field>
                </div>

                <div className="mt-4">
                    <Field label="Disclaimer">
                        <TextArea
                            rows={3}
                            value={content.uploadDisclaimer}
                            onChange={(e) => patchContent({ uploadDisclaimer: e.target.value })}
                        />
                    </Field>
                </div>
            </AdminCard>

            <AdminCard
                title="Contact & legal"
                description="Public-facing contact points."
                icon={<FileText className="h-4 w-4" />}
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Contact email">
                        <TextInput
                            type="email"
                            value={content.contactEmail}
                            onChange={(e) => patchContent({ contactEmail: e.target.value })}
                        />
                    </Field>
                    <Field label="Terms last updated">
                        <TextInput
                            value={content.termsLastUpdated}
                            onChange={(e) => patchContent({ termsLastUpdated: e.target.value })}
                        />
                    </Field>
                </div>
            </AdminCard>

            <AdminCard
                title="Maintenance banner"
                description="Flag the site as under maintenance (display only)."
                icon={<Megaphone className="h-4 w-4" />}
            >
                <Toggle
                    checked={maintenance.enabled}
                    onChange={(v) => patchMaintenance({ enabled: v })}
                    label="Maintenance mode"
                    description="Turn on to show the maintenance notice."
                />
                <div className="mt-3">
                    <Field label="Message">
                        <TextArea
                            rows={2}
                            value={maintenance.message}
                            onChange={(e) => patchMaintenance({ message: e.target.value })}
                        />
                    </Field>
                </div>
            </AdminCard>

            <div className="flex items-center gap-3">
                <AdminButton onClick={() => void save()} disabled={saving || !adminSecret}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {saving ? 'Saving…' : 'Save changes'}
                </AdminButton>
                {saved && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                        <CheckCircle2 className="h-4 w-4" /> Saved
                    </span>
                )}
                {error && <span className="text-xs font-semibold text-[#dc4835]">{error}</span>}
            </div>
        </div>
    );
}

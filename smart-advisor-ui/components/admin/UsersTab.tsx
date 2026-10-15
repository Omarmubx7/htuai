'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, RefreshCw, ShieldCheck, ShieldBan, UserCog, Loader2 } from 'lucide-react';
import { AdminCard, AdminButton, TextInput } from '@/components/admin/ui';

type Role = 'student' | 'admin' | 'banned';

interface AdminUser {
    id: number;
    name: string | null;
    email: string | null;
    student_id: string | null;
    role: Role | string | null;
    created_at: string | null;
    _count: { resources: number; semesters: number; visitor_logs: number };
}

function roleBadge(role?: string | null) {
    const base = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide';
    switch (role) {
        case 'admin':
            return `${base} bg-[#dc4835]/10 text-[#dc4835]`;
        case 'banned':
            return `${base} bg-rose-500/10 text-rose-600`;
        default:
            return `${base} bg-[#edf1f6] text-[#5a6472]`;
    }
}

export default function UsersTab({ adminSecret }: Readonly<{ adminSecret: string }>) {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [busyId, setPendingId] = useState<number | null>(null);
    const [error, setError] = useState('');

    const fetchUsers = useCallback(async () => {
        if (!adminSecret) return;
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/admin/users', {
                headers: { 'x-admin-secret': adminSecret },
                cache: 'no-store',
            });
            if (!res.ok) throw new Error('Failed to load users');
            const data = await res.json();
            setUsers(data.users ?? []);
            setTotal(data.total ?? data.users?.length ?? 0);
        } catch {
            setError('Could not load users.');
        } finally {
            setLoading(false);
        }
    }, [adminSecret]);

    useEffect(() => {
        void fetchUsers();
    }, [fetchUsers]);

    const setRole = useCallback(
        async (user: AdminUser, role: Role) => {
            if (!adminSecret) return;
            setPendingId(user.id);
            setError('');
            try {
                const res = await fetch(`/api/admin/users/${user.id}`, {
                    method: 'PATCH',
                    headers: { 'x-admin-secret': adminSecret, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ role }),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.error || 'Failed to update role');
                setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role } : u)));
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Failed to update role');
            } finally {
                setPendingId(null);
            }
        },
        [adminSecret]
    );

    const q = search.trim().toLowerCase();
    const filtered = useMemo(() => {
        if (!q) return users;
        return users.filter(
            (u) =>
                (u.name ?? '').toLowerCase().includes(q) ||
                (u.email ?? '').toLowerCase().includes(q) ||
                (u.student_id ?? '').toLowerCase().includes(q)
        );
    }, [users, q]);

    const counts = useMemo(() => {
        return {
            total: users.length,
            admins: users.filter((u) => u.role === 'admin').length,
            banned: users.filter((u) => u.role === 'banned').length,
        };
    }, [users]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: 'Accounts', value: total, color: '#3b82f6' },
                    { label: 'Admins', value: counts.admins, color: '#dc4835' },
                    { label: 'Banned', value: counts.banned, color: '#e11d48' },
                ].map((s, i) => (
                    <motion.div
                        key={s.label}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="rounded-2xl border border-[#dde3ec] bg-white p-4 text-center shadow-sm"
                    >
                        <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-[#5a6472]">{s.label}</p>
                        <p className="text-2xl font-black tabular-nums" style={{ color: s.color }}>
                            {s.value}
                        </p>
                    </motion.div>
                ))}
            </div>

            <AdminCard
                title="User accounts"
                description="Promote, demote or ban accounts. Every change is reversible — no data is deleted."
                icon={<Users className="h-4 w-4" />}
            >
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#5a6472]" />
                        <TextInput
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search name, email or ID…"
                            className="pl-9"
                        />
                    </div>
                    <AdminButton variant="ghost" onClick={() => void fetchUsers()}>
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </AdminButton>
                </div>

                {error && (
                    <p className="mb-3 rounded-xl border border-[#dc4835]/25 bg-[#dc4835]/5 px-3 py-2 text-xs font-medium text-[#dc4835]">
                        {error}
                    </p>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-[#dde3ec] text-[11px] font-bold uppercase tracking-wide text-[#5a6472]">
                                <th className="py-2 pr-4">User</th>
                                <th className="py-2 pr-4">Role</th>
                                <th className="py-2 pr-4">Resources</th>
                                <th className="py-2 pr-4">Semesters</th>
                                <th className="py-2 pr-4">Joined</th>
                                <th className="py-2 pr-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((u) => {
                                const busy = busyId === u.id;
                                const isAdmin = u.role === 'admin';
                                const isBanned = u.role === 'banned';
                                return (
                                    <tr key={u.id} className="border-b border-[#edf1f6] hover:bg-[#edf1f6]/50">
                                        <td className="py-3 pr-4 text-xs">
                                            <p className="font-semibold text-[#222d32]">
                                                {u.name || u.email || u.student_id || `User #${u.id}`}
                                            </p>
                                            <p className="text-[11px] text-[#5a6472]">
                                                {u.email ?? u.student_id ?? '—'}
                                            </p>
                                        </td>
                                        <td className="py-3 pr-4">
                                            <span className={roleBadge(u.role ?? 'student')}>{u.role ?? 'student'}</span>
                                        </td>
                                        <td className="py-3 pr-4 text-xs tabular-nums text-[#5a6472]">
                                            {u._count?.resources ?? 0}
                                        </td>
                                        <td className="py-3 pr-4 text-xs tabular-nums text-[#5a6472]">
                                            {u._count?.semesters ?? 0}
                                        </td>
                                        <td className="py-3 pr-4 text-xs text-[#5a6472]">
                                            {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                                        </td>
                                        <td className="py-3 pr-4">
                                            <div className="flex items-center justify-end gap-2">
                                                {busy ? (
                                                    <Loader2 className="h-4 w-4 animate-spin text-[#5a6472]" />
                                                ) : (
                                                    <>
                                                        {!isAdmin && (
                                                            <button
                                                                type="button"
                                                                onClick={() => void setRole(u, 'admin')}
                                                                className="inline-flex items-center gap-1 rounded-lg bg-[#dc4835]/10 px-2.5 py-1.5 text-[11px] font-bold text-[#dc4835] hover:bg-[#dc4835]/20"
                                                                title="Make admin"
                                                            >
                                                                <ShieldCheck className="h-3.5 w-3.5" /> Admin
                                                            </button>
                                                        )}
                                                        {isAdmin && (
                                                            <button
                                                                type="button"
                                                                onClick={() => void setRole(u, 'student')}
                                                                className="inline-flex items-center gap-1 rounded-lg bg-[#edf1f6] px-2.5 py-1.5 text-[11px] font-bold text-[#5a6472] hover:bg-[#dde3ec]"
                                                                title="Demote to student"
                                                            >
                                                                <UserCog className="h-3.5 w-3.5" /> Demote
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => void setRole(u, isBanned ? 'student' : 'banned')}
                                                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold ${
                                                                isBanned
                                                                    ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                                                                    : 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20'
                                                            }`}
                                                            title={isBanned ? 'Unban' : 'Ban'}
                                                        >
                                                            <ShieldBan className="h-3.5 w-3.5" />
                                                            {isBanned ? 'Unban' : 'Ban'}
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {!loading && filtered.length === 0 && (
                        <p className="py-8 text-center text-xs text-[#5a6472]">No matching users.</p>
                    )}
                    {loading && (
                        <p className="py-8 text-center text-xs text-[#5a6472]">Loading users…</p>
                    )}
                </div>
            </AdminCard>
        </div>
    );
}

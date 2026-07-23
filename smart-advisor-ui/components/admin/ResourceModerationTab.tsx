'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    Shield, ExternalLink, Trash2, AlertTriangle,
    FileText, Filter, Search, RefreshCw, ChevronDown
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════ */

interface Report {
    id: number;
    reason: string;
    detail: string | null;
    created_by: string | null;
    created_at: string;
}

interface Resource {
    id: number;
    course_code: string;
    title: string;
    type: string;
    url: string;
    file_path: string | null;
    description: string | null;
    uploaded_by: string | null;
    semester: string | null;
    report_count: number;
    created_at: string;
    reports: Report[];
}

/* ═══════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════ */

const REASON_LABELS: Record<string, string> = {
    broken_link: 'Broken Link',
    wrong_course: 'Wrong Course',
    inappropriate: 'Inappropriate',
};

function reasonBadge(reason: string) {
    const base = 'text-[10px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded';
    switch (reason) {
        case 'broken_link': return `${base} bg-rose-500/15 text-rose-400`;
        case 'wrong_course': return `${base} bg-amber-500/15 text-amber-400`;
        case 'inappropriate': return `${base} bg-purple-500/15 text-purple-400`;
        default: return `${base} bg-gray-500/15 text-gray-400`;
    }
}

function typeBadge(type: string) {
    const base = 'text-[10px] font-bold uppercase tracking-tighter px-1.5 py-0.5 rounded';
    switch (type) {
        case 'pdf': return `${base} bg-red-500/15 text-red-400`;
        case 'video': return `${base} bg-blue-500/15 text-blue-400`;
        case 'link': return `${base} bg-green-500/15 text-green-400`;
        case 'image': return `${base} bg-pink-500/15 text-pink-400`;
        default: return `${base} bg-gray-500/15 text-gray-400`;
    }
}

/* ═══════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════ */

export default function ResourceModerationTab({ adminSecret }: { adminSecret: string }) {
    const [resources, setResources] = useState<Resource[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'reported'>('reported');
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const fetchResources = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/resources', {
                headers: { 'x-admin-secret': adminSecret },
            });
            if (res.ok) {
                const data = await res.json();
                setResources(data);
            }
        } finally {
            setLoading(false);
        }
    }, [adminSecret]);

    useEffect(() => { fetchResources(); }, [fetchResources]);

    const handleDelete = async (id: number) => {
        setDeleting(true);
        try {
            const res = await fetch(`/api/admin/resources/${id}`, {
                method: 'DELETE',
                headers: { 'x-admin-secret': adminSecret },
            });
            if (res.ok) {
                setResources(prev => prev.filter(r => r.id !== id));
                setDeleteId(null);
            }
        } finally {
            setDeleting(false);
        }
    };

    const filtered = resources.filter(r => {
        if (filter === 'reported' && r.report_count === 0) return false;
        if (search) {
            const q = search.toLowerCase();
            return r.title.toLowerCase().includes(q) ||
                r.course_code.toLowerCase().includes(q) ||
                (r.uploaded_by && r.uploaded_by.toLowerCase().includes(q));
        }
        return true;
    });

    const reportedCount = resources.filter(r => r.report_count > 0).length;

    return (
        <div className="space-y-6">
            {/* ─── Stats Row ───────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                    { label: 'Total Resources', value: resources.length, color: '#3b82f6' },
                    { label: 'Reported', value: reportedCount, color: '#f43f5e' },
                    { label: 'Total Reports', value: resources.reduce((s, r) => s + r.report_count, 0), color: '#f59e0b' },
                ].map((stat, i) => (
                    <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 * i, duration: 0.35 }}
                        className="premium-card p-4 text-center">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-[#222d32]/30 mb-1">{stat.label}</p>
                        <p className="text-2xl font-black tabular-nums" style={{ color: stat.color }}>{stat.value}</p>
                    </motion.div>
                ))}
            </div>

            {/* ─── Filters & Search ───────────────────────── */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="premium-card p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 text-[#222d32]/30" />
                    <div className="flex rounded-lg overflow-hidden border border-[#dde3ec]/60">
                        {([['reported', 'Reported'], ['all', 'All']] as const).map(([key, label]) => (
                            <button key={key} onClick={() => setFilter(key)}
                                className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all ${filter === key
                                    ? 'bg-[#dc4835] text-white'
                                    : 'bg-[#edf1f6]/40 text-[#222d32]/40 hover:text-[#222d32]/60'
                                }`}>
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 w-full sm:w-auto relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#222d32]/20" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search resources..."
                        className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#edf1f6]/40 border border-[#dde3ec]/60 text-xs text-[#222d32]/70 placeholder:text-[#222d32]/20 focus:outline-none focus:ring-2 focus:ring-[#dc4835]/20 transition-all" />
                </div>

                <button onClick={fetchResources}
                    className="p-2 rounded-lg hover:bg-[#edf1f6]/40 text-[#222d32]/30 hover:text-[#222d32]/60 transition-all">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </motion.div>

            {/* ─── Resource List ──────────────────────────── */}
            {loading ? (
                <div className="premium-card p-10 text-center">
                    <div className="w-6 h-6 border-2 border-[#dc4835]/30 border-t-[#dc4835] rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-xs text-[#222d32]/30 font-medium">Loading resources...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="premium-card p-10 text-center">
                    <div className="w-10 h-10 rounded-full bg-[#edf1f6]/30 flex items-center justify-center mx-auto mb-3">
                        <FileText className="w-5 h-5 text-[#222d32]/10" />
                    </div>
                    <p className="text-xs text-[#222d32]/20 font-medium">
                        {filter === 'reported' ? 'No reported resources — nice!' : 'No resources yet'}
                    </p>
                </div>
            ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                    className="space-y-2">
                    {filtered.map((resource, i) => (
                        <motion.div key={resource.id}
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.02 * Math.min(i, 20), duration: 0.3 }}
                            className="premium-card p-4 group hover:shadow-lg hover:shadow-[#dc4835]/5 transition-all duration-300">
                            {/* ─── Resource Header ─────────────────── */}
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                        <span className={`font-mono text-[11px] font-bold ${typeBadge(resource.type)}`}>
                                            {resource.type.toUpperCase()}
                                        </span>
                                        <span className="text-[11px] font-mono font-bold text-[#222d32]/40 bg-[#edf1f6]/60 px-2 py-0.5 rounded">
                                            {resource.course_code}
                                        </span>
                                        {resource.report_count > 0 && (
                                            <span className="flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full">
                                                <AlertTriangle className="w-3 h-3" />
                                                {resource.report_count} report{resource.report_count > 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-sm font-semibold text-[#222d32]/80 truncate">{resource.title}</h3>
                                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[#222d32]/30">
                                        {resource.uploaded_by && <span>by {resource.uploaded_by}</span>}
                                        {resource.semester && <span className="font-mono">{resource.semester}</span>}
                                        <span>{new Date(resource.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                {/* ─── Actions ──────────────────────── */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                    {resource.url && (
                                        <a href={resource.url} target="_blank" rel="noopener noreferrer"
                                            className="p-2 rounded-lg hover:bg-blue-500/10 text-[#222d32]/25 hover:text-blue-400 transition-all"
                                            title="Open resource">
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                    )}
                                    {resource.reports.length > 0 && (
                                        <button onClick={() => setExpandedId(expandedId === resource.id ? null : resource.id)}
                                            className="p-2 rounded-lg hover:bg-amber-500/10 text-[#222d32]/25 hover:text-amber-400 transition-all"
                                            title="View reports">
                                            <AlertTriangle className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button onClick={() => setDeleteId(resource.id)}
                                        className="p-2 rounded-lg hover:bg-rose-500/10 text-[#222d32]/25 hover:text-rose-400 transition-all"
                                        title="Delete resource">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* ─── Expanded Reports ───────────────── */}
                            {expandedId === resource.id && resource.reports.length > 0 && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                                    className="mt-3 pt-3 border-t border-[#dde3ec]/40 space-y-2">
                                    {resource.reports.map(report => (
                                        <div key={report.id} className="flex items-start gap-2 text-xs">
                                            <span className={reasonBadge(report.reason)}>
                                                {REASON_LABELS[report.reason] || report.reason}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                {report.detail && <p className="text-[#222d32]/50">{report.detail}</p>}
                                                <p className="text-[#222d32]/25 mt-0.5">
                                                    {report.created_by || 'Anonymous'} · {new Date(report.created_at).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                        </motion.div>
                    ))}
                </motion.div>
            )}

            {/* ─── Delete Confirmation Modal ──────────────── */}
            {deleteId !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    onClick={() => !deleting && setDeleteId(null)}>
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        onClick={e => e.stopPropagation()}
                        className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl bg-white border border-[#dde3ec]">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-rose-500/15">
                                <Trash2 className="w-5 h-5 text-rose-500" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-[#222d32]">Delete Resource</h3>
                                <p className="text-xs text-[#5a6472]">This action cannot be undone</p>
                            </div>
                        </div>
                        <p className="text-xs text-[#5a6472] mb-5">
                            Are you sure you want to delete this resource and all its reports?
                        </p>
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setDeleteId(null)} disabled={deleting}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-[#5a6472] hover:text-[#222d32] hover:bg-[#edf1f6] transition-all">
                                Cancel
                            </button>
                            <button onClick={() => handleDelete(deleteId)} disabled={deleting}
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500/15 text-rose-600 hover:bg-rose-500/25 transition-all disabled:opacity-50 border border-rose-500/20">
                                {deleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}

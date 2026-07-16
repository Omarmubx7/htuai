'use client';

import { useEffect, useState } from 'react';
import AdminGate, { useAdminSecret } from '@/components/AdminGate';
import { Loader2 } from 'lucide-react';
import { fetchJSON } from '@/lib/fetch-retry';

interface LogEntry {
    id: number;
    student_id: string | null;
    ip_address: string;
    device_vendor: string | null;
    device_model: string | null;
    os_name: string | null;
    os_version: string | null;
    browser_name: string | null;
    visited_at: string;
}

export default function LogsPage() {
    return <AdminGate><LogsInner /></AdminGate>;
}

function LogsInner() {
    const adminSecret = useAdminSecret();
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchJSON<LogEntry[]>('/api/admin/logs', {
            headers: { 'x-admin-secret': adminSecret },
            retries: 2
        })
            .then(data => { setLogs(data); setLoading(false); })
            .catch(() => setLoading(false));
    }, [adminSecret]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#edf1f6' }}>
            <Loader2 className="w-6 h-6 text-[#5a6472] animate-spin" />
        </div>
    );

    return (
        <div className="min-h-screen bg-[#edf1f6] text-[#222d32] p-6">
            <h1 className="text-2xl font-bold mb-6">Visitor Logs (Last 100)</h1>

            <div className="overflow-x-auto border border-[#dde3ec] rounded-lg">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-[#edf1f6] text-[#5a6472]">
                        <tr>
                            <th className="px-4 py-3">Time</th>
                            <th className="px-4 py-3">Student ID</th>
                            <th className="px-4 py-3">IP Address</th>
                            <th className="px-4 py-3">Device / OS</th>
                            <th className="px-4 py-3">Browser</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {logs.map((log) => (
                            <tr key={log.id} className="hover:bg-[#edf1f6] transition-colors">
                                <td className="px-4 py-3 whitespace-nowrap text-[#222d32]/80">
                                    {new Date(log.visited_at).toLocaleString()}
                                </td>
                                <td className="px-4 py-3 font-mono text-blue-400">
                                    {log.student_id || '-'}
                                </td>
                                <td className="px-4 py-3 font-mono text-[#5a6472]">
                                    {log.ip_address}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="text-[#222d32]">
                                        {log.device_vendor} {log.device_model}
                                    </div>
                                    <div className="text-[#5a6472] text-xs">
                                        {log.os_name} {log.os_version}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-[#222d32]/70">
                                    {log.browser_name}
                                </td>
                            </tr>
                        ))}
                        {logs.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-[#5a6472]/80">
                                    No logs found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

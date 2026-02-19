import { getVisitorLogs } from '@/lib/database';

export const dynamic = 'force-dynamic';

export default async function LogsPage() {
    const logs = await getVisitorLogs(100);

    return (
        <div className="min-h-screen bg-black text-white p-6">
            <h1 className="text-2xl font-bold mb-6">Visitor Logs (Last 100)</h1>

            <div className="overflow-x-auto border border-white/10 rounded-lg">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-white/5 text-white/60">
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
                            <tr key={log.id} className="hover:bg-white/5 transition-colors">
                                <td className="px-4 py-3 whitespace-nowrap text-white/80">
                                    {new Date(log.visited_at).toLocaleString()}
                                </td>
                                <td className="px-4 py-3 font-mono text-blue-400">
                                    {log.student_id || '-'}
                                </td>
                                <td className="px-4 py-3 font-mono text-white/60">
                                    {log.ip_address}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="text-white/90">
                                        {log.device_vendor} {log.device_model}
                                    </div>
                                    <div className="text-white/50 text-xs">
                                        {log.os_name} {log.os_version}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-white/70">
                                    {log.browser_name}
                                </td>
                            </tr>
                        ))}
                        {logs.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-white/40">
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

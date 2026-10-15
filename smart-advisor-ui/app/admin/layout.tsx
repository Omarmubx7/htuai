import { Suspense } from 'react';
import AdminGate from '@/components/AdminGate';
import AdminShell from '@/components/admin/AdminShell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <AdminGate>
            <Suspense fallback={null}>
                <AdminShell>{children}</AdminShell>
            </Suspense>
        </AdminGate>
    );
}
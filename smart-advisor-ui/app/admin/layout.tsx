import { Suspense } from 'react';
import type { Metadata } from 'next';
import AdminGate from '@/components/AdminGate';
import AdminShell from '@/components/admin/AdminShell';

export const metadata: Metadata = {
    title: 'Admin',
    robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <AdminGate>
            <Suspense fallback={null}>
                <AdminShell>{children}</AdminShell>
            </Suspense>
        </AdminGate>
    );
}
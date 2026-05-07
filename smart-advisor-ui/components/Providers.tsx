"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/components/ui/Toast";

export function Providers({ children }: { readonly children: ReactNode }) {
    return (
        <SessionProvider 
            basePath="/api/auth"
            refetchInterval={5 * 60}
            refetchOnWindowFocus={false}
        >
            <ToastProvider>{children}</ToastProvider>
        </SessionProvider>
    );
}

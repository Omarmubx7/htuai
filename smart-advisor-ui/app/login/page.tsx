import StudentLogin from "@/components/StudentLogin";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Login",
    description: "Sign in to your MUBXAI account to access your academic dashboard.",
    alternates: {
        canonical: "https://ai.mubx.dev/login",
    },
    robots: { index: false, follow: true },
};

export default function LoginPage() {
    return <StudentLogin />;
}

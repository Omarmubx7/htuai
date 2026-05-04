
import type { NextAuthOptions, DefaultSession } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { getUserByStudentId, createUser, getUserByEmail, linkAccount, createAdminLog } from "./lib/database";
import { requireEnv } from "@/lib/env";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            db_id?: number;
            student_id?: string | null;
            provider?: string;
        } & DefaultSession["user"];
    }
    interface User {
        student_id?: string | null;
    }
}

declare module "next-auth/jwt" {
    interface JWT extends DefaultJWT {
        student_id?: string | null;
        db_id?: number | null;
        provider?: string;
    }
}

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: requireEnv("GOOGLE_CLIENT_ID"),
            clientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
        }),
        CredentialsProvider({
            name: "University ID",
            credentials: {
                student_id: { label: "University ID", type: "text" },
                password: { label: "Password", type: "password" },
                is_claiming: { label: "Claiming Account", type: "text" }
            },
            async authorize(credentials) {
                if (!credentials?.student_id || !credentials?.password) {
                    return null;
                }

                const studentId = credentials.student_id;
                const password = credentials.password;
                const isClaiming = credentials.is_claiming === "true";

                try {
                    const user = await getUserByStudentId(studentId);

                    if (isClaiming) {
                        if (user) {
                            return null;
                        }

                        const passwordHash = await bcrypt.hash(password, 10);
                        const finalUser = await createUser({
                            student_id: studentId,
                            password_hash: passwordHash
                        });

                        return { id: finalUser.id.toString(), name: studentId, student_id: studentId };
                    }

                    if (!user || !user.password_hash) {
                        return null;
                    }

                    const isValid = await bcrypt.compare(password, user.password_hash);
                    if (!isValid) {
                        return null;
                    }

                    return { id: user.id.toString(), name: user.student_id, student_id: user.student_id };
                } catch (error) {
                    console.error("Auth Error in authorize callback:", error);
                    throw error;
                }
            }
        }),
    ],
    callbacks: {
        async signIn({ user, account }) {
            if (account?.provider === "google") {
                const existingUser = await getUserByEmail(user.email || "");
                if (existingUser) {
                    await linkAccount(existingUser.id, account.provider, account.providerAccountId);
                    createAdminLog({
                        type: 'login',
                        message: `User ${user.email} logged in via Google OAuth`,
                        details: { email: user.email, name: user.name, provider: 'google' },
                        event_kind: 'login',
                        target_id: user.email || String(existingUser.id),
                    }).catch(() => {});
                    return true;
                }
                const newUser = await createUser({
                    email: user.email,
                    name: user.name,
                    image: user.image
                });
                await linkAccount(newUser.id, account.provider, account.providerAccountId);
                createAdminLog({
                    type: 'register',
                    message: `New user registered via Google: ${user.email} (${user.name})`,
                    details: { email: user.email, name: user.name, provider: 'google', db_id: newUser.id },
                    event_kind: 'register',
                    target_id: user.email || String(newUser.id),
                }).catch(() => {});
            }
            return true;
        },

        /**
         * Reads session data from the JWT token — NO DB call on every request.
         * This fixes the "Initializing Workspace" hang caused by DB latency on
         * every page load. DB lookups are done once at sign-in time (jwt callback).
         */
        async session({ session, token }) {
            if (token.sub && session.user) {
                session.user.id = token.sub;
                session.user.provider = token.provider;
                if (token.student_id) {
                    session.user.student_id = token.student_id;
                }
                if (token.db_id) {
                    session.user.db_id = token.db_id;
                }
            }
            return session;
        },

        /**
         * JWT is only called at sign-in time (first time) or when token is refreshed.
         * This is the right place for the one-time DB lookup per session.
         */
        async jwt({ token, user, account }) {
            // Persist student_id from the Credentials authorize() return
            if (user) {
                token.student_id = (user as { student_id?: string | null }).student_id;
            }
            if (account) {
                token.provider = account.provider;
                // For Google OAuth: look up the DB user ONCE at sign-in time
                if (account.provider === "google" && user?.email) {
                    try {
                        const dbUser = await getUserByEmail(user.email);
                        if (dbUser) {
                            token.student_id = dbUser.student_id;
                            token.db_id = dbUser.id;
                        }
                    } catch (e) {
                        console.error("[JWT] Failed to look up Google user in DB:", e);
                        // Non-fatal: session will still work, student_id just won't be set
                    }
                }
            }
            return token;
        }
    },
    secret: requireEnv("AUTH_SECRET"),
    cookies: {
        sessionToken: {
            name: process.env.NODE_ENV === 'production' ? `__Secure-next-auth.session-token` : `next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production',
                domain: process.env.NODE_ENV === 'production' ? '.mubx.dev' : undefined
            }
        }
    }
};

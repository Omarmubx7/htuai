
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { getUserByStudentId, createUser, getUserByEmail, linkAccount, updateUserDetails } from "./lib/database";

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
        CredentialsProvider({
            name: "University ID",
            credentials: {
                student_id: { label: "University ID", type: "text" },
                password: { label: "Password", type: "password" },
                is_claiming: { label: "Claiming Account", type: "text" }
            },
            async authorize(credentials) {
                console.log("Authorize called with:", { ...credentials, password: "[REDACTED]" });
                if (!credentials?.student_id || !credentials?.password) {
                    console.log("Missing ID or Password");
                    return null;
                }

                const studentId = credentials.student_id as string;
                const password = credentials.password as string;
                const isClaiming = credentials.is_claiming === "true";

                try {
                    const user = await getUserByStudentId(studentId);
                    console.log("Existing user found:", !!user);

                    if (isClaiming) {
                        if (user) {
                            // Account already exists — cannot claim it, must login instead
                            console.log("Claim rejected: account already exists for", studentId);
                            return null;
                        }

                        console.log("Creating new user for claim:", studentId);
                        const passwordHash = await bcrypt.hash(password, 10);
                        const finalUser = await createUser({
                            student_id: studentId,
                            password_hash: passwordHash
                        });

                        console.log("User successfully claimed with id:", finalUser.id);
                        return { id: finalUser.id.toString(), name: studentId, student_id: studentId } as any;
                    }

                    if (!user || !user.password_hash) {
                        console.log("Login failed: User not found or no password hash for ID:", studentId);
                        return null;
                    }

                    const isValid = await bcrypt.compare(password, user.password_hash);
                    if (!isValid) {
                        console.log("Login failed: Invalid password for student_id:", studentId);
                        return null;
                    }

                    console.log("Login successful for student_id:", studentId);
                    return { id: user.id.toString(), name: user.student_id, student_id: user.student_id } as any;
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
                    return true;
                }
                const newUser = await createUser({
                    email: user.email,
                    name: user.name,
                    image: user.image
                });
                await linkAccount(newUser.id, account.provider, account.providerAccountId);
            }
            return true;
        },
        async session({ session, token }) {
            if (token.sub && session.user) {
                (session.user as any).id = token.sub;
                (session.user as any).provider = (token as any).provider;
                const dbUser = await getUserByEmail(session.user.email || "") || await getUserByStudentId(session.user.name || "");
                if (dbUser) {
                    (session.user as any).student_id = dbUser.student_id;
                }
            }
            return session;
        },
        async jwt({ token, user, account }) {
            if (user) {
                (token as any).student_id = (user as any).student_id;
            }
            if (account) {
                (token as any).provider = account.provider;
            }
            return token;
        }
    },
    pages: {
        signIn: "/login",
    },
    secret: process.env.AUTH_SECRET,
};

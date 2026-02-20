
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { getUserByStudentId, createUser, getUserByEmail, linkAccount } from "./lib/database";

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
                if (!credentials?.student_id || !credentials?.password) return null;

                const studentId = credentials.student_id as string;
                const password = credentials.password as string;
                const isClaiming = credentials.is_claiming === "true";

                const user = await getUserByStudentId(studentId);

                if (isClaiming) {
                    if (user) return null;

                    const passwordHash = await bcrypt.hash(password, 10);
                    const newUser = await createUser({
                        student_id: studentId,
                        password_hash: passwordHash
                    });
                    return { id: newUser.id.toString(), name: studentId, student_id: studentId } as any;
                }

                if (!user || !user.password_hash) return null;

                const isValid = await bcrypt.compare(password, user.password_hash);
                if (!isValid) return null;

                return { id: user.id.toString(), name: user.student_id, student_id: user.student_id } as any;
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
                const dbUser = await getUserByEmail(session.user.email || "") || await getUserByStudentId(session.user.name || "");
                if (dbUser) {
                    (session.user as any).student_id = dbUser.student_id;
                }
            }
            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                (token as any).student_id = (user as any).student_id;
            }
            return token;
        }
    },
    pages: {
        signIn: "/login",
    },
    secret: process.env.AUTH_SECRET,
};


import NextAuth from "next-auth";
import { authOptions } from "@/auth";

console.log("[Auth Setup] Initializing NextAuth handler at server start");

const handler = NextAuth(authOptions);
console.log("[Auth Setup] NextAuth handler created successfully");

export { handler as GET, handler as POST };

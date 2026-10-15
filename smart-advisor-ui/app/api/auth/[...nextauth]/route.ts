
import NextAuth from "next-auth";
import { authOptions } from "@/auth";

// This route must always be evaluated at request time. Without this, Next's
// dev/build step tries to statically analyse the catch-all segment, which can
// fail and make `/api/auth/session` briefly return an HTML page instead of JSON
// (triggering next-auth's CLIENT_FETCH_ERROR "Unexpected token '<'").
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

import { defineConfig } from "prisma/config";
import { buildLocalPostgresUrl } from "./lib/postgres-url";

// Only override DB URLs for local dev — on Vercel, env vars already point to Neon
if (!process.env.VERCEL) {
  const localPostgresUrl = buildLocalPostgresUrl();
  process.env.POSTGRES_PRISMA_URL = localPostgresUrl;
  process.env.POSTGRES_URL = localPostgresUrl;
  process.env.POSTGRES_URL_NON_POOLING = localPostgresUrl;
}

export default defineConfig({
    schema: "prisma/schema.prisma",
});

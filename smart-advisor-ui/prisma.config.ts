import "dotenv/config";
import { defineConfig } from "prisma/config";
import { buildLocalPostgresUrl } from "./lib/postgres-url";

const localPostgresUrl = buildLocalPostgresUrl();

process.env.POSTGRES_PRISMA_URL = localPostgresUrl;
process.env.POSTGRES_URL = localPostgresUrl;
process.env.POSTGRES_URL_NON_POOLING = localPostgresUrl;

export default defineConfig({
    schema: "prisma/schema.prisma",
});
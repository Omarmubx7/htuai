export function buildLocalPostgresUrl() {
    const host = process.env.POSTGRES_HOST || "localhost";
    const port = process.env.POSTGRES_PORT || "5432";
    const database = process.env.POSTGRES_DATABASE || "htuai_dev";
    const user = process.env.POSTGRES_USER || "postgres";
    const password = process.env.POSTGRES_PASSWORD || "admin";
    const sslmode = process.env.POSTGRES_SSLMODE || "disable";

    const url = new URL(`postgresql://${host}:${port}/${database}`);
    url.searchParams.set("sslmode", sslmode);
    url.searchParams.set("schema", "public");
    url.username = user;
    url.password = password;
    return url.toString();
}
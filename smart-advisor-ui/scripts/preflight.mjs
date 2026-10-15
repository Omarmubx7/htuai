#!/usr/bin/env node
/**
 * preflight.mjs — read-only safety gate to run before pushing to production.
 *
 * It never mutates application data. It only reads the repo + database and (by
 * default) writes a fresh row-count snapshot into the gitignored db-backups/
 * folder so you have a permanent "no data was lost" artefact.
 *
 * Checks (each can be skipped with a flag):
 *   1. git       – branch, HEAD, working-tree state, tags
 *   2. migrations– destructive-SQL scan + newest migration summary
 *   3. db        – dev DB reachable, prisma migrate status, schema drift,
 *                  and per-table row counts vs the pre-change baseline
 *   4. tsc       – `tsc --noEmit`
 *   5. lint      – `next lint` (must exit 0)
 *   6. build     – `prisma generate && next build`   (only with --build)
 *   7. api       – HTTP smoke of public + admin routes (needs a running server)
 *   8. env       – required environment variables are present
 *
 * Usage:
 *   node scripts/preflight.mjs              # everything except the slow build
 *   node scripts/preflight.mjs --build      # include the production build
 *   node scripts/preflight.mjs --skip-api   # when no dev server is running
 *   node scripts/preflight.mjs --json       # machine-readable summary
 *
 * Exit code 0 => GO, 1 => NO-GO.
 */

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, ".."); // smart-advisor-ui
const REPO = path.resolve(ROOT, ".."); // repo root
const BACKUP_DIR = process.env.PREFLIGHT_BACKUP_DIR || path.join(REPO, "db-backups");
const require = createRequire(import.meta.url);

// ─────────────────────────────── args ───────────────────────────────
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const SKIP = {
  git: flag("skip-git"),
  migrations: flag("skip-migrations"),
  db: flag("skip-db"),
  tsc: flag("skip-tsc"),
  lint: flag("skip-lint"),
  tests: flag("skip-tests"),
  build: !flag("build") || flag("skip-build"),
  api: flag("skip-api"),
  env: flag("skip-env"),
};
const AS_JSON = flag("json");
const BASE_URL = opt("base-url", process.env.PREFLIGHT_BASE_URL || "http://localhost:3000");

// ─────────────────────────────── reporting ───────────────────────────────
const results = [];
function record(severity, section, message, detail) {
  results.push({ severity, section, message, detail });
  if (AS_JSON) return;
  const icon =
    severity === "fail" ? "FAIL" : severity === "warn" ? "WARN" : severity === "info" ? "INFO" : "PASS";
  const colour =
    severity === "fail"
      ? "\x1b[31m"
      : severity === "warn"
        ? "\x1b[33m"
        : severity === "info"
          ? "\x1b[36m"
          : "\x1b[32m";
  console.log(`${colour}[${icon}]\x1b[0m ${message}`);
  if (detail) console.log(`        ${String(detail).split("\n").join("\n        ")}`);
}
const ok = (s, m, d) => record("ok", s, m, d);
const fail = (s, m, d) => record("fail", s, m, d);
const warn = (s, m, d) => record("warn", s, m, d);
const info = (s, m, d) => record("info", s, m, d);

function heading(title) {
  if (!AS_JSON) console.log(`\n\x1b[1m=== ${title} ===\x1b[0m`);
}

// ─────────────────────────────── helpers ───────────────────────────────
function run(cmdline, { cwd = ROOT, env = {}, timeout = 0 } = {}) {
  const res = spawnSync(cmdline, {
    cwd,
    shell: true,
    encoding: "utf8",
    env: { ...process.env, ...env, FORCE_COLOR: "0" },
    timeout: timeout || undefined,
    maxBuffer: 64 * 1024 * 1024,
  });
  return { status: res.status, stdout: res.stdout || "", stderr: res.stderr || "", signal: res.signal };
}

function tail(text, lines = 12) {
  const arr = String(text).trim().split(/\r?\n/);
  return arr.slice(Math.max(0, arr.length - lines)).join("\n");
}

/** Read a text file, tolerating UTF-8/UTF-16LE/UTF-16BE (PowerShell writes the latter). */
function readTextSmart(p) {
  const buf = readFileSync(p);
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) return buf.toString("utf16le").replace(/^\uFEFF/, "");
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    const swapped = Buffer.from(buf);
    for (let i = 0; i + 1 < swapped.length; i += 2) {
      const t = swapped[i];
      swapped[i] = swapped[i + 1];
      swapped[i + 1] = t;
    }
    return swapped.toString("utf16le").replace(/^\uFEFF/, "");
  }
  return buf.toString("utf8").replace(/^\uFEFF/, "");
}

/** Minimal .env loader (no dependency). Later files win; real env wins. */
function loadEnv() {
  for (const file of [".env", ".env.local"]) {
    const p = path.join(ROOT, file);
    if (!existsSync(p)) continue;
    for (const raw of readTextSmart(p).split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
      if (process.env[key] !== undefined && process.env[key] !== "") continue;
      let val = line.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

/** Mirror of lib/postgres-url.ts, plus the production variable names. */
function resolveDatabaseUrl() {
  if (process.env.POSTGRES_PRISMA_URL) return process.env.POSTGRES_PRISMA_URL;
  if (process.env.POSTGRES_URL) return process.env.POSTGRES_URL;
  const host = process.env.POSTGRES_HOST || "localhost";
  const port = process.env.POSTGRES_PORT || "5432";
  const db = process.env.POSTGRES_DATABASE || "postgres";
  const user = encodeURIComponent(process.env.POSTGRES_USER || "postgres");
  const pass = encodeURIComponent(process.env.POSTGRES_PASSWORD || "");
  const sslmode = process.env.POSTGRES_SSLMODE || "disable";
  return `postgresql://${user}:${pass}@${host}:${port}/${db}?sslmode=${sslmode}`;
}

// ─────────────────────────────── 1. git ───────────────────────────────
function checkGit() {
  heading("1. Repository state");
  const branch = run("git rev-parse --abbrev-ref HEAD").stdout.trim();
  const head = run("git rev-parse --short HEAD").stdout.trim();
  const log = run("git log --oneline -1").stdout.trim();
  const status = run("git status --porcelain").stdout.trim();
  const tag = run("git describe --tags --abbrev=0 2>nul").stdout.trim();

  info("git", `On branch ${branch} @ ${head}`, log);
  if (tag) info("git", `Nearest tag: ${tag}`);

  if (!status) {
    ok("git", "Working tree is clean");
  } else {
    const files = status.split(/\r?\n/).filter(Boolean);
    warn("git", `Working tree has ${files.length} uncommitted change(s)`, files.join("\n"));
  }
}

// ─────────────────────────────── 2. migrations ───────────────────────────────
const DESTRUCTIVE = [
  { re: /\bDROP\s+TABLE\b/i, kind: "DROP TABLE" },
  { re: /\bDROP\s+COLUMN\b/i, kind: "DROP COLUMN" },
  { re: /\bDROP\s+(DATABASE|SCHEMA|TYPE|CONSTRAINT|INDEX)\b/i, kind: "DROP object" },
  { re: /\bTRUNCATE\b/i, kind: "TRUNCATE" },
  { re: /\bDELETE\s+FROM\b/i, kind: "DELETE FROM" },
  { re: /\bALTER\s+COLUMN\b[^;]*\bTYPE\b/i, kind: "ALTER COLUMN TYPE" },
  { re: /\bALTER\s+TABLE\b[^;]*\bDROP\b/i, kind: "ALTER TABLE ... DROP" },
];

const stripSql = (sql) => sql.replace(/--[^\n]*/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ");

function scanMigrations() {
  heading("2. Migrations (additive-only safety scan)");
  const dir = path.join(ROOT, "prisma", "migrations");
  if (!existsSync(dir)) {
    fail("migrations", "prisma/migrations not found");
    return;
  }
  const folders = readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  if (folders.length === 0) {
    fail("migrations", "No migration folders found");
    return;
  }

  const newest = folders[folders.length - 1];
  info("migrations", `${folders.length} migration(s); newest is ${newest}`);

  let newestDestructive = [];
  for (const name of folders) {
    const sqlPath = path.join(dir, name, "migration.sql");
    if (!existsSync(sqlPath)) continue;
    const sql = stripSql(readFileSync(sqlPath, "utf8"));
    const hits = DESTRUCTIVE.filter((d) => d.re.test(sql)).map((d) => d.kind);
    if (hits.length > 0) {
      if (name === newest) newestDestructive = hits;
      else info("migrations", `Historical migration ${name} contains: ${hits.join(", ")} (already applied)`);
    }
  }

  const newestSql = stripSql(readFileSync(path.join(dir, newest, "migration.sql"), "utf8"));
  if (newestDestructive.length > 0) {
    fail(
      "migrations",
      `Newest migration ${newest} contains destructive SQL: ${newestDestructive.join(", ")}`,
      "Review before applying to production."
    );
  } else {
    ok("migrations", `Newest migration ${newest} is additive (no destructive statements)`);
  }

  const tables = [...newestSql.matchAll(/CREATE\s+TABLE\s+"?([\w.]+)"?/gi)].map((m) => m[1]);
  if (tables.length) info("migrations", `Creates table(s): ${tables.join(", ")}`);

  const unstaged = run("git status --porcelain prisma/migrations").stdout.trim();
  if (unstaged) warn("migrations", "Migration files have uncommitted changes", unstaged);

  return newest;
}

// ─────────────────────────────── 2. database ───────────────────────────────
function readBaseline() {
  if (!existsSync(BACKUP_DIR)) return null;
  const candidates = readdirSync(BACKUP_DIR)
    .filter((f) => /^baseline_counts_.*\.txt$/.test(f))
    .sort();
  if (candidates.length === 0) return null;
  const file = candidates[0]; // earliest = the pre-change baseline
  const map = {};
  for (const line of readTextSmart(path.join(BACKUP_DIR, file)).split(/\r?\n/)) {
    const m = line.match(/^([\w.]+)\|(\d+)\s*$/);
    if (m) map[m[1]] = Number(m[2]);
  }
  return { file, map };
}

async function checkDatabase() {
  heading("7. Database integrity (no data loss)");
  const url = resolveDatabaseUrl();
  info("db", `Target: ${url.replace(/:\/\/[^@]*@/, "://***@")}`);

  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient({ datasources: { db: { url } } });

  const live = {};
  try {
    const tables = await prisma.$queryRawUnsafe(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
    );
    if (!tables.length) fail("db", "Connected, but found no public tables");
    for (const t of tables) {
      const rows = await prisma.$queryRawUnsafe(`SELECT count(*)::int AS c FROM "${t.tablename}"`);
      live[t.tablename] = rows[0].c;
    }
    ok("db", `Connected; ${Object.keys(live).length} public table(s) inspected`);
  } catch (err) {
    fail("db", "Could not read the database", err.message);
    await prisma.$disconnect().catch(() => {});
    return;
  }

  // ── compare with the pre-change baseline
  const baseline = readBaseline();
  if (!baseline) {
    warn("db", "No baseline_counts_*.txt found; cannot prove zero data loss", `Looked in ${BACKUP_DIR}`);
  } else {
    info("db", `Baseline: ${baseline.file}`);
    const lost = [];
    const missing = [];
    for (const [table, before] of Object.entries(baseline.map)) {
      if (!(table in live)) missing.push(table);
      else if (live[table] < before) lost.push(`${table}: ${before} → ${live[table]}`);
    }
    if (missing.length) fail("db", `Table(s) present in baseline are now MISSING: ${missing.join(", ")}`);
    if (lost.length) fail("db", "Row count DECREASED (possible data loss):", lost.join("\n"));
    if (!missing.length && !lost.length)
      ok("db", `All ${Object.keys(baseline.map).length} baseline tables still exist and none lost rows`);

    const added = Object.keys(live).filter((t) => !(t in baseline.map));
    if (added.length) info("db", `New table(s) since baseline: ${added.join(", ")}`);
    const grown = Object.entries(live)
      .filter(([t, n]) => t in baseline.map && n > baseline.map[t])
      .map(([t, n]) => `${t}: ${baseline.map[t]} → ${n}`);
    if (grown.length) info("db", "Tables that grew (expected for live traffic):", grown.join("\n"));
  }

  // ── migrations status + schema drift
  const env = { POSTGRES_PRISMA_URL: resolveDatabaseUrl() };
  const status = run("npx prisma migrate status", { env, timeout: 180000 });
  const statusText = `${status.stdout}\n${status.stderr}`;
  if (status.status === 0 && /up to date/i.test(statusText)) {
    ok("db", "prisma migrate status: schema is up to date");
  } else if (/have not yet been applied|pending/i.test(statusText)) {
    warn("db", "prisma migrate status reports PENDING migrations", tail(statusText, 8));
  } else {
    warn("db", "prisma migrate status did not report a clean state", tail(statusText, 8));
  }

  const diff = run(
    "npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma",
    { env, timeout: 180000 }
  );
  if (diff.status === 0) ok("db", "No schema drift: database matches prisma/schema.prisma");
  else warn("db", "prisma migrate diff reported a difference between DB and schema", tail(`${diff.stdout}\n${diff.stderr}`, 10));

  await prisma.$disconnect().catch(() => {});

  // ── snapshot for the record
  if (!flag("no-write") && Object.keys(live).length) {
    try {
      const ts = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 15);
      const out = path.join(BACKUP_DIR, `postchange_counts_${ts}.txt`);
      const body =
        "relname|rows\n" +
        Object.keys(live)
          .sort()
          .map((t) => `${t}|${live[t]}`)
          .join("\n") +
        "\n";
      writeFileSync(out, body, "utf8");
      info("db", `Wrote snapshot ${path.relative(REPO, out)}`);
    } catch (err) {
      warn("db", "Could not write row-count snapshot", err.message);
    }
  }
}

// ─────────────────────────────── 4. tsc ───────────────────────────────
function checkTsc() {
  heading("3. TypeScript");
  const res = run("npx tsc --noEmit", { timeout: 900000 });
  if (res.status === 0) ok("tsc", "tsc --noEmit passed with no errors");
  else fail("tsc", "tsc --noEmit reported errors", tail(`${res.stdout}\n${res.stderr}`, 20));
}

// ─────────────────────────────── 5. lint ───────────────────────────────
function checkLint() {
  heading("4. ESLint");
  const res = run("npx next lint", { timeout: 900000 });
  const text = `${res.stdout}\n${res.stderr}`;
  if (res.status === 0) {
    const errs = (text.match(/(\d+)\s+errors?/i) || [])[1] || "0";
    const warns = (text.match(/(\d+)\s+warnings?/i) || [])[1] || "0";
    ok("lint", `next lint passed (${errs} errors, ${warns} warnings)`);
  } else {
    fail("lint", "next lint reported errors", tail(text, 20));
  }
}

const stripAnsi = (s) => String(s).replace(/\u001b\[[0-9;]*m/g, "");

// ─────────────────────────────── 5. unit tests ───────────────────────────────
function checkTests() {
  heading("5. Unit tests (vitest)");
  const res = run("npx vitest run", { timeout: 900000 });
  const text = stripAnsi(`${res.stdout}\n${res.stderr}`);
  if (res.status === 0) {
    const m = text.match(/Tests\s+(\d+)\s+passed\s+\((\d+)\)/i);
    ok("tests", `vitest passed${m ? ` — ${m[1]} tests, ${m[2]} total` : ""}`);
  } else {
    fail("tests", "vitest reported failures", tail(text, 30));
  }
}

// ─────────────────────────────── 6. build ───────────────────────────────
function checkBuild() {
  heading("6. Production build");  const gen = run("npx prisma generate", { timeout: 600000 });
  if (gen.status !== 0) {
    fail("build", "prisma generate failed", tail(`${gen.stdout}\n${gen.stderr}`, 15));
    return;
  }
  info("build", "prisma generate succeeded");

  const res = run("npx next build", { timeout: 1800000 });
  if (res.status === 0) ok("build", "next build succeeded");
  else fail("build", "next build failed", tail(`${res.stdout}\n${res.stderr}`, 25));
}

// ─────────────────────────────── 7. api ───────────────────────────────
const API_CHECKS = [
  { name: "Public settings readable", method: "GET", url: "/api/settings", expect: [200] },
  { name: "Courses index requires auth", method: "GET", url: "/api/courses", expect: [401] },
  { name: "Admin settings requires auth", method: "GET", url: "/api/admin/settings", expect: [401] },
  { name: "Admin users requires auth", method: "GET", url: "/api/admin/users", expect: [401] },
  { name: "Admin courses requires auth", method: "GET", url: "/api/admin/courses", expect: [401] },
  { name: "Admin resources requires auth", method: "GET", url: "/api/admin/resources", expect: [401] },
  { name: "Admin logs requires auth", method: "GET", url: "/api/admin/logs", expect: [401] },
  { name: "Admin stats requires auth", method: "GET", url: "/api/admin/stats", expect: [401] },
  { name: "Resource delete requires admin", method: "DELETE", url: "/api/directory/resources/999999", expect: [401] },
];

async function checkApi() {
  heading("8. HTTP smoke test");
  let reachable = false;
  try {
    const res = await fetch(`${BASE_URL}/api/settings`, { signal: AbortSignal.timeout(8000) });
    reachable = res.status < 500;
  } catch {
    reachable = false;
  }
  if (!reachable) {
    warn("api", `No server responding at ${BASE_URL} — skipped HTTP checks`, "Start it with: npm run dev");
    return;
  }
  info("api", `Server reachable at ${BASE_URL}`);

  for (const c of API_CHECKS) {
    try {
      const res = await fetch(`${BASE_URL}${c.url}`, { method: c.method, signal: AbortSignal.timeout(15000) });
      if (c.expect.includes(res.status)) ok("api", `${c.method} ${c.url} → ${res.status}`, c.name);
      else fail("api", `${c.method} ${c.url} → ${res.status} (expected ${c.expect.join("/")})`, c.name);
    } catch (err) {
      fail("api", `${c.method} ${c.url} threw`, err.message);
    }
  }
}

// ─────────────────────────────── 8. env ───────────────────────────────
const REQUIRED_ENV = [
  "POSTGRES_HOST",
  "POSTGRES_DATABASE",
  "POSTGRES_USER",
  "POSTGRES_PASSWORD",
  "NEXTAUTH_URL",
  "NEXTAUTH_SECRET",
  "ADMIN_SECRET",
];
const OPTIONAL_ENV = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "R2_BUCKET_NAME", "R2_PUBLIC_URL", "groqapi_token"];

function checkEnv() {
  heading("9. Environment");
  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
  if (missing.length) fail("env", `Missing required env var(s) locally: ${missing.join(", ")}`);
  else ok("env", `All ${REQUIRED_ENV.length} required env vars are present locally`);

  const missingOpt = OPTIONAL_ENV.filter((k) => !process.env[k]);
  if (missingOpt.length) info("env", `Optional env var(s) not set locally: ${missingOpt.join(", ")}`);

  info(
    "env",
    "Production values live in the Vercel project settings.",
    "Confirm POSTGRES_PRISMA_URL, NEXTAUTH_*, GOOGLE_*, R2_*, groqapi_token and ADMIN_SECRET are set there."
  );
}

// ─────────────────────────────── main ───────────────────────────────
async function main() {
  if (!AS_JSON) {
    console.log("\x1b[1mMubxai preflight — production readiness gate\x1b[0m");
    console.log(`Repo: ${REPO}`);
  }

  loadEnv();

  if (!SKIP.git) checkGit();
  if (!SKIP.migrations) scanMigrations();
  // NOTE: the build runs before the DB check on purpose. Loading PrismaClient (the
  // DB check) locks the Windows query-engine DLL, which then blocks `prisma generate`.
  if (!SKIP.tsc) checkTsc();
  if (!SKIP.lint) checkLint();
  if (!SKIP.tests) checkTests();
  if (!SKIP.build) checkBuild();
  if (!SKIP.db) await checkDatabase();
  if (!SKIP.api) await checkApi();
  if (!SKIP.env) checkEnv();

  const fails = results.filter((r) => r.severity === "fail");
  const warns = results.filter((r) => r.severity === "warn");

  if (AS_JSON) {
    console.log(JSON.stringify({ verdict: fails.length ? "NO-GO" : "GO", fails, warns, results }, null, 2));
  } else {
    console.log("\n" + "─".repeat(60));
    console.log(`Checks: ${results.length}   Warnings: ${warns.length}   Failures: ${fails.length}`);
    if (fails.length === 0) {
      console.log("\x1b[32m\x1b[1mVERDICT: GO — safe to push.\x1b[0m");
    } else {
      console.log("\x1b[31m\x1b[1mVERDICT: NO-GO — resolve the failures above first.\x1b[0m");
      for (const f of fails) console.log(`  • ${f.message}`);
    }
    console.log("─".repeat(60));
  }

  process.exit(fails.length ? 1 : 0);
}

main().catch((err) => {
  console.error("preflight crashed:", err);
  process.exit(1);
});

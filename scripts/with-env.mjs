#!/usr/bin/env node
/**
 * Runs a command with environment variables loaded from `.env` and then
 * `.env.local` (the latter overrides). This fixes the intermittent Prisma
 * error `Environment variable not found: DATABASE_URL`, which happens because
 * the Prisma CLI only auto-loads `.env` (not Next.js's `.env.local`).
 *
 * Usage: node scripts/with-env.mjs <command> [...args]
 *   e.g. node scripts/with-env.mjs prisma migrate dev --name init
 *
 * Missing env files are ignored, so it works whether you keep your variables
 * in `.env`, `.env.local`, or both.
 */
import { config } from "dotenv";
import { spawn } from "node:child_process";
import path from "node:path";

// `.env` first, then `.env.local` (override). dotenv does not throw when a
// file is absent — it simply returns an error in the result we ignore.
config({ path: ".env" });
config({ path: ".env.local", override: true });

const [cmd, ...args] = process.argv.slice(2);
if (!cmd) {
  console.error("with-env: no command provided");
  process.exit(1);
}

// Ensure local CLIs (prisma, tsx) resolve even when invoked outside npm.
const binDir = path.resolve("node_modules/.bin");
const env = {
  ...process.env,
  PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ""}`,
};

const child = spawn(cmd, args, { stdio: "inherit", shell: true, env });
child.on("exit", (code) => process.exit(code ?? 0));
child.on("error", (err) => {
  console.error(err);
  process.exit(1);
});

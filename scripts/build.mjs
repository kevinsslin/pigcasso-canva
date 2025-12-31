import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

const run = (command) => {
  execSync(command, {
    stdio: "inherit",
    env: process.env,
  });
};

const shouldMigrate = Boolean(process.env.DATABASE_URL?.trim()) && process.env.SKIP_DB_MIGRATE !== "1";

if (shouldMigrate) {
  const drizzleBin =
    process.platform === "win32"
      ? "node_modules/.bin/drizzle-kit.cmd"
      : "node_modules/.bin/drizzle-kit";

  if (existsSync(drizzleBin)) {
    run(`${drizzleBin} migrate`);
  } else {
    run("npx drizzle-kit migrate");
  }
}

run("next build");


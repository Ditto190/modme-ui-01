#!/usr/bin/env node
/**
 * Fetch latest GitLab pipeline status for current branch (adjunct mirror).
 * Non-fatal: exits 0 when glab/GITLAB_PROJECT_ID unavailable.
 */
import { execSync } from "node:child_process";

const projectId = process.env.GITLAB_PROJECT_ID;
const branch =
  process.env.CI_COMMIT_REF_NAME ||
  process.env.GIT_BRANCH ||
  execSync("git branch --show-current", { encoding: "utf8" }).trim();

function hasGlab() {
  try {
    execSync("glab --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

if (!projectId || !hasGlab()) {
  console.log(
    JSON.stringify({
      ok: true,
      skipped: true,
      reason: !projectId ? "GITLAB_PROJECT_ID unset" : "glab not on PATH",
    }),
  );
  process.exit(0);
}

try {
  const raw = execSync(
    `glab api "projects/${projectId}/pipelines?ref=${encodeURIComponent(branch)}&per_page=1"`,
    { encoding: "utf8" },
  );
  const pipelines = JSON.parse(raw);
  const latest = Array.isArray(pipelines) ? pipelines[0] : null;
  const out = {
    ok: true,
    skipped: false,
    branch,
    project_id: projectId,
    pipeline: latest
      ? {
          id: latest.id,
          status: latest.status,
          web_url: latest.web_url,
          ref: latest.ref,
        }
      : null,
  };
  console.log(JSON.stringify(out));
} catch (err) {
  console.log(
    JSON.stringify({
      ok: false,
      skipped: false,
      error: err instanceof Error ? err.message : String(err),
    }),
  );
  process.exit(0);
}

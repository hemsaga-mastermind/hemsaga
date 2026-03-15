/**
 * UI agent: runs production build to validate the app (Next.js build). Ensures UI/build is healthy.
 */
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function runCommand(cmd, cwd) {
  try {
    const out = execSync(cmd, {
      encoding: "utf8",
      cwd: cwd || path.resolve(__dirname, "../../.."),
      env: { ...process.env, CI: "1" },
    });
    return { ok: true, stdout: out || "", stderr: "" };
  } catch (e) {
    return {
      ok: false,
      stdout: (e.stdout && String(e.stdout)) || "",
      stderr: (e.stderr && String(e.stderr)) || e.message || "",
    };
  }
}

export function uiNode(state) {
  const projectRoot = path.resolve(__dirname, "../../..");
  const errors = [];

  const buildResult = runCommand("npx next build", projectRoot);
  if (!buildResult.ok) {
    errors.push(`Build failed: ${buildResult.stderr || buildResult.stdout}`);
  }

  return {
    uiResult: {
      buildPassed: buildResult.ok,
      stdout: buildResult.stdout,
      stderr: buildResult.stderr,
      timestamp: new Date().toISOString(),
    },
    currentStep: "ui",
    errors,
    passed: state.passed !== false && buildResult.ok,
  };
}

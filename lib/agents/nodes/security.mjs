/**
 * Security agent: runs npm audit (and optionally other checks). Records findings in state.
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

export function securityNode(state) {
  const projectRoot = path.resolve(__dirname, "../../..");
  const errors = [];

  const auditResult = runCommand("npm audit --audit-level=high", projectRoot);
  const hasHighSeverity = !auditResult.ok;

  if (hasHighSeverity) {
    errors.push(`Security audit reported high/critical issues: ${auditResult.stderr || auditResult.stdout}`);
  }

  return {
    securityResult: {
      auditPassed: !hasHighSeverity,
      raw: auditResult.stdout || auditResult.stderr,
      timestamp: new Date().toISOString(),
    },
    currentStep: "security",
    errors,
    passed: state.passed !== false && !hasHighSeverity,
  };
}
